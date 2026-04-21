"""
app/api/v1/admin/services.py
Admin service management — list, create, update, toggle, delete.
Mounted at: /api/v1/admin/services
Auth:       JWT via get_current_tenant
Tenancy:    every query filtered by clientId from the token
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant

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
    return {
        "id":          s.id,
        "name_ar":     s.name_ar,
        "name_en":     s.name_en,
        "description": getattr(s, "description", None),
        "image_url":   getattr(s, "image_url",   None),
        "duration":    getattr(s, "duration",    None),
        "base_price":  float(s.basePrice),
        "currency":    s.currency,
        "sort_order":  getattr(s, "sort_order",  0),
        "is_active":   s.isActive,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_services(tenant: dict = Depends(get_current_tenant)):
    services = await prisma_client.service.find_many(
        where={"clientId": tenant["id"]},
        order=[{"sort_order": "asc"}, {"createdAt": "asc"}],
    )
    return [_fmt(s) for s in services]


@router.post("/", status_code=201)
async def create_service(
    body: ServiceCreate,
    tenant: dict = Depends(get_current_tenant),
):
    prop = await prisma_client.property.find_first(
        where={"clientId": tenant["id"], "isActive": True},
        order={"createdAt": "asc"},
    )

    service = await prisma_client.service.create(
        data={
            "clientId":    tenant["id"],
            "propertyId":  prop.id if prop else None,
            "name_ar":     body.name_ar,
            "name_en":     body.name_en,
            "description": body.description,
            "image_url":   body.image_url,
            "duration":    body.duration,
            "basePrice":   body.base_price,
            "currency":    body.currency or tenant.get("currency", "SAR"),
            "sort_order":  body.sort_order,
            "isActive":    True,
        }
    )
    return _fmt(service)


@router.patch("/{service_id}")
async def update_service(
    service_id: str,
    body: ServiceUpdate,
    tenant: dict = Depends(get_current_tenant),
):
    existing = await prisma_client.service.find_first(
        where={"id": service_id, "clientId": tenant["id"]}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found.")

    patch: dict = {}
    if body.name_ar     is not None: patch["name_ar"]     = body.name_ar
    if body.name_en     is not None: patch["name_en"]     = body.name_en
    if body.description is not None: patch["description"] = body.description
    if body.image_url   is not None: patch["image_url"]   = body.image_url
    if body.duration    is not None: patch["duration"]    = body.duration
    if body.base_price  is not None: patch["basePrice"]   = body.base_price
    if body.currency    is not None: patch["currency"]    = body.currency
    if body.sort_order  is not None: patch["sort_order"]  = body.sort_order
    if body.is_active   is not None: patch["isActive"]    = body.is_active

    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update.")

    updated = await prisma_client.service.update(
        where={"id": service_id},
        data=patch,
    )
    return _fmt(updated)


@router.delete("/{service_id}", status_code=204)
async def delete_service(
    service_id: str,
    tenant: dict = Depends(get_current_tenant),
):
    existing = await prisma_client.service.find_first(
        where={"id": service_id, "clientId": tenant["id"]}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found.")

    await prisma_client.service.delete(where={"id": service_id})
