"""
Public Repository — Prisma queries for slug-based public endpoints in __init__.py.
All queries MUST filter by clientId or slug. No business logic here.
"""

from app.db.client import prisma_client


async def find_active_client_by_slug(slug: str):
    """Resolve a public slug to an active Client row or None."""
    return await prisma_client.client.find_first(
        where={"slug": slug, "isActive": True}
    )


async def find_unit_by_id(unit_id: str):
    """Fetch a Unit by its UUID (clientId check done in caller)."""
    return await prisma_client.unit.find_unique(where={"id": unit_id})


async def list_active_services_for_client(client_id: str) -> list:
    """All active add-on Services for a tenant."""
    return await prisma_client.service.find_many(
        where={"clientId": client_id, "isActive": True}
    )


async def list_gallery_images_for_unit(unit_id: str, client_id: str) -> list:
    """Active gallery images for a unit, sorted by sort_order."""
    return await prisma_client.galleryimage.find_many(
        where={"unitId": unit_id, "clientId": client_id, "isActive": True},
        order={"sort_order": "asc"},
    )


async def list_active_bookings_for_unit(unit_id: str, client_id: str) -> list:
    """Non-cancelled bookings for a unit — used to build disabled-date calendar."""
    return await prisma_client.booking.find_many(
        where={
            "unitId":   unit_id,
            "clientId": client_id,
            "status":   {"not": "cancelled"},
        },
        order={"checkIn": "asc"},
    )


async def list_prices_for_unit(unit_id: str, client_id: str) -> list:
    """All price overrides for a unit — used to build calendar price map."""
    return await prisma_client.price.find_many(
        where={"unitId": unit_id, "clientId": client_id},
        order={"date": "asc"},
    )
