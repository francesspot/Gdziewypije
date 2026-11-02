# Punkt wejścia aplikacji FastAPI.
from fastapi import FastAPI

from src.api import accounts, admin, health, prices

app = FastAPI(title="Gdziewypije API")

app.include_router(health.router)
app.include_router(accounts.router)
app.include_router(prices.router)
app.include_router(admin.router)
