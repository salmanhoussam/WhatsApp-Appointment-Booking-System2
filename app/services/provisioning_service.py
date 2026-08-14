"""
app/services/provisioning_service.py — Unified Provisioning Contract, Phase 2.

Shared, vertical-general domain-object provisioning capability. Extracted from
demo_service.py's _seed_demo_barbershop() (which called this same sequence, with hardcoded demo
content, since 2026-07-31). Every real, live caller of that function was confirmed to be exactly
one -- Demo Builder's own create_demo_tenant() path -- before this extraction started.

Deliberate boundary, per Salman's explicit decision (2026-08-15, see
.claudedocs/architecture/ALZABT_PHASE2_EXTRACTION_BOUNDARY_FINDING.md): this module is mechanism
only. It never carries default content (no hardcoded service list, no placeholder staff name) --
every caller supplies its own real or placeholder data explicitly, always. The reasoning, stated
directly: baking Demo Builder's own placeholder content into a "shared" capability would make it
shared in name only, and would silently hand a future self-registered real business the identical
demo script the moment a second caller (Self-Registration, Phase 3 -- not built yet) is wired to
it. Which content to pass is each door's own decision, not this module's.

Two structural defaults ARE kept inside this module (working hours, the category's own generic
name) -- judged, not assumed, to be genuinely universal/structural rather than demo-flavored
content: no real barbershop needs a *different* category label than "الخدمات," and default
working hours are a reasonable starting point any tenant edits afterward via the Dashboard, the
same way its whole config is Content-layer, tenant-owned once created. Flagged here explicitly so
this judgment call is visible and correctable, not silently made.

Does NOT yet include: a batch-level idempotency guard (deferred to whenever a second real caller
with a real retry path exists -- Demo Builder has none today, so building one now would be
speculative infrastructure with nothing to protect) or any provisioning_status write (same reason
-- Phase 1's own column exists, but nothing writes it yet; this module doesn't need to be the
first writer just because it exists).
"""
from prisma import Json

from app.repositories import admin_catalog_repo as catalog_repo
from app.repositories import barber_repo, catalog_service_repo, barber_service_repo


async def provision_barber_domain(
    client_id: str,
    barber_name: str,
    services: list[tuple[str, str, int, float]],
) -> None:
    """
    Create the real Barber-vertical domain objects for one tenant: one Barber, one
    CatalogCategory, the given CatalogServices, and a full BarberService cross-assignment (every
    given service assigned to the one barber).

    Args:
        client_id: the tenant's real Client.id.
        barber_name: required, no default -- the caller decides what to name the barber
                     (a demo placeholder, a real owner's name, whatever fits that door).
        services: required, no default -- list of (name_ar, name_en, duration_min, price)
                  tuples. The caller decides the content; this function only knows how to turn
                  a given list into real rows.
    """
    barber = await barber_repo.create_barber({
        "clientId":     client_id,
        "name":         barber_name,
        "workingHours": Json({"open_time": "09:00", "close_time": "20:00", "closed_days": []}),
        "sortOrder":    0,
    })

    category = await catalog_repo.create_category({
        "clientId":  client_id,
        "moduleKey": "catalog",
        "nameAr":    "الخدمات",
        "nameEn":    "Services",
        "sortOrder": 0,
    })

    created_service_ids = []
    for i, (svc_name_ar, svc_name_en, duration_min, price) in enumerate(services):
        service = await catalog_service_repo.create_catalog_service({
            "clientId":    client_id,
            "categoryId":  category.id,
            "nameAr":      svc_name_ar,
            "nameEn":      svc_name_en,
            "durationMin": duration_min,
            "price":       price,
            "currency":    "USD",
            "isActive":    True,
            "isFeatured":  True,
            "sortOrder":   i,
        })
        created_service_ids.append(service.id)

    await barber_service_repo.set_services_for_barber(client_id, barber.id, created_service_ids)
