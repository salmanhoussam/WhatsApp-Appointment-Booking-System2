from typing import Optional

from pydantic import BaseModel


class Product(BaseModel):
    id: Optional[int] = None
    name: str
    price: float
    quantity: int = 0
    notes: Optional[str] = None
