"""
app/api/v1/admin/units.py
Admin unit management — list all, toggle availability, create, block dates.

Mounted at: /api/v1/admin/units  (prefix on router)
Auth:       any valid tenant JWT via get_current_tenant
Tenancy:    every query filtered by clientId from the token
"""

from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant

router = APIRouter(prefix="/units", tags=["Admin Units"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class UnitToggle(BaseModel):
    """PATCH body — send only the field(s) you want to change."""
    is_available: Optional[bool] = None
    is_active:    Optional[bool] = None


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
    name_ar:    str
    name_en:    Optional[str]  = None
    unit_type:  Optional[str]  = "chalet"   # villa | chalet | restaurant | pool
    capacity:   int            = 2
    bedrooms:   Optional[int]  = None
    bathrooms:  Optional[int]  = None
    image_url:  Optional[str]  = None
    sort_order: Optional[int]  = 0


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fmt(unit) -> dict:
    """Serialize a Prisma Unit to a plain dict the frontend expects."""
    return {
        "id":          unit.id,
        "name_ar":     unit.name_ar,
        "name_en":     unit.name_en,
        "unit_type":   getattr(unit, "unit_type",   "chalet"),
        "capacity":    unit.capacity,
        "bedrooms":    unit.bedrooms,
        "bathrooms":   unit.bathrooms,
        "image_url":   unit.image_url,
        "sort_order":  getattr(unit, "sort_order",  0),
        "is_active":   unit.isActive,
        "is_available": unit.isAvailable,
        "position_x":  getattr(unit, "position_x", None),
        "position_y":  getattr(unit, "position_y", None),
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_units(tenant: dict = Depends(get_current_tenant)):
    """Return ALL units for this tenant (active + inactive) — admin view."""
    units = await prisma_client.unit.find_many(
        where={"clientId": tenant["id"]},
        order=[{"unit_type": "asc"}, {"sort_order": "asc"}],
    )
    return [_fmt(u) for u in units]


@router.patch("/{unit_id}")
async def toggle_unit(
    unit_id: str,
    body: UnitToggle,
    tenant: dict = Depends(get_current_tenant),
):
    """Toggle isAvailable and/or isActive for a single unit."""
    if body.is_available is None and body.is_active is None:
        raise HTTPException(status_code=400, detail="No fields to update.")

    # Verify ownership before updating
    existing = await prisma_client.unit.find_first(
        where={"id": unit_id, "clientId": tenant["id"]}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Unit not found.")

    patch: dict = {}
    if body.is_available is not None:
        patch["isAvailable"] = body.is_available
    if body.is_active is not None:
        patch["isActive"] = body.is_active

    updated = await prisma_client.unit.update(
        where={"id": unit_id},
        data=patch,
    )
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
    unit = await prisma_client.unit.find_first(
        where={"id": unit_id, "clientId": tenant["id"]}
    )
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")

    # Resolve (or create) a deterministic system customer for blocked records
    system_phone = f"__block__{tenant['id']}"
    system_customer = await prisma_client.customer.upsert(
        where={"phone": system_phone},
        data={
            "create": {
                "clientId": tenant["id"],
                "phone":    system_phone,
                "name":     "Admin Block",
            },
            "update": {},
        },
    )

    # Expand the blocked range so we can build the list of dates for the response
    blocked_dates: List[str] = []
    cursor = body.check_in
    while cursor < body.check_out:
        blocked_dates.append(cursor.strftime("%Y-%m-%d"))
        cursor += timedelta(days=1)

    booking = await prisma_client.booking.create(
        data={
            "clientId":   tenant["id"],
            "unitId":     unit_id,
            "customerId": system_customer.id,
            "checkIn":    body.check_in.isoformat(),
            "checkOut":   body.check_out.isoformat(),
            "guests":     0,
            "totalPrice": 0,
            "status":     "blocked",
            "notes":      body.reason or "Admin block",
        }
    )

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

    unit = await prisma_client.unit.find_first(
        where={"id": unit_id, "clientId": tenant["id"]}
    )
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
    await prisma_client.price.delete_many(
        where={
            "unitId":   unit_id,
            "clientId": tenant["id"],
            "date": {
                "gte": to_datetime_start(body.start_date),
                "lte": to_datetime_start(body.end_date),
            },
        }
    )
    await prisma_client.price.create_many(data=records)

    days = len(records)
    return {
        "unit_id":      unit_id,
        "start_date":   body.start_date.isoformat(),
        "end_date":     body.end_date.isoformat(),
        "days_updated": days,
        "is_blocked":   body.is_blocked,
        "custom_price": body.custom_price,
    }


@router.post("/", status_code=201)
async def create_unit(
    body: UnitCreate,
    tenant: dict = Depends(get_current_tenant),
):
    """
    Create a new unit.
    propertyId is auto-resolved to the tenant's first active property.
    """
    prop = await prisma_client.property.find_first(
        where={"clientId": tenant["id"], "isActive": True},
        order={"createdAt": "asc"},
    )
    if not prop:
        raise HTTPException(
            status_code=422,
            detail="No active property found for this tenant. Create a property first."
        )

    unit = await prisma_client.unit.create(
        data={
            "clientId":   tenant["id"],
            "propertyId": prop.id,
            "name_ar":    body.name_ar,
            "name_en":    body.name_en,
            "unit_type":  body.unit_type,
            "capacity":   body.capacity,
            "bedrooms":   body.bedrooms,
            "bathrooms":  body.bathrooms,
            "image_url":  body.image_url,
            "sort_order": body.sort_order,
            "isActive":    True,
            "isAvailable": True,
        }
    )
    return _fmt(unit)
