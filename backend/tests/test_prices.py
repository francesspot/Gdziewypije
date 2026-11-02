# Testy cen: zgłoszenie ceny (T2, PU.02), potwierdzenie ceny (T3, PU.03) i aktualne ceny baru.
# Wymagają działającej bazy (docker compose up -d) i pliku backend/.env.
# Bar, napój i konta są tworzone w fixturach, więc testy nie zależą od danych z 03_testdata.sql.
import uuid

import pytest

from src.db.connection import connect


@pytest.fixture
def bar():
    with connect() as conn:
        bar_id = conn.execute(
            "INSERT INTO bars (name, location) VALUES ('Bar testowy', ST_Point(17.03, 51.11, 4326)) RETURNING id"
        ).fetchone()["id"]
    yield bar_id
    # Potwierdzenia wskazują na ceny, a ceny na bar kluczem obcym, więc są usuwane w tej kolejności
    with connect() as conn:
        conn.execute(
            "DELETE FROM price_confirmations WHERE price_id IN (SELECT id FROM prices WHERE bar_id = %s)",
            (bar_id,),
        )
        conn.execute("DELETE FROM prices WHERE bar_id = %s", (bar_id,))
        conn.execute("DELETE FROM bars WHERE id = %s", (bar_id,))


@pytest.fixture
def drink():
    # Losowa nazwa, bo para (name, volume_ml) jest unikalna
    with connect() as conn:
        drink_id = conn.execute(
            "INSERT INTO drinks (name, category, volume_ml) VALUES (%s, 'beer', 500) RETURNING id",
            (f"Piwo testowe {uuid.uuid4().hex[:8]}",),
        ).fetchone()["id"]
    yield drink_id
    with connect() as conn:
        conn.execute(
            "DELETE FROM price_confirmations WHERE price_id IN (SELECT id FROM prices WHERE drink_id = %s)",
            (drink_id,),
        )
        conn.execute("DELETE FROM prices WHERE drink_id = %s", (drink_id,))
        conn.execute("DELETE FROM drinks WHERE id = %s", (drink_id,))


def create_user(client):
    email = f"test-{uuid.uuid4().hex[:12]}@test.pl"
    body = client.post(
        "/auth/register",
        json={"email": email, "password": "tajnehaslo", "display_name": "Tester"},
    ).json()
    return {"id": body["user"]["id"], "headers": {"Authorization": f"Bearer {body['access_token']}"}}


def delete_user(user_id):
    with connect() as conn:
        conn.execute(
            """
            DELETE FROM price_confirmations
            WHERE user_id = %s OR price_id IN (SELECT id FROM prices WHERE reported_by = %s)
            """,
            (user_id, user_id),
        )
        conn.execute("DELETE FROM prices WHERE reported_by = %s", (user_id,))
        conn.execute("DELETE FROM user_profiles WHERE user_id = %s", (user_id,))
        conn.execute("DELETE FROM users WHERE id = %s", (user_id,))


@pytest.fixture
def user(client):
    created = create_user(client)
    yield created
    delete_user(created["id"])


@pytest.fixture
def other_user(client):
    # Druga osoba, która potwierdza cenę zgłoszoną przez user
    created = create_user(client)
    yield created
    delete_user(created["id"])


def report(client, bar, drink, user, amount=12.5):
    response = client.post(f"/bars/{bar}/prices", json={"drink_id": drink, "amount": amount}, headers=user["headers"])
    return response.json()["price_id"]


def make_price_old(price_id, days=91):
    # Cofnięcie daty ostatniego potwierdzenia zamiast czekania 90 dni
    with connect() as conn:
        conn.execute(
            "UPDATE prices SET last_confirmed_at = now() - make_interval(days => %s) WHERE id = %s",
            (days, price_id),
        )


def points(user_id):
    with connect() as conn:
        return conn.execute("SELECT points FROM user_profiles WHERE user_id = %s", (user_id,)).fetchone()["points"]


def price_count(bar_id):
    with connect() as conn:
        return conn.execute("SELECT count(*) AS n FROM prices WHERE bar_id = %s", (bar_id,)).fetchone()["n"]


def test_report_price_saves_price_and_adds_5_points(client, bar, drink, user):
    response = client.post(f"/bars/{bar}/prices", json={"drink_id": drink, "amount": 12.5}, headers=user["headers"])

    assert response.status_code == 201
    assert response.json()["amount"] == 12.5
    assert response.json()["needs_verification"] is False
    # T2: cena i punkty zapisane razem
    assert price_count(bar) == 1
    assert points(user["id"]) == 5


def test_reported_price_is_current_price_of_bar(client, bar, drink, user):
    client.post(f"/bars/{bar}/prices", json={"drink_id": drink, "amount": 12.5}, headers=user["headers"])
    client.post(f"/bars/{bar}/prices", json={"drink_id": drink, "amount": 14}, headers=user["headers"])

    response = client.get(f"/bars/{bar}/prices")

    # Historia ma dwa wpisy, ale aktualna cena to tylko najnowszy
    assert response.status_code == 200
    assert [price["amount"] for price in response.json()] == [14.0]


@pytest.mark.parametrize("amount", [0, -5])
def test_report_price_not_greater_than_zero_returns_422(client, bar, drink, user, amount):
    response = client.post(f"/bars/{bar}/prices", json={"drink_id": drink, "amount": amount}, headers=user["headers"])

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "amount"]
    # PU.02 (3a): nic się nie zapisuje
    assert price_count(bar) == 0
    assert points(user["id"]) == 0


def test_report_price_for_disabled_bar_returns_404(client, bar, drink, user):
    with connect() as conn:
        conn.execute("UPDATE bars SET is_active = false WHERE id = %s", (bar,))

    response = client.post(f"/bars/{bar}/prices", json={"drink_id": drink, "amount": 12.5}, headers=user["headers"])

    assert response.status_code == 404
    assert response.json() == {"detail": "Bar nie istnieje lub jest wyłączony"}
    assert points(user["id"]) == 0


def test_report_price_for_disabled_drink_returns_404(client, bar, drink, user):
    with connect() as conn:
        conn.execute("UPDATE drinks SET is_active = false WHERE id = %s", (drink,))

    response = client.post(f"/bars/{bar}/prices", json={"drink_id": drink, "amount": 12.5}, headers=user["headers"])

    assert response.status_code == 404
    assert response.json() == {"detail": "Napój nie istnieje lub jest wyłączony"}


def test_report_price_without_token_returns_401(client, bar, drink):
    response = client.post(f"/bars/{bar}/prices", json={"drink_id": drink, "amount": 12.5})

    assert response.status_code == 401
    assert price_count(bar) == 0


def test_current_prices_of_bar_without_prices_is_empty(client, bar):
    response = client.get(f"/bars/{bar}/prices")

    assert response.status_code == 200
    assert response.json() == []


def test_current_prices_of_disabled_bar_returns_404(client, bar):
    with connect() as conn:
        conn.execute("UPDATE bars SET is_active = false WHERE id = %s", (bar,))

    response = client.get(f"/bars/{bar}/prices")

    assert response.status_code == 404


def test_price_not_confirmed_for_90_days_needs_verification(client, bar, drink, user):
    price_id = report(client, bar, drink, user)
    make_price_old(price_id)

    response = client.get(f"/bars/{bar}/prices")

    # WF.13: po 90 dniach bez potwierdzenia cena dostaje „do weryfikacji”
    assert response.json()[0]["needs_verification"] is True


def test_confirm_price_removes_needs_verification_and_adds_1_point(client, bar, drink, user, other_user):
    price_id = report(client, bar, drink, user)
    make_price_old(price_id)

    response = client.post(f"/prices/{price_id}/confirmations", json={}, headers=other_user["headers"])

    assert response.status_code == 201
    # PU.03 (4): etykieta znika, bo potwierdzenie odświeża datę ceny
    assert response.json()["needs_verification"] is False
    assert client.get(f"/bars/{bar}/prices").json()[0]["needs_verification"] is False
    # T3: potwierdzenie i punkt zapisane razem
    assert points(other_user["id"]) == 1


def test_confirm_price_twice_by_same_user_returns_409(client, bar, drink, user, other_user):
    price_id = report(client, bar, drink, user)
    client.post(f"/prices/{price_id}/confirmations", json={}, headers=other_user["headers"])

    response = client.post(f"/prices/{price_id}/confirmations", json={}, headers=other_user["headers"])

    # PU.03 (2a): drugie potwierdzenie nie daje kolejnego punktu
    assert response.status_code == 409
    assert response.json() == {"detail": "Ta cena została już potwierdzona z tego konta"}
    assert points(other_user["id"]) == 1


def test_change_does_not_refresh_price_date_nor_add_point(client, bar, drink, user, other_user):
    price_id = report(client, bar, drink, user)
    make_price_old(price_id)

    response = client.post(
        f"/prices/{price_id}/confirmations", json={"kind": "change"}, headers=other_user["headers"]
    )

    # PU.03 (2b): „zmiana” zapisuje tylko sprzeciw, nową cenę zgłasza się osobno
    assert response.status_code == 201
    assert response.json()["needs_verification"] is True
    assert points(other_user["id"]) == 0
    with connect() as conn:
        kind = conn.execute(
            "SELECT kind FROM price_confirmations WHERE price_id = %s AND user_id = %s",
            (price_id, other_user["id"]),
        ).fetchone()["kind"]
    assert kind == "change"


def test_confirm_older_price_from_history_returns_404(client, bar, drink, user, other_user):
    old_price_id = report(client, bar, drink, user, amount=11)
    report(client, bar, drink, user, amount=12.5)

    response = client.post(f"/prices/{old_price_id}/confirmations", json={}, headers=other_user["headers"])

    # Potwierdzić można tylko aktualną cenę, którą użytkownik widzi
    assert response.status_code == 404
    assert response.json() == {"detail": "Cena nie istnieje lub nie jest aktualna"}


def test_confirm_price_with_invalid_kind_returns_422(client, bar, drink, user, other_user):
    price_id = report(client, bar, drink, user)

    response = client.post(
        f"/prices/{price_id}/confirmations", json={"kind": "zmiana"}, headers=other_user["headers"]
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "kind"]


def test_confirm_price_without_token_returns_401(client, bar, drink, user):
    price_id = report(client, bar, drink, user)

    response = client.post(f"/prices/{price_id}/confirmations", json={})

    assert response.status_code == 401
