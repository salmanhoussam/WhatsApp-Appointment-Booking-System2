"""
Admin Reservations API — /api/v1/admin/reservations/
JWT required. Gated by require_service("reservations").
Lists and manages reservations across all module types.
"""

from datetime import datetime, date, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db.dependencies import get_current_admin_user
from app.core.services import require_service
from app.services import reservation_service

router = APIRouter()

VALID_STATUSES    = ["pending", "confirmed", "arrived", "cancelled", "no_show"]
VALID_MODULE_KEYS = ["restaurant", "services", "real_estate", "hotel"]


class StatusUpdateIn(BaseModel):
    status: str


class RescheduleIn(BaseModel):
    reserved_at: datetime
    barber_id:   Optional[str] = None


class EditReservationIn(BaseModel):
    customer_name:  Optional[str] = None
    customer_phone: Optional[str] = None
    reserved_at:    Optional[datetime] = None
    duration_min:   Optional[int] = None
    barber_id:      Optional[str] = None
    service_id:     Optional[str] = None


class ReservationCreateIn(BaseModel):
    module_key:     str
    customer_name:  str
    customer_phone: str
    customer_email: Optional[str] = None
    reserved_at:    datetime
    duration_min:   Optional[int] = None
    notes:          Optional[str] = None
    metadata:       Optional[dict] = None


# Kept in lockstep with app/api/v1/public/reservations.py's own VALID_MODULE_KEYS -- NOT the
# module-level VALID_MODULE_KEYS declared above (that one is dead code, never referenced anywhere
# in this file; it predates the "clinic"/"barber" module keys and was never updated).
CREATE_VALID_MODULE_KEYS = ["restaurant", "services", "real_estate", "hotel", "clinic", "barber"]


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_reservations(
    module_key: Optional[str] = Query(None, description="restaurant | services | real_estate | hotel"),
    status:     Optional[str] = Query(None),
    date:       Optional[str] = Query(None, description="YYYY-MM-DD — filters by a single day"),
    date_from:  Optional[date] = Query(None, description="YYYY-MM-DD — range start, inclusive"),
    date_to:    Optional[date] = Query(None, description="YYYY-MM-DD — range end, inclusive"),
    limit:      int = Query(50, le=500),
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("reservations")),
):
    range_from = range_to = None
    if date:
        # Existing single-day behavior, unchanged.
        try:
            day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            range_from = day
            range_to   = day + timedelta(days=1)
        except ValueError:
            raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    elif date_from or date_to:
        # New — a 7-day range in one call, for the Reservations Calendar week view.
        if date_from:
            range_from = datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
        if date_to:
            # Inclusive of the whole calendar day, mirroring the single-`date` case above.
            end_day  = datetime(date_to.year, date_to.month, date_to.day, tzinfo=timezone.utc)
            range_to = end_day + timedelta(days=1)

    results = await reservation_service.list_reservations(
        client_id  = str(user.clientId),
        module_key = module_key,
        status     = status,
        date_from  = range_from,
        date_to    = range_to,
        limit      = limit,
    )
    return {"success": True, "data": results}


@router.get("/stats")
async def reservations_stats(
    module_key: Optional[str] = Query(None),
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("reservations")),
):
    """Today's counts per status."""
    today = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    results = await reservation_service.list_reservations(
        client_id  = str(user.clientId),
        module_key = module_key,
        date_from  = today,
        date_to    = today + timedelta(days=1),
        limit      = 500,
    )
    by_status = {s: 0 for s in VALID_STATUSES}
    for r in results:
        s = r["status"]
        if s in by_status:
            by_status[s] += 1

    return {
        "success": True,
        "data": {
            "today_total": len(results),
            "by_status":   by_status,
        },
    }


@router.get("/{reservation_id}")
async def get_reservation(
    reservation_id: str,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("reservations")),
):
    result = await reservation_service.get_reservation(
        client_id      = str(user.clientId),
        reservation_id = reservation_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    return {"success": True, "data": result}


@router.patch("/{reservation_id}/status")
async def update_status(
    reservation_id: str,
    body: StatusUpdateIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("reservations")),
):
    try:
        result = await reservation_service.update_status(
            client_id      = str(user.clientId),
            reservation_id = reservation_id,
            new_status     = body.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not result:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    return {"success": True, "data": result}


@router.patch("/{reservation_id}/reschedule")
async def reschedule(
    reservation_id: str,
    body: RescheduleIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("reservations")),
):
    """Calendar drag-and-drop -- time and/or staff reassignment. All conflict/working-hours
    logic lives in reservation_service.edit_reservation() (renamed from reschedule_reservation(),
    Phase 3.2 -- same function now also backs the full-Edit route below); nothing decided here or
    in the frontend."""
    try:
        result = await reservation_service.edit_reservation(
            client_id       = str(user.clientId),
            reservation_id  = reservation_id,
            new_reserved_at = body.reserved_at,
            new_barber_id   = body.barber_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    if not result:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    return {"success": True, "data": result}


@router.patch("/{reservation_id}")
async def edit_reservation(
    reservation_id: str,
    body: EditReservationIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("reservations")),
):
    """Full Edit (Phase 3.2, 2026-08-05) -- name/phone/service/time/staff/duration, any subset.
    Same reservation_service.edit_reservation() the drag/reschedule route above calls; only the set
    of populated fields differs. Working-hours/conflict checks run only when the schedule (time/
    duration/barber) actually changes -- see the function's own docstring."""
    try:
        result = await reservation_service.edit_reservation(
            client_id           = str(user.clientId),
            reservation_id      = reservation_id,
            new_reserved_at     = body.reserved_at,
            new_barber_id       = body.barber_id,
            new_duration_min    = body.duration_min,
            new_customer_name   = body.customer_name,
            new_customer_phone  = body.customer_phone,
            new_service_id      = body.service_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    if not result:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    return {"success": True, "data": result}


@router.post("/")
async def create_reservation(
    body: ReservationCreateIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("reservations")),
):
    """Admin-side Create (Quick Create, Phase 3.2, 2026-08-05) -- calls the exact same
    reservation_service.create_reservation() the public booking route uses (app/api/v1/public/
    reservations.py:51-80). Same pipeline, same validators, no second write path."""
    if body.module_key not in CREATE_VALID_MODULE_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid module_key. Use: {CREATE_VALID_MODULE_KEYS}",
        )
    # Phase 1.x fix (2026-08-05, same root cause as get_available_slots()'s past-slot filter):
    # body.reserved_at is a naive-local wall-clock value labeled UTC (no real conversion) -- `now`
    # must be built the same way, not the TRUE UTC instant, or this guard is wrong by the tenant's
    # real UTC offset.
    if body.reserved_at < datetime.now().replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot reserve a past time slot.")

    try:
        result = await reservation_service.create_reservation(
            client_id      = str(user.clientId),
            module_key     = body.module_key,
            customer_name  = body.customer_name,
            customer_phone = body.customer_phone,
            customer_email = body.customer_email,
            reserved_at    = body.reserved_at,
            duration_min   = body.duration_min,
            notes          = body.notes,
            metadata       = body.metadata,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    return {"success": True, "data": result}
