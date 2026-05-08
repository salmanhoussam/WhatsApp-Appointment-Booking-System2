from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

from app.db.client import prisma_client
from app.core.tenant import require_super_admin
from app.core.services import sync_selected_services

router = APIRouter(tags=["Super Admin — Platform Services"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class PlatformServiceCreate(BaseModel):
    key:            str
    module_key:     str
    name_ar:        str
    name_en:        Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    icon:           Optional[str] = None
    monthly_price:  Optional[float] = None
    sort_order:     int = 0

class PlatformServiceUpdate(BaseModel):
    name_ar:        Optional[str] = None
    name_en:        Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    icon:           Optional[str] = None
    monthly_price:  Optional[float] = None
    is_active:      Optional[bool] = None
    sort_order:     Optional[int] = None

class ClientServiceToggle(BaseModel):
    service_key: str
    is_active:   bool


# ── Platform Services CRUD ─────────────────────────────────────────────────────

def _fmt(svc) -> dict:
    return {
        "id":             svc.id,
        "key":            svc.key,
        "module_key":     svc.moduleKey,
        "name_ar":        svc.nameAr,
        "name_en":        svc.nameEn,
        "description_ar": svc.descriptionAr,
        "description_en": svc.descriptionEn,
        "icon":           svc.icon,
        "monthly_price":  float(svc.monthlyPrice) if svc.monthlyPrice is not None else None,
        "is_active":      svc.isActive,
        "sort_order":     svc.sortOrder,
    }


@router.get("/platform-services")
async def list_platform_services(
    _admin = Depends(require_super_admin),
):
    rows = await prisma_client.platformservice.find_many(
        order={"sortOrder": "asc"},
    )
    return {"success": True, "data": [_fmt(r) for r in rows]}


@router.post("/platform-services", status_code=201)
async def create_platform_service(
    body: PlatformServiceCreate,
    _admin = Depends(require_super_admin),
):
    existing = await prisma_client.platformservice.find_unique(where={"key": body.key})
    if existing:
        raise HTTPException(status_code=409, detail=f"Service key '{body.key}' already exists")

    svc = await prisma_client.platformservice.create(data={
        "key":            body.key,
        "moduleKey":      body.module_key,
        "nameAr":         body.name_ar,
        "nameEn":         body.name_en,
        "descriptionAr":  body.description_ar,
        "descriptionEn":  body.description_en,
        "icon":           body.icon,
        "monthlyPrice":   Decimal(str(body.monthly_price)) if body.monthly_price is not None else None,
        "sortOrder":      body.sort_order,
        "isActive":       True,
    })
    return {"success": True, "data": {"id": svc.id, "key": svc.key}}


@router.patch("/platform-services/{service_key}")
async def update_platform_service(
    service_key: str,
    body: PlatformServiceUpdate,
    _admin = Depends(require_super_admin),
):
    svc = await prisma_client.platformservice.find_unique(where={"key": service_key})
    if not svc:
        raise HTTPException(status_code=404, detail="Platform service not found")

    patch = {}
    if body.name_ar        is not None: patch["nameAr"]        = body.name_ar
    if body.name_en        is not None: patch["nameEn"]        = body.name_en
    if body.description_ar is not None: patch["descriptionAr"] = body.description_ar
    if body.description_en is not None: patch["descriptionEn"] = body.description_en
    if body.icon           is not None: patch["icon"]          = body.icon
    if body.monthly_price  is not None: patch["monthlyPrice"]  = Decimal(str(body.monthly_price))
    if body.is_active      is not None: patch["isActive"]      = body.is_active
    if body.sort_order     is not None: patch["sortOrder"]     = body.sort_order

    updated = await prisma_client.platformservice.update(where={"key": service_key}, data=patch)
    return {"success": True, "data": _fmt(updated)}


# ── Client Service Toggle ──────────────────────────────────────────────────────

@router.patch("/clients/{client_id}/services")
async def toggle_client_service(
    client_id: str,
    body: ClientServiceToggle,
    _admin = Depends(require_super_admin),
):
    client = await prisma_client.client.find_unique(where={"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    await prisma_client.clientservice.upsert(
        where={"clientId_serviceKey": {"clientId": client_id, "serviceKey": body.service_key}},
        data={
            "create": {"clientId": client_id, "serviceKey": body.service_key, "isActive": body.is_active},
            "update": {"isActive": body.is_active},
        },
    )

    await sync_selected_services(client_id)

    return {"success": True, "client_id": client_id, "service_key": body.service_key, "is_active": body.is_active}


@router.get("/clients/{client_id}/services")
async def get_client_services(
    client_id: str,
    _admin = Depends(require_super_admin),
):
    client = await prisma_client.client.find_unique(where={"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    rows = await prisma_client.clientservice.find_many(
        where={"clientId": client_id},
        order={"serviceKey": "asc"},
    )
    return {"success": True, "data": [
        {"service_key": r.serviceKey, "is_active": r.isActive, "activated_at": r.activatedAt}
        for r in rows
    ]}
