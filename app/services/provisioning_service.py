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

Phase 3 (2026-08-15) added the retry-safe orchestration (provision_vertical_domain_objects(),
below) once Self-Registration became the real second caller with a real retry path this module's
own idempotency guard had been deferred for. Phase 3.6 (same day, following the Phase 3.5 audit)
hardened it further: an atomic claim closing a real concurrency gap, and a real (still no-op)
apply_page_repertoire() hook matching the Contract's own diagram. provision_barber_domain() above
remains untouched by any of this -- still the pure, content-free mechanism, still Demo Builder's
own direct, non-orchestrated call.
"""
import logging

from prisma import Json

from app.core.exceptions import BusinessLogicError, ConflictError
from app.core.verticals import get_vertical
from app.repositories import admin_catalog_repo as catalog_repo
from app.repositories import admin_client_repo
from app.repositories import barber_repo, catalog_service_repo, barber_service_repo

logger = logging.getLogger(__name__)


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


# ── Orchestration (Unified Provisioning Contract, Phase 3, 2026-08-15; hardened Phase 3.6) ──────
#
# provision_vertical_domain_objects() is the retry-safe entrypoint Self-Registration's own
# provisioning endpoint calls -- distinct from provision_barber_domain() above, which stays the
# pure, content-free mechanism (Phase 2, unchanged, still Demo Builder's own direct call with no
# retry semantics, since it has no retry path to protect). This function adds exactly what a real
# second caller with a real retry path needs: dispatch by staff_backing_model (never a vertical-
# name string comparison), idempotent no-op if already complete, an atomic claim closing a real
# concurrency gap (Phase 3.5's own audit finding #3), and delete-then-recreate cleanup of any
# partial rows a prior failed attempt left behind -- the same "full replace" pattern
# barber_service_repo.set_services_for_barber() already proves works in this codebase, applied one
# level up. See .claudedocs/architecture/ALZABT_PHASE3_FINAL_CONTRACT.md for the full reasoning.
#
# ── provisioning_status vs. TENANT_LIFECYCLE_PLAN.md -- reconciliation, stated once, here ──────
# Phase 3.5's audit found provisioning_status sits on the same conceptual axis as
# TENANT_LIFECYCLE_PLAN.md's own already-designed (2026-07-18, never implemented) "Onboarding
# Status" (not_started/in_progress/completed), never checked against it before. Stated plainly,
# so neither this field nor a future real Onboarding Status implementation silently duplicates or
# contradicts the other:
#   - provisioning_status is scoped ONLY to this one mechanism: did the vertical's real domain
#     objects (Barber/CatalogService/BarberService today) get created. Nothing more.
#   - It is NOT, and must never be read as, a substitute for tenant-onboarding.md's own
#     Completion Gate ("Client -> User -> Services -> Settings -> Page Content -> Media -> Public
#     Page renders -> Dashboard renders") -- provisioning_status='complete' certifies only a
#     subset of that chain (through Domain Data), never Page Content, Media, or rendering.
#   - If/when TENANT_LIFECYCLE_PLAN.md's own Onboarding Status field is ever actually built, this
#     field does not get folded into it silently -- that would be a real migration decision (does
#     "provisioning complete" become one Onboarding Status value among several, or stay a separate,
#     narrower fact a broader Onboarding Status also reads?), made explicitly then, not assumed now.

async def _current_domain_state(client_id: str) -> dict:
    barbers = await barber_repo.list_barbers(client_id)
    catsvcs = await catalog_service_repo.list_catalog_services(client_id)
    return {
        "barber_id":   barbers[0].id if barbers else None,
        "service_ids": [s.id for s in catsvcs],
    }


async def provision_vertical_domain_objects(
    client_id: str,
    vertical: str,
    staff_name: str,
    services: list[tuple[str, str | None, int, float]],
) -> dict:
    """
    Retry-safe orchestration: provision a tenant's real vertical domain objects from
    caller-supplied data, exactly once, safely re-callable on failure.

    Returns {"barber_id": ..., "service_ids": [...]}.
    Raises BusinessLogicError for an unsupported vertical or an unimplemented staff_backing_model.
    Any other exception during provisioning sets Client.provisioning_status = "failed" before
    re-raising.
    """
    entry = get_vertical(vertical)
    if entry is None:
        raise BusinessLogicError(f"Unsupported vertical '{vertical}'.")

    client = await admin_client_repo.find_client_by_id(client_id)
    if client is None:
        raise BusinessLogicError(f"Client '{client_id}' not found.")

    if client.provisioningStatus == "complete":
        # Idempotent no-op -- already provisioned, never re-run. Real state returned so a caller
        # that retried for no real reason (e.g. a duplicate click) still gets a real, useful
        # response instead of an ambiguous empty one.
        return await _current_domain_state(client_id)

    # Atomic claim (Phase 3.6) -- a single conditional UPDATE, not a separate read-then-write, so
    # two genuinely concurrent calls for the same client_id can't both pass a check and both
    # proceed to create duplicate rows. Only one caller ever wins this.
    claimed = await admin_client_repo.claim_provisioning(client_id)
    if not claimed:
        # Someone else either just finished (status is now 'complete' -- a real, harmless race
        # with the no-op check above, not a bug: return the real result instead of erroring) or is
        # actively provisioning right now (status is 'provisioning' -- a genuine conflict, told to
        # the caller honestly rather than silently retried into a duplicate).
        refreshed = await admin_client_repo.find_client_by_id(client_id)
        if refreshed and refreshed.provisioningStatus == "complete":
            return await _current_domain_state(client_id)
        raise ConflictError(
            f"Provisioning for client '{client_id}' is already in progress. Please wait and retry."
        )

    staff_model = entry.get("staff_backing_model")
    try:
        if staff_model == "Barber":
            # Delete-then-recreate: clear any partial rows a prior failed attempt left behind,
            # using THIS call's fresh data, never stale data from the failed attempt. Cascades
            # (schema.prisma) handle everything downstream: deleting the Barber cascades to its
            # BarberService rows; deleting the Category cascades to its CatalogServices, which
            # cascades to THEIR BarberService rows too -- no separate cleanup call needed for
            # either.
            await barber_repo.delete_barbers_by_client(client_id)
            await catalog_repo.delete_categories_by_client(client_id)

            await provision_barber_domain(client_id, staff_name, services)
            await apply_page_repertoire(client_id, vertical)
        else:
            raise BusinessLogicError(
                f"No provisioning implementation for staff_backing_model={staff_model!r} "
                f"(vertical={vertical!r})."
            )
    except Exception:
        await admin_client_repo.update_client(client_id, {"provisioningStatus": "failed"})
        raise

    await admin_client_repo.update_client(client_id, {"provisioningStatus": "complete"})
    return await _current_domain_state(client_id)


async def apply_page_repertoire(client_id: str, vertical: str) -> None:
    """
    Real, documented extension point for Section System P3's own future work -- named explicitly
    in ALZABT_UNIFIED_PROVISIONING_CONTRACT_FINAL.md's own contract diagram, but never actually
    built as code until now (Phase 3.5's audit found it existed only as a paragraph).

    Reads VERTICAL_REGISTRY[vertical]["page_template"] -- today always None, for every real
    vertical, because no real page_templates/{vertical}.json exists yet (Section System P3's own
    job, not built here). When a real template path does exist, this is where it gets applied,
    via the same mechanism scripts/seed_page_content.py already proves works, automated instead
    of run by hand. Deliberately does nothing today rather than faking a guarantee -- the same
    "no fake step" principle ALZABT_PHASE3_FINAL_CONTRACT.md's own Decision 1 already applied to
    self-registration's data collection, applied here to this hook instead.
    """
    entry = get_vertical(vertical)
    page_template = entry.get("page_template") if entry else None
    if page_template is None:
        logger.info(
            "apply_page_repertoire: no page_template registered for vertical=%r yet -- no-op.",
            vertical,
        )
        return
    # Not reachable today -- no real vertical has a page_template yet. Left unimplemented on
    # purpose, failing loudly rather than silently, so whoever adds the first real template also
    # decides what "applying" it actually means (Section System P3's own scope, not this file's).
    raise NotImplementedError(
        f"page_template application not yet built (vertical={vertical!r}, "
        f"page_template={page_template!r})."
    )
