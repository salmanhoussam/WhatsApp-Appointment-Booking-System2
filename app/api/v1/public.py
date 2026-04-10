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