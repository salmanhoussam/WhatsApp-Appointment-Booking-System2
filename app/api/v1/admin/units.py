"""
app/api/v1/admin/units.py
Admin unit management — list all, toggle availability, create, block dates.

Mounted at: /api/v1/admin/units  (prefix on router)
Auth:       any valid tenant JWT via get_current_tenant
Tenancy:    every query filtered by clientId from the token
"""

from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Any
from prisma import Json
from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.services.storage_service import (
    upload_unit_image as _svc_upload,
    delete_unit_image as _svc_delete,
)
from app.repositories import UnitRepository, BookingRepository, CustomerRepository
from app.repositories import price_repo as _price_repo

_unit_repo     = UnitRepository(prisma_client)
_booking_repo  = BookingRepository(prisma_client)
_customer_repo = CustomerRepository(prisma_client)

router = APIRouter(prefix="/units", tags=["Admin Units"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class ImageDeleteRequest(BaseModel):
    url: str


class UnitUpdate(BaseModel):
    """PATCH body — send only the field(s) you want to change."""
    name:           Optional[str]   = None
    name_ar:        Optional[str]   = None
    name_en:        Optional[str]   = None
    type:           Optional[str]   = None
    unit_type:      Optional[str]   = None
    capacity:       Optional[int]   = None
    beds:           Optional[int]   = None
    bedrooms:       Optional[int]   = None
    baths:          Optional[int]   = None
    bathrooms:      Optional[int]   = None
    price:          Optional[float] = None
    price_label:    Optional[str]   = None
    images:         Optional[List[str]] = None
    is_available:   Optional[bool]  = None
    is_active:      Optional[bool]  = None
    # ── Dynamic Content (Block Builder) ────────────────────────────────────────
    category:       Optional[str]   = None
    description_ar: Optional[str]   = None
    description_en: Optional[str]   = None
    content_blocks: Optional[Any]   = None   # JSON array of {type, content, style?}
    amenities:      Optional[Any]   = None   # JSON array of {icon, label}
    rules_policies: Optional[Any]   = None   # JSON {checkIn, checkOut, cancellation, rules[]}


class BlockDatesRequest(BaseModel):
    check_in:  date
    check_out: date
    reason:    Optional[str] = None


class DateOverrideRequest(BaseModel):
    """
    Upsert price/availability for every day in [start_date, end_date].
    - is_blocked=True, custom_price=None  → blocks the range (available=False, price=0)
    - is_blocked=False, custom_price=350  → opens the range with a custom price
    - is_blocked=False, custom_price=None → opens the range at 0 price (clears prior block)
    Uses the existing Price model (@@unique unitId+date) — no migration needed.
    """
    start_date:   date
    end_date:     date
    custom_price: Optional[float] = None
    is_blocked:   bool            = False
    reason:       Optional[str]   = None


class UnitCreate(BaseModel):
    name_ar:        str
    name_en:        Optional[str]   = None
    unit_type:      Optional[str]   = "chalet"
    capacity:       int             = 2
    bedrooms:       Optional[int]   = None
    bathrooms:      Optional[int]   = None
    price:          Optional[float] = None
    price_label:    Optional[str]   = None
    image_url:      Optional[str]   = None
    images:         Optional[List[str]] = None
    sort_order:     Optional[int]   = 0
    # ── Dynamic Content (Block Builder) ────────────────────────────────────────
    category:       Optional[str]   = None
    description_ar: Optional[str]   = None
    description_en: Optional[str]   = None
    content_blocks: Optional[Any]   = None
    amenities:      Optional[Any]   = None
    rules_policies: Optional[Any]   = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fmt(unit) -> dict:
    """Serialize a Prisma Unit to a plain dict the frontend expects."""
    return {
        "id":             unit.id,
        "name_ar":        unit.name_ar,
        "name_en":        unit.name_en,
        "unit_type":      getattr(unit, "unit_type",   "chalet"),
        "capacity":       unit.capacity,
        "bedrooms":       unit.bedrooms,
        "bathrooms":      unit.bathrooms,
        "image_url":      unit.image_url,
        "sort_order":     getattr(unit, "sort_order",  0),
        "is_active":      unit.isActive,
        "is_available":   unit.isAvailable,
        "position_x":     getattr(unit, "position_x", None),
        "position_y":     getattr(unit, "position_y", None),
        "images":         getattr(unit, "images", []),
        "price":          float(unit.price) if unit.price is not None else None,
        "price_label":    getattr(unit, "price_label", None),
        # ── Dynamic Content (Block Builder) ────────────────────────────────────
        "category":       getattr(unit, "category", None),
        "description_ar": getattr(unit, "description_ar", None),
        "description_en": getattr(unit, "description_en", None),
        "content_blocks": getattr(unit, "content_blocks", None),
        "amenities":      getattr(unit, "amenities", None),
        "rules_policies": getattr(unit, "rules_policies", None),
    }


# ── Routes — collection endpoints FIRST, then item endpoints ──────────────────

@router.get("/")
async def list_units(tenant: dict = Depends(get_current_tenant)):
    """Return ALL units for this tenant (active + inactive) — admin view."""
    units = await _unit_repo.get_all_admin(tenant["id"])
    return [_fmt(u) for u in units]


@router.post("/", status_code=201)
async def create_unit(
    body: UnitCreate,
    tenant: dict = Depends(get_current_tenant),
):
    """
    Create a new unit.
    propertyId is auto-resolved to the tenant's first active property.
    """
    prop = await _unit_repo.find_first_active_property(tenant["id"])
    if not prop:
        raise HTTPException(
            status_code=422,
            detail="No active property found for this tenant. Create a property first."
        )

    unit = await _unit_repo.create_unit(data={
        "clientId":       tenant["id"],
        "propertyId":     prop.id,
        "name_ar":        body.name_ar,
        "name_en":        body.name_en,
        "unit_type":      body.unit_type,
        "capacity":       body.capacity,
        "bedrooms":       body.bedrooms,
        "bathrooms":      body.bathrooms,
        "image_url":      body.images[0] if body.images and len(body.images) > 0 else body.image_url,
        "images":         body.images if body.images else [],
        "price":          body.price,
        "price_label":    body.price_label,
        "sort_order":     body.sort_order,
        "isActive":       True,
        "isAvailable":    True,
        # ── Dynamic Content (Block Builder) ────────────────────────────────
        "category":       body.category,
        "description_ar": body.description_ar,
        "description_en": body.description_en,
        "content_blocks": Json(body.content_blocks) if body.content_blocks is not None else None,
        "amenities":      Json(body.amenities)      if body.amenities      is not None else None,
        "rules_policies": Json(body.rules_policies) if body.rules_policies is not None else None,
    })
    return _fmt(unit)


@router.patch("/{unit_id}")
async def update_unit(
    unit_id: str,
    body: UnitUpdate,
    tenant: dict = Depends(get_current_tenant),
):
    """Update unit details (toggles, names, capacity, amenities, images)."""
    # Verify ownership before updating
    existing = await _unit_repo.get_by_id(unit_id, tenant["id"])
    if not existing:
        raise HTTPException(status_code=404, detail="Unit not found.")

    patch: dict = {}
    if body.is_available is not None:
        patch["isAvailable"] = body.is_available
    if body.is_active is not None:
        patch["isActive"] = body.is_active
    
    name_ar = body.name_ar or body.name
    if name_ar is not None:
        patch["name_ar"] = name_ar
    if body.name_en is not None:
        patch["name_en"] = body.name_en
        
    unit_type = body.unit_type or body.type
    if unit_type is not None:
        patch["unit_type"] = unit_type
        
    if body.capacity is not None:
        patch["capacity"] = body.capacity
        
    beds = body.bedrooms if body.bedrooms is not None else body.beds
    if beds is not None:
        patch["bedrooms"] = beds
        
    baths = body.bathrooms if body.bathrooms is not None else body.baths
    if baths is not None:
        patch["bathrooms"] = baths
        
    if body.images is not None:
        patch["images"] = body.images
        patch["image_url"] = body.images[0] if body.images else None

    if body.price is not None:
        patch["price"] = body.price
    if body.price_label is not None:
        patch["price_label"] = body.price_label

    # ── Dynamic Content (Block Builder) ────────────────────────────────────
    if body.category is not None:
        patch["category"] = body.category
    if body.description_ar is not None:
        patch["description_ar"] = body.description_ar
    if body.description_en is not None:
        patch["description_en"] = body.description_en
    if body.content_blocks is not None:
        patch["content_blocks"] = Json(body.content_blocks)
    if body.amenities is not None:
        patch["amenities"] = Json(body.amenities)
    if body.rules_policies is not None:
        patch["rules_policies"] = Json(body.rules_policies)

    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update.")

    updated = await _unit_repo.update_raw(unit_id, patch)
    return _fmt(updated)


@router.post("/{unit_id}/block-dates", status_code=201)
async def block_dates(
    unit_id: str,
    body: BlockDatesRequest,
    tenant: dict = Depends(get_current_tenant),
):
    """
    Create a 'blocked' booking for a date range (maintenance, seasonal closure, etc.).
    Uses an upsert on a system customer (phone=__block__{client_id}) so the non-null
    customerId constraint is satisfied without polluting the real customer table.
    """
    if body.check_in >= body.check_out:
        raise HTTPException(status_code=400, detail="check_out must be after check_in.")

    # Verify unit belongs to this tenant
    unit = await _unit_repo.get_by_id(unit_id, tenant["id"])
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")

    # Resolve (or create) a deterministic system customer for blocked records
    system_phone    = f"__block__{tenant['id']}"
    system_customer = await _customer_repo.upsert_system_customer(tenant["id"], system_phone)

    # Expand the blocked range so we can build the list of dates for the response
    blocked_dates: List[str] = []
    cursor = body.check_in
    while cursor < body.check_out:
        blocked_dates.append(cursor.strftime("%Y-%m-%d"))
        cursor += timedelta(days=1)

    booking = await _booking_repo.create_block(data={
        "clientId":   tenant["id"],
        "unitId":     unit_id,
        "customerId": system_customer.id,
        "checkIn":    body.check_in.isoformat(),
        "checkOut":   body.check_out.isoformat(),
        "guests":     0,
        "totalPrice": 0,
        "status":     "blocked",
        "notes":      body.reason or "Admin block",
    })

    return {
        "booking_id":    booking.id,
        "unit_id":       unit_id,
        "check_in":      body.check_in.isoformat(),
        "check_out":     body.check_out.isoformat(),
        "blocked_dates": blocked_dates,
        "reason":        body.reason,
    }


@router.post("/{unit_id}/date-overrides", status_code=201)
async def set_date_overrides(
    unit_id: str,
    body: DateOverrideRequest,
    tenant: dict = Depends(get_current_tenant),
):
    """
    Upsert Price records for [start_date, end_date] (inclusive).
    Deletes any existing Price rows for this unit+range then bulk-creates new ones.
    This powers both dynamic pricing AND admin date-blocking from the calendar UI.
    """
    if body.start_date > body.end_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date.")

    unit = await _unit_repo.get_by_id(unit_id, tenant["id"])
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")

    from app.services.price_service import to_datetime_start

    # Build per-day records
    records: List[dict] = []
    cursor = body.start_date
    while cursor <= body.end_date:
        records.append({
            "clientId":  tenant["id"],
            "unitId":    unit_id,
            "date":      to_datetime_start(cursor),
            "price":     body.custom_price if body.custom_price is not None else 0,
            "currency":  "SAR",
            "available": not body.is_blocked,
        })
        cursor += timedelta(days=1)

    # Delete existing rows for this range, then bulk-insert
    await _price_repo.delete_price_range(
        tenant["id"], unit_id,
        to_datetime_start(body.start_date),
        to_datetime_start(body.end_date),
    )
    await _price_repo.bulk_create_prices(records)

    days = len(records)
    return {
        "unit_id":      unit_id,
        "start_date":   body.start_date.isoformat(),
        "end_date":     body.end_date.isoformat(),
        "days_updated": days,
        "is_blocked":   body.is_blocked,
        "custom_price": body.custom_price,
    }


@router.post("/{unit_id}/images", status_code=201)
async def upload_image(
    unit_id: str,
    file: UploadFile = File(...),
    tenant: dict = Depends(get_current_tenant),
):
    """
    Upload an image for a unit to Supabase Storage.
    Appends the returned public URL to Unit.images and updates Unit.image_url
    to the first image in the array.
    """
    unit = await _unit_repo.get_by_id(unit_id, tenant["id"])
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")

    file_bytes = await file.read()

    public_url = await _svc_upload(
        client_slug=tenant["slug"],
        unit_id=unit_id,
        file_bytes=file_bytes,
        content_type=file.content_type or "image/jpeg",
        original_filename=file.filename or "image.jpg",
    )

    current_images = list(getattr(unit, "images", []) or [])
    new_images = current_images + [public_url]

    updated = await _unit_repo.update_raw(unit_id, {"images": new_images, "image_url": new_images[0]})
    return {"images": list(updated.images), "image_url": updated.image_url}


@router.delete("/{unit_id}/images")
async def delete_image(
    unit_id: str,
    body: ImageDeleteRequest,
    tenant: dict = Depends(get_current_tenant),
):
    """
    Remove an image from Supabase Storage and from Unit.images array.
    Updates Unit.image_url to the next remaining image (or null if empty).
    """
    unit = await _unit_repo.get_by_id(unit_id, tenant["id"])
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")

    await _svc_delete(body.url)

    current_images = list(getattr(unit, "images", []) or [])
    new_images = [u for u in current_images if u != body.url]

    updated = await _unit_repo.update_raw(unit_id, {
        "images":    new_images,
        "image_url": new_images[0] if new_images else None,
    })
    return {"images": list(updated.images), "image_url": updated.image_url}


@router.delete("/{unit_id}")
async def delete_unit(
    unit_id: str,
    tenant: dict = Depends(get_current_tenant),
):
    """
    Permanently delete a unit and all its associated bookings, prices, and images.
    Cascade is enforced at the DB level (onDelete: Cascade on Booking → Unit).
    """
    unit = await _unit_repo.get_by_id(unit_id, tenant["id"])
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")

    await _unit_repo.delete_unit(unit_id)
    return {"success": True, "deleted_id": unit_id}
