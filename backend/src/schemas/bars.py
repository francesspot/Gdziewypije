# Modele odpowiedzi listy, szczegółów i rankingu barów (WF.01–WF.06, Q2).
from pydantic import BaseModel

from src.schemas.prices import PriceResponse


class BarResponse(BaseModel):
    id: int
    name: str
    address: str | None
    opening_hours: str | None
    latitude: float
    longitude: float
    avg_rating: float | None
    ratings_count: int
    weighted_score: float | None
    # Pusta lista oznacza bar bez ceny; frontend pokazuje wtedy „brak danych” (WF.04)
    prices: list[PriceResponse]


class RankingBarResponse(BarResponse):
    # miejsce z RANK() w zapytaniu Q2
    rank: int


class NearbyBarResponse(BarResponse):
    # ST_Distance w metrach (Q1)
    distance_m: float
