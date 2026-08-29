import asyncio
import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from prisma import Prisma

from app.repositories.registration_repo import RegistrationRepository
from app.core.security import get_password_hash
from app.core.exceptions import ConflictError, BusinessLogicError
from app.core.verticals import get_vertical
from app.services import sheets_service
from app.services.email_service import send_welcome_email

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
    "barbershop":  [],  # no unit types -- Booking here is appointment-based, not unit-based
}

# Maps venue_type → which client_services to seed at registration
# Note: "catalog" is always included for store/restaurant to gate admin catalog endpoints.
# The module-specific key ("store"/"restaurant") gates the public-facing endpoints.
_SERVICE_SEED_MAP: dict[str, list[str]] = {
    "store":       ["store", "catalog"],
    "restaurant":  ["restaurant", "catalog"],
    "barbershop":  ["booking", "reservations", "catalog", "whatsapp_ordering"],
    "real_estate": ["catalog"],
    "hotel":       ["catalog"],
    "sports":      ["catalog"],
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
    if await repo.phone_exists(data["whatsapp_number"]):
        raise ConflictError(
            f"The phone number '{data['whatsapp_number']}' is already registered. "
            "Please use a different number."
        )

    venue_type    = data.get("venue_type", "real_estate")

    # Vertical Registry wiring (2026-08-14) -- additive, self-registration's own onboarding
    # contract fix. `vertical` is optional and only ever set by a Reservations-shaped template
    # (see template-registry.js); a retail/restaurant template (or any caller that doesn't send
    # it) leaves this None and falls through to the existing venue_type/_SERVICE_SEED_MAP logic
    # below, completely unchanged. A `vertical` value that doesn't resolve in VERTICAL_REGISTRY is
    # a real client error (a typo, or a vertical not registered yet) -- fails loudly per the
    # already-ratified hard-gate decision (ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md), not silently
    # ignored the way venue_type's own unreachable "barbershop" value has been until now.
    vertical        = data.get("vertical")
    vertical_entry  = get_vertical(vertical) if vertical else None
    if vertical and vertical_entry is None:
        raise BusinessLogicError(f"Unsupported vertical '{vertical}'.")

    # ADR-0002 §9.2: 14 days is the unified default trial duration across
    # every onboarding path (this one already matched; demo_service.py's
    # separate 7-day default was retired to match it). Stored per-tenant
    # via trial_ends_at (existing field) - not a hardcoded platform config.
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
        # ADR-0002 §9.2: Tenant Status (active/suspended, ADR-0001 Hard
        # Block) is independent of Account Lifecycle State (trial here) -
        # new tenants are always "active" at creation, never "suspended".
        "status":          "active",
        "lifecycle_state": "trial",
        "trial_ends_at":   trial_ends_at,
        "service_type":    venue_type,
        "vertical":        vertical if vertical_entry else None,
        # Unified Provisioning Contract, Phase 3 (2026-08-15): 'pending' only when a real
        # vertical resolved -- this tenant has a real Step 1.5 to complete. A retail/restaurant
        # tenant (no vertical) has no domain-objects step to gate, so it correctly stays
        # untracked (None) by this mechanism, same honesty convention `vertical` itself already
        # uses for out-of-scope tenants -- never a permanent, meaningless "pending forever".
        "provisioningStatus": "pending" if vertical_entry else None,
    })

    setup_token     = secrets.token_urlsafe(32)
    setup_token_exp = datetime.now(timezone.utc) + timedelta(days=7)

    user = await repo.create_user({
        "clientId":       client.id,
        "email":          data["email"],
        "password_hash":  get_password_hash(data["password"]),
        "fullName":       data.get("owner_name") or data.get("business_name_ar") or data.get("business_name", ""),
        "role":           "TENANT_ADMIN",
        # Tenant Owner Phone Login (2026-08-29) -- same source value as Client.phone above
        # (data["whatsapp_number"], already normalized by TenantRegistrationRequest's own
        # validator), so the tenant's admin can log in with either email or this same phone
        # number -- see app/api/v1/admin/auth.py's user_login() phone fallback.
        "phone":          data["whatsapp_number"],
        "setupToken":     setup_token,
        "setupTokenExp":  setup_token_exp,
    })

    # Service seeding strategy (BUG-08 permanent fix):
    # - Payload services come pre-validated by the Validator skill (auto-adds "catalog")
    # - _SERVICE_SEED_MAP is the safety net for direct API calls (no pipeline)
    # - Union of both ensures we never miss a required service regardless of call origin
    #
    # Vertical Registry takes over map_services ONLY when a real, registered vertical was sent --
    # every other caller (retail/restaurant templates, the WhatsApp/n8n webhook, direct API calls
    # with no `vertical`) keeps the exact _SERVICE_SEED_MAP behavior it already had, unchanged.
    payload_services = set(data.get("services") or [])
    map_services     = (
        set(vertical_entry["default_services"]) if vertical_entry
        else set(_SERVICE_SEED_MAP.get(venue_type, ["catalog"]))
    )
    services_to_seed = list(payload_services | map_services)
    await repo.seed_default_services(client.id, services_to_seed)

    # Non-blocking: create tenant folder structure in Supabase Storage
    asyncio.get_event_loop().run_in_executor(None, _init_tenant_storage, client.slug)

    # Non-blocking: send welcome email to new tenant admin
    asyncio.get_event_loop().run_in_executor(
        None,
        lambda: asyncio.run(send_welcome_email(
            to_email      = data["email"],
            business_name = data.get("business_name_ar") or data.get("business_name_en") or data.get("business_name", ""),
            slug          = client.slug,
        ))
    )

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

    base_url = os.getenv("FRONTEND_URL", "https://salmansaas.com")
    return {
        "success": True,
        "data": {
            "slug":          client.slug,
            "client_id":     client.id,
            "admin_email":   user.email,
            "trial_ends_at": trial_ends_at.isoformat(),
            "dashboard_url": f"{base_url}/{client.slug}/dashboard",
            "setup_url":     f"{base_url}/setup?token={setup_token}",
        },
    }
