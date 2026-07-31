"""
app/api/v1/admin/resources.py
Admin Resource management — per-resource schedule for the Reservation capability
(a doctor today). Mounted at /api/v1/admin/resources.

Authorization (established from day one — Authorization Hardening pattern, 2026-07-30):
  GET /resources                 -> SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS
  POST /resources                -> SUPER_ADMIN, TENANT_ADMIN
  PATCH /resources/{id}          -> SUPER_ADMIN, TENANT_ADMIN
  PATCH /resources/{id}/deactivate -> SUPER_ADMIN, TENANT_ADMIN
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

    updated = await resource_repo.update_resource(resource_id, patch)
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

    updated = await resource_repo.update_resource(resource_id, {"isActive": False})
    return {"success": True, "data": _fmt(updated)}
