import asyncio
import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.repositories import BookingRepository, CustomerRepository
from app.schemas.booking import BookingResponse
from app.services import BookingService
from app.services.whatsapp_notifications import send_booking_confirmation

# ARCH-01: repo used instead of prisma_client directly in update_booking
_booking_repo = BookingRepository(prisma_client)

logger = logging.getLogger(__name__)
router = APIRouter()


def get_booking_service():
    booking_repo  = BookingRepository(prisma_client)
    customer_repo = CustomerRepository(prisma_client)
    return BookingService(booking_repo, customer_repo)


# ── Serializer — converts a Prisma Booking model → clean dict ────────────────
def _serialize(b) -> dict:
    return {
        "id":                b.id,
        "status":            b.status,
        "check_in":          b.checkIn.isoformat()  if b.checkIn  else None,
        "check_out":         b.checkOut.isoformat() if b.checkOut else None,
        "guests":            b.guests,
        "total_price":       str(b.totalPrice),
        "currency":          b.currency,
        "source":            b.source,
        "notes":             b.notes,
        "payment_method":    b.paymentMethod,
        "payment_reference": b.paymentReference,
        "arrival_time":      b.arrivalTime,
        "created_at":        b.createdAt.isoformat() if b.createdAt else None,
        "customer": {
            "id":    b.customer.id,
            "name":  b.customer.name,
            "phone": b.customer.phone,
        } if b.customer else None,
        "unit": {
            "id":        b.unit.id,
            "name_ar":   b.unit.name_ar,
            "name_en":   b.unit.name_en,
            "unit_type": getattr(b.unit, "unit_type", None),
            "unitNumber": getattr(b.unit, "unitNumber", None),
        } if b.unit else None,
    }


def _to_dt(d) -> datetime:
    """Convert a date or str to a naive datetime (midnight) for Date-column queries."""
    if isinstance(d, datetime):
        return d.replace(tzinfo=None)
    if isinstance(d, date):
        return datetime(d.year, d.month, d.day, 0, 0, 0)
    # string "YYYY-MM-DD"
    return datetime.fromisoformat(str(d))


# ── Schemas ───────────────────────────────────────────────────────────────────

class AdminBookingCreate(BaseModel):
    unit_id:        str
    customer_name:  str
    customer_phone: str
    check_in:       str          # ISO date "YYYY-MM-DD"
    check_out:      str          # ISO date "YYYY-MM-DD"
    guests:         int
    total_price:    str          # decimal string e.g. "750.00"
    currency:       str = "SAR"
    notes:          Optional[str] = None


class AdminBookingUpdate(BaseModel):
    status: Optional[str] = None
    notes:  Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


# ── GET / — paginated bookings list ──────────────────────────────────────────

@router.get("/")
async def list_bookings(
    page:      int            = Query(1,    ge=1),
    limit:     int            = Query(20,   ge=1, le=100),
    status:    Optional[str]  = Query(None),
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    current_client: dict = Depends(get_current_tenant),
):
    """Paginated admin view of all reservations for this tenant."""
    try:
        client_id = current_client["id"]

        date_from_dt = _to_dt(date_from) if date_from else None
        date_to_dt   = _to_dt(date_to)   if date_to   else None

        repo  = BookingRepository(prisma_client)
        skip  = (page - 1) * limit

        total, bookings = await asyncio.gather(
            repo.count_by_client(client_id, status=status,
                                 date_from=date_from_dt, date_to=date_to_dt),
            repo.get_all_by_client(client_id, skip=skip, take=limit,
                                   status=status,
                                   date_from=date_from_dt, date_to=date_to_dt),
        )

        return {
            "data":  [_serialize(b) for b in bookings],
            "total": total,
            "page":  page,
            "limit": limit,
        }
    except Exception as e:
        logger.error("🔥 list_bookings failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch bookings")


# ── POST / — admin manual booking ────────────────────────────────────────────

@router.post("/", response_model=BookingResponse, status_code=201)
async def create_booking(
    body:             AdminBookingCreate,
    background_tasks: BackgroundTasks,
    current_client:   dict         = Depends(get_current_tenant),
    service:          BookingService = Depends(get_booking_service),
):
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

    ref       = getattr(booking, "bookingRef", None) or booking.id[:8].upper()
    unit_name = (getattr(booking.unit, "name_ar", None) or body.unit_id
                 if hasattr(booking, "unit") else body.unit_id)

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


# ── PATCH /{id}/status — used by the dashboard action buttons ────────────────

@router.patch("/{booking_id}/status")
async def update_booking_status(
    booking_id:     str,
    body:           StatusUpdate,
    current_client: dict = Depends(get_current_tenant),
):
    """Update booking status — tenant-scoped via JWT."""
    try:
        repo    = BookingRepository(prisma_client)
        updated = await repo.update_status(booking_id, current_client["id"], body.status)
        if not updated:
            raise HTTPException(status_code=404, detail="Booking not found")
        return _serialize(updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("🔥 update_booking_status failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update booking status")


# ── PATCH /{id} — general update (status + notes) ────────────────────────────

@router.patch("/{booking_id}")
async def update_booking(
    booking_id:     str,
    body:           AdminBookingUpdate,
    current_client: dict = Depends(get_current_tenant),
):
    try:
        existing = await _booking_repo.find_by_id(booking_id, current_client["id"])
        if not existing:
            raise HTTPException(status_code=404, detail="Booking not found.")

        patch = {}
        if body.status is not None: patch["status"] = body.status
        if body.notes  is not None: patch["notes"]  = body.notes
        if not patch:
            raise HTTPException(status_code=400, detail="No fields to update")

        updated = await _booking_repo.update_patch(booking_id, current_client["id"], patch)
        return _serialize(updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("🔥 update_booking failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update booking")


