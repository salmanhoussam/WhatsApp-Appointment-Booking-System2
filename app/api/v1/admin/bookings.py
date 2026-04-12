from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.repositories import BookingRepository, CustomerRepository
from app.services import BookingService
from app.schemas.booking import BookingResponse
from app.schemas.pagination import PaginatedResponse
from app.services.whatsapp_notifications import send_booking_confirmation

router = APIRouter()


def get_booking_service():
    booking_repo = BookingRepository(prisma_client)
    customer_repo = CustomerRepository(prisma_client)
    return BookingService(booking_repo, customer_repo)


class AdminBookingCreate(BaseModel):
    unit_id: str
    customer_name: str
    customer_phone: str
    check_in: str          # ISO date "YYYY-MM-DD"
    check_out: str         # ISO date "YYYY-MM-DD"
    guests: int
    total_price: str       # decimal string e.g. "750.00"
    currency: str = "SAR"
    notes: Optional[str] = None


@router.get("/")
async def list_bookings(
    current_client: dict = Depends(get_current_tenant),
):
    """Admin view of all reservations."""
    bookings = await prisma_client.booking.find_many(
        where={"clientId": current_client["id"]},
        include={
            "unit": True,
            "customer": True
        },
        order=[{"createdAt": "desc"}]
    )
    return bookings


@router.post("/", response_model=BookingResponse, status_code=201)
async def create_booking(
    body: AdminBookingCreate,
    background_tasks: BackgroundTasks,
    current_client: dict = Depends(get_current_tenant),
    service: BookingService = Depends(get_booking_service),
):
    """
    Admin manual booking creation.
    After persisting, dispatches a WhatsApp confirmation to the customer
    as a BackgroundTask (non-blocking — returns 201 immediately).
    """
    try:
        booking = await service.create_booking(
            client_id=current_client["id"],
            unit_id=body.unit_id,
            customer_data={"name": body.customer_name, "phone": body.customer_phone},
            booking_data={
                "checkIn":    body.check_in,
                "checkOut":   body.check_out,
                "guests":     body.guests,
                "totalPrice": body.total_price,
                "currency":   body.currency,
                "source":     "admin",
                "notes":      body.notes,
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    ref = getattr(booking, "bookingRef", None) or booking.id[:8].upper()
    unit_name = (
        getattr(booking.unit, "name_ar", None) or body.unit_id
        if hasattr(booking, "unit") else body.unit_id
    )
    background_tasks.add_task(
        send_booking_confirmation,
        customer_phone=body.customer_phone,
        booking_ref=ref,
        unit_name=unit_name,
        check_in=body.check_in,
        check_out=body.check_out,
        client_name=current_client.get("name", ""),
    )

    return booking


class AdminBookingUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

@router.patch("/{booking_id}")
async def update_booking(
    booking_id: str,
    body: AdminBookingUpdate,
    current_client: dict = Depends(get_current_tenant),
):
    """Update a booking's status or notes."""
    existing = await prisma_client.booking.find_first(
        where={"id": booking_id, "clientId": current_client["id"]}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Booking not found.")

    patch = {}
    if body.status is not None:
        patch["status"] = body.status
    if body.notes is not None:
        patch["notes"] = body.notes

    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")

    updated = await prisma_client.booking.update(
        where={"id": booking_id},
        data=patch,
        include={"unit": True, "customer": True}
    )
    return updated
