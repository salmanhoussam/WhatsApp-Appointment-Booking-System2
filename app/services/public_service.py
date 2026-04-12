import logging
from typing import Optional, Dict, Any
from prisma import Prisma
from datetime import datetime, timedelta, date
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)

async def get_client_catalog(
    db: Prisma,
    slug: str,
    check_in: Optional[date] = None,
    check_out: Optional[date] = None,
    guests: int = 1,
    unit_type: Optional[str] = None,   # villa | chalet | restaurant | pool | None = all
) -> Optional[Dict[str, Any]]:
    """
    جلب بيانات المنتجع والشاليهات المتاحة بناءً على التواريخ وعدد الضيوف
    """
    try:
        client = await db.client.find_first(
            where={"slug": slug, "isActive": True},
            include={"services": {"where": {"isActive": True}}}
        )
        
        if not client:
            return None

        # 1. البحث عن الشاليهات المحجوزة في هذه التواريخ
        booked_unit_ids = []
        if check_in and check_out:
            # 💡 التعديل هنا: تحويل date إلى datetime لتجنب خطأ Prisma
            check_in_dt = datetime.combine(check_in, datetime.min.time()) if isinstance(check_in, date) and not isinstance(check_in, datetime) else check_in
            check_out_dt = datetime.combine(check_out, datetime.min.time()) if isinstance(check_out, date) and not isinstance(check_out, datetime) else check_out

            # نبحث عن الحجوزات المتقاطعة زمنياً (وليست ملغاة أو مرفوضة)
            overlapping_bookings = await db.booking.find_many(
                where={
                    "clientId": client.id,
                    "status": {"notIn": ["cancelled", "rejected"]},
                    "checkIn": {"lt": check_out_dt},  # استخدام المتغير المحول
                    "checkOut": {"gt": check_in_dt}   # استخدام المتغير المحول
                }
            )
            booked_unit_ids = [b.unitId for b in overlapping_bookings]

        # 2. جلب الشاليهات التي تطابق الشروط
        units_query_where = {
            "clientId": client.id,
            "isActive": True,
            "isAvailable": True,
            "capacity": {"gte": guests}
        }

        # فلترة حسب النوع (villa | chalet | restaurant | pool)
        if unit_type and unit_type != "all":
            units_query_where["unit_type"] = unit_type

        # استبعاد الشاليهات المحجوزة
        if booked_unit_ids:
            units_query_where["id"] = {"notIn": booked_unit_ids}

        available_units = await db.unit.find_many(
            where=units_query_where,
            order={"sort_order": "asc"}
        )

        return {
            "client_name": client.name,
            "slug": client.slug,
            "units": [
                {
                    "id":          unit.id,
                    "unit_type":   getattr(unit, 'unit_type', 'chalet'),
                    "name_ar":     getattr(unit, 'name_ar', ''),
                    "name_en":     getattr(unit, 'name_en', ''),
                    "description": getattr(unit, 'description', ''),
                    "capacity":    unit.capacity,
                    "bedrooms":    getattr(unit, 'bedrooms', None),
                    "bathrooms":   getattr(unit, 'bathrooms', None),
                    "image_url":   getattr(unit, 'image_url', ''),
                    "image_url1":  getattr(unit, 'image_url1', None),
                    "image_url2":  getattr(unit, 'image_url2', None),
                    "image_url3":  getattr(unit, 'image_url3', None),
                    "image_url4":  getattr(unit, 'image_url4', None),
                    "image_url5":  getattr(unit, 'image_url5', None),
                    "position_x":  getattr(unit, 'position_x', 0),
                    "position_y":  getattr(unit, 'position_y', 0),
                } for unit in available_units
            ],
            "services": [
                {
                    "id": s.id,
                    "name_ar": s.name_ar,
                    "name_en": s.name_en,
                    "price": float(s.basePrice)
                } for s in getattr(client, 'services', [])
            ]
        }
    except Exception as e:
        logger.error(f"🔥 Error in get_client_catalog for slug {slug}: {e}", exc_info=True)
        return None


async def create_public_booking(db: Prisma, slug: str, data: dict):
    try:
        client = await db.client.find_first(where={"slug": slug})
        if not client:
            return None

        customer_phone = data.get("customer_phone")
        customer = await db.customer.find_unique(where={"phone": customer_phone})
        
        if not customer:
            customer = await db.customer.create(
                data={
                    "clientId": client.id,
                    "phone": customer_phone,
                    "name": data.get("customer_name")
                }
            )

        check_in_date = data.get("check_in") or (datetime.utcnow().date() + timedelta(days=1))
        check_out_date = data.get("check_out") or (datetime.utcnow().date() + timedelta(days=2))

        if isinstance(check_in_date, date) and not isinstance(check_in_date, datetime):
            check_in_date = datetime.combine(check_in_date, datetime.min.time())
        if isinstance(check_out_date, date) and not isinstance(check_out_date, datetime):
            check_out_date = datetime.combine(check_out_date, datetime.min.time())

        from app.services import price_service
        end_date = check_out_date - timedelta(days=1)
        prices = await price_service.get_prices(
            db=db, 
            client_id=client.id,
            unit_id=data.get("unit_id"),
            date_from=check_in_date,
            date_to=end_date
        )
        unit_price = sum(float(p.price) for p in prices if p.available)

        services_data = data.get("services", []) or []
        total_service_price = 0.0
        valid_services = []

        for s_req in services_data:
            svc = await db.service.find_unique(where={"id": s_req.get("service_id")})
            if svc and getattr(svc, 'isActive', True):
                qty = s_req.get("quantity", 1)
                price = float(svc.basePrice)
                total_service_price += price * qty
                valid_services.append({
                    "serviceId": svc.id,
                    "quantity": qty,
                    "price": price
                })
        
        final_total_price = unit_price + total_service_price

        payment_method = data.get("payment_method", "cash")
        status = "confirmed" if payment_method == "cash" else "pending"

        booking_data = {
            "unitId": data.get("unit_id"),
            "clientId": client.id,
            "customerId": customer.id,
            "checkIn": check_in_date,
            "checkOut": check_out_date,
            "guests": data.get("guests", 1),
            "totalPrice": final_total_price,
            "status": status,
            "source": "website",
            "paymentMethod": payment_method,
            "paymentReference": data.get("payment_reference"),
            "arrivalTime": data.get("arrival_time"),
        }

        if valid_services:
            booking_data["services"] = {
                "create": valid_services
            }

        # إنشاء الحجز
        new_booking = await db.booking.create(data=booking_data)

        try:
            wa_service = WhatsAppService()
            message = (
                f"مرحباً {customer.name}،\n\n"
                f"لقد استلمنا طلب الحجز الخاص بك في *{client.name}* بنجاح! 🎉\n"
                f"رقم الطلب: #{new_booking.id[:6]}\n\n"
                f"طلبك الآن قيد المراجعة، وسنتواصل معك قريباً جداً لتأكيده.\n"
                f"شكراً لاختيارك لنا! 🌊"
            )
            await wa_service.send_text(to=customer.phone, text=message)
        except Exception as wa_error:
            logger.error(f"Failed to send WhatsApp confirmation: {wa_error}")

        return new_booking

    except Exception as e:
        logger.error(f"🔥 Error creating booking: {e}", exc_info=True)
        return None