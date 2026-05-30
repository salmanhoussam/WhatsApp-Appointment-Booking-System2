"""
Service Repository — Prisma queries for the Service (add-on) model.
All queries MUST filter by clientId. No business logic here.
"""

from typing import Optional
from app.db.client import prisma_client


async def list_services(client_id: str, property_id: Optional[str] = None) -> list:
    where: dict = {"clientId": client_id}
    if property_id:
        where["propertyId"] = property_id
    return await prisma_client.service.find_many(
        where=where,
        order=[{"sort_order": "asc"}, {"createdAt": "asc"}],
    )


async def find_service(client_id: str, service_id: str):
    """Single service scoped to tenant."""
    return await prisma_client.service.find_first(
        where={"id": service_id, "clientId": client_id}
    )


async def find_first_property(client_id: str):
    """Resolve the tenant's first active property (for propertyId FK)."""
    return await prisma_client.property.find_first(
        where={"clientId": client_id, "isActive": True},
        order={"createdAt": "asc"},
    )


async def create_service(data: dict):
    """Insert a new Service row."""
    return await prisma_client.service.create(data=data)


async def update_service(service_id: str, data: dict):
    """Update a Service by primary key."""
    return await prisma_client.service.update(
        where={"id": service_id},
        data=data,
    )


async def delete_service(service_id: str):
    """Hard-delete a Service by primary key."""
    return await prisma_client.service.delete(where={"id": service_id})
