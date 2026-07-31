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
