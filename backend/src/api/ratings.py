# Ścieżki ocen: dodanie i zmiana oceny baru (T4, PU.04).
import psycopg
from fastapi import APIRouter, Depends

from src.api.dependencies import get_current_user
from src.api.prices import ensure_active_bar
from src.db.connection import get_connection
from src.schemas.ratings import RatingRequest, RatingResponse

router = APIRouter(tags=["ratings"])

@router.put(
    "/bars/{bar_id}/rating",
    response_model=RatingResponse,
    summary="Ocena baru",
    description=(
        "Wystawia ocenę 1–5, a kolejna ocena tej samej osoby zastępuje poprzednią (T4, PU.04). "
        "Wymaga logowania. Brak baru daje 404."
    ),
)
def put_rating(
    bar_id: int,
    data: RatingRequest,
    user: dict = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_connection),
) -> dict:
    ensure_active_bar(conn, bar_id)
    # T4: druga ocena tej samej osoby zastępuje pierwszą (klucz główny user_id, bar_id)
    return conn.execute(
        """
        INSERT INTO ratings (user_id, bar_id, value)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id, bar_id) DO UPDATE SET value = EXCLUDED.value
        RETURNING user_id, bar_id, value
        """,
        (user["id"], bar_id, data.value),
    ).fetchone()
