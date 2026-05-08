import asyncio
import json
import logging
import os
from datetime import datetime, timedelta, timezone

from prisma import Prisma

from app.repositories.registration_repo import RegistrationRepository
from app.core.security import get_password_hash
from app.core.exceptions import ConflictError
from app.services import sheets_service

logger = logging.getLogger(__name__)

_DEFAULT_CONFIG = {
    "hero": {
        "title_ar":    "مرحباً بكم",
        "title_en":    "Welcome",
        "subtitle_ar": "احجز مكانك الآن",
        "subtitle_en": "Book your spot now",
    },
    "story": {
        "body_ar": "قصتنا تبدأ من هنا. أضف وصف منشأتك من لوحة التحكم.",
        "body_en": "Our story starts here. Add your venue description from the dashboard.",
    },
}

_DEFAULT_FEATURES = {
    "listings": True,
    "booking":  True,
    "spatial":  False,
    "payment":  False,
}

VENUE_TYPE_MAP: dict[str, list[str]] = {
    "real_estate": ["villa", "chalet", "pool", "restaurant"],
    "restaurant":  ["restaurant"],
    "hotel":       ["room", "suite", "villa"],
    "sports":      ["court", "field", "gym"],
}


def _init_tenant_storage(slug: str) -> None:
    """Upload .keep placeholders to create the tenant's folder tree in Supabase."""
    _url = os.getenv("SUPABASE_URL")
    _key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    if not (_url and _key):
        logger.warning("Supabase not configured — skipping tenant folder init for %s", slug)
        return
    try:
        from supabase import create_client
        sb = create_client(_url, _key)
        placeholders = [
            f"{slug}/pages/home/hero/.keep",
            f"{slug}/pages/home/logo/.keep",
            f"{slug}/pages/demo/.keep",
            f"{slug}/catalog/.keep",
        ]
        for path in placeholders:
            try:
                sb.storage.from_("properties").upload(path, b"", {"upsert": "true"})
            except Exception:
                pass  # folder creation is best-effort; Supabase creates paths on first real upload
    except Exception as exc:
        logger.warning("Tenant folder init failed for %s: %s", slug, exc)


async def register_new_tenant(db: Prisma, data: dict) -> dict:
    repo = RegistrationRepository(db)

    if await repo.slug_exists(data["slug"]):
        raise ConflictError(
            f"The slug '{data['slug']}' is already taken. Please choose a different one."
        )
    if await repo.user_email_exists(data["email"]):
        raise ConflictError("An account with this email address already exists.")

    venue_type    = data.get("venue_type", "real_estate")
    trial_ends_at = datetime.now(timezone.utc) + timedelta(days=14)

    client = await repo.create_client({
        "name":            data.get("business_name_ar") or data.get("business_name", ""),
        "name_ar":         data.get("business_name_ar"),
        "name_en":         data.get("business_name_en") or data.get("business_name"),
        "slug":            data["slug"],
        "phone":           data["whatsapp_number"],
        "email":           data["email"],
        "whatsapp_number": data["whatsapp_number"],
        "primary_color":   data.get("primary_color", "#6d28d9"),
        "currency":        data.get("currency", "USD"),
        "config":          json.dumps(_DEFAULT_CONFIG),
        "features":        json.dumps(_DEFAULT_FEATURES),
        "payment_methods": data.get("payment_methods", ["cash", "card"]),
        "unit_types":      VENUE_TYPE_MAP.get(venue_type, ["chalet"]),
        "status":          "trial",
        "trial_ends_at":   trial_ends_at,
        "service_type":    venue_type,
    })

    user = await repo.create_user({
        "clientId":      client.id,
        "email":         data["email"],
        "password_hash": get_password_hash(data["password"]),
        "fullName":      data.get("owner_name") or data.get("business_name_ar") or data.get("business_name", ""),
        "role":          "TENANT_ADMIN",
    })

    await repo.seed_default_services(client.id, ["catalog"])

    # Non-blocking: create tenant folder structure in Supabase Storage
    asyncio.get_event_loop().run_in_executor(None, _init_tenant_storage, client.slug)

    await sheets_service.append_client_row({
        "slug":            client.slug,
        "name_ar":         data.get("business_name_ar") or data.get("business_name", ""),
        "name_en":         data.get("business_name_en") or data.get("business_name"),
        "service_type":    venue_type,
        "status":          "trial",
        "currency":        data.get("currency", "USD"),
        "primary_color":   data.get("primary_color", "#6d28d9"),
        "owner_name":      data.get("owner_name", ""),
        "owner_phone":     data["whatsapp_number"],
        "owner_email":     data["email"],
        "trial_ends_at":   trial_ends_at.isoformat(),
        "created_at":      datetime.now(timezone.utc).isoformat(),
        "selected_services": [],
    })

    return {
        "success": True,
        "data": {
            "slug":          client.slug,
            "client_id":     client.id,
            "admin_email":   user.email,
            "trial_ends_at": trial_ends_at.isoformat(),
            "dashboard_url": f"https://{client.slug}.salmansaas.com/dashboard",
        },
    }
