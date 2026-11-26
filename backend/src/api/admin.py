# Ścieżki administratora: dodawanie, edycja i wyłączanie barów i napojów, wyłączanie cen (WB.11, WF.18).
import psycopg
from fastapi import APIRouter, Depends, HTTPException

from src.api.dependencies import require_admin
from src.db.connection import get_connection
from src.schemas.admin import (
    ActiveRequest,
    AdminPriceResponse,
    BarRequest,
    BarResponse,
    DrinkRequest,
    DrinkResponse,
)

# WNF.06: require_admin na poziomie routera obejmuje wszystkie ścieżki modułu
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

# Kolumny zwracane po zapisie baru. Punkt geography jest rzutowany na geometry,
# bo ST_Y i ST_X (szerokość i długość geograficzna) działają tylko na geometry.
BAR_COLUMNS = """
    id, name, address, opening_hours,
    ST_Y(location::geometry) AS latitude,
    ST_X(location::geometry) AS longitude,
    is_active
"""


@router.get(
    "/bars",
    response_model=list[BarResponse],
    summary="Lista wszystkich barów",
    description=(
        "Zwraca wszystkie bary razem z wyłączonymi, posortowane po nazwie. "
        "Wymaga konta administratora."
    ),
)
def list_all_bars(conn: psycopg.Connection = Depends(get_connection)) -> list[dict]:
    # Odczyt z tabeli, a nie z v_bar_stats, bo panel musi pokazać też wyłączone bary, żeby dało się je włączyć
    return conn.execute(f"SELECT {BAR_COLUMNS} FROM bars ORDER BY name, id").fetchall()


@router.post(
    "/bars",
    status_code=201,
    response_model=BarResponse,
    summary="Dodanie baru",
    description="Dodaje bar spoza OpenStreetMap. Wymaga konta administratora.",
)
def create_bar(data: BarRequest, conn: psycopg.Connection = Depends(get_connection)) -> dict:
    # ST_MakePoint przyjmuje najpierw długość, potem szerokość geograficzną.
    # Bar dodany ręcznie nie ma odpowiednika w OSM, więc osm_type i osm_id zostają puste.
    return conn.execute(
        f"""
        INSERT INTO bars (name, address, opening_hours, location)
        VALUES (%s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)
        RETURNING {BAR_COLUMNS}
        """,
        (data.name, data.address, data.opening_hours, data.longitude, data.latitude),
    ).fetchone()


@router.put(
    "/bars/{bar_id}",
    response_model=BarResponse,
    summary="Edycja baru",
    description="Zastępuje wszystkie pola baru. Wymaga konta administratora. Brak baru daje 404.",
)
def update_bar(bar_id: int, data: BarRequest, conn: psycopg.Connection = Depends(get_connection)) -> dict:
    # Edycja zastępuje wszystkie pola baru; updated_at ustawia wyzwalacz
    row = conn.execute(
        f"""
        UPDATE bars
        SET name = %s, address = %s, opening_hours = %s,
            location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
        WHERE id = %s
        RETURNING {BAR_COLUMNS}
        """,
        (data.name, data.address, data.opening_hours, data.longitude, data.latitude, bar_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Bar nie istnieje")
    return row


@router.patch(
    "/bars/{bar_id}",
    response_model=BarResponse,
    summary="Włączenie lub wyłączenie baru",
    description=(
        "Ustawia `is_active`. Wyłączony bar znika z mapy, list i rankingów, ale zostaje w bazie. "
        "Wymaga konta administratora."
    ),
)
def set_bar_active(bar_id: int, data: ActiveRequest, conn: psycopg.Connection = Depends(get_connection)) -> dict:
    # Wyłączony bar znika z widoków (v_bar_stats, v_current_prices, v_top_month), ale zostaje w bazie
    row = conn.execute(
        f"UPDATE bars SET is_active = %s WHERE id = %s RETURNING {BAR_COLUMNS}",
        (data.is_active, bar_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Bar nie istnieje")
    return row


DRINK_COLUMNS = "id, name, category, volume_ml, is_active"

# UNIQUE (name, volume_ml) w drinks: ten sam napój może mieć kilka pojemności, ale nie dwa razy tę samą
DUPLICATE_DRINK = "Napój o tej nazwie i pojemności już istnieje"


@router.get(
    "/drinks",
    response_model=list[DrinkResponse],
    summary="Lista wszystkich napojów",
    description=(
        "Zwraca wszystkie napoje razem z wyłączonymi, posortowane po nazwie i pojemności. "
        "Wymaga konta administratora."
    ),
)
def list_all_drinks(conn: psycopg.Connection = Depends(get_connection)) -> list[dict]:
    # Wyłączone napoje też są na liście, żeby panel mógł je włączyć z powrotem
    return conn.execute(f"SELECT {DRINK_COLUMNS} FROM drinks ORDER BY name, volume_ml, id").fetchall()


@router.post(
    "/drinks",
    status_code=201,
    response_model=DrinkResponse,
    summary="Dodanie napoju",
    description=(
        "Dodaje napój do słownika. Wymaga konta administratora. "
        "Napój o tej samej nazwie i pojemności daje 409."
    ),
)
def create_drink(data: DrinkRequest, conn: psycopg.Connection = Depends(get_connection)) -> dict:
    try:
        return conn.execute(
            f"INSERT INTO drinks (name, category, volume_ml) VALUES (%s, %s, %s) RETURNING {DRINK_COLUMNS}",
            (data.name, data.category, data.volume_ml),
        ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail=DUPLICATE_DRINK)


@router.put(
    "/drinks/{drink_id}",
    response_model=DrinkResponse,
    summary="Edycja napoju",
    description=(
        "Zastępuje wszystkie pola napoju. Wymaga konta administratora. "
        "Brak napoju daje 404, duplikat nazwy i pojemności daje 409."
    ),
)
def update_drink(drink_id: int, data: DrinkRequest, conn: psycopg.Connection = Depends(get_connection)) -> dict:
    # Edycja może zderzyć się z innym napojem, np. po zmianie pojemności na już istniejącą
    try:
        row = conn.execute(
            f"""
            UPDATE drinks SET name = %s, category = %s, volume_ml = %s
            WHERE id = %s
            RETURNING {DRINK_COLUMNS}
            """,
            (data.name, data.category, data.volume_ml, drink_id),
        ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail=DUPLICATE_DRINK)
    if row is None:
        raise HTTPException(status_code=404, detail="Napój nie istnieje")
    return row


@router.patch(
    "/drinks/{drink_id}",
    response_model=DrinkResponse,
    summary="Włączenie lub wyłączenie napoju",
    description=(
        "Ustawia `is_active`. Ceny wyłączonego napoju znikają z barów, a nowych nie da się zgłosić. "
        "Wymaga konta administratora."
    ),
)
def set_drink_active(drink_id: int, data: ActiveRequest, conn: psycopg.Connection = Depends(get_connection)) -> dict:
    # Ceny wyłączonego napoju znikają z v_current_prices, a report_price odrzuca nowe zgłoszenia
    row = conn.execute(
        f"UPDATE drinks SET is_active = %s WHERE id = %s RETURNING {DRINK_COLUMNS}",
        (data.is_active, drink_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Napój nie istnieje")
    return row


@router.patch(
    "/prices/{price_id}",
    response_model=AdminPriceResponse,
    summary="Włączenie lub wyłączenie ceny",
    description=(
        "Ustawia `is_active`. Po wyłączeniu aktualnej ceny aktualna staje się poprzednia aktywna cena "
        "tego napoju w barze, a gdy jej nie ma, bar nie ma ceny tego napoju. Wymaga konta administratora."
    ),
)
def set_price_active(price_id: int, data: ActiveRequest, conn: psycopg.Connection = Depends(get_connection)) -> dict:
    # Diagram stanów ceny (etap 2): administrator wyłącza błędną cenę. v_current_prices bierze najnowszy
    # aktywny wpis, więc wyłączenie przywraca poprzednią cenę bez zmian w historii.
    row = conn.execute(
        "UPDATE prices SET is_active = %s WHERE id = %s RETURNING id, bar_id, drink_id, amount, is_active",
        (data.is_active, price_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Cena nie istnieje")
    return row
