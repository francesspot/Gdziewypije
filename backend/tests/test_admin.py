# Testy ścieżek administratora: bary i napoje (WF.18), dostęp tylko dla roli admin (WNF.06).
# Wymagają działającej bazy (docker compose up -d) i pliku backend/.env.
import uuid

import psycopg
import pytest

from src.db.connection import connect

PASSWORD = "tajnehaslo"


@pytest.fixture
def tag():
    # Wspólny przedrostek nazw barów, napojów i e-maili z jednego testu, po którym są sprzątane
    value = f"test-{uuid.uuid4().hex[:12]}"
    yield value
    pattern = f"{value}%"
    with connect() as conn:
        # Kolejność wynika z kluczy obcych: najpierw ceny, potem bary, napoje i konta
        conn.execute(
            """
            DELETE FROM prices
            WHERE bar_id IN (SELECT id FROM bars WHERE name LIKE %s)
               OR drink_id IN (SELECT id FROM drinks WHERE name LIKE %s)
            """,
            (pattern, pattern),
        )
        conn.execute("DELETE FROM bars WHERE name LIKE %s", (pattern,))
        conn.execute("DELETE FROM drinks WHERE name LIKE %s", (pattern,))
        conn.execute(
            "DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s)",
            (pattern,),
        )
        conn.execute("DELETE FROM users WHERE email LIKE %s", (pattern,))


def auth_headers(client, email, role="user"):
    token = client.post(
        "/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": "Tester"},
    ).json()["access_token"]
    # Rejestracja zawsze tworzy zwykłe konto, administratora ustawia się w bazie
    if role == "admin":
        with connect() as conn:
            conn.execute("UPDATE users SET role = 'admin' WHERE email = %s", (email,))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client, tag):
    return auth_headers(client, f"{tag}-admin@test.pl", role="admin")


@pytest.fixture
def user_headers(client, tag):
    return auth_headers(client, f"{tag}-user@test.pl")


def bar_data(tag, **changes):
    return {
        "name": f"{tag} Bar",
        "address": "Rynek 1",
        "opening_hours": "Mo-Su 16:00-02:00",
        "latitude": 51.11,
        "longitude": 17.03,
        **changes,
    }


def drink_data(tag, **changes):
    return {"name": f"{tag} Negroni", "category": "cocktail", "volume_ml": 200, **changes}


# Wszystkie ścieżki modułu z poprawnymi danymi, żeby odmowa wynikała z roli, a nie z walidacji
ADMIN_ROUTES = [
    ("post", "/admin/bars", bar_data("x")),
    ("put", "/admin/bars/1", bar_data("x")),
    ("patch", "/admin/bars/1", {"is_active": False}),
    ("post", "/admin/drinks", drink_data("x")),
    ("put", "/admin/drinks/1", drink_data("x")),
    ("patch", "/admin/drinks/1", {"is_active": False}),
]


@pytest.mark.parametrize(("method", "path", "body"), ADMIN_ROUTES)
def test_admin_route_without_token_returns_401(client, method, path, body):
    response = client.request(method, path, json=body)

    assert response.status_code == 401


@pytest.mark.parametrize(("method", "path", "body"), ADMIN_ROUTES)
def test_admin_route_for_regular_user_returns_403(client, user_headers, method, path, body):
    response = client.request(method, path, json=body, headers=user_headers)

    assert response.status_code == 403
    assert response.json() == {"detail": "Brak uprawnień administratora"}


# Bary

def test_create_bar_returns_bar_with_coordinates(client, admin_headers, tag):
    response = client.post("/admin/bars", json=bar_data(tag), headers=admin_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == f"{tag} Bar"
    assert body["latitude"] == pytest.approx(51.11)
    assert body["longitude"] == pytest.approx(17.03)
    assert body["is_active"] is True

    # Bar dodany ręcznie nie ma odpowiednika w OSM
    with connect() as conn:
        row = conn.execute("SELECT osm_type, osm_id FROM bars WHERE id = %s", (body["id"],)).fetchone()
    assert row == {"osm_type": None, "osm_id": None}


def test_update_bar_replaces_all_fields(client, admin_headers, tag):
    bar_id = client.post("/admin/bars", json=bar_data(tag), headers=admin_headers).json()["id"]

    # Brak opening_hours w żądaniu czyści to pole, bo PUT zastępuje cały bar
    changed = {"name": f"{tag} Bar Nowy", "address": "Rynek 2", "latitude": 51.12, "longitude": 17.04}
    response = client.put(f"/admin/bars/{bar_id}", json=changed, headers=admin_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == f"{tag} Bar Nowy"
    assert body["opening_hours"] is None
    assert body["latitude"] == pytest.approx(51.12)


def test_missing_bar_returns_404(client, admin_headers, tag):
    put = client.put("/admin/bars/999999999", json=bar_data(tag), headers=admin_headers)
    patch = client.patch("/admin/bars/999999999", json={"is_active": False}, headers=admin_headers)

    assert put.status_code == patch.status_code == 404
    assert put.json() == {"detail": "Bar nie istnieje"}


def test_invalid_bar_returns_422(client, admin_headers):
    response = client.post(
        "/admin/bars",
        json={"name": " ", "latitude": 91, "longitude": 181},
        headers=admin_headers,
    )

    assert response.status_code == 422
    fields = {error["loc"][-1] for error in response.json()["detail"]}
    assert fields == {"name", "latitude", "longitude"}


def test_disabled_bar_disappears_from_views(client, admin_headers, tag):
    bar_id = client.post("/admin/bars", json=bar_data(tag), headers=admin_headers).json()["id"]
    drink_id = client.post("/admin/drinks", json=drink_data(tag), headers=admin_headers).json()["id"]
    admin_id = client.get("/auth/me", headers=admin_headers).json()["id"]
    with connect() as conn:
        conn.execute("SELECT report_price(%s, %s, 25, %s)", (bar_id, drink_id, admin_id))

    response = client.patch(f"/admin/bars/{bar_id}", json={"is_active": False}, headers=admin_headers)

    assert response.status_code == 200
    assert response.json()["is_active"] is False
    with connect() as conn:
        # Bar zostaje w tabeli, ale znika z rankingu (v_bar_stats) i z cen (v_current_prices)
        assert conn.execute("SELECT 1 FROM bars WHERE id = %s", (bar_id,)).fetchone() is not None
        assert conn.execute("SELECT 1 FROM v_bar_stats WHERE bar_id = %s", (bar_id,)).fetchone() is None
        assert conn.execute("SELECT 1 FROM v_current_prices WHERE bar_id = %s", (bar_id,)).fetchone() is None
        # PU.02: do wyłączonego baru nie można zgłosić ceny
        with pytest.raises(psycopg.errors.RaiseException):
            conn.execute("SELECT report_price(%s, %s, 25, %s)", (bar_id, drink_id, admin_id))


def test_enabled_bar_returns_to_views(client, admin_headers, tag):
    bar_id = client.post("/admin/bars", json=bar_data(tag), headers=admin_headers).json()["id"]
    client.patch(f"/admin/bars/{bar_id}", json={"is_active": False}, headers=admin_headers)

    response = client.patch(f"/admin/bars/{bar_id}", json={"is_active": True}, headers=admin_headers)

    assert response.json()["is_active"] is True
    with connect() as conn:
        assert conn.execute("SELECT 1 FROM v_bar_stats WHERE bar_id = %s", (bar_id,)).fetchone() is not None


# Napoje

def test_create_drink_returns_drink(client, admin_headers, tag):
    response = client.post("/admin/drinks", json=drink_data(tag), headers=admin_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == f"{tag} Negroni"
    assert body["category"] == "cocktail"
    assert body["volume_ml"] == 200
    assert body["is_active"] is True


def test_duplicate_drink_returns_409(client, admin_headers, tag):
    client.post("/admin/drinks", json=drink_data(tag), headers=admin_headers)

    response = client.post("/admin/drinks", json=drink_data(tag), headers=admin_headers)

    assert response.status_code == 409
    assert response.json() == {"detail": "Napój o tej nazwie i pojemności już istnieje"}


def test_same_drink_with_other_volume_is_allowed(client, admin_headers, tag):
    client.post("/admin/drinks", json=drink_data(tag), headers=admin_headers)

    response = client.post("/admin/drinks", json=drink_data(tag, volume_ml=400), headers=admin_headers)

    assert response.status_code == 201


def test_update_drink_to_existing_returns_409(client, admin_headers, tag):
    client.post("/admin/drinks", json=drink_data(tag), headers=admin_headers)
    other_id = client.post("/admin/drinks", json=drink_data(tag, volume_ml=400), headers=admin_headers).json()["id"]

    response = client.put(f"/admin/drinks/{other_id}", json=drink_data(tag), headers=admin_headers)

    assert response.status_code == 409


def test_update_drink_changes_fields(client, admin_headers, tag):
    drink_id = client.post("/admin/drinks", json=drink_data(tag), headers=admin_headers).json()["id"]

    response = client.put(
        f"/admin/drinks/{drink_id}",
        json=drink_data(tag, category="shot", volume_ml=40),
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert response.json()["category"] == "shot"
    assert response.json()["volume_ml"] == 40


def test_missing_drink_returns_404(client, admin_headers, tag):
    put = client.put("/admin/drinks/999999999", json=drink_data(tag), headers=admin_headers)
    patch = client.patch("/admin/drinks/999999999", json={"is_active": False}, headers=admin_headers)

    assert put.status_code == patch.status_code == 404
    assert put.json() == {"detail": "Napój nie istnieje"}


def test_invalid_drink_returns_422(client, admin_headers):
    response = client.post(
        "/admin/drinks",
        json={"name": "", "category": "vodka", "volume_ml": 0},
        headers=admin_headers,
    )

    assert response.status_code == 422
    fields = {error["loc"][-1] for error in response.json()["detail"]}
    assert fields == {"name", "category", "volume_ml"}


def test_disabled_drink_disappears_from_current_prices(client, admin_headers, tag):
    bar_id = client.post("/admin/bars", json=bar_data(tag), headers=admin_headers).json()["id"]
    drink_id = client.post("/admin/drinks", json=drink_data(tag), headers=admin_headers).json()["id"]
    admin_id = client.get("/auth/me", headers=admin_headers).json()["id"]
    with connect() as conn:
        conn.execute("SELECT report_price(%s, %s, 25, %s)", (bar_id, drink_id, admin_id))

    response = client.patch(f"/admin/drinks/{drink_id}", json={"is_active": False}, headers=admin_headers)

    assert response.json()["is_active"] is False
    with connect() as conn:
        assert conn.execute("SELECT 1 FROM v_current_prices WHERE drink_id = %s", (drink_id,)).fetchone() is None
        with pytest.raises(psycopg.errors.RaiseException):
            conn.execute("SELECT report_price(%s, %s, 25, %s)", (bar_id, drink_id, admin_id))
