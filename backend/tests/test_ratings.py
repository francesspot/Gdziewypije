# Testy oceny baru (T4, PU.04): zastąpienie, 422 poza 1–5, 401, 404.
# Wymagają działającej bazy (docker compose up -d) i pliku backend/.env.
import uuid

import pytest

from src.db.connection import connect


@pytest.fixture
def bar():
    with connect() as conn:
        bar_id = conn.execute(
            "INSERT INTO bars (name, location) VALUES ('Bar oceny', ST_Point(17.03, 51.11, 4326)) RETURNING id"
        ).fetchone()["id"]
    yield bar_id
    with connect() as conn:
        conn.execute("DELETE FROM ratings WHERE bar_id = %s", (bar_id,))
        conn.execute("DELETE FROM bars WHERE id = %s", (bar_id,))


def create_user(client):
    email = f"test-{uuid.uuid4().hex[:12]}@test.pl"
    body = client.post(
        "/auth/register",
        json={"email": email, "password": "tajnehaslo", "display_name": "Tester"},
    ).json()
    return {"id": body["user"]["id"], "headers": {"Authorization": f"Bearer {body['access_token']}"}}


def delete_user(user_id):
    with connect() as conn:
        conn.execute("DELETE FROM ratings WHERE user_id = %s", (user_id,))
        conn.execute("DELETE FROM user_profiles WHERE user_id = %s", (user_id,))
        conn.execute("DELETE FROM users WHERE id = %s", (user_id,))


@pytest.fixture
def user(client):
    created = create_user(client)
    yield created
    delete_user(created["id"])


@pytest.fixture
def other_user(client):
    created = create_user(client)
    yield created
    delete_user(created["id"])


def stored_ratings(bar_id):
    with connect() as conn:
        return conn.execute(
            "SELECT user_id, bar_id, value FROM ratings WHERE bar_id = %s ORDER BY user_id",
            (bar_id,),
        ).fetchall()


def test_second_rating_from_same_user_replaces_first(client, bar, user):
    first = client.put(f"/bars/{bar}/rating", json={"value": 5}, headers=user["headers"])
    second = client.put(f"/bars/{bar}/rating", json={"value": 3}, headers=user["headers"])
    rows = stored_ratings(bar)

    assert first.status_code == 200
    assert first.json() == {"user_id": user["id"], "bar_id": bar, "value": 5}
    assert second.status_code == 200
    assert second.json() == {"user_id": user["id"], "bar_id": bar, "value": 3}
    assert rows == [{"user_id": user["id"], "bar_id": bar, "value": 3}]


@pytest.mark.parametrize(
    "body",
    [
        {"value": 0},
        {"value": 6},
        {},
        {"value": True},
        {"value": "5"},
        {"value": 1.5},
        {"value": 5.0},
    ],
)
def test_rating_outside_1_to_5_returns_422(client, bar, user, body):
    response = client.put(f"/bars/{bar}/rating", json=body, headers=user["headers"])

    assert response.status_code == 422
    assert any(error["loc"][-1] == "value" for error in response.json()["detail"])
    assert stored_ratings(bar) == []


def test_rating_accepts_lower_bound(client, bar, user):
    response = client.put(f"/bars/{bar}/rating", json={"value": 1}, headers=user["headers"])

    assert response.status_code == 200
    assert response.json()["value"] == 1
    assert stored_ratings(bar) == [{"user_id": user["id"], "bar_id": bar, "value": 1}]


def test_rating_without_token_returns_401(client, bar):
    response = client.put(f"/bars/{bar}/rating", json={"value": 4})

    assert response.status_code == 401
    assert response.json()["detail"] == "Wymagane zalogowanie"


def test_rating_missing_or_disabled_bar_returns_404(client, user):
    with connect() as conn:
        disabled_id = conn.execute(
            """
            INSERT INTO bars (name, location, is_active)
            VALUES ('Bar wylaczony oceny', ST_Point(17.03, 51.11, 4326), false)
            RETURNING id
            """
        ).fetchone()["id"]
    try:
        missing = client.put("/bars/2147483647/rating", json={"value": 4}, headers=user["headers"])
        disabled = client.put(f"/bars/{disabled_id}/rating", json={"value": 4}, headers=user["headers"])
    finally:
        with connect() as conn:
            conn.execute("DELETE FROM ratings WHERE bar_id = %s", (disabled_id,))
            conn.execute("DELETE FROM bars WHERE id = %s", (disabled_id,))

    assert missing.status_code == 404
    assert missing.json()["detail"] == "Bar nie istnieje lub jest wyłączony"
    assert disabled.status_code == 404
    assert disabled.json()["detail"] == "Bar nie istnieje lub jest wyłączony"


def test_two_users_can_rate_the_same_bar(client, bar, user, other_user):
    first = client.put(f"/bars/{bar}/rating", json={"value": 5}, headers=user["headers"])
    second = client.put(f"/bars/{bar}/rating", json={"value": 2}, headers=other_user["headers"])
    rows = stored_ratings(bar)

    assert first.status_code == 200
    assert second.status_code == 200
    assert len(rows) == 2
    assert {row["user_id"] for row in rows} == {user["id"], other_user["id"]}
    assert {row["value"] for row in rows} == {5, 2}
