from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import date
from pydantic import BaseModel
from typing import List

from . import properties, units, bookings, listings, registration
from app.db.client import prisma_client
from app.services import public_service

router = APIRouter()

class ServiceSelection(BaseModel):
    service_id: str
    quantity: int = 1

class BookingRequest(BaseModel):
    unit_id: str
    customer_name: str
    customer_phone: str
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guests: int = 1
    services: List[ServiceSelection] = []
    payment_method: str = "cash"
    payment_reference: Optional[str] = None
    arrival_time: str = "14:00"

# ── Slug-in-path endpoints ─────────────────────────────────────────
# Defined explicitly before includes to prevent shadowing

@router.get("/{slug}/config", tags=["Public Tenant"])
async def get_tenant_config_by_slug(slug: str):
    data = await public_service.get_tenant_config(prisma_client, slug)
    if not data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return data


@router.get("/{slug}/listings", tags=["Public Tenant"])
async def get_listings_by_slug(
    slug: str,
    check_in: Optional[date] = None,
    check_out: Optional[date] = None,
    guests: int = 1,
    type: Optional[str] = Query(None, description="villa | chalet | restaurant | pool"),
):
    if check_in and check_out and check_in >= check_out:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")
    if check_in and check_in < date.today():
        raise HTTPException(status_code=400, detail="Cannot search past dates")

    data = await public_service.get_client_catalog(
        prisma_client, slug, check_in, check_out, guests, unit_type=type
    )
    if not data:
        raise HTTPException(status_code=404, detail="Client not found")
    return data

@router.post("/{slug}/bookings", tags=["Public Tenant"])
async def create_booking_by_slug(slug: str, data: BookingRequest):
    if data.check_in and data.check_out and data.check_in >= data.check_out:
        raise HTTPException(status_code=400, detail="تاريخ الخروج غير منطقي")

    result = await public_service.create_public_booking(prisma_client, slug, data.model_dump())
    if not result:
        raise HTTPException(status_code=400, detail="فشل إنشاء الحجز، يرجى المحاولة لاحقاً")

    return {
        "message": "Booking successful",
        "booking_id": result.id,
        "customer_id": result.customerId,
    }

@router.get("/{slug}/price", tags=["Public Tenant"])
async def get_price_by_slug(
    slug: str,
    unit_id: str = Query(...),
    check_in: date = Query(...),
    check_out: date = Query(...),
    guests: int = Query(1),
):
    from datetime import timedelta
    from app.services import price_service

    client = await prisma_client.client.find_first(where={"slug": slug, "isActive": True})
    if not client:
        raise HTTPException(status_code=404, detail="المنتجع غير موجود")

    unit = await prisma_client.unit.find_unique(where={"id": unit_id})
    if not unit or unit.clientId != client.id:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    if unit.capacity < guests:
        raise HTTPException(status_code=400, detail=f"هذه الوحدة تستوعب {unit.capacity} أشخاص كحد أقصى")

    end_date = check_out - timedelta(days=1)
    if check_in > end_date:
        raise HTTPException(status_code=400, detail="تاريخ الخروج يجب أن يكون بعد تاريخ الدخول")

    prices = await price_service.get_prices(
        db=prisma_client,
        client_id=unit.clientId,
        unit_id=unit_id,
        date_from=check_in,
        date_to=end_date,
    )
    total_price = sum(float(p.price) for p in prices if p.available)
    currency = prices[0].currency if prices else "SAR"
    return {"total_price": total_price, "currency": currency}

@router.get("/{slug}/services", tags=["Public Tenant"])
async def get_services_by_slug(
    slug: str,
    unit_id: str = Query(...),
):
    client = await prisma_client.client.find_first(where={"slug": slug, "isActive": True})
    if not client:
        raise HTTPException(status_code=404, detail="المنتجع غير موجود")

    unit = await prisma_client.unit.find_unique(where={"id": unit_id})
    if not unit or unit.clientId != client.id:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")

    services = await prisma_client.service.find_many(
        where={"clientId": unit.clientId, "isActive": True}
    )
    return [
        {
            "id": s.id,
            "name_ar": s.name_ar,
            "name_en": s.name_en,
            "image_url": getattr(s, 'image_url', ''),
            "basePrice": float(s.basePrice),
            "currency": s.currency,
            "duration": getattr(s, 'duration', 0),
        } for s in services
    ]

@router.get("/{slug}/units/{unit_id}/gallery", tags=["Public Tenant"])
async def get_unit_gallery(slug: str, unit_id: str):
    client = await prisma_client.client.find_first(where={"slug": slug, "isActive": True})
    if not client:
        raise HTTPException(status_code=404, detail="المنتجع غير موجود")

    unit = await prisma_client.unit.find_unique(where={"id": unit_id})
    if not unit or unit.clientId != client.id:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")

    images = await prisma_client.galleryimage.find_many(
        where={"unitId": unit_id, "clientId": client.id, "isActive": True},
        order={"sort_order": "asc"},
    )
    return [
        {
            "id":         img.id,
            "url":        img.url,
            "sort_order": img.sort_order,
            "caption_ar": img.caption_ar,
            "caption_en": img.caption_en,
        }
        for img in images
    ]


@router.get("/{slug}/units/{unit_id}/calendar", tags=["Public Tenant"])
async def get_unit_calendar(slug: str, unit_id: str):
    from datetime import timedelta
    client = await prisma_client.client.find_first(where={"slug": slug, "isActive": True})
    if not client:
        raise HTTPException(status_code=404, detail="المنتجع غير موجود")

    unit = await prisma_client.unit.find_unique(where={"id": unit_id})
    if not unit or unit.clientId != client.id:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")

    bookings = await prisma_client.booking.find_many(
        where={
            "unitId":   unit_id,
            "clientId": client.id,
            "status":   {"not": "cancelled"},
        },
        order={"checkIn": "asc"},
    )
    disabled_set = set()
    for b in bookings:
        current = b.checkIn.date() if hasattr(b.checkIn, "date") else b.checkIn
        end     = b.checkOut.date() if hasattr(b.checkOut, "date") else b.checkOut
        while current < end:
            disabled_set.add(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)

    prices = await prisma_client.price.find_many(
        where={"unitId": unit_id, "clientId": client.id},
        order={"date": "asc"},
    )
    price_overrides = {}
    for p in prices:
        d = p.date.date() if hasattr(p.date, "date") else p.date
        d_str = d.strftime("%Y-%m-%d")
        if not p.available:
            disabled_set.add(d_str)
        else:
            price_overrides[d_str] = float(p.price)

    return {
        "disabled_dates":  sorted(list(disabled_set)),
        "price_overrides": price_overrides,
    }


# ── Nested sub-routers ─────────────────────────────────────────────
router.include_router(properties.router,   prefix="/properties", tags=["Public Properties"])
router.include_router(units.router,        prefix="/units",       tags=["Public Units"])
router.include_router(bookings.router,     prefix="/bookings",    tags=["Public Bookings"])
router.include_router(listings.router,     prefix="/listings",    tags=["Public Listings"])
router.include_router(registration.router)
