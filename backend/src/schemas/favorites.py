# Modele odpowiedzi ulubionych barów (T5, WF.14, WF.15).
from datetime import datetime

from pydantic import BaseModel


class FavoriteResponse(BaseModel):
    user_id: int
    bar_id: int
    created_at: datetime
