from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.db.client import prisma_client
from app.services import public_service
from datetime import date
from typing import Optional, List

router = APIRouter(prefix="/public", tags=["Public Facing"])

# تحديث النموذج ليقبل التواريخ والضيوف من الواجهة
class ServiceSelection(BaseModel):
    service_id: str
    quantity: int = 1

class BookingRequest(BaseModel):
    unit_id: str
    customer_name: str
    customer_phone: str
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guests: Optional[int] = 1
    services: Optional[List[ServiceSelection]] = []
    payment_method: Optional[str] = "cash"       # cash | whish | omt | card
    payment_reference: Optional[str] = None       # receipt ref for Whish/OMT
    arrival_time: Optional[str] = "14:00"         # expected arrival HH:MM
    client_slug: Optional[str] = None             # legacy /bookings/ route only

@router.get("/client/{slug}/units")
async def get_public_units(
    slug: str,
    checkIn: Optional[date] = None,
    checkOut: Optional[date] = None,
    guests: Optional[int] = 1,
    type: Optional[str] = Query(None, description="villa | chalet | restaurant | pool"),
):
    # 🛡️ الحماية الأولى: التأكد أن تاريخ الخروج بعد تاريخ الدخول
    if checkIn and checkOut and checkIn >= checkOut:
        raise HTTPException(status_code=400, detail="تاريخ الخروج يجب أن يكون بعد تاريخ الدخول")

    # 🛡️ الحماية الثانية: التأكد أن التواريخ ليست من الماضي
    if checkIn and checkIn < date.today():
        raise HTTPException(status_code=400, detail="لا يمكن الحجز في تواريخ سابقة")

    data = await public_service.get_client_catalog(
        prisma_client, slug, checkIn, checkOut, guests, unit_type=type
    )

    if not data:
        raise HTTPException(status_code=404, detail="المنتجع غير موجود")

    return data

@router.post("/client/{slug}/book")
async def create_booking_endpoint(slug: str, data: BookingRequest):
    # 🛡️ حماية التواريخ عند تأكيد الحجز أيضاً
    if data.check_in and data.check_out and data.check_in >= data.check_out:
        raise HTTPException(status_code=400, detail="تاريخ الخروج غير منطقي")
        
    result = await public_service.create_public_booking(prisma_client, slug, data.model_dump())
    
    if not result:
        raise HTTPException(status_code=400, detail="فشل إنشاء الحجز، يرجى المحاولة لاحقاً")
        
    return {
        "message": "Booking successful", 
        "booking_id": result.id,
        "customer_id": result.customerId
    }

@router.get("/units/{unit_id}/price")
async def calculate_unit_price(
    unit_id: str,
    check_in: date = Query(...),
    check_out: date = Query(...),
    guests: int = Query(1)
):
    from datetime import timedelta
    from app.services import price_service
    
    # 1. Fetch unit
    unit = await prisma_client.unit.find_unique(where={"id": unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
        
    end_date = check_out - timedelta(days=1)
    if check_in > end_date:
        raise HTTPException(status_code=400, detail="تاريخ الخروج يجب أن يكون بعد تاريخ الدخول")
        
    # 2. Get prices
    prices = await price_service.get_prices(
        db=prisma_client, 
        client_id=unit.clientId,
        unit_id=unit_id,
        date_from=check_in,
        date_to=end_date
    )
    
    total_price = sum(float(p.price) for p in prices if p.available)
    currency = prices[0].currency if prices else "SAR"
    
    return {
        "total_price": total_price,
        "currency": currency
    }

@router.get("/units/{unit_id}/services")
async def get_unit_services(unit_id: str):
    unit = await prisma_client.unit.find_unique(where={"id": unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")

    services = await prisma_client.service.find_many(
        where={
            "clientId": unit.clientId,
            "isActive": True
        }
    )
    return [
        {
            "id": s.id,
            "name_ar": s.name_ar,
            "name_en": s.name_en,
            "description_ar": getattr(s, 'description_ar', ''),
            "description_en": getattr(s, 'description_en', ''),
            "image_url": getattr(s, 'image_url', ''),
            "basePrice": float(s.basePrice),
            "currency": s.currency,
            "duration": getattr(s, 'duration', 0)
        } for s in services
    ]


# ── Slug-in-path endpoints (Phase 18) ─────────────────────────────────────────
# Pattern: /{slug}/... — slug is always the first path segment, never repeated.

@router.get("/{slug}/listings")
async def get_listings_by_slug(
    slug: str,
    check_in: Optional[date] = None,
    check_out: Optional[date] = None,
    guests: Optional[int] = 1,
    type: Optional[str] = Query(None, description="villa | chalet | restaurant | pool"),
):
    if check_in and check_out and check_in >= check_out:
        raise HTTPException(status_code=400, detail="تاريخ الخروج يجب أن يكون بعد تاريخ الدخول")
    if check_in and check_in < date.today():
        raise HTTPException(status_code=400, detail="لا يمكن الحجز في تواريخ سابقة")

    data = await public_service.get_client_catalog(
        prisma_client, slug, check_in, check_out, guests, unit_type=type
    )
    if not data:
        raise HTTPException(status_code=404, detail="المنتجع غير موجود")
    return data


@router.post("/{slug}/bookings")
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


@router.get("/{slug}/price")
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


@router.get("/{slug}/services")
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


@router.get("/{slug}/units/{unit_id}/calendar")
async def get_unit_calendar(slug: str, unit_id: str):
    """
    Return availability + dynamic pricing data for a unit.

    Response shape:
    {
        "disabled_dates":  ["YYYY-MM-DD", ...],   ← guest cannot select these
        "price_overrides": { "YYYY-MM-DD": 350.0, ... }  ← admin-set custom prices
    }

    disabled_dates comes from two sources:
      1. Bookings with status != 'cancelled'   (confirmed/pending/blocked by guest)
      2. Price records with available = False  (blocked by admin via date-overrides)

    price_overrides comes from Price records with available = True that have a price set.
    The frontend renders these as tiny price chips on each calendar cell.
    """
    from datetime import timedelta

    client = await prisma_client.client.find_first(where={"slug": slug, "isActive": True})
    if not client:
        raise HTTPException(status_code=404, detail="المنتجع غير موجود")

    unit = await prisma_client.unit.find_unique(where={"id": unit_id})
    if not unit or unit.clientId != client.id:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")

    # ── 1. Booking-level disabled dates ─────────────────────────────────────
    bookings = await prisma_client.booking.find_many(
        where={
            "unitId":   unit_id,
            "clientId": client.id,
            "status":   {"not": "cancelled"},
        },
        order={"checkIn": "asc"},
    )
    disabled_set: set[str] = set()
    for b in bookings:
        current = b.checkIn.date() if hasattr(b.checkIn, "date") else b.checkIn
        end     = b.checkOut.date() if hasattr(b.checkOut, "date") else b.checkOut
        while current < end:
            disabled_set.add(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)

    # ── 2. Price-level disabled dates + custom price overrides ──────────────
    prices = await prisma_client.price.find_many(
        where={"unitId": unit_id, "clientId": client.id},
        order={"date": "asc"},
    )
    price_overrides: dict[str, float] = {}
    for p in prices:
        d = p.date.date() if hasattr(p.date, "date") else p.date
        d_str = d.strftime("%Y-%m-%d")
        if not p.available:
            disabled_set.add(d_str)
        else:
            price_overrides[d_str] = float(p.price)

    return {
        "disabled_dates":  sorted(disabled_set),
        "price_overrides": price_overrides,
    }