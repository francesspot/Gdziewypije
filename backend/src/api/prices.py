# Ścieżki cen: aktualne ceny baru i zgłoszenie ceny (T2, PU.02).
import psycopg
from fastapi import APIRouter, Depends, HTTPException

from src.api.dependencies import get_current_user
from src.db.connection import get_connection
from src.schemas.prices import PriceReportRequest, PriceResponse

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


@router.post("/{bar_id}/prices", status_code=201, response_model=PriceResponse)
def report_price(
    bar_id: int,
    data: PriceReportRequest,
    user: dict = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_connection),
) -> dict:
    # PU.02 (3b): bar i napój sprawdzane przed zapisem, żeby zwrócić 404 zamiast ogólnego błędu z report_price
    ensure_active_bar(conn, bar_id)
    drink = conn.execute("SELECT 1 FROM drinks WHERE id = %s AND is_active", (data.drink_id,)).fetchone()
    if drink is None:
        raise HTTPException(status_code=404, detail="Napój nie istnieje lub jest wyłączony")

    # T2: report_price zapisuje cenę i dodaje autorowi 5 punktów w jednej transakcji
    row = conn.execute(
        "SELECT report_price(%s, %s, %s, %s) AS id",
        (bar_id, data.drink_id, data.amount, user["id"]),
    ).fetchone()
    # PU.02 (5): nowa cena jest najnowszym wpisem, więc od razu jest aktualną ceną w widoku
    return conn.execute(
        """
        SELECT price_id, bar_id, drink_id, drink_name, category, volume_ml,
               amount, created_at, last_confirmed_at, needs_verification
        FROM v_current_prices
        WHERE price_id = %s
        """,
        (row["id"],),
    ).fetchone()
