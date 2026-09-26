"""
app/api/v1/admin/resources.py
Admin Resource management — per-resource schedule for the Reservation capability
(a doctor today). Mounted at /api/v1/admin/resources.

Authorization (established from day one — Authorization Hardening pattern, 2026-07-30):
  GET /resources                 -> SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS
  POST /resources                -> SUPER_ADMIN, TENANT_ADMIN
  PATCH /resources/{id}          -> SUPER_ADMIN, TENANT_ADMIN
  PATCH /resources/{id}/deactivate -> SUPER_ADMIN, TENANT_ADMIN
  GET   /resources/{id}/services   -> SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS
  PATCH /resources/{id}/services   -> SUPER_ADMIN, TENANT_ADMIN
  No DELETE exposed this pass — a hard delete would silently orphan historical
  Reservation.resourceId rows (onDelete: SetNull); deactivate is the supported path.

Ownership reasoning (same "who owns this resource" question already applied to team.py/units.py
this session): Resources exist to serve the Reservation capability specifically, so
MANAGER_RESERVATIONS gets read access (needs to know which doctors exist to do their job) but not
write access — creating/editing a resource (and its working hours) is a structural decision,
closer to units.py's TENANT_ADMIN-only creation ownership than day-to-day reservation handling.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.tenant import require_roles
from app.core.services import require_service
from app.db.dependencies import get_current_tenant
from app.repositories import resource_repo
from app.repositories import resource_service_repo, catalog_service_repo

router = APIRouter(prefix="/resources", tags=["Admin Resources"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ResourceCreate(BaseModel):
    type:          str
    name:          str
    specialty:     Optional[str] = None
    phone:         Optional[str] = None
    working_hours: Optional[dict] = None
    sort_order:    Optional[int] = 0


class ResourceUpdate(BaseModel):
    name:          Optional[str] = None
    specialty:     Optional[str] = None
    phone:         Optional[str] = None
    working_hours: Optional[dict] = None
    sort_order:    Optional[int] = None
    is_active:     Optional[bool] = None


# ── Serializer ────────────────────────────────────────────────────────────────

def _fmt(r) -> dict:
    return {
        "id":            r.id,
        "type":          r.type,
        "name":          r.name,
        "specialty":     r.specialty,
        "phone":         r.phone,
        "is_active":     r.isActive,
        "working_hours": r.workingHours or {},
        "sort_order":    r.sortOrder,
        "created_at":    r.createdAt.isoformat() if r.createdAt else None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_resources(
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    resources = await resource_repo.list_resources(tenant["id"])
    return {"success": True, "data": [_fmt(r) for r in resources]}


@router.post("/", status_code=201)
async def create_resource(
    body: ResourceCreate,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    from prisma import Json

    data = {
        "clientId":  tenant["id"],  # CRITICAL: always the current tenant
        "type":      body.type,
        "name":      body.name,
        "specialty": body.specialty,
        "phone":     body.phone,
        "sortOrder": body.sort_order or 0,
    }
    if body.working_hours:
        data["workingHours"] = Json(body.working_hours)

    resource = await resource_repo.create_resource(data)
    return {"success": True, "data": _fmt(resource)}


@router.patch("/{resource_id}")
async def update_resource(
    resource_id: str,
    body: ResourceUpdate,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    from prisma import Json

    existing = await resource_repo.find_resource(tenant["id"], resource_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Resource not found.")

    patch: dict = {}
    if body.name is not None:
        patch["name"] = body.name
    if body.specialty is not None:
        patch["specialty"] = body.specialty
    if body.phone is not None:
        patch["phone"] = body.phone
    if body.working_hours is not None:
        patch["workingHours"] = Json(body.working_hours)
    if body.sort_order is not None:
        patch["sortOrder"] = body.sort_order
    if body.is_active is not None:
        patch["isActive"] = body.is_active

    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update.")

    updated = await resource_repo.update_resource(resource_id, tenant["id"], patch)
    return {"success": True, "data": _fmt(updated)}


@router.patch("/{resource_id}/deactivate")
async def deactivate_resource(
    resource_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    existing = await resource_repo.find_resource(tenant["id"], resource_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Resource not found.")

    updated = await resource_repo.update_resource(resource_id, tenant["id"], {"isActive": False})
    return {"success": True, "data": _fmt(updated)}


# ── Resource <-> Service eligibility (Clinic P5-B, 2026-09-26) ─────────────────
#
# The write side of `resource_services`. Until now the table existed, the strict rule was
# enforced in the availability reader AND the booking writer, and NOTHING could put a row in it --
# so every clinic offered zero doctors. Correct behaviour (ق-٤-ز), and unusable.
#
# Mirrors admin/barbers.py's two routes in shape, deliberately not by import: the barber and
# resource paths stay separate even where they end up looking alike. Two differences are real:
#
#   1. THE GATE STYLE IS THIS FILE'S, NOT barbers.py's. That file uses require_permission
#      ("staff.read"/"staff.write"); this one has used require_roles since day one. Mixing two
#      gate styles inside one file is exactly how two gates drift apart, and moving resources.py
#      onto the permission model is a change to authorization -- P7's own security gate, not a
#      side effect of a clinic phase. The divergence is named here rather than silently resolved.
#
#   2. 🔴 THE SERVICE IDS ARE VALIDATED AGAINST THE TENANT. The barber equivalent writes whatever
#      it is handed; `resource_services.service_id` has a real FK to catalog_services(id) which is
#      NOT tenant-scoped, so another tenant's service id would insert happily and sit there
#      forever, pointing across a tenant boundary. rules/global.md admits no exception to
#      "every query filters by clientId", and the clinic has zero live rows, so it pays nothing
#      for being strict. The barber's own hole is NOT repaired here -- that is the barber's debt,
#      and this vertical's contract forbids fixing it from inside the clinic.


class ResourceServicesSet(BaseModel):
    service_ids: list[str]  # CatalogService ids -- never catalog_item_ids


@router.get("/{resource_id}/services")
async def get_resource_services(
    resource_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    """Which CatalogServices this resource performs. An empty list means it performs NONE of
    them -- never 'we could not tell' (ق-٤-ز)."""
    existing = await resource_repo.find_resource(tenant["id"], resource_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Resource not found.")
    service_ids = await resource_service_repo.list_service_ids_for_resource(tenant["id"], resource_id)
    return {"success": True, "data": service_ids}


@router.patch("/{resource_id}/services")
async def set_resource_services(
    resource_id: str,
    body: ResourceServicesSet,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Full replace -- this resource performs exactly these services, and nothing else.

    A full replace rather than add/remove because that is the shape the question has: a checkbox
    list saved as a whole. It also makes 'this doctor performs nothing' expressible, by sending an
    empty list -- which the strict rule turns into 'he is offered for nothing', deliberately.
    """
    existing = await resource_repo.find_resource(tenant["id"], resource_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Resource not found.")

    # Every id, before writing any of them -- so a bad id in the middle cannot leave the resource
    # half-assigned. `set_services_for_resource` deletes before it creates.
    for sid in body.service_ids:
        if not await catalog_service_repo.find_catalog_service(tenant["id"], sid):
            raise HTTPException(status_code=404, detail=f"Service not found for this tenant: {sid}")

    await resource_service_repo.set_services_for_resource(tenant["id"], resource_id, body.service_ids)
    service_ids = await resource_service_repo.list_service_ids_for_resource(tenant["id"], resource_id)
    return {"success": True, "data": service_ids}
