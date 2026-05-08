"""
Public Reservations API — /api/v1/public/reservations/
No auth required. Gated by require_service("reservations").
Works for: restaurant tables, service appointments, property viewings.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db.dependencies import get_current_tenant
from app.core.services import require_service
from app.services import reservation_service

router = APIRouter()

VALID_MODULE_KEYS = ["restaurant", "services", "real_estate", "hotel"]


# ── Schemas ───────────────────────────────────────────────────────────────────

class ReservationIn(BaseModel):
    module_key:     str
    customer_name:  str
    customer_phone: str
    customer_email: Optional[str] = None
    reserved_at:    datetime
    duration_min:   Optional[int] = None
    notes:          Optional[str] = None
    # module-specific:
    # restaurant  → { "table_label": "A4", "party_size": 4 }
    # services    → { "service_name": "...", "staff_id": "..." }
    # real_estate → { "unit_id": "...", "guests": 2, "viewing_type": "in_person" }
    metadata:       Optional[dict] = None


class CancelIn(BaseModel):
    customer_phone: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/")
async def create_reservation(
    body: ReservationIn,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    if body.module_key not in VALID_MODULE_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid module_key. Use: {VALID_MODULE_KEYS}",
        )
    if body.reserved_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Cannot reserve a past time slot.")

    try:
        result = await reservation_service.create_reservation(
            client_id      = tenant["id"],
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


@router.get("/{reservation_id}")
async def get_reservation(
    reservation_id: str,
    customer_phone: str = Query(..., description="Required for customer verification"),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    result = await reservation_service.get_reservation(
        client_id       = tenant["id"],
        reservation_id  = reservation_id,
        customer_phone  = customer_phone,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    return {"success": True, "data": result}


@router.patch("/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: str,
    body: CancelIn,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    """Customer self-cancellation — verified by phone number."""
    cancelled = await reservation_service.cancel_by_customer(
        client_id      = tenant["id"],
        reservation_id = reservation_id,
        customer_phone = body.customer_phone,
    )
    if not cancelled:
        raise HTTPException(
            status_code=404,
            detail="Reservation not found, already cancelled, or phone mismatch.",
        )
    return {"success": True, "data": {"status": "cancelled"}}
