# Modele danych dla oceny baru (T4, PU.04, WF.09).
from pydantic import BaseModel, Field


class RatingRequest(BaseModel):
    # strict: bool, float i tekst nie wchodzą jako ocena (bool jest podtypem int)
    value: int = Field(ge=1, le=5, strict=True)


class RatingResponse(BaseModel):
    user_id: int
    bar_id: int
    value: int
