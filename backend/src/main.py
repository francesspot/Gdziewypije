# Punkt wejścia aplikacji FastAPI.
from fastapi import FastAPI

from src.api import accounts, admin, bars, favorites, health, prices, ratings, top_month

# Kolejność tagów ustala kolejność grup w Swaggerze
TAGS = [
    {"name": "health", "description": "Sprawdzenie, czy backend działa."},
    {"name": "accounts", "description": "Rejestracja, logowanie i dane zalogowanego użytkownika (token JWT)."},
    {"name": "bars", "description": "Lista barów z wyszukiwarką, szczegóły baru, ranking i bary w pobliżu."},
    {"name": "prices", "description": "Aktualne ceny napojów, zgłaszanie i potwierdzanie cen."},
    {"name": "top-month", "description": "Top 3 barów bieżącego miesiąca."},
    {"name": "ratings", "description": "Wystawianie i zmiana oceny baru."},
    {"name": "favorites", "description": "Ulubione bary zalogowanego użytkownika."},
    {"name": "admin", "description": "Zarządzanie barami i napojami. Tylko dla administratora."},
]

app = FastAPI(
    title="Gdziewypije API",
    description=(
        "Backend aplikacji do szukania barów we Wrocławiu. "
        "Bary pochodzą z OpenStreetMap, a oceny i ceny dodają użytkownicy.\n\n"
        "Ścieżki wymagające logowania przyjmują nagłówek `Authorization: Bearer <token>`. "
        "Token zwracają `POST /auth/register` i `POST /auth/login`, "
        "a w Swaggerze wpisuje się go przyciskiem **Authorize**."
    ),
    version="1.0.0",
    openapi_tags=TAGS,
)

app.include_router(health.router)
app.include_router(accounts.router)
app.include_router(bars.router)
app.include_router(prices.router)
app.include_router(top_month.router)
app.include_router(ratings.router)
app.include_router(favorites.router)
app.include_router(admin.router)
