# Ścieżka top 3 miesiąca: odczyt z widoku v_top_month (Q3, WF.16, WNF.04).
import psycopg
from fastapi import APIRouter, Depends

from src.db.connection import get_connection
from src.schemas.top_month import TopMonthBarResponse

router = APIRouter(tags=["top-month"])

# Q3 z raportu etapu 2: SELECT name, activity, avg_rating FROM v_top_month LIMIT 3
Q3_TOP_MONTH = """
    SELECT bar_id, name, activity, avg_rating
    FROM v_top_month
    LIMIT 3
"""


@router.get(
    "/top-month",
    response_model=list[TopMonthBarResponse],
    summary="Top 3 miesiąca",
    description=(
        "Zwraca do 3 barów z największą liczbą ocen i dodań do ulubionych w bieżącym miesiącu (Q3, WF.16). "
        "Bar musi mieć co najmniej 3 takie zdarzenia, a przy remisie decyduje średnia ocena."
    ),
)
def top_month(conn: psycopg.Connection = Depends(get_connection)) -> list[dict]:
    # Widok już filtruje aktywne bary i HAVING count(*) >= 3; brak wierszy to pusta lista (200)
    return conn.execute(Q3_TOP_MONTH).fetchall()
