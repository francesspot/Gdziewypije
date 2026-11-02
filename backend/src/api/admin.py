# Ścieżki administratora: dodawanie, edycja i wyłączanie barów (WB.11, WF.18).
import psycopg
from fastapi import APIRouter, Depends, HTTPException

from src.api.dependencies import require_admin
from src.db.connection import get_connection
from src.schemas.admin import ActiveRequest, BarRequest, BarResponse

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


@router.post("/bars", status_code=201, response_model=BarResponse)
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


@router.put("/bars/{bar_id}", response_model=BarResponse)
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


@router.patch("/bars/{bar_id}", response_model=BarResponse)
def set_bar_active(bar_id: int, data: ActiveRequest, conn: psycopg.Connection = Depends(get_connection)) -> dict:
    # Wyłączony bar znika z widoków (v_bar_stats, v_current_prices, v_top_month), ale zostaje w bazie
    row = conn.execute(
        f"UPDATE bars SET is_active = %s WHERE id = %s RETURNING {BAR_COLUMNS}",
        (data.is_active, bar_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Bar nie istnieje")
    return row
