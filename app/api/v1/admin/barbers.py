"""
app/api/v1/admin/barbers.py
Admin Barber management — per-barber schedule for the Reservation capability (2nd real
Reservation Strategy case, 2026-07-31). Mounted at /api/v1/admin/barbers.

Built independently of resources.py per Salman's explicit instruction — its own file, its own
schemas, its own CRUD. The Ownership Question was re-asked fresh for Barber rather than copied
from resources.py's own answer, and landed on the same shape:

  GET /barbers                 -> SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS
  POST /barbers                -> SUPER_ADMIN, TENANT_ADMIN
  PATCH /barbers/{id}          -> SUPER_ADMIN, TENANT_ADMIN
  PATCH /barbers/{id}/deactivate -> SUPER_ADMIN, TENANT_ADMIN
  GET /barbers/{id}/services    -> SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS  (Phase 3.7C)
  PATCH /barbers/{id}/services  -> SUPER_ADMIN, TENANT_ADMIN                        (Phase 3.7C)
  No DELETE exposed — same reasoning as resources.py: a hard delete would orphan historical
  Reservation.barberId rows (onDelete: SetNull); deactivate is the supported path.

Ownership reasoning (asked independently for Barber, not inherited from resources.py's answer):
who owns the barber roster? The shop's tenant admin — adding/removing staff, setting their hours,
is a structural decision. Who needs to read it day to day? MANAGER_RESERVATIONS, to know which
barbers exist when handling bookings — read-only, same as units.py/resources.py's own precedent
for an operational role reading a resource it doesn't own.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.tenant import require_roles
from app.core.services import require_service
from app.db.dependencies import get_current_tenant
from app.repositories import barber_repo, barber_service_repo

router = APIRouter(prefix="/barbers", tags=["Admin Barbers"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class BarberCreate(BaseModel):
    name:          str
    phone:         Optional[str] = None
    description:   Optional[str] = None
    image_url:     Optional[str] = None
    working_hours: Optional[dict] = None
    sort_order:    Optional[int] = 0


class BarberUpdate(BaseModel):
    name:          Optional[str] = None
    phone:         Optional[str] = None
    description:   Optional[str] = None
    image_url:     Optional[str] = None
    working_hours: Optional[dict] = None
    sort_order:    Optional[int] = None
    is_active:     Optional[bool] = None


class BarberServicesSet(BaseModel):
    service_ids: list[str]  # CatalogService ids -- deliberately NOT catalog_item_ids, the exact
                             # naming confusion Phase 3.7C exists to eliminate


# ── Serializer ────────────────────────────────────────────────────────────────

def _fmt(b) -> dict:
    return {
        "id":            b.id,
        "name":          b.name,
        "phone":         b.phone,
        "description":   b.description,
        "image_url":     b.imageUrl,
        "is_active":     b.isActive,
        "working_hours": b.workingHours or {},
        "sort_order":    b.sortOrder,
        "created_at":    b.createdAt.isoformat() if b.createdAt else None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_barbers(
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    # STAFF added 2026-08-09 (Staff Scoped Access Phase D fix) -- read-only grant, not an ownership
    # grant. The Calendar needs this list to resolve/render the caller's own barber row; write
    # routes below (create/update/deactivate/set_barber_services) deliberately do NOT include STAFF.
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS", "STAFF")),
):
    barbers = await barber_repo.list_barbers(tenant["id"])
    return {"success": True, "data": [_fmt(b) for b in barbers]}


@router.post("/", status_code=201)
async def create_barber(
    body: BarberCreate,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    from prisma import Json

    data = {
        "clientId":    tenant["id"],  # CRITICAL: always the current tenant
        "name":        body.name,
        "phone":       body.phone,
        "description": body.description,
        "imageUrl":    body.image_url,
        "sortOrder":   body.sort_order or 0,
    }
    if body.working_hours:
        data["workingHours"] = Json(body.working_hours)

    barber = await barber_repo.create_barber(data)
    return {"success": True, "data": _fmt(barber)}


@router.patch("/{barber_id}")
async def update_barber(
    barber_id: str,
    body: BarberUpdate,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    from prisma import Json

    existing = await barber_repo.find_barber(tenant["id"], barber_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Barber not found.")

    patch: dict = {}
    if body.name is not None:
        patch["name"] = body.name
    if body.phone is not None:
        patch["phone"] = body.phone
    if body.description is not None:
        patch["description"] = body.description
    if body.image_url is not None:
        patch["imageUrl"] = body.image_url
    if body.working_hours is not None:
        patch["workingHours"] = Json(body.working_hours)
    if body.sort_order is not None:
        patch["sortOrder"] = body.sort_order
    if body.is_active is not None:
        patch["isActive"] = body.is_active

    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update.")

    updated = await barber_repo.update_barber(barber_id, patch)
    return {"success": True, "data": _fmt(updated)}


@router.patch("/{barber_id}/deactivate")
async def deactivate_barber(
    barber_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    existing = await barber_repo.find_barber(tenant["id"], barber_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Barber not found.")

    updated = await barber_repo.update_barber(barber_id, {"isActive": False})
    return {"success": True, "data": _fmt(updated)}


# ── Staff <-> Service assignment (Phase 3.7C, 2026-08-08) ──────────────────────

@router.get("/{barber_id}/services")
async def get_barber_services(
    barber_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    existing = await barber_repo.find_barber(tenant["id"], barber_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Barber not found.")
    service_ids = await barber_service_repo.list_service_ids_for_barber(tenant["id"], barber_id)
    return {"success": True, "data": service_ids}


@router.patch("/{barber_id}/services")
async def set_barber_services(
    barber_id: str,
    body: BarberServicesSet,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    existing = await barber_repo.find_barber(tenant["id"], barber_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Barber not found.")
    await barber_service_repo.set_services_for_barber(tenant["id"], barber_id, body.service_ids)
    service_ids = await barber_service_repo.list_service_ids_for_barber(tenant["id"], barber_id)
    return {"success": True, "data": service_ids}
