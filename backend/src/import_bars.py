# Import barów Wrocławia z Overpass API do tabeli bars (WNF.09, WNF.10).
# Uruchomienie z katalogu backend/: python -m src.import_bars
import json
import time
import urllib.error
import urllib.parse
import urllib.request

from src.config import get_settings
from src.db.connection import connect

# Identyfikacja klienta wymagana przez politykę użycia Overpass
USER_AGENT = "Gdziewypije/1.0 (OSM bar import; student project)"
TIMEOUT_SECONDS = 90

# amenity=bar daje około 66 miejsc. Puby w OSM to też bary, razem jest ich około 150
# (tyle zakłada raport etapu 2). out center dodaje punkt drogom i relacjom.
OVERPASS_QUERY = """
[out:json][timeout:90];
area["name"="Wrocław"]["boundary"="administrative"]["admin_level"="8"]->.wroclaw;
(
  nwr["amenity"="bar"](area.wroclaw);
  nwr["amenity"="pub"](area.wroclaw);
);
out center;
"""


def parse_element(element: dict) -> dict | None:
    """Zamienia obiekt Overpass na pola tabeli bars.

    Zwraca None, gdy obiektu nie da się zapisać: zły typ, brak nazwy albo brak punktu.
    Kolumny name i location są NOT NULL.
    """
    osm_type = element.get("type")
    osm_id = element.get("id")
    if osm_type not in ("node", "way", "relation") or not isinstance(osm_id, int):
        return None

    tags = element.get("tags") or {}
    name = str(tags.get("name") or "").strip()
    if not name:
        return None

    point = _point(element)
    if point is None:
        return None
    latitude, longitude = point

    opening_hours = str(tags.get("opening_hours") or "").strip() or None
    return {
        "osm_type": osm_type,
        "osm_id": osm_id,
        "name": name,
        "address": _address(tags),
        "opening_hours": opening_hours,
        "latitude": latitude,
        "longitude": longitude,
    }


def parse_elements(elements: list) -> list[dict]:
    # Pomija obiekty bez nazwy lub bez współrzędnych
    bars = []
    for element in elements:
        bar = parse_element(element)
        if bar is not None:
            bars.append(bar)
    return bars


def fetch_elements(url: str) -> list[dict]:
    """Pobiera obiekty z Overpass. Pusta odpowiedź jest błędem, nic nie zapisuje.

    Publiczny Overpass czasem zwraca 429 albo 502. Do trzech prób z przerwą.
    Przy błędzie nic nie jest zapisywane.
    """
    attempt = 0
    while True:
        try:
            return _fetch_once(url)
        except urllib.error.HTTPError as error:
            # Ostatnia próba kończy import wyjątkiem, baza zostaje bez zmian
            if error.code not in (429, 502, 503, 504) or attempt == 2:
                raise
            attempt += 1
            time.sleep(5 * attempt)


def _fetch_once(url: str) -> list[dict]:
    body = urllib.parse.urlencode({"data": OVERPASS_QUERY}).encode()
    request = urllib.request.Request(
        url,
        data=body,
        headers={"User-Agent": USER_AGENT},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        payload = json.load(response)

    elements = payload.get("elements") if isinstance(payload, dict) else None
    if not elements:
        raise RuntimeError("Overpass nie zwrócił żadnych barów")
    return elements


def save_bars(conn, bars: list[dict]) -> dict:
    """Zapisuje bary i wyłącza te z OSM, których nie ma na liście.

    Całość ma iść w jednej transakcji wywołującego. Pusta lista jest odrzucana,
    bo wyłączenie liczy się względem tej listy i wyłączyłoby wszystkie bary z OSM.
    Bar bez osm_type (dodany ręcznie albo z danych testowych) nie jest ruszany.
    """
    if not bars:
        raise ValueError("Import nie zawiera żadnego baru")

    existing = {
        (row["osm_type"], row["osm_id"])
        for row in conn.execute(
            "SELECT osm_type, osm_id FROM bars WHERE osm_type IS NOT NULL"
        ).fetchall()
    }

    inserted = 0
    updated = 0
    for bar in bars:
        # Drugi zapis tego samego osm_type i osm_id aktualizuje wiersz i włącza go z powrotem
        conn.execute(
            """
            INSERT INTO bars (osm_type, osm_id, name, address, opening_hours, location, is_active)
            VALUES (%s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, true)
            ON CONFLICT (osm_type, osm_id) DO UPDATE SET
                name = EXCLUDED.name,
                address = EXCLUDED.address,
                opening_hours = EXCLUDED.opening_hours,
                location = EXCLUDED.location,
                is_active = true
            """,
            (
                bar["osm_type"],
                bar["osm_id"],
                bar["name"],
                bar["address"],
                bar["opening_hours"],
                bar["longitude"],
                bar["latitude"],
            ),
        )
        key = (bar["osm_type"], bar["osm_id"])
        if key in existing:
            updated += 1
        else:
            inserted += 1
            existing.add(key)

    # Już wyłączony bar nie jest aktualizowany ponownie
    deactivated = conn.execute(
        """
        UPDATE bars SET is_active = false
        WHERE osm_type IS NOT NULL
          AND is_active
          AND (osm_type, osm_id) NOT IN (
              SELECT * FROM unnest(%s::text[], %s::bigint[])
          )
        """,
        ([bar["osm_type"] for bar in bars], [bar["osm_id"] for bar in bars]),
    ).rowcount

    return {"inserted": inserted, "updated": updated, "deactivated": deactivated}


def main() -> None:
    settings = get_settings()
    elements = fetch_elements(settings.overpass_url)
    bars = parse_elements(elements)
    if not bars:
        raise RuntimeError("Overpass nie zwrócił barów z nazwą i współrzędnymi")

    with connect() as conn:
        stats = save_bars(conn, bars)

    print(
        f"Pobrano {len(elements)} obiektów, zapisano {len(bars)} barów "
        f"(nowe: {stats['inserted']}, zaktualizowane: {stats['updated']}, "
        f"wyłączone: {stats['deactivated']})."
    )


def _point(element: dict) -> tuple[float, float] | None:
    # Węzeł ma lat/lon. Droga i relacja dostają środek dzięki out center.
    if "lat" in element and "lon" in element:
        return float(element["lat"]), float(element["lon"])
    center = element.get("center") or {}
    if "lat" in center and "lon" in center:
        return float(center["lat"]), float(center["lon"])
    return None


def _address(tags: dict) -> str | None:
    street = str(tags.get("addr:street") or "").strip()
    number = str(tags.get("addr:housenumber") or "").strip()
    if street and number:
        return f"{street} {number}"
    return street or number or None


if __name__ == "__main__":
    main()
