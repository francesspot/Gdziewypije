# Konfiguracja aplikacji wczytywana ze zmiennych środowiskowych.
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Nazwy pól odpowiadają zmiennym z .env (wielkość liter nie ma znaczenia)
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str
    db_user: str
    db_password: str

    # Klucz podpisu tokenów logowania i czas ich ważności (domyślnie doba)
    jwt_secret: str
    jwt_expire_minutes: int = 1440

    # Adres Overpass API używany przez import barów z OpenStreetMap
    overpass_url: str = "https://overpass-api.de/api/interpreter"

    @field_validator("overpass_url")
    @classmethod
    def overpass_url_must_be_https(cls, value: str) -> str:
        if not value.lower().startswith("https://"):
            raise ValueError("OVERPASS_URL musi być adresem HTTPS")
        return value


# Ustawienia wczytywane raz, przy pierwszym użyciu, a nie przy imporcie modułu
@lru_cache
def get_settings() -> Settings:
    return Settings()
