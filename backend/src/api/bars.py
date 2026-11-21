# Ścieżki barów: lista i mapa (WF.01), szczegóły (WF.02), wyszukiwanie (WF.06), ranking Q2 (WF.05), pobliże Q1 (WF.17).
from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query

from src.db.connection import get_connection
from src.schemas.bars import BarResponse, NearbyBarResponse, RankingBarResponse

router = APIRouter(tags=["bars"])

# v_bar_stats ma tylko aktywne bary, więc wyłączony bar nie wraca na listę ani do rankingu
BAR_COLUMNS = """
    b.id, b.name, b.address, b.opening_hours,
    ST_Y(b.location::geometry) AS latitude,
    ST_X(b.location::geometry) AS longitude,
    s.avg_rating, s.ratings_count, s.weighted_score
"""

PRICE_COLUMNS = """
    price_id, bar_id, drink_id, drink_name, category, volume_ml,
    amount, created_at, last_confirmed_at, needs_verification
"""


def _like_pattern(query: str) -> str:
    # % i _ w ILIKE są wieloznacznikami, więc w tekście z wyszukiwarki są escapowane
    escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def attach_prices(conn: psycopg.Connection, bars: list[dict]) -> list[dict]:
    for bar in bars:
        bar["prices"] = []
    if not bars:
        return bars

    by_id = {bar["id"]: bar for bar in bars}
    prices = conn.execute(
        f"""
        SELECT {PRICE_COLUMNS}
        FROM v_current_prices
        WHERE bar_id = ANY(%s)
        ORDER BY drink_name, volume_ml
        """,
        ([bar["id"] for bar in bars],),
    ).fetchall()
    for price in prices:
        by_id[price["bar_id"]]["prices"].append(price)
    return bars


@router.get("/bars", response_model=list[BarResponse])
def list_bars(
    q: str | None = Query(default=None),
    conn: psycopg.Connection = Depends(get_connection),
) -> list[dict]:
    query = q.strip() if q else ""
    if query:
        rows = conn.execute(
            f"""
            SELECT {BAR_COLUMNS}
            FROM bars b
            JOIN v_bar_stats s ON s.bar_id = b.id
            WHERE b.name ILIKE %s ESCAPE '\\'
            ORDER BY b.name, b.id
            """,
            (_like_pattern(query),),
        ).fetchall()
    else:
        rows = conn.execute(
            f"""
            SELECT {BAR_COLUMNS}
            FROM bars b
            JOIN v_bar_stats s ON s.bar_id = b.id
            ORDER BY b.name, b.id
            """,
        ).fetchall()
    return attach_prices(conn, rows)


@router.get("/nearby", response_model=list[NearbyBarResponse])
def nearby_bars(
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
    radius_m: Annotated[float, Query(gt=0)],
    conn: psycopg.Connection = Depends(get_connection),
) -> list[dict]:
    # Q1: ST_DWithin i ST_Distance w metrach; ST_MakePoint przyjmuje długość, potem szerokość
    origin = "ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography"
    rows = conn.execute(
        f"""
        SELECT {BAR_COLUMNS},
               ST_Distance(b.location, {origin}) AS distance_m
        FROM bars b
        JOIN v_bar_stats s ON s.bar_id = b.id
        WHERE ST_DWithin(b.location, {origin}, %s)
        ORDER BY distance_m, b.id
        """,
        (lon, lat, lon, lat, radius_m),
    ).fetchall()
    return attach_prices(conn, rows)


@router.get("/bars/{bar_id}", response_model=BarResponse)
def get_bar(bar_id: int, conn: psycopg.Connection = Depends(get_connection)) -> dict:
    row = conn.execute(
        f"""
        SELECT {BAR_COLUMNS}
        FROM bars b
        JOIN v_bar_stats s ON s.bar_id = b.id
        WHERE b.id = %s
        """,
        (bar_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Bar nie istnieje lub jest wyłączony")
    return attach_prices(conn, [row])[0]


@router.get("/ranking", response_model=list[RankingBarResponse])
def ranking(conn: psycopg.Connection = Depends(get_connection)) -> list[dict]:
    # Q2 z raportu etapu 2: RANK po ocenie ważonej, tylko bary z co najmniej jedną oceną
    rows = conn.execute(
        f"""
        SELECT RANK() OVER (ORDER BY s.weighted_score DESC) AS rank,
               {BAR_COLUMNS}
        FROM bars b
        JOIN v_bar_stats s ON s.bar_id = b.id
        WHERE s.ratings_count > 0
        ORDER BY rank, b.id
        """,
    ).fetchall()
    return attach_prices(conn, rows)
