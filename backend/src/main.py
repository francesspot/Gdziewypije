# Punkt wejścia aplikacji FastAPI.
from fastapi import FastAPI

from src.api import accounts, admin, bars, health, prices, ratings

app = FastAPI(title="Gdziewypije API")

app.include_router(health.router)
app.include_router(accounts.router)
app.include_router(bars.router)
app.include_router(prices.router)
app.include_router(ratings.router)
app.include_router(admin.router)
