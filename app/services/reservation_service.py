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

from datetime import datetime, timedelta

from prisma import Json

from app.db.client import prisma_client
from app.repositories.reservation_repo import ReservationRepository
from app.repositories import resource_repo, barber_repo

VALID_STATUSES  = ["pending", "confirmed", "arrived", "cancelled", "no_show"]
ACTIVE_STATUSES = ["pending", "confirmed", "arrived"]

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

    reservation = await repo.create(create_data)

    # -- Post Actions --------------------------------------------------------------------------
    # No-op today for every module_key — confirmed no pricing field on Reservation, no
    # notification call anywhere in this path (Reservation Lifecycle & Workflow section of the
    # design doc). Kept as an explicit, empty stage rather than omitted, so the fixed pipeline
    # stays visible in the code even where a stage currently does nothing.

    return _fmt(reservation)


async def get_reservation(client_id: str, reservation_id: str, customer_phone: str | None = None) -> dict | None:
    repo = ReservationRepository(prisma_client)
    if customer_phone:
        r = await repo.find_by_id_and_phone(reservation_id, client_id, customer_phone)
    else:
        r = await repo.find_by_id(reservation_id, client_id)
    return _fmt(r) if r else None


async def list_reservations(
    client_id:   str,
    module_key:  str | None = None,
    status:      str | None = None,
    date_from:   datetime | None = None,
    date_to:     datetime | None = None,
    limit:       int = 50,
) -> list[dict]:
    repo = ReservationRepository(prisma_client)
    rows = await repo.list_by_client(client_id, module_key, status, date_from, date_to, limit)
    return [_fmt(r) for r in rows]


async def update_status(client_id: str, reservation_id: str, new_status: str) -> dict | None:
    if new_status not in VALID_STATUSES:
        raise ValueError(f"Invalid status. Use: {VALID_STATUSES}")
    repo = ReservationRepository(prisma_client)
    r = await repo.update_status(reservation_id, client_id, new_status)
    return _fmt(r) if r else None


async def cancel_by_customer(client_id: str, reservation_id: str, customer_phone: str) -> bool:
    repo = ReservationRepository(prisma_client)
    return await repo.cancel(reservation_id, client_id, customer_phone)
