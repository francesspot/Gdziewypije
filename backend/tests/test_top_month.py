# Testy top 3 miesiąca (Q3, WF.16): wynik jak v_top_month LIMIT 3, pusta lista bez błędu.
# Wymagają działającej bazy (docker compose up -d) i pliku backend/.env.
import uuid

import pytest

from src.db.connection import connect, get_connection
from src.main import app


@pytest.fixture
def tag():
    value = f"test-{uuid.uuid4().hex[:12]}"
    yield value
    pattern = f"{value}%"
    with connect() as conn:
        conn.execute(
            "DELETE FROM ratings WHERE bar_id IN (SELECT id FROM bars WHERE name LIKE %s)",
            (pattern,),
        )
        conn.execute(
            "DELETE FROM favorites WHERE bar_id IN (SELECT id FROM bars WHERE name LIKE %s)",
            (pattern,),
        )
        conn.execute("DELETE FROM bars WHERE name LIKE %s", (pattern,))
        conn.execute(
            "DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s)",
            (pattern,),
        )
        conn.execute("DELETE FROM users WHERE email LIKE %s", (pattern,))


def insert_bar(name):
    with connect() as conn:
        return conn.execute(
            "INSERT INTO bars (name, location) VALUES (%s, ST_Point(17.03, 51.11, 4326)) RETURNING id",
            (name,),
        ).fetchone()["id"]


def insert_user(email):
    with connect() as conn:
        return conn.execute(
            "SELECT register_user(%s, 'test-hash', 'Tester') AS id",
            (email,),
        ).fetchone()["id"]


def q3_rows():
    with connect() as conn:
        rows = conn.execute(
            "SELECT bar_id, name, activity, avg_rating FROM v_top_month LIMIT 3"
        ).fetchall()
    result = []
    for row in rows:
        rating = row["avg_rating"]
        result.append(
            {
                "bar_id": row["bar_id"],
                "name": row["name"],
                "activity": int(row["activity"]),
                "avg_rating": None if rating is None else float(rating),
            }
        )
    return result


def test_top_month_matches_q3_and_is_at_most_three(client):
    response = client.get("/top-month")

    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) <= 3
    assert response.json() == q3_rows()


def test_top_month_omits_bar_with_fewer_than_three_events(client, tag):
    bar_id = insert_bar(f"{tag} Za malo")
    users = [insert_user(f"{tag}-{i}@test.pl") for i in range(2)]
    with connect() as conn:
        conn.execute(
            "INSERT INTO ratings (user_id, bar_id, value) VALUES (%s, %s, 5), (%s, %s, 4)",
            (users[0], bar_id, users[1], bar_id),
        )

    response = client.get("/top-month")
    names = [bar["name"] for bar in response.json()]

    assert response.status_code == 200
    assert f"{tag} Za malo" not in names


def test_top_month_includes_bar_with_three_events_this_month(client, tag):
    bar_id = insert_bar(f"{tag} Trzy zdarzenia")
    users = [insert_user(f"{tag}-{i}@test.pl") for i in range(3)]
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO ratings (user_id, bar_id, value) VALUES (%s, %s, 5), (%s, %s, 5)
            """,
            (users[0], bar_id, users[1], bar_id),
        )
        conn.execute(
            "INSERT INTO favorites (user_id, bar_id) VALUES (%s, %s)",
            (users[2], bar_id),
        )
        in_view = conn.execute(
            "SELECT activity FROM v_top_month WHERE bar_id = %s",
            (bar_id,),
        ).fetchone()

    response = client.get("/top-month")

    assert in_view is not None
    assert int(in_view["activity"]) == 3
    assert response.status_code == 200
    assert response.json() == q3_rows()


def test_top_month_empty_list_when_no_active_bars(client):
    # Bary wyłącza się w transakcji bez zatwierdzenia, więc po teście baza zostaje bez zmian
    def connection_without_bars():
        with connect() as conn:
            conn.execute("UPDATE bars SET is_active = false")
            yield conn
            conn.rollback()

    app.dependency_overrides[get_connection] = connection_without_bars
    try:
        response = client.get("/top-month")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == []


def test_top_month_omits_disabled_bar_and_last_month_events(client, tag):
    disabled_id = insert_bar(f"{tag} Wylaczony top")
    old_id = insert_bar(f"{tag} Stary miesiac")
    users = [insert_user(f"{tag}-d{i}@test.pl") for i in range(3)]
    extra = [insert_user(f"{tag}-o{i}@test.pl") for i in range(3)]
    with connect() as conn:
        conn.execute("UPDATE bars SET is_active = false WHERE id = %s", (disabled_id,))
        for user_id in users:
            conn.execute(
                "INSERT INTO ratings (user_id, bar_id, value) VALUES (%s, %s, 5)",
                (user_id, disabled_id),
            )
        for user_id in extra:
            # INSERT omija wyzwalacz updated_at, więc data zostaje z poprzedniego miesiąca
            conn.execute(
                """
                INSERT INTO ratings (user_id, bar_id, value, created_at, updated_at)
                VALUES (%s, %s, 5, now() - interval '2 months', now() - interval '2 months')
                """,
                (user_id, old_id),
            )

    response = client.get("/top-month")
    names = [bar["name"] for bar in response.json()]

    assert response.status_code == 200
    assert f"{tag} Wylaczony top" not in names
    assert f"{tag} Stary miesiac" not in names
