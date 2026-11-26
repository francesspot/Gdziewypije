# Modele danych dla ścieżek administratora: dodawanie, edycja i wyłączanie barów i napojów (WF.18).
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from src.schemas.text import NoNulStr


class BarRequest(BaseModel):
    # Ten sam model przy dodaniu i edycji: edycja zastępuje wszystkie pola baru
    model_config = ConfigDict(str_strip_whitespace=True)

    name: NoNulStr = Field(min_length=1, examples=["Bar pod Ratuszem"])
    address: NoNulStr | None = Field(default=None, examples=["Rynek 1, Wrocław"])
    # Format godzin z OpenStreetMap, tak jak u barów z importu
    opening_hours: NoNulStr | None = Field(default=None, examples=["Mo-Su 16:00-02:00"])
    # Współrzędne GPS w stopniach, w bazie zapisywane jako punkt geography (4326)
    latitude: float = Field(ge=-90, le=90, examples=[51.11])
    longitude: float = Field(ge=-180, le=180, examples=[17.032])


class BarResponse(BaseModel):
    id: int
    name: str
    address: str | None
    opening_hours: str | None
    latitude: float
    longitude: float
    is_active: bool


class DrinkRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: NoNulStr = Field(min_length=1, examples=["Piwo lane"])
    # Te same wartości co CHECK w drinks
    category: Literal["beer", "cocktail", "shot", "wine"]
    # Górna granica to zakres kolumny integer; większa liczba kończyłaby się błędem bazy (500) zamiast 422
    volume_ml: int = Field(gt=0, le=2_147_483_647, examples=[500])


class DrinkResponse(BaseModel):
    id: int
    name: str
    category: str
    volume_ml: int
    is_active: bool


class ActiveRequest(BaseModel):
    # false wyłącza bar, napój lub cenę, true włącza z powrotem (dane nie są usuwane)
    is_active: bool = Field(examples=[False])


class AdminPriceResponse(BaseModel):
    id: int
    bar_id: int
    drink_id: int
    # float zamiast Decimal, bo Decimal trafiłby do JSON jako tekst ("11.50"), a nie liczba
    amount: float
    is_active: bool
