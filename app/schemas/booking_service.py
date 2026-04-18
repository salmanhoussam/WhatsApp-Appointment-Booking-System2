from pydantic import BaseModel, ConfigDict
from typing import Optional

class BookingServiceBase(BaseModel):
    booking_id: str
    service_id: str
    quantity: int = 1
    price: float

class BookingServiceCreate(BookingServiceBase):
    # price is ignored on create; the server reads it from service.basePrice
    price: Optional[float] = None

class BookingServiceUpdate(BaseModel):
    booking_id: Optional[str] = None
    service_id: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None

class BookingService(BookingServiceBase):
    model_config = ConfigDict(from_attributes=True)