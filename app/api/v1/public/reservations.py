"""
Public Reservations API — /api/v1/public/reservations/
No auth required. Gated by require_service("reservations").
Works for: restaurant tables, service appointments, property viewings, clinic appointments.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db.dependencies import get_current_tenant
from app.core.services import require_service
from app.services import reservation_service
from app.repositories import resource_repo, barber_repo

router = APIRouter()

VALID_MODULE_KEYS = ["restaurant", "services", "real_estate", "hotel", "clinic", "barber"]


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
    # clinic      → { "resource_id": "uuid", "service_id": "uuid" }  (resource_id also mirrored
    #                to the real Reservation.resourceId FK — see resource_repo.py)
    # barber      → { "barber_id": "uuid", "service_id": "uuid" }  (barber_id also mirrored to the
    #                real Reservation.barberId FK — see barber_repo.py; built independently of
    #                the clinic/resource_id path, 2nd real Reservation Strategy case, 2026-07-31)
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
    if body.reserved_at < datetime.now(timezone.utc):
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


# module_key -> Resource.type — only "clinic" is resource-backed today (RESOURCE_BACKED_MODULE_KEYS
# in reservation_service.py); this map stays in lockstep with that set.
MODULE_KEY_TO_RESOURCE_TYPE = {"clinic": "doctor"}


@router.get("/resources")
async def list_public_resources(
    module_key: str = Query(...),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    """List active Resources for a moduleKey — e.g. a 'choose your doctor' picker for clinic
    bookings. Only active resources are ever returned publicly."""
    resource_type = MODULE_KEY_TO_RESOURCE_TYPE.get(module_key)
    if not resource_type:
        return {"success": True, "data": []}

    resources = await resource_repo.list_resources(tenant["id"], resource_type=resource_type, active_only=True)
    return {
        "success": True,
        "data": [
            {"id": r.id, "name": r.name, "specialty": r.specialty, "type": r.type}
            for r in resources
        ],
    }


@router.get("/barbers")
async def list_public_barbers(
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    """List active Barbers for this tenant — e.g. a 'choose your barber' picker for barber
    bookings. Written as its own endpoint rather than folded into /resources above, per the
    independent-build instruction (2026-07-31) — there's no module_key/resource_type mapping to
    look up here, since barber isn't a Resource.type value at all."""
    barbers = await barber_repo.list_barbers(tenant["id"], active_only=True)
    return {
        "success": True,
        "data": [{"id": b.id, "name": b.name} for b in barbers],
    }


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
