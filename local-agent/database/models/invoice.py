from typing import Optional

from pydantic import BaseModel


class Invoice(BaseModel):
    id: Optional[int] = None
    customer_id: int
    product_id: int
    quantity: int
    total: float
    notes: Optional[str] = None
