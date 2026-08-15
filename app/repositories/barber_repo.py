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


async def update_barber(barber_id: str, data: dict):
    """Update a Barber by primary key."""
    return await prisma_client.barber.update(
        where={"id": barber_id},
        data=data,
    )


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
