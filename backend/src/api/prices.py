# Ścieżki cen: lista napojów, aktualne ceny baru, zgłoszenie ceny (T2, PU.02) i potwierdzenie ceny (T3, PU.03).
import psycopg
from fastapi import APIRouter, Depends, HTTPException

from src.api.dependencies import get_current_user
from src.db.connection import get_connection
from src.schemas.prices import DrinkResponse, PriceConfirmRequest, PriceReportRequest, PriceResponse

# Bez wspólnego prefiksu, bo ścieżki zaczynają się od /drinks, /bars albo /prices
router = APIRouter(tags=["prices"])


def ensure_active_bar(conn: psycopg.Connection, bar_id: int) -> None:
    # Wyłączony bar jest traktowany jak nieistniejący, bo znika z mapy i list
    bar = conn.execute("SELECT 1 FROM bars WHERE id = %s AND is_active", (bar_id,)).fetchone()
    if bar is None:
        raise HTTPException(status_code=404, detail="Bar nie istnieje lub jest wyłączony")


def fetch_current_price(conn: psycopg.Connection, price_id: int) -> dict | None:
    # None, gdy cena nie jest aktualna: jest starszym wpisem z historii, jest wyłączona albo jej bar lub napój są wyłączone
    return conn.execute(
        """
        SELECT price_id, bar_id, drink_id, drink_name, category, volume_ml,
               amount, created_at, last_confirmed_at, needs_verification
        FROM v_current_prices
        WHERE price_id = %s
        """,
        (price_id,),
    ).fetchone()


@router.get(
    "/drinks",
    response_model=list[DrinkResponse],
    summary="Lista napojów",
    description=(
        "Zwraca aktywne napoje, posortowane po nazwie i pojemności. "
        "Służy do wyboru napoju w formularzu zgłoszenia ceny (PU.02). Nie wymaga logowania."
    ),
)
def list_drinks(conn: psycopg.Connection = Depends(get_connection)) -> list[dict]:
    # Tylko aktywne, bo dla wyłączonego napoju zgłoszenie ceny i tak zwraca 404
    return conn.execute(
        "SELECT id, name, category, volume_ml FROM drinks WHERE is_active ORDER BY name, volume_ml, id"
    ).fetchall()


@router.get(
    "/bars/{bar_id}/prices",
    response_model=list[PriceResponse],
    summary="Aktualne ceny baru",
    description=(
        "Zwraca najnowszą cenę każdego napoju w barze. Cena bez potwierdzenia od 90 dni "
        "ma `needs_verification = true`. Pusta lista oznacza brak danych (WF.04). Brak baru daje 404."
    ),
)
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


@router.post(
    "/bars/{bar_id}/prices",
    status_code=201,
    response_model=PriceResponse,
    summary="Zgłoszenie ceny",
    description=(
        "Zapisuje nową cenę napoju w barze i dodaje autorowi 5 punktów (T2, PU.02). Wymaga logowania. "
        "Brak baru lub napoju daje 404."
    ),
)
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
    return fetch_current_price(conn, row["id"])


@router.post(
    "/prices/{price_id}/confirmations",
    status_code=201,
    response_model=PriceResponse,
    summary="Potwierdzenie ceny",
    description=(
        "`kind = confirm` potwierdza cenę: odświeża jej datę i daje 1 punkt. "
        "`kind = change` zgłasza, że cena jest inna, bez punktu (T3, PU.03). Wymaga logowania. "
        "Cena nieaktualna daje 404, drugie potwierdzenie z tego samego konta "
        "i potwierdzenie własnej ceny przez jej autora dają 409."
    ),
)
def confirm_price(
    price_id: int,
    data: PriceConfirmRequest,
    user: dict = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_connection),
) -> dict:
    # PU.03 (1): potwierdzić można tylko cenę, którą użytkownik widzi, czyli aktualną
    if fetch_current_price(conn, price_id) is None:
        raise HTTPException(status_code=404, detail="Cena nie istnieje lub nie jest aktualna")

    # Zgłoszenie liczy się jak pierwsze potwierdzenie autora, więc drugie (i kolejny punkt) mu nie przysługuje.
    # „change” zostaje dozwolone, bo autor może poprawić własną pomyłkę.
    reported_by = conn.execute("SELECT reported_by FROM prices WHERE id = %s", (price_id,)).fetchone()["reported_by"]
    if data.kind == "confirm" and reported_by == user["id"]:
        raise HTTPException(status_code=409, detail="Nie można potwierdzić własnej ceny")

    # T3: confirm_price zapisuje potwierdzenie, a przy kind = 'confirm' także nową datę ceny i 1 punkt
    try:
        conn.execute("SELECT confirm_price(%s, %s, %s)", (price_id, user["id"], data.kind))
    except psycopg.errors.UniqueViolation:
        # PU.03 (2a): klucz główny (price_id, user_id) blokuje drugie potwierdzenie tej samej osoby
        raise HTTPException(status_code=409, detail="Ta cena została już potwierdzona z tego konta")
    # PU.03 (4): zwracana cena ma nową datę potwierdzenia, więc etykieta „do weryfikacji” znika
    return fetch_current_price(conn, price_id)
