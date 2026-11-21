# Typ tekstu wspólny dla danych wejściowych, które trafiają do kolumn text w bazie.
from typing import Annotated

from pydantic import AfterValidator


def reject_nul(value: str) -> str:
    # PostgreSQL nie zapisuje znaku NUL w tekście, a psycopg zgłasza wtedy błąd (500), więc odrzuca się go wcześniej (422)
    if "\x00" in value:
        raise ValueError("Tekst nie może zawierać znaku NUL (\\x00)")
    return value


NoNulStr = Annotated[str, AfterValidator(reject_nul)]
