"""
app/api/v1/admin/services.py
Admin service management — list, create, update, toggle, delete.
Mounted at: /api/v1/admin/services
Auth:       JWT via get_current_tenant
Tenancy:    every query filtered by clientId from the token

Authorization (Authorization Hardening, 2026-07-31):
  GET /                        -> SUPER_ADMIN, TENANT_ADMIN, MANAGER_UNITS, MANAGER_RESERVATIONS
  POST/PATCH/DELETE            -> SUPER_ADMIN, TENANT_ADMIN, MANAGER_UNITS

Ownership reasoning: confirmed by reading the code (service_repo has no other caller anywhere in
the codebase) that this file is exclusively the property/unit-scoped add-on path (create_service
auto-assigns propertyId via find_first_property) — Clinic/Barber's Service rows are seeded
directly, never through this route. Write ownership stays with MANAGER_UNITS (matches this file's
real current scope); MANAGER_RESERVATIONS gets read-only, since a reservations manager may need to
see/reference available services (no PII/pricing-sensitive risk in a read-only Service listing).
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.db.dependencies import get_current_tenant
from app.core.tenant import require_roles
from app.repositories import service_repo as _repo

router = APIRouter(prefix="/services", tags=["Admin Services"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class ServiceCreate(BaseModel):
    name_ar:     str
    name_en:     str
    description: Optional[str]  = None
    image_url:   Optional[str]  = None
    duration:    Optional[int]  = None
    base_price:  float
    currency:    Optional[str]  = "SAR"
    sort_order:  Optional[int]  = 0


class ServiceUpdate(BaseModel):
    name_ar:     Optional[str]   = None
    name_en:     Optional[str]   = None
    description: Optional[str]   = None
    image_url:   Optional[str]   = None
    duration:    Optional[int]   = None
    base_price:  Optional[float] = None
    currency:    Optional[str]   = None
    sort_order:  Optional[int]   = None
    is_active:   Optional[bool]  = None


# ── Serialiser ─────────────────────────────────────────────────────────────────

def _fmt(s) -> dict:
    """Serialise a CatalogService row into this route's long-standing response shape.

    Data Model Consolidation Phase 2c (2026-09-07): the underlying model changed from the legacy
    `Service` to `CatalogService`, and the field names differ (nameAr / price / durationMin /
    descriptionAr / imageUrl / sortOrder). The RESPONSE KEYS are deliberately unchanged, so
    smar's ServicesTab.jsx -- the only consumer of this route -- needs no edit and cannot break
    on a rename. The mapping lives here, at the boundary, rather than leaking into the UI.
    """
    return {
        "id":          s.id,
        "name_ar":     s.nameAr,
        "name_en":     s.nameEn,
        "description": s.descriptionAr,
        "image_url":   s.imageUrl,
        "duration":    s.durationMin,
        "base_price":  float(s.price) if s.price is not None else 0.0,
        "currency":    s.currency,
        "sort_order":  s.sortOrder,
        "is_active":   s.isActive,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_services(
    tenant: dict = Depends(get_current_tenant),
    _user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_UNITS", "MANAGER_RESERVATIONS")),
):
    services = await _repo.list_services(tenant["id"])
    return [_fmt(s) for s in services]


@router.post("/", status_code=201)
async def create_service(
    body: ServiceCreate,
    tenant: dict = Depends(get_current_tenant),
    _user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_UNITS")),
):
    prop = await _repo.find_first_property(tenant["id"])
    # CatalogService.categoryId is NOT NULL -- a real requirement of the target model that the
    # legacy Service row did not have. Reuses the tenant's own 'الخدمات' category, the same one the
    # Phase 2b migration landed the existing rows in.
    category = await _repo.find_or_create_services_category(tenant["id"])

    service = await _repo.create_service(data={
        "clientId":      tenant["id"],
        "categoryId":    category.id,
        "propertyId":    prop.id if prop else None,
        "nameAr":        body.name_ar,
        "nameEn":        body.name_en,
        "descriptionAr": body.description,
        "imageUrl":      body.image_url,
        # durationMin is NOT NULL on CatalogService. A stay add-on genuinely has no slot length,
        # so the model's own default stands in when the caller sends none -- the same value the
        # Phase 2b migration used for smar's seven rows, for the same reason.
        "durationMin":   body.duration if body.duration is not None else 30,
        "price":         body.base_price,
        "currency":      body.currency or tenant.get("currency", "SAR"),
        "sortOrder":     body.sort_order,
        "isActive":      True,
    })
    return _fmt(service)


@router.patch("/{service_id}")
async def update_service(
    service_id: str,
    body: ServiceUpdate,
    tenant: dict = Depends(get_current_tenant),
    _user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_UNITS")),
):
    existing = await _repo.find_service(tenant["id"], service_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found.")

    patch: dict = {}
    # Request keys stay as they were; only the column names on the right changed with the model.
    if body.name_ar     is not None: patch["nameAr"]        = body.name_ar
    if body.name_en     is not None: patch["nameEn"]        = body.name_en
    if body.description is not None: patch["descriptionAr"] = body.description
    if body.image_url   is not None: patch["imageUrl"]      = body.image_url
    if body.duration    is not None: patch["durationMin"]   = body.duration
    if body.base_price  is not None: patch["price"]         = body.base_price
    if body.currency    is not None: patch["currency"]      = body.currency
    if body.sort_order  is not None: patch["sortOrder"]     = body.sort_order
    if body.is_active   is not None: patch["isActive"]      = body.is_active

    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update.")

    updated = await _repo.update_service(service_id, tenant["id"], patch)
    return _fmt(updated)


@router.delete("/{service_id}", status_code=204)
async def delete_service(
    service_id: str,
    tenant: dict = Depends(get_current_tenant),
    _user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_UNITS")),
):
    existing = await _repo.find_service(tenant["id"], service_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found.")

    await _repo.delete_service(service_id, tenant["id"])
