# Testy ulubionych (T5, WF.14, WF.15): dodanie, duplikat 409, lista tylko swojej osoby.
# Wymagają działającej bazy (docker compose up -d) i pliku backend/.env.
import uuid

import pytest

from src.db.connection import connect


@pytest.fixture
def bar():
    with connect() as conn:
        bar_id = conn.execute(
            "INSERT INTO bars (name, location) VALUES ('Bar ulubione', ST_Point(17.03, 51.11, 4326)) RETURNING id"
        ).fetchone()["id"]
    yield bar_id
    with connect() as conn:
        conn.execute("DELETE FROM favorites WHERE bar_id = %s", (bar_id,))
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
        conn.execute("DELETE FROM favorites WHERE user_id = %s", (user_id,))
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


def test_add_favorite_then_duplicate_returns_409(client, bar, user):
    first = client.post(f"/bars/{bar}/favorite", headers=user["headers"])
    second = client.post(f"/bars/{bar}/favorite", headers=user["headers"])

    assert first.status_code == 201
    assert first.json()["user_id"] == user["id"]
    assert first.json()["bar_id"] == bar
    assert second.status_code == 409
    assert second.json()["detail"] == "Bar jest już w ulubionych"


def test_list_favorites_contains_only_current_user_bars(client, bar, user, other_user):
    with connect() as conn:
        other_bar = conn.execute(
            "INSERT INTO bars (name, location) VALUES ('Bar cudzy', ST_Point(17.04, 51.11, 4326)) RETURNING id"
        ).fetchone()["id"]
    try:
        client.post(f"/bars/{bar}/favorite", headers=user["headers"])
        client.post(f"/bars/{other_bar}/favorite", headers=other_user["headers"])
        mine = client.get("/favorites", headers=user["headers"])
        theirs = client.get("/favorites", headers=other_user["headers"])
    finally:
        with connect() as conn:
            conn.execute("DELETE FROM favorites WHERE bar_id = %s", (other_bar,))
            conn.execute("DELETE FROM bars WHERE id = %s", (other_bar,))

    assert mine.status_code == 200
    assert [item["bar_id"] for item in mine.json()] == [bar]
    assert all(item["user_id"] == user["id"] for item in mine.json())
    assert [item["bar_id"] for item in theirs.json()] == [other_bar]


def test_remove_favorite_and_missing_returns_404(client, bar, user):
    client.post(f"/bars/{bar}/favorite", headers=user["headers"])
    removed = client.delete(f"/bars/{bar}/favorite", headers=user["headers"])
    again = client.delete(f"/bars/{bar}/favorite", headers=user["headers"])
    listed = client.get("/favorites", headers=user["headers"])

    assert removed.status_code == 204
    assert again.status_code == 404
    assert again.json()["detail"] == "Bar nie jest w ulubionych"
    assert listed.json() == []


def test_favorites_without_token_return_401(client, bar):
    add = client.post(f"/bars/{bar}/favorite")
    listed = client.get("/favorites")
    removed = client.delete(f"/bars/{bar}/favorite")

    assert add.status_code == 401
    assert listed.status_code == 401
    assert removed.status_code == 401
    assert add.json()["detail"] == "Wymagane zalogowanie"


def test_add_favorite_for_disabled_bar_returns_404(client, user):
    with connect() as conn:
        disabled_id = conn.execute(
            """
            INSERT INTO bars (name, location, is_active)
            VALUES ('Bar wylaczony ulubione', ST_Point(17.03, 51.11, 4326), false)
            RETURNING id
            """
        ).fetchone()["id"]
    try:
        response = client.post(f"/bars/{disabled_id}/favorite", headers=user["headers"])
    finally:
        with connect() as conn:
            conn.execute("DELETE FROM favorites WHERE bar_id = %s", (disabled_id,))
            conn.execute("DELETE FROM bars WHERE id = %s", (disabled_id,))

    assert response.status_code == 404
    assert response.json()["detail"] == "Bar nie istnieje lub jest wyłączony"


def test_list_favorites_omits_disabled_bar(client, bar, user):
    client.post(f"/bars/{bar}/favorite", headers=user["headers"])
    with connect() as conn:
        conn.execute("UPDATE bars SET is_active = false WHERE id = %s", (bar,))
    listed = client.get("/favorites", headers=user["headers"])
    with connect() as conn:
        conn.execute("UPDATE bars SET is_active = true WHERE id = %s", (bar,))

    assert listed.status_code == 200
    assert listed.json() == []


def test_add_favorite_for_missing_bar_returns_404(client, user):
    response = client.post("/bars/2147483647/favorite", headers=user["headers"])

    assert response.status_code == 404
    assert response.json()["detail"] == "Bar nie istnieje lub jest wyłączony"


def test_user_cannot_remove_another_users_favorite(client, bar, user, other_user):
    client.post(f"/bars/{bar}/favorite", headers=other_user["headers"])
    removed = client.delete(f"/bars/{bar}/favorite", headers=user["headers"])
    listed = client.get("/favorites", headers=other_user["headers"])

    assert removed.status_code == 404
    assert removed.json()["detail"] == "Bar nie jest w ulubionych"
    assert [item["bar_id"] for item in listed.json()] == [bar]
