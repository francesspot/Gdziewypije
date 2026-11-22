# Testy barów w pobliżu (Q1, WF.17): ST_DWithin, sortowanie, 422 przy złych współrzędnych.
# Wymagają działającej bazy (docker compose up -d) i pliku backend/.env.
import uuid

import pytest

from src.db.connection import connect

# Punkt z przykładu Q1 (okolice Rynku)
ORIGIN = {"lat": 51.110, "lon": 17.032, "radius_m": 2000}


@pytest.fixture
def tag():
    value = f"test-{uuid.uuid4().hex[:12]}"
    yield value
    pattern = f"{value}%"
    with connect() as conn:
        conn.execute(
            """
            DELETE FROM prices
            WHERE bar_id IN (SELECT id FROM bars WHERE name LIKE %s)
               OR drink_id IN (SELECT id FROM drinks WHERE name LIKE %s)
            """,
            (pattern, pattern),
        )
        conn.execute(
            "DELETE FROM ratings WHERE bar_id IN (SELECT id FROM bars WHERE name LIKE %s)",
            (pattern,),
        )
        conn.execute("DELETE FROM bars WHERE name LIKE %s", (pattern,))
        conn.execute("DELETE FROM drinks WHERE name LIKE %s", (pattern,))
        conn.execute(
            "DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s)",
            (pattern,),
        )
        conn.execute("DELETE FROM users WHERE email LIKE %s", (pattern,))


def insert_bar(name, lon, lat, is_active=True):
    with connect() as conn:
        return conn.execute(
            """
            INSERT INTO bars (name, location, is_active)
            VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
            RETURNING id
            """,
            (name, lon, lat, is_active),
        ).fetchone()["id"]


def insert_drink(name):
    with connect() as conn:
        return conn.execute(
            "INSERT INTO drinks (name, category, volume_ml) VALUES (%s, 'beer', 500) RETURNING id",
            (name,),
        ).fetchone()["id"]


def insert_user(email):
    with connect() as conn:
        return conn.execute(
            "SELECT register_user(%s, 'test-hash', 'Tester') AS id",
            (email,),
        ).fetchone()["id"]


def nearby(client, **changes):
    params = {**ORIGIN, **changes}
    return client.get("/nearby", params=params)


def names_for_tag(response, tag):
    return [bar["name"] for bar in response.json() if bar["name"].startswith(tag)]


def test_nearby_returns_bars_inside_radius_sorted_by_distance(client, tag):
    close = insert_bar(f"{tag} Blisko", 17.032, 51.110)
    mid = insert_bar(f"{tag} Sredni", 17.0335, 51.1095)
    insert_bar(f"{tag} Daleko", 17.0800, 51.1300)
    drink = insert_drink(f"{tag} Piwo")
    user_id = insert_user(f"{tag}@test.pl")
    with connect() as conn:
        conn.execute(
            "SELECT report_price(%s::integer, %s::integer, %s::numeric, %s::integer)",
            (close, drink, 12.50, user_id),
        )
        conn.execute(
            "INSERT INTO ratings (user_id, bar_id, value) VALUES (%s, %s, 4)",
            (user_id, close),
        )

    response = nearby(client)
    rows = [bar for bar in response.json() if bar["name"].startswith(tag)]
    close_bar = next(bar for bar in rows if bar["id"] == close)

    assert response.status_code == 200
    assert [bar["id"] for bar in rows] == [close, mid]
    assert rows[0]["distance_m"] < rows[1]["distance_m"]
    assert f"{tag} Daleko" not in names_for_tag(response, tag)
    assert close_bar["prices"][0]["amount"] == 12.5
    assert close_bar["avg_rating"] == 4.0
    assert close_bar["ratings_count"] == 1
    assert close_bar["weighted_score"] is not None
    mid_bar = next(bar for bar in rows if bar["id"] == mid)
    assert mid_bar["prices"] == []
    assert mid_bar["avg_rating"] is None
    assert mid_bar["ratings_count"] == 0
    assert mid_bar["weighted_score"] is None


@pytest.mark.parametrize(
    "params, loc",
    [
        ({**ORIGIN, "lat": 91}, "lat"),
        ({**ORIGIN, "lat": -91}, "lat"),
        ({**ORIGIN, "lon": 181}, "lon"),
        ({**ORIGIN, "lon": -181}, "lon"),
        ({**ORIGIN, "radius_m": 0}, "radius_m"),
        ({**ORIGIN, "radius_m": -10}, "radius_m"),
        ({**ORIGIN, "radius_m": 10_001}, "radius_m"),
        ({**ORIGIN, "radius_m": "inf"}, "radius_m"),
        ({"lat": 51.110, "lon": 17.032}, "radius_m"),
        ({"lon": 17.032, "radius_m": 2000}, "lat"),
        ({"lat": 51.110, "radius_m": 2000}, "lon"),
    ],
)
def test_nearby_rejects_invalid_coordinates_with_422(client, params, loc):
    response = client.get("/nearby", params=params)
    fields = [error["loc"][-1] for error in response.json()["detail"]]

    assert response.status_code == 422
    assert loc in fields


def test_nearby_omits_disabled_bar_inside_radius(client, tag):
    insert_bar(f"{tag} Aktywny", 17.032, 51.110)
    insert_bar(f"{tag} Wylaczony", 17.032, 51.110, is_active=False)

    response = nearby(client)
    found = names_for_tag(response, tag)

    assert response.status_code == 200
    assert found == [f"{tag} Aktywny"]


def test_nearby_returns_empty_list_when_nothing_in_radius(client):
    # Punkt z dala od Wrocławia, żeby seed i OSM nie weszły w promień
    response = nearby(client, lat=0, lon=0, radius_m=100)

    assert response.status_code == 200
    assert response.json() == []
