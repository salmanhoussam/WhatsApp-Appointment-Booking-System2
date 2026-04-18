from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.db.client import prisma_client
from app.schemas.booking import PublicBookingRequest
from app.services import price_service, public_service

router = APIRouter(prefix="/public", tags=["Public Facing"])


# ── Slug-in-path endpoints ────────────────────────────────────────────────────


@router.get("/{slug}/config")
async def get_config_by_slug(slug: str):
    """Return public tenant configuration (branding, features, payment methods)."""
    config = await public_service.get_tenant_config(prisma_client, slug)
    if config is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return config


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
async def create_booking_by_slug(slug: str, data: PublicBookingRequest):
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

    services = await public_service.get_unit_services_data(prisma_client, unit_id)
    if services is None:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")

    # Verify the unit belongs to this tenant
    unit = await prisma_client.unit.find_unique(where={"id": unit_id})
    if not unit or unit.clientId != client.id:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")

    return services


@router.get("/{slug}/units/{unit_id}/services")
async def get_unit_services_by_slug(slug: str, unit_id: str):
    client = await prisma_client.client.find_first(where={"slug": slug, "isActive": True})
    if not client:
        raise HTTPException(status_code=404, detail="المنتجع غير موجود")

    unit = await prisma_client.unit.find_unique(where={"id": unit_id})
    if not unit or unit.clientId != client.id:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")

    services = await public_service.get_unit_services_data(prisma_client, unit_id)
    if services is None:
        raise HTTPException(status_code=404, detail="الشاليه غير موجود")
    return services


@router.get("/{slug}/gallery")
async def get_gallery_by_slug(slug: str):
    """List tenant gallery images from Supabase Storage (properties/{folder}/gallery/)."""
    images = await public_service.get_tenant_gallery_images(slug)
    return {"success": True, "data": images}


@router.get("/{slug}/units/{unit_id}/calendar")
async def get_unit_calendar(slug: str, unit_id: str):
    """
    Return availability + dynamic pricing data for a unit.

    Response shape:
    {
        "disabled_dates":  ["YYYY-MM-DD", ...],
        "price_overrides": { "YYYY-MM-DD": 350.0, ... }
    }
    """
    result = await public_service.get_unit_calendar_data(prisma_client, slug, unit_id)
    if result is None:
        raise HTTPException(status_code=404, detail="الشاليه أو المنتجع غير موجود")
    return result
