from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional

class PriceBase(BaseModel):
    unit_id: str
    date: date
    price: float
    min_stay: int = 1
    available: bool = True
    client_id: str

class PriceCreate(PriceBase):
    pass

class PriceUpdate(BaseModel):
    unit_id: Optional[str] = None
    price: Optional[float] = None
    min_stay: Optional[int] = None
    available: Optional[bool] = None
    client_id: Optional[str] = None

class Price(PriceBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)