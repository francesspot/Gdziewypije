# Modele odpowiedzi top 3 miesiąca (Q3, WF.16).
from pydantic import BaseModel


class TopMonthBarResponse(BaseModel):
    bar_id: int
    name: str
    activity: int
    avg_rating: float | None
