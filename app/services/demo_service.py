"""
app/services/demo_service.py
Business logic — instant trial tenant creation for the /demo/create endpoint.

Flow:
  1. Generate unique slug  →  demo-{name_en_slug}-{4 random chars}
  2. Create Client row     →  status="trial", trial_ends_at=now()+7days
  3. Create User row       →  role=TENANT_ADMIN, temp 8-char password
  4. Seed client_services  →  based on business_type
  5. Seed catalog          →  sample categories + items (restaurant / store only)
  6. Return slug + temp_password + admin_url + expires_at

Service-type mapping:
  restaurant → ["restaurant", "gallery", "catalog"]
  store      → ["store", "gallery", "catalog"]
  booking    → ["booking", "gallery", "whatsapp_ordering", "catalog"]
"""
import json
import logging
import os
import re
import secrets
import string
from datetime import datetime, timedelta, timezone

from prisma import Prisma

from app.core.exceptions import ConflictError
from app.core.security import get_password_hash
from app.repositories.demo_repo import DemoRepository
from app.repositories import admin_catalog_repo as catalog_repo
from app.services import provisioning_service

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

# ADR-0002 §9.2: unified to 14 days, matching registration_service.py's
# default (was 7 - the exact inconsistency ADR-0002 was written to fix).
TRIAL_DAYS = 14

_SERVICE_MAP: dict[str, list[str]] = {
    "restaurant": ["restaurant", "gallery", "catalog"],
    "store":      ["store",      "gallery", "catalog"],
    "booking":    ["booking",    "gallery", "whatsapp_ordering", "catalog"],
    # Both booking AND reservations -- service-system.md's documented pitfall (seeding only one
    # leaves the admin Reservations tab/route silently unreachable). Same 4 keys
    # scripts/seed_alzabt_demo_tenant.py already proved for the alzabt-demo reference tenant.
    "barbershop": ["booking", "reservations", "catalog", "whatsapp_ordering"],
}

_VENUE_TYPE_MAP: dict[str, str] = {
    "restaurant": "restaurant",
    "store":      "ecommerce",
    "booking":    "real_estate",
    # Matches Client.service_type already used by RK and alzabt-demo -- one canonical value.
    "barbershop": "barbershop",
}

# Vertical Registry wiring (2026-08-14) -- business_type -> Client.vertical, additive alongside
# service_type above, not a replacement yet (ALZABT_VERTICAL_IMPACT_AND_MIGRATION_ANALYSIS.md's
# Migration Plan Step 3). Only "barbershop" maps to a real, registered vertical ("barber") today --
# every other business_type maps to None (not yet a Vertical Registry concept; unaffected).
_VERTICAL_MAP: dict[str, str] = {
    "barbershop": "barber",
}

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

# ── Demo catalog seed data ─────────────────────────────────────────────────────
# Each entry: (name_ar, name_en, items)
# Item tuple: (name_ar, name_en, price)

_RESTAURANT_SEED: list[tuple[str, str, list[tuple[str, str, float]]]] = [
    (
        "المقبلات", "Appetizers",
        [
            ("حمص",   "Hummus",          4.0),
            ("فتوش",  "Fattoush Salad",  3.5),
        ],
    ),
    (
        "الأطباق الرئيسية", "Main Dishes",
        [
            ("شاورما دجاج", "Chicken Shawarma", 8.0),
            ("كباب مشوي",   "Grilled Kebab",    10.0),
        ],
    ),
    (
        "المشروبات", "Beverages",
        [
            ("عصير ليمون",  "Lemonade",     2.5),
            ("قهوة عربية", "Arabic Coffee", 3.0),
        ],
    ),
    (
        "الحلويات", "Desserts",
        [
            ("كنافة",   "Knafeh",   4.0),
            ("بقلاوة",  "Baklava",  3.5),
        ],
    ),
]

_STORE_SEED: list[tuple[str, str, list[tuple[str, str, float]]]] = [
    (
        "العروض", "Deals",
        [
            ("منتج تجريبي 1", "Demo Product 1", 15.0),
            ("منتج تجريبي 2", "Demo Product 2", 20.0),
        ],
    ),
    (
        "الأكثر مبيعاً", "Best Sellers",
        [
            ("منتج تجريبي 3", "Demo Product 3", 30.0),
            ("منتج تجريبي 4", "Demo Product 4", 25.0),
        ],
    ),
    (
        "الجديد", "New Arrivals",
        [
            ("منتج تجريبي 5", "Demo Product 5", 18.0),
            ("منتج تجريبي 6", "Demo Product 6", 22.0),
        ],
    ),
]

_CATALOG_SEED_MAP: dict[str, list] = {
    "restaurant": _RESTAURANT_SEED,
    "store":      _STORE_SEED,
}

# Barbershop seed data -- same realistic set as scripts/seed_alzabt_demo_tenant.py's SERVICES
# list (independently authored data, same shape). Tuple: (name_ar, name_en, duration_min, price).
_BARBERSHOP_SEED_SERVICES: list[tuple[str, str, int, float]] = [
    ("شعر",       "Haircut",           20, 8.0),
    ("لحية",      "Beard Trim",        15, 6.0),
    ("شعر ولحية", "Haircut & Beard",   30, 12.0),
    ("كرياتين",   "Keratin Treatment", 75, 25.0),
    ("تصفيف",     "Styling",           15, 5.0),
    ("صبغة",      "Hair Color",        40, 15.0),
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    """Convert arbitrary text to a URL-safe slug fragment."""
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or "tenant"


def _unique_slug(name_en: str) -> str:
    """
    Generate demo-{name_en_slug}-{4 random chars}.
    Example: name_en="Beit Smar" → "demo-beit-smar-a3f9"
    """
    base = _slugify(name_en)[:30]          # cap the name part at 30 chars
    suffix = secrets.token_hex(2)          # 4 lowercase hex chars
    return f"demo-{base}-{suffix}"


def _temp_password(length: int = 8) -> str:
    """Generate a human-readable 8-character alphanumeric password."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


# ── Catalog seeder ────────────────────────────────────────────────────────────

async def _seed_demo_catalog(client_id: str, business_type: str, name_ar: str = "") -> None:
    """
    Seed sample CatalogCategories + CatalogItems for a new trial tenant.

    - restaurant → 4 categories, 2 items each (8 items total)
    - store      → 3 categories, 2 items each (6 items total)
    - barbershop → 1 Barber, 1 CatalogCategory, 6 CatalogService rows (real reservation model)
    - booking    → no catalog needed; returns immediately

    Uses admin_catalog_repo so all writes go through the proper repository layer.
    Every row carries clientId — no cross-tenant leakage possible.
    """
    if business_type == "barbershop":
        await _seed_demo_barbershop(client_id, name_ar)
        return

    seed_data = _CATALOG_SEED_MAP.get(business_type)
    if not seed_data:
        # booking (and any unknown type) — catalog not relevant
        logger.debug("_seed_demo_catalog: skipping for business_type=%s", business_type)
        return

    module_key = business_type  # "restaurant" or "store"
    total_categories = 0
    total_items = 0

    for cat_order, (name_ar, name_en, items) in enumerate(seed_data):
        category = await catalog_repo.create_category({
            "clientId":  client_id,
            "moduleKey": module_key,
            "nameAr":    name_ar,
            "nameEn":    name_en,
            "sortOrder": cat_order,
        })
        total_categories += 1

        for item_order, (item_name_ar, item_name_en, price) in enumerate(items):
            await catalog_repo.create_item({
                "clientId":   client_id,
                "categoryId": category.id,
                "nameAr":     item_name_ar,
                "nameEn":     item_name_en,
                "price":      price,
                "currency":   "USD",
                "isActive":   True,
                "sortOrder":  item_order,
            })
            total_items += 1

    logger.info(
        "Seeded %d categories, %d items for client_id=%s (type=%s)",
        total_categories, total_items, client_id, business_type,
    )


async def _seed_demo_barbershop(client_id: str, name_ar: str = "") -> None:
    """
    Seed a real reservations-model demo tenant: 1 Barber, 1 CatalogCategory, 6 CatalogService
    rows, then assign every service to the one barber. Same shape
    scripts/seed_alzabt_demo_tenant.py already proved for the standalone alzabt-demo reference
    tenant -- reused here as the auto-provisioning path for a real per-visitor demo.

    Personalized barber name (Salman's explicit request): includes the visitor's own business
    name so the booking page feels built for them, not a generic placeholder.

    Unified Provisioning Contract, Phase 2 (2026-08-15): the actual domain-object creation
    mechanism now lives in provisioning_service.provision_barber_domain() -- this function's own
    job is only to decide WHAT content to pass (Demo Builder's own placeholder name + the fixed
    _BARBERSHOP_SEED_SERVICES list), never how the rows get created. Explicit-always, no defaults
    inside the shared function -- see ALZABT_PHASE2_EXTRACTION_BOUNDARY_FINDING.md for why.
    """
    barber_name = f"الحلاق الرئيسي — {name_ar}" if name_ar else "الحلاق الرئيسي"
    await provisioning_service.provision_barber_domain(
        client_id=client_id,
        barber_name=barber_name,
        services=_BARBERSHOP_SEED_SERVICES,
    )
    logger.info(
        "Seeded barbershop demo: 1 barber, %d services for client_id=%s",
        len(_BARBERSHOP_SEED_SERVICES), client_id,
    )


# ── Main service function ─────────────────────────────────────────────────────

async def create_demo_tenant(db: Prisma, business_type: str, name_ar: str, name_en: str) -> dict:
    """
    Provision a fully-functional trial tenant in one call.

    Args:
        db:            Prisma DB connection (injected by route).
        business_type: "restaurant" | "store" | "booking" | "barbershop"
        name_ar:       Business name in Arabic.
        name_en:       Business name in English (used for slug generation). Optional --
                       a mobile, Arabic-only visitor may leave this empty.

    Returns dict with: slug, admin_url, temp_password, expires_at
    """
    repo = DemoRepository(db)

    # ── 1. Generate a collision-resistant slug ─────────────────────────────
    # name_en is optional (demo.py's DemoCreateRequest) -- fall back to a business-type-aware
    # word rather than _slugify's own generic "tenant" default, so a barbershop-type demo still
    # gets a meaningful slug like demo-barber-a3f9 instead of demo-tenant-a3f9.
    slug_seed = name_en.strip() if name_en and name_en.strip() else (
        "Barber" if business_type == "barbershop" else name_en
    )

    # Retry up to 5 times in the extremely unlikely event of a hex collision.
    slug = None
    for _ in range(5):
        candidate = _unique_slug(slug_seed)
        if not await repo.slug_exists(candidate):
            slug = candidate
            break

    if slug is None:
        # Astronomically unlikely; raise a clear error rather than silently failing.
        raise ConflictError("Could not generate a unique demo slug. Please try again.")

    # ── 2. Create Client row ───────────────────────────────────────────────
    trial_ends_at = datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)
    service_type  = _VENUE_TYPE_MAP[business_type]
    # Additive alongside service_type, not a replacement yet -- see _VERTICAL_MAP above.
    vertical      = _VERTICAL_MAP.get(business_type)

    # Client.phone is UNIQUE NOT NULL — use a placeholder unique value.
    # We use the slug itself prefixed with "demo-" so it never clashes with real phones.
    placeholder_phone = f"demo-{slug}"

    client = await repo.create_client({
        "name":          name_ar or name_en,
        "name_ar":       name_ar,
        "name_en":       name_en,
        "slug":          slug,
        "phone":         placeholder_phone,
        "primary_color": "#6d28d9",
        "currency":      "USD",
        "config":        json.dumps(_DEFAULT_CONFIG),
        "features":      json.dumps(_DEFAULT_FEATURES),
        "payment_methods": ["cash", "card"],
        "unit_types":    [],
        # ADR-0002 §9.2: same split as registration_service.py - active
        # Tenant Status, trial Account Lifecycle State.
        "status":          "active",
        "lifecycle_state": "trial",
        "trial_ends_at": trial_ends_at,
        "service_type":  service_type,
        "vertical":      vertical,
    })

    # ── 3. Create TENANT_ADMIN user with temp password ─────────────────────
    password_plain = _temp_password()
    # email must be unique — use slug-based placeholder
    placeholder_email = f"{slug}@demo.salmansaas.com"

    await repo.create_user({
        "clientId":      client.id,
        "email":         placeholder_email,
        "password_hash": get_password_hash(password_plain),
        "fullName":      name_en or name_ar,
        "role":          "TENANT_ADMIN",
    })

    # ── 4. Seed client_services based on business_type ─────────────────────
    services_to_seed = _SERVICE_MAP.get(business_type, ["catalog"])
    await repo.seed_services(client.id, services_to_seed)

    # ── 5. Seed sample catalog (restaurant / store / barbershop) ──────────
    await _seed_demo_catalog(client.id, business_type, name_ar)

    # ── 6. Build response ──────────────────────────────────────────────────
    base_url  = os.getenv("FRONTEND_URL", "https://demo.salmansaas.com")
    # Canonical admin URL per routing.md §0b -- /{slug}/dashboard (GenericAdminDashboard), not
    # the legacy /{slug}/admin (SmarAdminDashboard) this line pointed to before. Directly relevant
    # here since this URL is surfaced to real visitors in the demo-builder's success view.
    admin_url = f"{base_url}/{slug}/dashboard"

    logger.info("Demo tenant created: slug=%s type=%s expires=%s", slug, business_type, trial_ends_at.isoformat())

    return {
        "slug":          slug,
        "admin_url":     admin_url,
        "temp_password": password_plain,
        "expires_at":    trial_ends_at.isoformat(),
    }
