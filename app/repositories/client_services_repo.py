"""
ClientService Repository — Prisma queries only.
All queries MUST filter by clientId. No business logic here.
"""

from app.db.client import prisma_client


async def list_client_services(client_id: str) -> list:
    """All ClientService rows (active + inactive) for a tenant."""
    return await prisma_client.clientservice.find_many(
        where={"clientId": client_id},
        order={"activatedAt": "desc"},
    )


async def upsert_client_service(client_id: str, service_key: str, is_active: bool):
    """Insert or update a ClientService row."""
    return await prisma_client.clientservice.upsert(
        where={"clientId_serviceKey": {"clientId": client_id, "serviceKey": service_key}},
        data={
            "create": {"clientId": client_id, "serviceKey": service_key, "isActive": is_active},
            "update": {"isActive": is_active},
        },
    )


async def deactivate_client_service(client_id: str, service_key: str):
    """Set isActive=False for a specific service key, scoped to tenant."""
    return await prisma_client.clientservice.update_many(
        where={"clientId": client_id, "serviceKey": service_key},
        data={"isActive": False},
    )
