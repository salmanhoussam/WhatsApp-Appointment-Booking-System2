from typing import Optional

from pydantic import BaseModel


class Customer(BaseModel):
    id: Optional[int] = None
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
