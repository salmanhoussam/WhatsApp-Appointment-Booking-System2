from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, date

class BookingBase(BaseModel):
    check_in: datetime
    check_out: datetime
    guests: int
    total_price: Decimal
    currency: str = "SAR"
    status: str = "pending"
    source: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("check_out")
    def check_dates(cls, v, values):
        if "check_in" in values.data and v <= values.data["check_in"]:
            raise ValueError("check_out must be after check_in")
        return v

class BookingCreate(BookingBase):
    customer_name: str
    customer_phone: str

class BookingResponse(BookingBase):
    id: str
    client_id: str
    unit_id: str
    customer_id: str
    booking_reference: Optional[str] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    arrival_time: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ── Public-facing booking schemas (used by /api/v1/public.py) ────────────────

class ServiceSelection(BaseModel):
    service_id: str
    quantity: int = 1


class PublicBookingRequest(BaseModel):
    unit_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guests: Optional[int] = 1
    services: Optional[List[ServiceSelection]] = []
    payment_method: Optional[str] = "cash"       # cash | whish | omt | card
    payment_reference: Optional[str] = None       # receipt ref for Whish/OMT
    arrival_time: Optional[str] = "14:00"         # expected arrival HH:MM
    client_slug: Optional[str] = None             # legacy /bookings/ route only