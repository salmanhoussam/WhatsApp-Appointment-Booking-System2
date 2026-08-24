"""
Barber Repository — Prisma queries for the Barber model (a barbershop's staff calendar).
Written independently of resource_repo.py — the 2nd real Reservation Strategy case is built as
if Clinic/Resource didn't exist, per Salman's explicit instruction, 2026-07-31.
All queries MUST filter by clientId. No business logic here.
"""

from app.db.client import prisma_client


async def list_barbers(client_id: str, active_only: bool = False) -> list:
    where: dict = {"clientId": client_id}
    if active_only:
        where["isActive"] = True
    return await prisma_client.barber.find_many(
        where=where,
        order=[{"sortOrder": "asc"}, {"createdAt": "asc"}],
    )


async def find_barber(client_id: str, barber_id: str):
    """Single barber scoped to tenant."""
    return await prisma_client.barber.find_first(
        where={"id": barber_id, "clientId": client_id}
    )


async def create_barber(data: dict):
    """Insert a new Barber row."""
    return await prisma_client.barber.create(data=data)


async def update_barber(client_id: str, barber_id: str, data: dict):
    """Update a Barber by primary key, scoped to tenant.

    Multi-tenant DB Integrity Audit (Study 7, Customer Identity + WhatsApp Booking Study,
    2026-08-24) -- previously took only `barber_id`, scoped by neither `update()`'s own `where`
    nor the query itself (`prisma.barber.update(where={"id": barber_id})`); every real caller
    happened to pre-check ownership via `find_barber()` first, so this was never exploited, but
    the function itself didn't independently enforce this file's own "ALL queries MUST filter by
    clientId" rule. `update()` requires its `where` to resolve via a real unique selector (`id`
    alone already is one), so `update_many()` -- the same fix `reservation_repo.py`'s own mutating
    calls already use -- is what lets `clientId` actually participate in the filter; it returns a
    count, not the row, so the fresh row is re-fetched via the already-tenant-scoped
    `find_barber()` for the caller to format.
    """
    await prisma_client.barber.update_many(
        where={"id": barber_id, "clientId": client_id},
        data=data,
    )
    return await find_barber(client_id, barber_id)


async def delete_barbers_by_client(client_id: str):
    """
    Hard-delete ALL Barber rows for a tenant. Provisioning-retry cleanup ONLY (Unified
    Provisioning Contract, Phase 3) -- not a general admin capability. Deliberately distinct from
    the admin-facing API's own "no DELETE exposed" policy (this file's own module docstring,
    unchanged): that policy protects a real, established Barber from orphaning historical
    Reservation rows. This function is only ever called on rows a *just-failed* provisioning
    attempt created moments earlier, before any real Reservation could exist against them --
    schema.prisma's onDelete: Cascade on BarberService (both sides) and onDelete: SetNull on
    Reservation.barberId make this safe even in principle, not just in practice.
    """
    return await prisma_client.barber.delete_many(where={"clientId": client_id})
