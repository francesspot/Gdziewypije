# Ścieżki cen: aktualne ceny baru.
import psycopg
from fastapi import APIRouter, Depends, HTTPException

from src.db.connection import get_connection
from src.schemas.prices import PriceResponse

router = APIRouter(prefix="/bars", tags=["prices"])


def ensure_active_bar(conn: psycopg.Connection, bar_id: int) -> None:
    # Wyłączony bar jest traktowany jak nieistniejący, bo znika z mapy i list
    bar = conn.execute("SELECT 1 FROM bars WHERE id = %s AND is_active", (bar_id,)).fetchone()
    if bar is None:
        raise HTTPException(status_code=404, detail="Bar nie istnieje lub jest wyłączony")


@router.get("/{bar_id}/prices", response_model=list[PriceResponse])
def current_prices(bar_id: int, conn: psycopg.Connection = Depends(get_connection)) -> list[dict]:
    ensure_active_bar(conn, bar_id)
    # Pusta lista oznacza bar bez cen, frontend pokazuje wtedy „brak danych” (WF.04)
    return conn.execute(
        """
        SELECT price_id, bar_id, drink_id, drink_name, category, volume_ml,
               amount, created_at, last_confirmed_at, needs_verification
        FROM v_current_prices
        WHERE bar_id = %s
        ORDER BY drink_name, volume_ml
        """,
        (bar_id,),
    ).fetchall()
