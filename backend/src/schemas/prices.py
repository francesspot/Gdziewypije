# Modele danych dla zgłoszenia ceny (T2, PU.02), potwierdzenia ceny (T3, PU.03), aktualnych cen baru i listy napojów.
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class PriceReportRequest(BaseModel):
    drink_id: int = Field(examples=[1])
    # WF.11, PU.02 (3a): cena musi być większa od 0, tak samo jak CHECK w prices.
    # Decimal i limity cyfr odpowiadają kolumnie numeric(8, 2), więc za długa liczba daje 422, a nie błąd bazy.
    # Przykład jako liczba, bo Swagger pokazuje Decimal jako „liczba albo tekst” i generuje nieczytelny przykład
    amount: Decimal = Field(gt=0, max_digits=8, decimal_places=2, examples=[12.5])


class PriceConfirmRequest(BaseModel):
    # PU.03: confirm – cena się zgadza, change – cena jest inna (te same wartości co CHECK w price_confirmations)
    kind: Literal["confirm", "change"] = "confirm"


class DrinkResponse(BaseModel):
    # Bez is_active, bo lista zawiera tylko aktywne napoje
    id: int
    name: str
    category: str
    volume_ml: int


class PriceResponse(BaseModel):
    # Pola widoku v_current_prices
    price_id: int
    bar_id: int
    drink_id: int
    drink_name: str
    category: str
    volume_ml: int
    # float zamiast Decimal, bo Decimal trafiłby do JSON jako tekst ("11.50"), a nie liczba
    amount: float
    created_at: datetime
    last_confirmed_at: datetime
    needs_verification: bool
