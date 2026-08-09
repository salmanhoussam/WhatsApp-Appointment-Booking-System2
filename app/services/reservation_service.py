"""
Reservation Service — business logic for slot-based reservations.
Works across: restaurant, services, real_estate, hotel, clinic, barber.

Pipeline (fixed, always in this order — see the Reservation Strategy Architecture design doc,
Correction 1): Validate -> Resolve Resource -> Working Hours -> Conflict Check -> Create ->
Post Actions. Concrete, Clinic-specific logic lives inline in named helper functions per stage
(Correction 4) — deliberately not extracted into a generic Strategy/registry yet; that extraction
only happens once a second real case proves what's actually shared.

"barber" (added 2026-07-31) is that second real case. Per Salman's explicit instruction, it was
built AS IF clinic/Resource didn't exist — its own Barber table, its own _resolve_barber/
conflict-check code below, deliberately not calling into _resolve_resource or
RESOURCE_BACKED_MODULE_KEYS. The two branches are intentionally near-duplicates in places; that
duplication is the point — it's the raw material for the honest post-hoc comparison recorded in
.claudedocs/evolution/reservation-capability.md, instead of an assumed one.
"""

from datetime import date, datetime, timedelta, timezone

from prisma import Json

from app.db.client import prisma_client
from app.repositories.reservation_repo import ReservationRepository
from app.repositories import resource_repo, barber_repo, catalog_service_repo

VALID_STATUSES  = ["pending", "confirmed", "arrived", "cancelled", "no_show"]
ACTIVE_STATUSES = ["pending", "confirmed", "arrived"]


class ReservationAccessDenied(Exception):
    """Staff Scoped Access (Phase B, 2026-08-09) -- raised when a STAFF-role caller (identified by
    staff_barber_id, always server-derived from the authenticated User, never from client input)
    attempts to read/modify a reservation that isn't theirs, or reassign one to a different barber.
    Routes translate this into a real 403 -- see
    .claudedocs/implementation/STAFF_SCOPED_ACCESS_CONTRACT.md."""
    pass

# module_key → required metadata keys (informational — not enforced as 400, just documented)
MODULE_DEFAULTS: dict[str, dict] = {
    "restaurant":  {"duration_min": 90},
    "services":    {"duration_min": 60},
    "real_estate": {"duration_min": 60},
    "hotel":       {"duration_min": 60},
    "clinic":      {"duration_min": 30},
    "barber":      {"duration_min": 30},
}

# moduleKeys whose Reservation is backed by a real Resource row (Reservation.resourceId) rather
# than the legacy free-text metadata key (table_label/staff_id/unit_id). Only "clinic" today —
# restaurant/services/real_estate deliberately keep the legacy path unchanged (Correction 2/§3b
# scope boundary in the design doc). "barber" is deliberately NOT added to this set — it has its
# own resourceId-equivalent (barberId) and its own resolve/conflict-check path below, built
# independently rather than folded into this set.
RESOURCE_BACKED_MODULE_KEYS = {"clinic"}


def _fmt(r) -> dict:
    return {
        "id":             r.id,
        "client_id":      r.clientId,
        "module_key":     r.moduleKey,
        "customer_name":  r.customerName,
        "customer_phone": r.customerPhone,
        "customer_email": r.customerEmail,
        "reserved_at":    r.reservedAt.isoformat(),
        "duration_min":   r.durationMin,
        "status":         r.status,
        "notes":          r.notes,
        "metadata":       r.metadata or {},
        "resource_id":    getattr(r, "resourceId", None),
        "barber_id":      getattr(r, "barberId", None),
        "service_id":     getattr(r, "serviceId", None),
        "created_at":     r.createdAt.isoformat(),
    }


def _has_conflict(existing_list: list, new_start: datetime, new_duration_min: int) -> bool:
    """Return True if any active reservation overlaps the new slot."""
    new_end = new_start + timedelta(minutes=new_duration_min)
    for r in existing_list:
        r_start = r.reservedAt
        r_end   = r_start + timedelta(minutes=r.durationMin)
        # overlap condition: r_start < new_end AND r_end > new_start
        if r_start < new_end and r_end > new_start:
            return True
    return False


def _check_working_hours(reserved_at: datetime, working_hours: dict | None) -> None:
    """Pipeline stage: Working Hours. Raises ValueError if reserved_at falls outside
    working_hours. Shared regardless of whose working_hours dict is passed in (tenant-wide
    Client.config.working_hours, or a Resource's own working_hours) — same shape either way:
    {"closed_days": [...], "open_time": "HH:MM", "close_time": "HH:MM"}.
    All times treated as UTC directly, matching how reservedAt is stored/compared everywhere
    else in this codebase today (no timezone-conversion utility exists in this path)."""
    if not working_hours:
        return
    day_name = reserved_at.strftime("%A").lower()
    if day_name in (working_hours.get("closed_days") or []):
        raise ValueError(f"This business is closed on {day_name.capitalize()}.")
    open_t, close_t = working_hours.get("open_time"), working_hours.get("close_time")
    if open_t and close_t:
        slot_time = reserved_at.strftime("%H:%M")
        if not (open_t <= slot_time < close_t):
            raise ValueError(f"Outside working hours ({open_t}-{close_t}).")


async def _resolve_resource(client_id: str, module_key: str, metadata: dict | None):
    """Pipeline stage: Resolve Resource. Only runs for RESOURCE_BACKED_MODULE_KEYS (clinic today).
    Returns the Resource row (or None if this moduleKey doesn't use one) so later stages
    (Working Hours, Conflict Check) know whose calendar to check. Raises ValueError if the
    caller's resource_id is missing/invalid — this must run before Working Hours/Conflict Check,
    since both need to know which resource's schedule to read."""
    if module_key not in RESOURCE_BACKED_MODULE_KEYS:
        return None

    resource_id = (metadata or {}).get("resource_id")
    if not resource_id:
        raise ValueError(f"'{module_key}' reservations require a resource_id.")

    resource = await resource_repo.find_resource(client_id, resource_id)
    if not resource:
        raise ValueError("Resource not found for this tenant.")
    if not resource.isActive:
        raise ValueError("This resource is not currently accepting reservations.")
    return resource


async def _resolve_barber(client_id: str, module_key: str, metadata: dict | None):
    """Pipeline stage: Resolve [Barber]. Only runs for module_key == 'barber'. Written
    independently of _resolve_resource() above (2026-07-31, 2nd real Reservation Strategy case,
    built as if clinic didn't exist) — returns the Barber row (or None) so Working Hours and
    Conflict Check know whose calendar to check. Raises ValueError if barber_id is
    missing/invalid, same as the clinic path requires its own resource_id."""
    if module_key != "barber":
        return None

    barber_id = (metadata or {}).get("barber_id")
    if not barber_id:
        raise ValueError("'barber' reservations require a barber_id.")

    barber = await barber_repo.find_barber(client_id, barber_id)
    if not barber:
        raise ValueError("Barber not found for this tenant.")
    if not barber.isActive:
        raise ValueError("This barber is not currently accepting reservations.")
    return barber


async def _resolve_catalog_service(client_id: str, metadata: dict | None):
    """Pipeline stage, Phase 3.7C (2026-08-08) -- resolves metadata.service_id to a real
    CatalogService row so create_reservation can set the real Reservation.serviceId FK, not just
    leave it inside metadata. Deliberately tolerant, unlike _resolve_barber/_resolve_resource
    above: service_id isn't required for every module_key (restaurant/real_estate reservations
    never set it), and an invalid/stale id shouldn't block reservation creation over a labeling
    concern -- it just means serviceId stays null, same as it always has been until now."""
    service_id = (metadata or {}).get("service_id")
    if not service_id:
        return None
    return await catalog_service_repo.find_catalog_service(client_id, service_id)


async def create_reservation(
    client_id:      str,
    module_key:     str,
    customer_name:  str,
    customer_phone: str,
    reserved_at:    datetime,
    duration_min:   int | None,
    notes:          str | None,
    metadata:       dict | None,
    customer_email: str | None = None,
) -> dict:
    """
    Fixed pipeline (Reservation Strategy Architecture design doc, Correction 1) — always in this
    order, regardless of module_key: Validate -> Resolve Resource -> Working Hours ->
    Conflict Check -> Create -> Post Actions.
    """
    repo = ReservationRepository(prisma_client)

    # -- Validate ------------------------------------------------------------------------------
    # (Duration default resolution — a Validate-adjacent concern: what this reservation's
    # duration is, absent an explicit override.)
    effective_duration = duration_min or MODULE_DEFAULTS.get(module_key, {}).get("duration_min", 60)

    # -- Resolve Resource ------------------------------------------------------------------------
    # Only runs for RESOURCE_BACKED_MODULE_KEYS (clinic today). Must happen before Working Hours
    # and Conflict Check, since both need to know whose calendar to read.
    resource = await _resolve_resource(client_id, module_key, metadata)

    # -- Resolve [Barber] --------------------------------------------------------------------------
    # 2nd real Reservation Strategy case, built independently of the Resource path above
    # (2026-07-31) — its own function, its own column, no shared dispatch set.
    barber = await _resolve_barber(client_id, module_key, metadata)

    # -- Resolve [CatalogService] -----------------------------------------------------------------
    # Phase 3.7C (2026-08-08) -- unlike Resource/Barber above, this never gates working-hours or
    # conflict-checking (a Service has no calendar of its own); it only sets the real serviceId FK
    # so this reservation is fully resolvable through Service without relying on metadata alone.
    catalog_service = await _resolve_catalog_service(client_id, metadata)

    # -- Working Hours ---------------------------------------------------------------------------
    # Resource's own working_hours takes priority when set; falls back to the tenant-wide
    # Client.config.working_hours otherwise (unchanged behavior for moduleKeys with no Resource).
    working_hours = resource.workingHours if (resource and resource.workingHours) else None
    if working_hours is None and barber is None:
        client = await prisma_client.client.find_unique(where={"id": client_id})
        working_hours = (client.config or {}).get("working_hours") if client else None

    # Barber's own working_hours, resolved independently of the resource block above — falls back
    # to the tenant-wide Client.config.working_hours the same way, written as its own block rather
    # than merged into the resource one.
    if barber is not None:
        working_hours = barber.workingHours if barber.workingHours else None
        if working_hours is None:
            client = await prisma_client.client.find_unique(where={"id": client_id})
            working_hours = (client.config or {}).get("working_hours") if client else None

    _check_working_hours(reserved_at, working_hours)

    # -- Conflict Check --------------------------------------------------------------------------
    if resource:
        # Resource-backed path (clinic) — real resourceId FK, indexed query, no metadata
        # string-matching needed.
        candidates = await repo.find_overlapping_by_resource(client_id, resource.id, reserved_at, effective_duration)
        if _has_conflict(candidates, reserved_at, effective_duration):
            raise ValueError("This resource is already booked for that time. Please choose a different time.")
    elif barber:
        # Barber-backed path — real barberId FK, its own query, written independently of the
        # resource branch above even though the shape ends up similar.
        candidates = await repo.find_overlapping_by_barber(client_id, barber.id, reserved_at, effective_duration)
        if _has_conflict(candidates, reserved_at, effective_duration):
            raise ValueError("This barber is already booked for that time. Please choose a different time.")
    else:
        # Legacy path (restaurant/services/real_estate without a formal Resource row) — unchanged.
        should_check_conflict = bool(
            metadata and (
                metadata.get("table_label") or
                metadata.get("staff_id") or
                metadata.get("unit_id")
            )
        )
        if should_check_conflict:
            candidates = await repo.find_overlapping(client_id, module_key, reserved_at, effective_duration)
            resource_key = (
                metadata.get("table_label") or
                metadata.get("staff_id") or
                metadata.get("unit_id")
            )
            overlapping = [
                c for c in candidates
                if (c.metadata or {}).get("table_label") == resource_key
                or (c.metadata or {}).get("staff_id") == resource_key
                or (c.metadata or {}).get("unit_id") == resource_key
            ]
            if _has_conflict(overlapping, reserved_at, effective_duration):
                raise ValueError("This slot is already reserved. Please choose a different time.")

    # -- Create ------------------------------------------------------------------------------------
    create_data = {
        "clientId":      client_id,
        "moduleKey":     module_key,
        "customerName":  customer_name,
        "customerPhone": customer_phone,
        "customerEmail": customer_email,
        "reservedAt":    reserved_at,
        "durationMin":   effective_duration,
        "status":        "pending",
        "notes":         notes,
    }
    # Prisma's generated types for an optional Json? field reject a bare `None`/`dict` --
    # they must be omitted entirely or wrapped in Json(...). Confirmed via direct diagnostic
    # calls: omitting the key succeeds, `metadata: None` reproduces the real 500, `Json({...})`
    # succeeds.
    if metadata:
        create_data["metadata"] = Json(metadata)
    if resource:
        create_data["resourceId"] = resource.id
    if barber:
        create_data["barberId"] = barber.id
    if catalog_service:
        create_data["serviceId"] = catalog_service.id

    reservation = await repo.create(create_data)

    # -- Post Actions --------------------------------------------------------------------------
    # No-op today for every module_key — confirmed no pricing field on Reservation, no
    # notification call anywhere in this path (Reservation Lifecycle & Workflow section of the
    # design doc). Kept as an explicit, empty stage rather than omitted, so the fixed pipeline
    # stays visible in the code even where a stage currently does nothing.

    return _fmt(reservation)


async def get_available_slots(
    client_id:      str,
    barber_id:      str,
    target_date:    date,
    duration_min:   int,
    slot_step_min:  int = 30,
) -> list[dict]:
    """
    Reservation Pilot, Phase 1 — the one genuinely new piece of this pipeline.
    Generates candidate start times across `target_date` in `slot_step_min` increments and
    filters them through the already-existing, already-proven pipeline stages — no new
    validation logic: _check_working_hours() (reads Barber.workingHours) and _has_conflict()
    (real conflict-checking). Fetches the barber's existing bookings for the day in ONE query
    (find_by_barber_on_date) rather than one query per candidate slot -- an early version of
    this function called find_overlapping_by_barber() per-candidate and was real-world too
    slow under any DB latency; this is the fix, found and applied during Phase 1's own
    verification, not a redesign.
    No buffer time between bookings for v1, per Salman's explicit scope lock in
    implementation_plan_reservation_pilot.md's "Explicitly Out of Scope for v1" section.
    """
    barber = await barber_repo.find_barber(client_id, barber_id)
    if not barber:
        raise ValueError("Barber not found for this tenant.")
    if not barber.isActive:
        raise ValueError("This barber is not currently accepting reservations.")

    working_hours = barber.workingHours or {}
    open_time  = working_hours.get("open_time")
    close_time = working_hours.get("close_time")
    closed_days = working_hours.get("closed_days") or []

    day_name = target_date.strftime("%A").lower()
    if day_name in closed_days or not open_time or not close_time:
        return []

    # reservedAt is stored/returned timezone-aware (UTC) -- same assumption
    # _check_working_hours() already documents ("All times treated as UTC directly"). Every
    # datetime built here must be tz-aware too, or comparisons against real Reservation rows
    # raise TypeError (found and fixed during Phase 1's own verification, real evidence: a
    # live "can't compare offset-naive and offset-aware datetimes" error).
    repo = ReservationRepository(prisma_client)
    day_start = datetime.combine(target_date, datetime.strptime(open_time, "%H:%M").time(), tzinfo=timezone.utc)
    day_end   = datetime.combine(target_date, datetime.strptime(close_time, "%H:%M").time(), tzinfo=timezone.utc)

    # Single query for the whole day's existing bookings -- conflict checks below are all
    # in-memory against this list, not one DB round-trip per candidate.
    existing_today = await repo.find_by_barber_on_date(
        client_id, barber_id,
        datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc),
        datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc),
    )

    # Phase 1.x fix (2026-08-05, real bug found via Phase 3.3.1's Browser Verification): `day_start`/
    # `day_end`/`candidate` are all naive-local wall-clock values labeled UTC via tzinfo=timezone.utc
    # (no real conversion) -- the exact same convention `_check_working_hours()` already documents
    # ("All times treated as UTC directly ... no timezone-conversion utility exists in this path").
    # `now` must be built the same way. `datetime.now(timezone.utc)` is the TRUE UTC instant, which
    # for any tenant with a real UTC offset made this comparison wrong by exactly that offset --
    # confirmed live: at real local 17:37 (GMT+3), this endpoint returned slots as early as 15:00,
    # all already in the past by local wall-clock time. `datetime.now()` (no arg) is the server's own
    # naive local time; labeling it UTC without conversion matches every other datetime in this path.
    now = datetime.now().replace(tzinfo=timezone.utc)
    slots: list[dict] = []
    candidate = day_start
    while candidate + timedelta(minutes=duration_min) <= day_end:
        if candidate < now:
            candidate += timedelta(minutes=slot_step_min)
            continue

        try:
            _check_working_hours(candidate, working_hours)
        except ValueError:
            candidate += timedelta(minutes=slot_step_min)
            continue

        if not _has_conflict(existing_today, candidate, duration_min):
            slots.append({"time": candidate.strftime("%H:%M"), "datetime": candidate.isoformat()})

        candidate += timedelta(minutes=slot_step_min)

    return slots


async def get_reservation(
    client_id: str,
    reservation_id: str,
    customer_phone: str | None = None,
    staff_barber_id: str | None = None,
) -> dict | None:
    repo = ReservationRepository(prisma_client)
    if customer_phone:
        r = await repo.find_by_id_and_phone(reservation_id, client_id, customer_phone)
    else:
        r = await repo.find_by_id(reservation_id, client_id)
    if not r:
        return None
    if staff_barber_id is not None and getattr(r, "barberId", None) != staff_barber_id:
        raise ReservationAccessDenied()
    return _fmt(r)


async def list_reservations(
    client_id:   str,
    module_key:  str | None = None,
    status:      str | None = None,
    date_from:   datetime | None = None,
    date_to:     datetime | None = None,
    limit:       int = 50,
    barber_id:   str | None = None,
) -> list[dict]:
    repo = ReservationRepository(prisma_client)
    rows = await repo.list_by_client(client_id, module_key, status, date_from, date_to, limit, barber_id)
    return [_fmt(r) for r in rows]


async def list_my_clients(client_id: str, barber_id: str) -> list[dict]:
    """Staff Scoped Access Phase C (2026-08-09,
    .claudedocs/implementation/STAFF_SCOPED_ACCESS_CONTRACT.md) -- "my clients" derived from the
    barber's own reservations, no separate Customer entity (Salman's explicit choice: simplest
    option the current business model allows). Always scoped by clientId + barberId together --
    never client-supplied. Distinct on (customerName, customerPhone); a customer appearing across
    multiple reservations for the same barber is returned once."""
    repo = ReservationRepository(prisma_client)
    rows = await repo.list_customer_identities_for_barber(client_id, barber_id)
    seen: set[tuple] = set()
    clients: list[dict] = []
    for r in rows:
        key = (r.customerName, r.customerPhone)
        if key in seen:
            continue
        seen.add(key)
        clients.append({
            "customer_name":  r.customerName,
            "customer_phone": r.customerPhone,
            "customer_email": r.customerEmail,
        })
    return clients


async def update_status(
    client_id: str,
    reservation_id: str,
    new_status: str,
    staff_barber_id: str | None = None,
) -> dict | None:
    if new_status not in VALID_STATUSES:
        raise ValueError(f"Invalid status. Use: {VALID_STATUSES}")
    repo = ReservationRepository(prisma_client)
    if staff_barber_id is not None:
        existing = await repo.find_by_id(reservation_id, client_id)
        if not existing:
            return None
        if getattr(existing, "barberId", None) != staff_barber_id:
            raise ReservationAccessDenied()
    r = await repo.update_status(reservation_id, client_id, new_status)
    return _fmt(r) if r else None


async def cancel_by_customer(client_id: str, reservation_id: str, customer_phone: str) -> bool:
    repo = ReservationRepository(prisma_client)
    return await repo.cancel(reservation_id, client_id, customer_phone)


async def edit_reservation(
    client_id:           str,
    reservation_id:      str,
    new_reserved_at:      datetime | None = None,
    new_barber_id:         str | None = None,
    new_duration_min:      int | None = None,
    new_customer_name:     str | None = None,
    new_customer_phone:    str | None = None,
    new_service_id:        str | None = None,
    staff_barber_id:       str | None = None,
) -> dict | None:
    """
    Admin Dashboard Calendar mutation for an EXISTING reservation -- covers drag-and-drop reschedule
    (Phase 3.1, 2026-08-03), the popover's non-drag mini-reschedule form, and full Edit (service/
    duration/name/phone, Phase 3.2, 2026-08-05), all through one function per the "One Capability,
    One Contract, One Service" rule (rules/backend/architecture.md §9) -- deliberately NOT a second,
    divergent conflict-checking path. Renamed from reschedule_reservation() (Phase 3.1); the drag and
    mini-reschedule callers are unchanged in behavior -- they simply never populate the new optional
    duration/name/phone/service params. React never decides whether a slot is free; it only calls
    this and reacts to success/409.

    Working Hours + Conflict Check only run when the SCHEDULE actually changes (time, duration, or
    barber) -- a name/phone/service-only edit must not be blocked by a check that has nothing to do
    with what's actually changing, and must not be blocked by the reservation's OWN existing time
    already being in the past.

    staff_barber_id (Phase B, Staff Scoped Access, 2026-08-09): when set, this is a STAFF-role
    caller -- the reservation must already belong to them (else ReservationAccessDenied, -> 403),
    and they may not reassign it to a *different* barber (new_barber_id, if given, must equal their
    own barberId) -- otherwise a staff member could use their own reservation as a back door to
    write onto another barber's calendar, which is exactly the boundary this capability exists to
    enforce.
    """
    repo = ReservationRepository(prisma_client)
    existing = await repo.find_by_id(reservation_id, client_id)
    if not existing:
        return None

    if staff_barber_id is not None:
        if getattr(existing, "barberId", None) != staff_barber_id:
            raise ReservationAccessDenied()
        if new_barber_id is not None and new_barber_id != staff_barber_id:
            raise ReservationAccessDenied()

    # Phase 1.x fix (2026-08-05, same root cause as get_available_slots()'s past-slot filter):
    # new_reserved_at is a naive-local wall-clock value labeled UTC (no real conversion, the
    # convention _check_working_hours() documents) -- comparing it against the TRUE UTC instant
    # made this guard wrong by the tenant's real UTC offset. `now` built the same naive-local way.
    now = datetime.now().replace(tzinfo=timezone.utc)
    if new_reserved_at is not None and new_reserved_at < now:
        raise ValueError("Cannot reschedule to a past time slot.")

    effective_reserved_at = new_reserved_at if new_reserved_at is not None else existing.reservedAt
    effective_duration    = new_duration_min if new_duration_min is not None else existing.durationMin
    target_barber_id      = new_barber_id if new_barber_id is not None else getattr(existing, "barberId", None)

    schedule_changed = (
        (new_reserved_at is not None and new_reserved_at != existing.reservedAt) or
        (new_duration_min is not None and new_duration_min != existing.durationMin) or
        (new_barber_id is not None and new_barber_id != existing.barberId)
    )

    patch: dict = {}
    if new_reserved_at is not None:
        patch["reservedAt"] = new_reserved_at
    if new_duration_min is not None:
        patch["durationMin"] = new_duration_min
    if new_customer_name is not None:
        patch["customerName"] = new_customer_name
    if new_customer_phone is not None:
        patch["customerPhone"] = new_customer_phone

    if existing.moduleKey == "barber" and target_barber_id and schedule_changed:
        barber = await barber_repo.find_barber(client_id, target_barber_id)
        if not barber:
            raise ValueError("Barber not found for this tenant.")
        if not barber.isActive:
            raise ValueError("This barber is not currently accepting reservations.")

        _check_working_hours(effective_reserved_at, barber.workingHours or {})

        conflicts = await repo.find_overlapping_by_barber(
            client_id, target_barber_id, effective_reserved_at, effective_duration,
            exclude_id=reservation_id,
        )
        if _has_conflict(conflicts, effective_reserved_at, effective_duration):
            raise ValueError("This time slot conflicts with an existing reservation.")

        if target_barber_id != existing.barberId:
            patch["barberId"] = target_barber_id

    # metadata.barber_id / metadata.service_id merged independently of the schedule_changed gate --
    # a service-only edit still needs metadata.service_id to update even though no conflict-check
    # runs for it. "barberId" in patch is only ever set inside the conflict-checked block above.
    if new_service_id is not None or "barberId" in patch:
        meta = dict(existing.metadata or {})
        if new_service_id is not None:
            meta["service_id"] = new_service_id
            # Phase 3.7C (2026-08-08) -- also set the real FK, not just the metadata mirror, same
            # as barberId already does below. Keeps "resolvable through serviceId alone" true for
            # edits, not just new reservations (create_reservation's own _resolve_catalog_service).
            patch["serviceId"] = new_service_id
        if "barberId" in patch:
            meta["barber_id"] = patch["barberId"]
        patch["metadata"] = Json(meta)

    if not patch:
        return _fmt(existing)

    updated = await repo.update_fields(reservation_id, client_id, patch)
    return _fmt(updated) if updated else None
