"""
Public Reservations API — /api/v1/public/reservations/
No auth required. Gated by require_service("reservations").
Works for: restaurant tables, service appointments, property viewings, clinic appointments.
"""

from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db.dependencies import get_current_tenant
from app.core.services import require_service
from app.core.db_resilience import with_db_resilience
from app.services import reservation_service, catalog_service_service, whatsapp_service
from app.repositories import resource_repo, barber_repo, barber_service_repo
from app.repositories import resource_service_repo

router = APIRouter()

VALID_MODULE_KEYS = ["restaurant", "services", "real_estate", "hotel", "clinic", "barber"]


# ── Schemas ───────────────────────────────────────────────────────────────────

class ReservationIn(BaseModel):
    module_key:     str
    customer_name:  str
    customer_phone: str
    customer_email: Optional[str] = None
    reserved_at:    datetime
    duration_min:   Optional[int] = None
    notes:          Optional[str] = None
    # module-specific:
    # restaurant  → { "table_label": "A4", "party_size": 4 }
    # services    → { "service_name": "...", "staff_id": "..." }
    # real_estate → { "unit_id": "...", "guests": 2, "viewing_type": "in_person" }
    # clinic      → { "resource_id": "uuid", "service_id": "uuid" }  (resource_id also mirrored
    #                to the real Reservation.resourceId FK — see resource_repo.py)
    # barber      → { "barber_id": "uuid", "service_id": "uuid" }  (barber_id also mirrored to the
    #                real Reservation.barberId FK — see barber_repo.py; built independently of
    #                the clinic/resource_id path, 2nd real Reservation Strategy case, 2026-07-31)
    metadata:       Optional[dict] = None


class CancelIn(BaseModel):
    customer_phone: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/")
async def create_reservation(
    body: ReservationIn,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    if body.module_key not in VALID_MODULE_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid module_key. Use: {VALID_MODULE_KEYS}",
        )
    # Phase 1.x fix (2026-08-05, same root cause as get_available_slots()'s past-slot filter):
    # body.reserved_at is a naive-local wall-clock value labeled UTC (no real conversion) -- `now`
    # must be built the same way, not the TRUE UTC instant, or this guard is wrong by the tenant's
    # real UTC offset (confirmed: this is the guard a real customer hits when confirming a booking).
    # A NAIVE `reserved_at` USED TO 500 HERE (found 2026-09-12 while testing this endpoint by
    # hand). `body.reserved_at` is whatever the client sent: the availability endpoint returns
    # "...T14:00:00+00:00" so the real frontend is fine, but a client that omits the offset --
    # curl, a script, an integration -- produced a naive datetime, and comparing naive to aware
    # raises TypeError, which surfaces as an opaque 500 on a PUBLIC route. The value is already
    # treated as naive-local-labelled-UTC everywhere downstream (see the note below), so stamping
    # UTC on it here is the same interpretation, made explicit instead of crashing.
    reserved_at = body.reserved_at
    if reserved_at.tzinfo is None:
        reserved_at = reserved_at.replace(tzinfo=timezone.utc)

    if reserved_at < datetime.now().replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot reserve a past time slot.")

    try:
        result = await reservation_service.create_reservation(
            client_id      = tenant["id"],
            module_key     = body.module_key,
            customer_name  = body.customer_name,
            customer_phone = body.customer_phone,
            customer_email = body.customer_email,
            reserved_at    = reserved_at,
            duration_min   = body.duration_min,
            notes          = body.notes,
            metadata       = body.metadata,
            source         = "website",
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    return {"success": True, "data": result}


# module_key -> Resource.type — only "clinic" is resource-backed today (RESOURCE_BACKED_MODULE_KEYS
# in reservation_service.py); this map stays in lockstep with that set.
MODULE_KEY_TO_RESOURCE_TYPE = {"clinic": "doctor"}


@router.get("/resources")
async def list_public_resources(
    module_key: str = Query(...),
    service_id: Optional[UUID] = Query(None),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    """List active Resources for a moduleKey — e.g. a 'choose your doctor' picker for clinic
    bookings. Only active resources are ever returned publicly.

    service_id (Clinic P4-D, 2026-09-26): narrows the list to the Resources that actually perform
    that service, via `resource_services`.

    🔴 THIS FILTER IS HARD, AND THE BARBER ONE BELOW IS SOFT. That is a decision (ق-٤-ب / ق-٤-ز),
    not an inconsistency, and copying the barber's shape here by reflex would have re-created the
    exact divergence the decision exists to prevent -- a picker offering a doctor the availability
    engine then refuses. The barber's softness buys backward compatibility for tenants whose
    assignments were never filled in; the clinic has no live resources at all, so it pays nothing
    for strictness and starts correct instead of starting compatible.

    An empty result therefore means "no doctor here performs this", never "we could not tell".
    A clinic that has not had its `resource_services` rows written shows nobody — which is the
    correct state of a clinic nobody has provisioned, and is why provisioning must write them."""
    resource_type = MODULE_KEY_TO_RESOURCE_TYPE.get(module_key)
    if not resource_type:
        return {"success": True, "data": []}

    resources = await resource_repo.list_resources(tenant["id"], resource_type=resource_type, active_only=True)

    if service_id is not None:
        qualified = set(await resource_service_repo.list_resource_ids_for_service(
            tenant["id"], str(service_id)))
        resources = [r for r in resources if r.id in qualified]

    return {
        "success": True,
        "data": [
            {"id": r.id, "name": r.name, "specialty": r.specialty, "type": r.type}
            for r in resources
        ],
    }


@router.get("/resources/{resource_id}/availability")
async def get_resource_availability(
    resource_id: UUID,
    service_id:  UUID = Query(...),
    date_str:    str = Query(..., alias="date", description="YYYY-MM-DD"),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    """Free start times for one Resource on one date — the clinic's availability endpoint.

    A SIBLING of `/availability`, not a widening of it (ق-٤-ح): the barber endpoint's contract is
    untouched, and one shared engine sits under both. The path shape mirrors this codebase's own
    precedent, `/units/{unit_id}/availability`, rather than inventing a new one.

    🔴 NO `duration_min` PARAMETER — ق-٤-أ. The server derives it from `CatalogService.durationMin`,
    so a caller cannot ask for slots of a length the service does not have. `service_id` is
    REQUIRED here while it is optional on the picker above, because the duration has nowhere else
    to come from.

    Status codes, and the distinction is the point:
      404  the resource or the service is not this tenant's, or the resource is inactive
      409  both are real, but this resource does not perform this service -- a conflict between
           two valid ids, not a missing thing. Caught by TYPE, never by matching the message."""
    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD.")

    try:
        slots = await with_db_resilience(
            lambda: reservation_service.get_available_slots_for_resource(
                client_id   = tenant["id"],
                resource_id = str(resource_id),
                service_id  = str(service_id),
                target_date = target_date,
            ),
            label="get_available_slots_for_resource",
        )
    except reservation_service.ResourceDoesNotProvideService as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return {"success": True, "data": slots}


@router.get("/barbers")
async def list_public_barbers(
    service_id: Optional[UUID] = Query(None),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    """List active Barbers for this tenant — e.g. a 'choose your barber' picker for barber
    bookings. Written as its own endpoint rather than folded into /resources above, per the
    independent-build instruction (2026-07-31) — there's no module_key/resource_type mapping to
    look up here, since barber isn't a Resource.type value at all.

    service_id (Phase 3.7C, 2026-08-08, soft filter per Salman's explicit decision): when given,
    narrows the list to Barbers qualified for that CatalogService via BarberService. Deliberately
    NOT hard-enforced -- if the filtered result is empty (true for every existing service today,
    since no assignments exist yet), falls back to the full unfiltered list. This one rule is what
    keeps the endpoint backward-compatible with zero migration step for existing tenants -- a
    service with no assignments behaves exactly as it did before this filter existed."""
    barbers = await with_db_resilience(
        lambda: barber_repo.list_barbers(tenant["id"], active_only=True),
        label="list_public_barbers",
    )

    if service_id is not None:
        qualified_ids = set(await barber_service_repo.list_barber_ids_for_service(tenant["id"], str(service_id)))
        filtered = [b for b in barbers if b.id in qualified_ids]
        if filtered:
            barbers = filtered
        # else: no assignments for this service yet -- fall back to the full list, unfiltered.

    return {
        "success": True,
        # P1.1 (2026-08-15, ALZABT_P1_1_STAFF_SECTION_PROPOSAL.md): additive, backward-compatible
        # extension -- image_url/description already exist on Barber and are already exposed by
        # the admin endpoint (admin/barbers.py's own _fmt()); this is the first public consumer
        # that needs them (StaffSection.jsx's showcase list, not the booking picker's own use of
        # this same endpoint). id/name/ordering/auth are unchanged.
        "data": [
            {"id": b.id, "name": b.name, "image_url": b.imageUrl, "description": b.description}
            for b in barbers
        ],
    }


@router.get("/catalog-services")
async def list_public_services(
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    """List active CatalogServices for this tenant -- the "what am I booking" picker on the public
    booking page. Phase 3.7C (2026-08-08) -- replaces the old client-side pattern of walking every
    Category, fetching every CatalogItem, and filtering by metadata.requires_booking.

    Named "/catalog-services", not "/services" -- a real routing collision, not just a naming one:
    public/__init__.py already registers GET /{slug}/services (smar's unrelated property add-on
    Service model) directly on the root public router, BEFORE this router's own include_router()
    call. Starlette matches routes in registration order, so a request to
    /reservations/services would have matched that wildcard first, with "reservations" captured as
    {slug} -- confirmed live: it returned a 422 demanding unit_id, that route's own required param,
    not this one's. Found via real Browser Verification, not assumed."""
    data = await with_db_resilience(
        lambda: catalog_service_service.public_list_services(tenant["id"]),
        label="public_list_services",
    )
    return {"success": True, "data": data}


@router.get("/availability")
async def get_availability(
    barber_id:    UUID = Query(...),
    date_str:     str = Query(..., alias="date", description="YYYY-MM-DD"),
    duration_min: int = Query(...),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    """Reservation Pilot, Phase 1 — real open slots for a given barber/date/service duration.
    Thin route per api-rules.md — all logic lives in reservation_service.get_available_slots().

    barber_id typed as UUID (Phase 1.x fix, 2026-08-05): a malformed value (e.g. "1") used to
    reach barber_repo.find_barber()'s Prisma query untouched and raise prisma.errors.DataError --
    not a ValueError, so it wasn't caught below and surfaced as a raw 500. Typing it UUID here
    makes FastAPI reject a malformed value with a clean 422 before the route body ever runs, same
    pattern api-rules.md's own `unit_id: UUID` example already documents."""
    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD.")

    try:
        slots = await with_db_resilience(
            lambda: reservation_service.get_available_slots(
                client_id     = tenant["id"],
                barber_id     = str(barber_id),
                target_date   = target_date,
                duration_min  = duration_min,
            ),
            label="get_available_slots",
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return {"success": True, "data": slots}


@router.get("/whatsapp-link")
async def get_whatsapp_booking_link(
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    """Phase B, Stage 1 (Central Platform WABA) — this tenant's own deep link into the shared
    booking bot. Registered before /{reservation_id} deliberately (Starlette matches routes in
    registration order — this file's own /catalog-services comment already documents why a static
    path segment must come before a same-method catch-all path param, same rule applied here).

    `available: false` (url: null) means WHATSAPP_CENTRAL_NUMBER isn't configured in this
    environment yet — frontend should hide the WhatsApp entry point rather than render a dead link."""
    url = whatsapp_service.build_central_booking_link(tenant["slug"])
    return {"success": True, "data": {"url": url, "available": url is not None}}


@router.get("/{reservation_id}")
async def get_reservation(
    reservation_id: str,
    customer_phone: str = Query(..., description="Required for customer verification"),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    result = await reservation_service.get_reservation(
        client_id       = tenant["id"],
        reservation_id  = reservation_id,
        customer_phone  = customer_phone,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    return {"success": True, "data": result}


@router.patch("/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: str,
    body: CancelIn,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("reservations")),
):
    """Customer self-cancellation — verified by phone number."""
    cancelled = await reservation_service.cancel_by_customer(
        client_id      = tenant["id"],
        reservation_id = reservation_id,
        customer_phone = body.customer_phone,
    )
    if not cancelled:
        raise HTTPException(
            status_code=404,
            detail="Reservation not found, already cancelled, or phone mismatch.",
        )
    return {"success": True, "data": {"status": "cancelled"}}
