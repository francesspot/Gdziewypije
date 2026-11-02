# Modele danych dla ścieżek administratora: dodawanie, edycja i wyłączanie barów i napojów (WF.18).
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BarRequest(BaseModel):
    # Ten sam model przy dodaniu i edycji: edycja zastępuje wszystkie pola baru
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1)
    address: str | None = None
    opening_hours: str | None = None
    # Współrzędne GPS w stopniach, w bazie zapisywane jako punkt geography (4326)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


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

    name: str = Field(min_length=1)
    # Te same wartości co CHECK w drinks
    category: Literal["beer", "cocktail", "shot", "wine"]
    volume_ml: int = Field(gt=0)


class DrinkResponse(BaseModel):
    id: int
    name: str
    category: str
    volume_ml: int
    is_active: bool


class ActiveRequest(BaseModel):
    # false wyłącza bar lub napój, true włącza go z powrotem (dane nie są usuwane)
    is_active: bool
