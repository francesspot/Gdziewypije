# Testy cen: zgłoszenie ceny (T2, PU.02) i aktualne ceny baru.
# Wymagają działającej bazy (docker compose up -d) i pliku backend/.env.
# Bar, napój i konto są tworzone w fixturach, więc testy nie zależą od danych z 03_testdata.sql.
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
    # Ceny wskazują na bar kluczem obcym, więc są usuwane przed nim
    with connect() as conn:
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
        conn.execute("DELETE FROM prices WHERE drink_id = %s", (drink_id,))
        conn.execute("DELETE FROM drinks WHERE id = %s", (drink_id,))


@pytest.fixture
def user(client):
    email = f"test-{uuid.uuid4().hex[:12]}@test.pl"
    body = client.post(
        "/auth/register",
        json={"email": email, "password": "tajnehaslo", "display_name": "Tester"},
    ).json()
    user_id = body["user"]["id"]
    yield {"id": user_id, "headers": {"Authorization": f"Bearer {body['access_token']}"}}
    with connect() as conn:
        conn.execute("DELETE FROM prices WHERE reported_by = %s", (user_id,))
        conn.execute("DELETE FROM user_profiles WHERE user_id = %s", (user_id,))
        conn.execute("DELETE FROM users WHERE id = %s", (user_id,))


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
