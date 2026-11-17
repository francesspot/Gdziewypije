# Testy importu barów z OSM (WNF.10): parsowanie Overpass i zapis bez duplikatów.
# Testy zapisu wymagają działającej bazy i cofają transakcję, więc nic nie zostaje w bazie.
import io
import json
from unittest.mock import patch

import pytest

from src.db.connection import connect
from src.import_bars import fetch_elements, parse_element, parse_elements, save_bars


def test_parse_node_maps_tags_to_bar_fields():
    bar = parse_element(
        {
            "type": "node",
            "id": 1001,
            "lat": 51.11,
            "lon": 17.032,
            "tags": {
                "amenity": "bar",
                "name": "Pod Ratuszem",
                "addr:street": "Rynek",
                "addr:housenumber": "1",
                "opening_hours": "Mo-Su 12:00-02:00",
            },
        }
    )

    assert bar == {
        "osm_type": "node",
        "osm_id": 1001,
        "name": "Pod Ratuszem",
        "address": "Rynek 1",
        "opening_hours": "Mo-Su 12:00-02:00",
        "latitude": 51.11,
        "longitude": 17.032,
    }


def test_parse_way_uses_center_point():
    bar = parse_element(
        {
            "type": "way",
            "id": 2002,
            "center": {"lat": 51.109, "lon": 17.031},
            "tags": {"amenity": "pub", "name": "Piwnica", "addr:street": "Kuźnicza"},
        }
    )

    assert bar["osm_type"] == "way"
    assert bar["osm_id"] == 2002
    assert bar["address"] == "Kuźnicza"
    assert bar["opening_hours"] is None
    assert bar["latitude"] == 51.109
    assert bar["longitude"] == 17.031


def test_parse_relation_uses_center_point():
    bar = parse_element(
        {
            "type": "relation",
            "id": 3003,
            "center": {"lat": 51.1, "lon": 17.02},
            "tags": {"name": "Spółdzielnia", "addr:housenumber": "4"},
        }
    )

    assert bar["osm_type"] == "relation"
    assert bar["address"] == "4"
    assert bar["latitude"] == 51.1
    assert bar["longitude"] == 17.02


@pytest.mark.parametrize(
    "element",
    [
        {"type": "node", "id": 1, "lat": 51.1, "lon": 17.0, "tags": {"amenity": "bar"}},
        {"type": "node", "id": 2, "lat": 51.1, "lon": 17.0, "tags": {"name": "  "}},
        {"type": "way", "id": 3, "tags": {"name": "Bez punktu"}},
        {"type": "node", "id": "4", "lat": 51.1, "lon": 17.0, "tags": {"name": "Zly id"}},
        {"type": "area", "id": 5, "lat": 51.1, "lon": 17.0, "tags": {"name": "Zly typ"}},
    ],
)
def test_parse_element_skips_bar_without_name_or_point(element):
    assert parse_element(element) is None


def test_parse_elements_keeps_only_complete_bars():
    bars = parse_elements(
        [
            {"type": "node", "id": 1, "lat": 51.1, "lon": 17.0, "tags": {"name": "A"}},
            {"type": "node", "id": 2, "lat": 51.1, "lon": 17.0, "tags": {}},
            {
                "type": "way",
                "id": 3,
                "center": {"lat": 51.2, "lon": 17.1},
                "tags": {"name": "B"},
            },
        ]
    )

    assert [bar["name"] for bar in bars] == ["A", "B"]


@pytest.fixture
def db():
    # Transakcja testu jest cofana, także gdy asercja nie przejdzie
    conn = connect()
    try:
        yield conn
    finally:
        conn.rollback()
        conn.close()


def _bar(osm_id, **changes):
    # Ujemne osm_id nie występuje w OSM, więc test nie zderzy się z prawdziwym barem
    return {
        "osm_type": "node",
        "osm_id": osm_id,
        "name": f"Test Import {osm_id}",
        "address": "Rynek 1",
        "opening_hours": "Mo-Su 12:00-02:00",
        "latitude": 51.11,
        "longitude": 17.03,
        **changes,
    }


def _stored(conn, osm_id):
    return conn.execute(
        """
        SELECT id, name, address, opening_hours, is_active,
               ST_Y(location::geometry) AS latitude,
               ST_X(location::geometry) AS longitude
        FROM bars
        WHERE osm_type = 'node' AND osm_id = %s
        """,
        (osm_id,),
    ).fetchone()


def test_save_bars_updates_same_row_and_deactivates_missing_one(db):
    kept_id = -91001
    gone_id = -91002
    # Wyłączenie dotyczy każdego aktywnego baru OSM spoza listy, nie tylko barów z tego testu
    active_before = db.execute(
        "SELECT count(*) AS n FROM bars WHERE osm_type IS NOT NULL AND is_active"
    ).fetchone()["n"]
    first = save_bars(db, [_bar(kept_id), _bar(gone_id, name="Znika")])
    kept = _stored(db, kept_id)

    assert first["inserted"] == 2
    assert first["updated"] == 0
    assert first["deactivated"] == active_before
    assert kept["latitude"] == pytest.approx(51.11)
    assert kept["longitude"] == pytest.approx(17.03)

    changed = _bar(kept_id, name="Nowa nazwa", address="Odrzańska 2", opening_hours=None, latitude=51.12)
    second = save_bars(db, [changed])
    kept_again = _stored(db, kept_id)
    gone = _stored(db, gone_id)

    assert second["inserted"] == 0
    assert second["updated"] == 1
    assert second["deactivated"] == 1
    assert kept_again["id"] == kept["id"]
    assert kept_again["name"] == "Nowa nazwa"
    assert kept_again["address"] == "Odrzańska 2"
    assert kept_again["opening_hours"] is None
    assert kept_again["is_active"] is True
    assert kept_again["latitude"] == pytest.approx(51.12)
    assert gone["is_active"] is False

    # Powrót w OSM nie włącza baru wyłączonego wcześniejszym importem (WB.11)
    third = save_bars(db, [_bar(kept_id), _bar(gone_id)])
    assert third["inserted"] == 0
    assert _stored(db, gone_id)["is_active"] is False


def test_save_bars_leaves_manual_bar_active(db):
    manual_id = db.execute(
        """
        INSERT INTO bars (name, location)
        VALUES ('Test Import reczny', ST_SetSRID(ST_MakePoint(17.03, 51.11), 4326)::geography)
        RETURNING id
        """
    ).fetchone()["id"]

    save_bars(db, [_bar(-91003)])

    manual = db.execute(
        "SELECT is_active, osm_type, osm_id FROM bars WHERE id = %s",
        (manual_id,),
    ).fetchone()
    assert manual == {"is_active": True, "osm_type": None, "osm_id": None}


def test_save_bars_rejects_empty_list(db):
    db.execute(
        """
        INSERT INTO bars (osm_type, osm_id, name, location)
        VALUES ('node', -91004, 'Test Import zostaje',
                ST_SetSRID(ST_MakePoint(17.03, 51.11), 4326)::geography)
        """
    )

    with pytest.raises(ValueError):
        save_bars(db, [])

    row = _stored(db, -91004)
    assert row["is_active"] is True


def test_save_bars_keeps_admin_disabled_osm_bar_inactive(db):
    osm_id = -91005
    save_bars(db, [_bar(osm_id)])
    db.execute(
        "UPDATE bars SET is_active = false WHERE osm_type = 'node' AND osm_id = %s",
        (osm_id,),
    )

    save_bars(db, [_bar(osm_id, name="Po imporcie")])
    row = _stored(db, osm_id)

    assert row["is_active"] is False
    assert row["name"] == "Po imporcie"


class _FakeOverpassResponse:
    def __init__(self, payload):
        self._body = io.BytesIO(json.dumps(payload).encode())

    def __enter__(self):
        return self._body

    def __exit__(self, exc_type, exc, tb):
        return False


def test_fetch_elements_rejects_overpass_remark():
    payload = {
        "remark": "runtime error: Query timed out after 90 seconds.",
        "elements": [
            {"type": "node", "id": 1, "lat": 51.1, "lon": 17.0, "tags": {"name": "X"}},
        ],
    }

    with patch("src.import_bars.urllib.request.urlopen", return_value=_FakeOverpassResponse(payload)):
        with pytest.raises(RuntimeError, match="Overpass zwrócił błąd"):
            fetch_elements("https://overpass-api.de/api/interpreter")


def test_fetch_elements_rejects_empty_elements():
    with patch(
        "src.import_bars.urllib.request.urlopen",
        return_value=_FakeOverpassResponse({"elements": []}),
    ):
        with pytest.raises(RuntimeError, match="nie zwrócił żadnych barów"):
            fetch_elements("https://overpass-api.de/api/interpreter")


def test_fetch_elements_rejects_non_https_url():
    with pytest.raises(ValueError, match="HTTPS"):
        fetch_elements("http://overpass-api.de/api/interpreter")
