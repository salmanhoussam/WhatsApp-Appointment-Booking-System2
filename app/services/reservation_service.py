"""
Reservation Service — business logic for slot-based reservations.
Works across: restaurant, services, real_estate, hotel.
"""

from datetime import datetime, timedelta

from app.db.client import prisma_client
from app.repositories.reservation_repo import ReservationRepository

VALID_STATUSES  = ["pending", "confirmed", "arrived", "cancelled", "no_show"]
ACTIVE_STATUSES = ["pending", "confirmed", "arrived"]

# module_key → required metadata keys (informational — not enforced as 400, just documented)
MODULE_DEFAULTS: dict[str, dict] = {
    "restaurant":  {"duration_min": 90},
    "services":    {"duration_min": 60},
    "real_estate": {"duration_min": 60},
    "hotel":       {"duration_min": 60},
}


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
    repo = ReservationRepository(prisma_client)

    effective_duration = duration_min or MODULE_DEFAULTS.get(module_key, {}).get("duration_min", 60)

    # Conflict check — only relevant when metadata contains a specific table/resource label
    # For open "any table" reservations, skip the conflict block
    should_check_conflict = bool(
        metadata and (
            metadata.get("table_label") or
            metadata.get("staff_id") or
            metadata.get("unit_id")
        )
    )

    if should_check_conflict:
        candidates = await repo.find_overlapping(client_id, module_key, reserved_at, effective_duration)
        # Filter by the specific resource
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
            raise ValueError(f"This slot is already reserved. Please choose a different time.")

    reservation = await repo.create({
        "clientId":      client_id,
        "moduleKey":     module_key,
        "customerName":  customer_name,
        "customerPhone": customer_phone,
        "customerEmail": customer_email,
        "reservedAt":    reserved_at,
        "durationMin":   effective_duration,
        "status":        "pending",
        "notes":         notes,
        "metadata":      metadata,
    })
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
