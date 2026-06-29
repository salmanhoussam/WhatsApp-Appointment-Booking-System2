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


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_reservations(
    module_key: Optional[str] = Query(None, description="restaurant | services | real_estate | hotel"),
    status:     Optional[str] = Query(None),
    date:       Optional[str] = Query(None, description="YYYY-MM-DD — filters by day"),
    limit:      int = Query(50, le=200),
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("reservations")),
):
    date_from = date_to = None
    if date:
        try:
            day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            date_from = day
            date_to   = day + timedelta(days=1)
        except ValueError:
            raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")

    results = await reservation_service.list_reservations(
        client_id  = str(user.clientId),
        module_key = module_key,
        status     = status,
        date_from  = date_from,
        date_to    = date_to,
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
