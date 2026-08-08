"""
BarberService Repository — Prisma queries for the BarberService join table (which CatalogServices
a Barber is qualified to perform). Phase 3.7C, Commit 3 (2026-08-08).
All queries MUST filter by clientId. No business logic here.
"""

from app.db.client import prisma_client


async def list_service_ids_for_barber(client_id: str, barber_id: str) -> list[str]:
    rows = await prisma_client.barberservice.find_many(
        where={"clientId": client_id, "barberId": barber_id},
    )
    return [r.serviceId for r in rows]


async def list_barber_ids_for_service(client_id: str, service_id: str) -> list[str]:
    rows = await prisma_client.barberservice.find_many(
        where={"clientId": client_id, "serviceId": service_id},
    )
    return [r.barberId for r in rows]


async def set_services_for_barber(client_id: str, barber_id: str, service_ids: list[str]) -> None:
    """Full replace -- delete the barber's existing assignments, then bulk-create the new set.
    Matches the checkbox-list "save the whole selection" UX Staff Management's edit modal uses."""
    await prisma_client.barberservice.delete_many(
        where={"clientId": client_id, "barberId": barber_id},
    )
    if service_ids:
        await prisma_client.barberservice.create_many(
            data=[
                {"clientId": client_id, "barberId": barber_id, "serviceId": sid}
                for sid in service_ids
            ],
        )
