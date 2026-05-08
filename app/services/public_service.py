import asyncio
import logging
import os
import re
from typing import Optional, Dict, Any, List
from prisma import Prisma
from fastapi import HTTPException
from datetime import datetime, timedelta, date
from app.services.whatsapp_service import WhatsAppService

# ── Supabase storage client (storage-only, service key) ──────────────────────
_SUPABASE_URL = os.getenv("SUPABASE_URL")
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
try:
    from supabase import create_client as _create_supabase
    _supabase = _create_supabase(_SUPABASE_URL, _SUPABASE_KEY) if (_SUPABASE_URL and _SUPABASE_KEY) else None
except Exception:
    _supabase = None

# Slug → Supabase storage folder mapping (slug may differ from folder name)
_STORAGE_FOLDERS: Dict[str, str] = {
    "smar": "beitsmar",
}

# Filename-based category inference for beitsmar images
_CATEGORY_RANGES = [
    (range(1,  4),  "chalet"),
    (range(4,  7),  "nature"),
    (range(7,  10), "pool"),
    (range(10, 13), "chalet"),
]

def _infer_category(filename: str) -> str:
    m = re.search(r"beitsmar(\d+)", filename, re.IGNORECASE)
    if m:
        n = int(m.group(1))
        for rng, cat in _CATEGORY_RANGES:
            if n in rng:
                return cat
    return "general"

logger = logging.getLogger(__name__)

async def get_tenant_gallery_images(slug: str) -> List[Dict[str, Any]]:
    """
    List gallery images from Supabase Storage at properties/{folder}/gallery/.
    Returns [] if storage is not configured or the folder is empty.
    Category is inferred from filename (beitsmar1-3→chalet, 4-6→nature, 7-9→pool, 10-12→chalet).
    """
    if not _supabase:
        logger.warning("Supabase client not configured — gallery endpoint returns empty list")
        return []

    folder      = _STORAGE_FOLDERS.get(slug, slug)
    bucket_path = f"{folder}/gallery"

    def _list_files():
        return _supabase.storage.from_("properties").list(bucket_path)

    try:
        files = await asyncio.to_thread(_list_files)
    except Exception as e:
        logger.error(f"🔥 Supabase storage list error for slug={slug}: {e}", exc_info=True)
        return []

    if not files:
        return []

    base_url = f"{_SUPABASE_URL}/storage/v1/object/public/properties/{bucket_path}/"
    result: List[Dict[str, Any]] = []

    for f in files:
        name = f.get("name", "")
        if not name or name.startswith("."):
            continue
        result.append({
            "url":      base_url + name,
            "filename": name,
            "category": _infer_category(name),
        })

    return result


async def get_unit_services_data(db: Prisma, slug: str, unit_id: str) -> Optional[List[Dict[str, Any]]]:
    """
    Return all active services for the client that owns the given unit.
    Enforces clientId isolation — unit must belong to the tenant identified by slug.
    Returns None if the unit does not exist or belongs to a different tenant.
    """
    try:
        client = await db.client.find_first(where={"slug": slug, "isActive": True})
        if not client:
            return None

        unit = await db.unit.find_first(where={"id": unit_id, "clientId": client.id})
        if not unit:
            return None

        services = await db.service.find_many(
            where={"clientId": unit.clientId, "isActive": True}
        )
        return [
            {
                "id":             s.id,
                "name_ar":        s.name_ar,
                "name_en":        s.name_en,
                "description_ar": getattr(s, "description_ar", ""),
                "description_en": getattr(s, "description_en", ""),
                "image_url":      getattr(s, "image_url", ""),
                "basePrice":      float(s.basePrice),
                "currency":       s.currency,
                "duration":       getattr(s, "duration", 0),
            }
            for s in services
        ]
    except Exception as e:
        logger.error(f"🔥 DB error in get_unit_services_data for unit {unit_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


async def get_unit_calendar_data(
    db: Prisma,
    slug: str,
    unit_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Return availability + dynamic pricing data for a unit.

    Response shape:
        {
            "disabled_dates":  ["YYYY-MM-DD", ...],
            "price_overrides": { "YYYY-MM-DD": 350.0, ... }
        }
    """
    try:
        client = await db.client.find_first(where={"slug": slug, "isActive": True})
        if not client:
            return None

        unit = await db.unit.find_unique(where={"id": unit_id})
        if not unit or unit.clientId != client.id:
            return None

        # ── 1. Booking-level disabled dates ─────────────────────────────────
        bookings = await db.booking.find_many(
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

        # ── 2. Price-level disabled dates + custom price overrides ───────────
        prices = await db.price.find_many(
            where={"unitId": unit_id, "clientId": client.id},
            order={"date": "asc"},
        )
        price_overrides: Dict[str, float] = {}
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
            "base_price":      float(unit.price) if unit.price else None,
        }
    except Exception as e:
        logger.error(
            f"🔥 DB error in get_unit_calendar_data for slug={slug} unit={unit_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Database connection failed")


# ── Smar default styling (applied on first deploy or missing fields) ──────────
_SMAR_STYLING = {
    "name_ar":         "بيت سمار",
    "name_en":         "Beit Smar",
    "primary_color":   "#d4a853",
    "hero_video_url":  "https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/Logo_Formation_Video_Ready.mp4",
    "whatsapp_number": "96178727986",
    "currency":        "USD",
    "features":        {"spatial": True, "listings": True, "booking": True, "payment": True},
    "unit_types":      ["villa", "chalet"],
    "payment_methods": ["cash", "card", "whatsapp", "whish", "omt"],
}

# Full create payload — used only when the smar client row is entirely absent
_SMAR_CREATE = {
    "slug":  "smar",
    "name":  "Beit Smar",
    "phone": "+96178727986",
    **_SMAR_STYLING,
}


def _record_to_dict(record) -> Dict[str, Any]:
    client_services = getattr(record, "clientServices", None) or []
    return {
        "slug":            record.slug,
        "name_ar":         getattr(record, "name_ar",  None) or record.name,
        "name_en":         getattr(record, "name_en",  None) or record.name,
        "primary_color":   getattr(record, "primary_color",   None),
        "hero_video_url":  getattr(record, "hero_video_url",  None),
        "whatsapp_number": getattr(record, "whatsapp_number", None),
        "instagram_url":   getattr(record, "instagram_url",   None),
        "maps_url":        getattr(record, "maps_url",        None),
        "currency":        getattr(record, "currency", "USD"),
        "features":        getattr(record, "features", {}),
        "config":          getattr(record, "config",   {}) or {},
        "unit_types":      getattr(record, "unit_types", []),
        "payment_methods": getattr(record, "payment_methods", []),
        "service_type":    getattr(record, "service_type", None),
        "active_services": [s.serviceKey for s in client_services if s.isActive],
        "page_type":       getattr(record, "pageType",    "normal"),
        "template_key":    getattr(record, "templateKey", None),
    }


async def get_tenant_config(db: Prisma, slug: str) -> Optional[Dict[str, Any]]:
    """
    Fetch tenant public config from the clients table.
    If the client exists but has no styling (primary_color is null), auto-apply
    SMAR defaults so the 404 vanishes on first deploy — no manual DB seed needed.
    """
    try:
        record = await db.client.find_first(
            where={"slug": slug, "isActive": True},
            include={"clientServices": {"where": {"isActive": True}}},
        )

        if not record and slug == "smar":
            logger.info("🌱 Auto-creating smar Client row with default styling")
            record = await db.client.create(data=_SMAR_CREATE)

        elif record and slug == "smar" and not record.primary_color:
            logger.info("🎨 Auto-applying smar default styling to existing Client row")
            record = await db.client.update(
                where={"id": record.id},
                data=_SMAR_STYLING,
            )

        if not record:
            return None

        return _record_to_dict(record)
    except Exception as e:
        logger.error(f"🔥 DB error fetching tenant config for '{slug}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")

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
            order={"sort_order": "asc"},
            include={"galleryImages": {"where": {"isActive": True}}},
        )

        return {
            "client_name": client.name,
            "slug": client.slug,
            "units": [
                {
                    "id":             unit.id,
                    "unit_type":      getattr(unit, 'unit_type', 'chalet'),
                    "name_ar":        getattr(unit, 'name_ar', ''),
                    "name_en":        getattr(unit, 'name_en', ''),
                    "description":    getattr(unit, 'description', ''),
                    "capacity":       unit.capacity,
                    "bedrooms":       getattr(unit, 'bedrooms', None),
                    "bathrooms":      getattr(unit, 'bathrooms', None),
                    "price":          float(unit.price) if unit.price is not None else None,
                    "price_label":    getattr(unit, 'price_label', None),
                    "image_url":      getattr(unit, 'image_url', ''),
                    "images":         getattr(unit, 'images', []),
                    "position_x":     getattr(unit, 'position_x', 0),
                    "position_y":     getattr(unit, 'position_y', 0),
                    # ── Dynamic Content (Block Builder) ────────────────────────
                    "category":       getattr(unit, 'category', None),
                    "description_ar": getattr(unit, 'description_ar', None),
                    "description_en": getattr(unit, 'description_en', None),
                    "content_blocks": getattr(unit, 'content_blocks', None),
                    "amenities":      getattr(unit, 'amenities', None),
                    "rules_policies": getattr(unit, 'rules_policies', None),
                    # ── Gallery ────────────────────────────────────────────────
                    "gallery_images": sorted(
                        [
                            {
                                "id":         g.id,
                                "url":        g.url,
                                "sort_order": g.sort_order,
                                "span_size":  getattr(g, "span_size", "small"),
                                "caption_ar": g.caption_ar,
                                "caption_en": g.caption_en,
                            }
                            for g in (getattr(unit, "galleryImages", None) or [])
                        ],
                        key=lambda x: x["sort_order"],
                    ),
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
        customer = await db.customer.find_first(
            where={"phone": customer_phone, "clientId": client.id}
        )

        if not customer:
            create_data: dict = {
                "clientId": client.id,
                "phone":    customer_phone,
                "name":     data.get("customer_name"),
            }
            if data.get("customer_email"):
                create_data["email"] = data["customer_email"]
            customer = await db.customer.create(data=create_data)

        check_in_date = data.get("check_in") or (datetime.utcnow().date() + timedelta(days=1))
        check_out_date = data.get("check_out") or (datetime.utcnow().date() + timedelta(days=2))

        if isinstance(check_in_date, date) and not isinstance(check_in_date, datetime):
            check_in_date = datetime.combine(check_in_date, datetime.min.time())
        if isinstance(check_out_date, date) and not isinstance(check_out_date, datetime):
            check_out_date = datetime.combine(check_out_date, datetime.min.time())

        from app.services import price_service

        # Fetch unit for base price fallback
        unit_record = await db.unit.find_unique(where={"id": data.get("unit_id")})
        base_price_per_night = float(unit_record.price) if (unit_record and unit_record.price) else 0.0

        end_date = check_out_date - timedelta(days=1)
        prices = await price_service.get_prices(
            db=db,
            client_id=client.id,
            unit_id=data.get("unit_id"),
            date_from=check_in_date,
            date_to=end_date,
        )

        # Build date → price map from calendar entries
        price_map: dict = {}
        for p in prices:
            if p.available:
                day = p.date.date() if hasattr(p.date, "date") else p.date
                price_map[day] = float(p.price)

        # Sum per night — fall back to unit.price for days with no calendar entry
        nights = (check_out_date - check_in_date).days
        unit_price = 0.0
        cursor = check_in_date
        for _ in range(nights):
            day = cursor.date() if hasattr(cursor, "date") else cursor
            unit_price += price_map.get(day, base_price_per_night)
            cursor += timedelta(days=1)

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

        # ── Race condition guard: final availability check before write ──────────
        overlap = await db.booking.find_first(
            where={
                "unitId":   data.get("unit_id"),
                "clientId": client.id,
                "status":   {"notIn": ["cancelled", "rejected"]},
                "checkIn":  {"lt": check_out_date},
                "checkOut": {"gt": check_in_date},
            }
        )
        if overlap:
            raise HTTPException(
                status_code=409,
                detail="Unit is no longer available for these dates.",
            )

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 Error creating booking: {e}", exc_info=True)
        return None