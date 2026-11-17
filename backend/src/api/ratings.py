# Ścieżki ocen: dodanie i zmiana oceny baru (T4, PU.04).
import psycopg
from fastapi import APIRouter, Depends, HTTPException

from src.api.dependencies import get_current_user
from src.db.connection import get_connection
from src.schemas.ratings import RatingRequest, RatingResponse

router = APIRouter(tags=["ratings"])


def ensure_active_bar(conn: psycopg.Connection, bar_id: int) -> None:
    # Wyłączony bar jest traktowany jak nieistniejący, bo znika z mapy i list
    bar = conn.execute("SELECT 1 FROM bars WHERE id = %s AND is_active", (bar_id,)).fetchone()
    if bar is None:
        raise HTTPException(status_code=404, detail="Bar nie istnieje lub jest wyłączony")


@router.put("/bars/{bar_id}/rating", response_model=RatingResponse)
def put_rating(
    bar_id: int,
    data: RatingRequest,
    user: dict = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_connection),
) -> dict:
    ensure_active_bar(conn, bar_id)
    # T4: druga ocena tej samej osoby zastępuje pierwszą; is_active wraca, gdy wiersz był wyłączony
    return conn.execute(
        """
        INSERT INTO ratings (user_id, bar_id, value)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id, bar_id) DO UPDATE SET
            value = EXCLUDED.value,
            is_active = true
        RETURNING user_id, bar_id, value
        """,
        (user["id"], bar_id, data.value),
    ).fetchone()
