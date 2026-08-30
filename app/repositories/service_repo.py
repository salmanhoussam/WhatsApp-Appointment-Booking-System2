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


async def update_service(service_id: str, client_id: str, data: dict):
    """Update a Service by primary key, scoped to tenant.

    Tenant Isolation Audit (2026-08-30) -- previously unscoped (`where={"id": service_id}` only);
    the caller (`admin/services.py`) already pre-checks ownership via `find_service()` first, so
    this was never exploitable in practice, but the function itself didn't independently enforce
    scoping. `update_many()` + re-fetch, same shape as this project's other Study 7 fixes.
    """
    await prisma_client.service.update_many(
        where={"id": service_id, "clientId": client_id},
        data=data,
    )
    return await find_service(client_id, service_id)


async def delete_service(service_id: str, client_id: str):
    """Hard-delete a Service by primary key, scoped to tenant."""
    return await prisma_client.service.delete_many(where={"id": service_id, "clientId": client_id})
