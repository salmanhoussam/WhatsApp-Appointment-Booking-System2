"""
app/api/v1/admin/catalog_services.py
Admin CatalogService management — the "something a customer books a Reservation for" side of the
Service/Item split (Phase 3.7C, 2026-08-08). Mounted at /api/v1/admin/catalog-services. Named
catalog_services.py / prefix "/catalog-services", not services.py / "/services" -- that route
already exists for the unrelated smar property add-on Service model.

Same require_roles gate as admin/barbers.py -- Services are read by the same operational role
that reads Barbers/Staff today (MANAGER_RESERVATIONS), written by TENANT_ADMIN/SUPER_ADMIN.
No DELETE exposed -- same reasoning as barbers.py: a hard delete would orphan historical
Reservation.serviceId rows (onDelete: SetNull); deactivate (is_active: false via PATCH) is the
supported path.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.tenant import require_roles
from app.core.services import require_service
from app.db.dependencies import get_current_tenant
from app.services import catalog_service_service

router = APIRouter(prefix="/catalog-services", tags=["Admin Catalog Services"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CatalogServiceCreate(BaseModel):
    category_id:    str
    name_ar:        str
    name_en:        Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    image_url:      Optional[str] = None
    price:          Optional[float] = None
    currency:       str = "USD"
    duration_min:   int = 30
    is_featured:    bool = False
    sort_order:     int = 0


class CatalogServiceUpdate(BaseModel):
    name_ar:        Optional[str] = None
    name_en:        Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    image_url:      Optional[str] = None
    price:          Optional[float] = None
    currency:       Optional[str] = None
    duration_min:   Optional[int] = None
    is_featured:    Optional[bool] = None
    is_active:      Optional[bool] = None
    sort_order:     Optional[int] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_catalog_services(
    include_inactive: bool = Query(False),
    category_id:      Optional[str] = Query(None),
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    data = await catalog_service_service.admin_list_services(tenant["id"], include_inactive, category_id)
    return {"success": True, "data": data}


@router.post("/", status_code=201)
async def create_catalog_service(
    body: CatalogServiceCreate,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    data = await catalog_service_service.admin_create_service(
        client_id=tenant["id"], category_id=body.category_id, name_ar=body.name_ar,
        name_en=body.name_en, description_ar=body.description_ar, description_en=body.description_en,
        image_url=body.image_url, price=body.price, currency=body.currency,
        duration_min=body.duration_min, is_featured=body.is_featured, sort_order=body.sort_order,
    )
    return {"success": True, "data": data}


@router.patch("/{service_id}")
async def update_catalog_service(
    service_id: str,
    body: CatalogServiceUpdate,
    tenant: dict = Depends(get_current_tenant),
    _svc: dict   = Depends(require_service("reservations")),
    _user: dict  = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    data = await catalog_service_service.admin_update_service(
        client_id=tenant["id"], service_id=service_id, name_ar=body.name_ar, name_en=body.name_en,
        description_ar=body.description_ar, description_en=body.description_en,
        image_url=body.image_url, price=body.price, currency=body.currency,
        duration_min=body.duration_min, is_featured=body.is_featured, is_active=body.is_active,
        sort_order=body.sort_order,
    )
    return {"success": True, "data": data}
