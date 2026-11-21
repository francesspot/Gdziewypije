# Testy listy, szczegółów i rankingu barów (WF.01–WF.06, Q2).
# Wymagają działającej bazy (docker compose up -d) i pliku backend/.env.
# Bar, napój, oceny i ceny są tworzone w teście, więc nie zależą od 03_testdata.sql.
import uuid

import pytest

from src.db.connection import connect


@pytest.fixture
def tag():
    value = f"test-{uuid.uuid4().hex[:12]}"
    yield value
    pattern = f"{value}%"
    with connect() as conn:
        conn.execute(
            """
            DELETE FROM price_confirmations
            WHERE price_id IN (
                SELECT id FROM prices
                WHERE bar_id IN (SELECT id FROM bars WHERE name LIKE %s)
                   OR drink_id IN (SELECT id FROM drinks WHERE name LIKE %s)
            )
            """,
            (pattern, pattern),
        )
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


def insert_bar(name, is_active=True):
    with connect() as conn:
        return conn.execute(
            """
            INSERT INTO bars (name, address, opening_hours, location, is_active)
            VALUES (%s, 'Rynek 1', 'Mo-Su 12:00-02:00', ST_Point(17.03, 51.11, 4326), %s)
            RETURNING id
            """,
            (name, is_active),
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


def insert_price(bar_id, drink_id, user_id, amount):
    with connect() as conn:
        conn.execute(
            "SELECT report_price(%s::integer, %s::integer, %s::numeric, %s::integer)",
            (bar_id, drink_id, amount, user_id),
        )


def insert_rating(user_id, bar_id, value):
    with connect() as conn:
        conn.execute(
            "INSERT INTO ratings (user_id, bar_id, value) VALUES (%s, %s, %s)",
            (user_id, bar_id, value),
        )


def named(items, name):
    return next(item for item in items if item["name"] == name)


def test_list_bars_includes_rating_and_empty_prices_as_missing_data(client, tag):
    with_price = insert_bar(f"{tag} Z cena")
    without_price = insert_bar(f"{tag} Bez ceny")
    insert_bar(f"{tag} Wylaczony", is_active=False)
    drink = insert_drink(f"{tag} Piwo")
    user_id = insert_user(f"{tag}@test.pl")
    insert_price(with_price, drink, user_id, 12.50)
    insert_rating(user_id, with_price, 4)

    response = client.get("/bars")
    names = [bar["name"] for bar in response.json()]

    assert response.status_code == 200
    assert f"{tag} Wylaczony" not in names
    priced = named(response.json(), f"{tag} Z cena")
    empty = named(response.json(), f"{tag} Bez ceny")
    assert priced["avg_rating"] == 4.0
    assert priced["ratings_count"] == 1
    assert priced["prices"][0]["amount"] == 12.5
    assert empty["prices"] == []
    assert empty["avg_rating"] is None
    assert empty["ratings_count"] == 0


def test_get_bar_returns_details_and_404_when_missing_or_disabled(client, tag):
    bar_id = insert_bar(f"{tag} Szczegoly")
    disabled_id = insert_bar(f"{tag} Wylaczony", is_active=False)

    found = client.get(f"/bars/{bar_id}")
    missing = client.get("/bars/2147483647")
    disabled = client.get(f"/bars/{disabled_id}")

    assert found.status_code == 200
    assert found.json()["name"] == f"{tag} Szczegoly"
    assert found.json()["address"] == "Rynek 1"
    assert found.json()["prices"] == []
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Bar nie istnieje lub jest wyłączony"
    assert disabled.status_code == 404
    assert disabled.json()["detail"] == "Bar nie istnieje lub jest wyłączony"


def test_list_bars_filters_by_name_case_insensitive(client, tag):
    insert_bar(f"{tag} Piwnica")
    insert_bar(f"{tag} Ratusz")

    # q zawiera unikalny tag, żeby nie złapać barów z 03_testdata.sql (np. Piwnica Kupiecka)
    response = client.get("/bars", params={"q": f"{tag} piwn"})

    assert response.status_code == 200
    names = [bar["name"] for bar in response.json()]
    assert names == [f"{tag} Piwnica"]


@pytest.mark.parametrize("q", ["", "   "])
def test_list_bars_blank_query_returns_all_active_bars(client, tag, q):
    insert_bar(f"{tag} Alfa")
    insert_bar(f"{tag} Beta")

    response = client.get("/bars", params={"q": q})
    names = [bar["name"] for bar in response.json()]

    assert response.status_code == 200
    assert f"{tag} Alfa" in names
    assert f"{tag} Beta" in names


def test_list_bars_treats_percent_and_underscore_as_literal(client, tag):
    underscore = insert_bar(f"{tag} A_B")
    insert_bar(f"{tag} AXB")
    percent = insert_bar(f"{tag} 100%")
    insert_bar(f"{tag} 1000")

    by_underscore = client.get("/bars", params={"q": f"{tag} A_B"})
    by_percent = client.get("/bars", params={"q": f"{tag} 100%"})

    assert [bar["id"] for bar in by_underscore.json()] == [underscore]
    assert [bar["id"] for bar in by_percent.json()] == [percent]


def test_ranking_puts_many_good_ratings_ahead_of_single_five(client, tag):
    many = insert_bar(f"{tag} Dużo dobrych")
    single = insert_bar(f"{tag} Jedna piatka")
    unrated = insert_bar(f"{tag} Bez ocen")
    users = [insert_user(f"{tag}-{i}@test.pl") for i in range(8)]
    for user_id in users:
        insert_rating(user_id, many, 5)
    insert_rating(users[0], single, 5)

    response = client.get("/ranking")
    rows = [bar for bar in response.json() if bar["name"].startswith(tag)]
    by_name = {bar["name"]: bar for bar in rows}

    assert response.status_code == 200
    assert f"{tag} Bez ocen" not in [bar["name"] for bar in response.json()]
    assert by_name[f"{tag} Jedna piatka"]["weighted_score"] == 3.33
    assert by_name[f"{tag} Dużo dobrych"]["rank"] < by_name[f"{tag} Jedna piatka"]["rank"]


def test_ranking_omits_disabled_bar(client, tag):
    active = insert_bar(f"{tag} Aktywny")
    disabled = insert_bar(f"{tag} Wylaczony ranking", is_active=False)
    user_id = insert_user(f"{tag}-rank@test.pl")
    insert_rating(user_id, active, 4)
    insert_rating(user_id, disabled, 5)

    response = client.get("/ranking")
    names = [bar["name"] for bar in response.json()]

    assert response.status_code == 200
    assert f"{tag} Aktywny" in names
    assert f"{tag} Wylaczony ranking" not in names
