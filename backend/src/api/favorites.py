# Ścieżki ulubionych: dodanie, usunięcie i lista (T5, WF.14, WF.15).
import psycopg
from fastapi import APIRouter, Depends, HTTPException

from src.api.dependencies import get_current_user
from src.api.prices import ensure_active_bar
from src.db.connection import get_connection
from src.schemas.favorites import FavoriteResponse

router = APIRouter(tags=["favorites"])


@router.post("/bars/{bar_id}/favorite", status_code=201, response_model=FavoriteResponse)
def add_favorite(
    bar_id: int,
    user: dict = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_connection),
) -> dict:
    ensure_active_bar(conn, bar_id)
    try:
        # T5: dodanie wiersza; klucz (user_id, bar_id) blokuje duplikat
        return conn.execute(
            """
            INSERT INTO favorites (user_id, bar_id)
            VALUES (%s, %s)
            RETURNING user_id, bar_id, created_at
            """,
            (user["id"], bar_id),
        ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Bar jest już w ulubionych")


@router.delete("/bars/{bar_id}/favorite", status_code=204)
def remove_favorite(
    bar_id: int,
    user: dict = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_connection),
) -> None:
    # Ulubione usuwa się wierszem (T5), nie przez is_active
    deleted = conn.execute(
        "DELETE FROM favorites WHERE user_id = %s AND bar_id = %s",
        (user["id"], bar_id),
    ).rowcount
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Bar nie jest w ulubionych")


@router.get("/favorites", response_model=list[FavoriteResponse])
def list_favorites(
    user: dict = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_connection),
) -> list[dict]:
    # WF.15: tylko ulubione zalogowanej osoby; wyłączony bar znika z listy
    return conn.execute(
        """
        SELECT f.user_id, f.bar_id, f.created_at
        FROM favorites f
        JOIN bars b ON b.id = f.bar_id AND b.is_active
        WHERE f.user_id = %s
        ORDER BY f.created_at, f.bar_id
        """,
        (user["id"],),
    ).fetchall()
