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
    logic lives in reservation_service.reschedule_reservation(), reused from create_reservation();
    nothing decided here or in the frontend."""
    try:
        result = await reservation_service.reschedule_reservation(
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
