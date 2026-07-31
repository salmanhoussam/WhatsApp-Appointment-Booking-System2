"""
Resource Repository — Prisma queries for the Resource model (per-resource schedule,
a doctor today — see Reservation Strategy Architecture design doc).
All queries MUST filter by clientId. No business logic here.
"""

from typing import Optional
from app.db.client import prisma_client


async def list_resources(client_id: str, resource_type: Optional[str] = None, active_only: bool = False) -> list:
    where: dict = {"clientId": client_id}
    if resource_type:
        where["type"] = resource_type
    if active_only:
        where["isActive"] = True
    return await prisma_client.resource.find_many(
        where=where,
        order=[{"sortOrder": "asc"}, {"createdAt": "asc"}],
    )


async def find_resource(client_id: str, resource_id: str):
    """Single resource scoped to tenant."""
    return await prisma_client.resource.find_first(
        where={"id": resource_id, "clientId": client_id}
    )


async def create_resource(data: dict):
    """Insert a new Resource row."""
    return await prisma_client.resource.create(data=data)


async def update_resource(resource_id: str, data: dict):
    """Update a Resource by primary key."""
    return await prisma_client.resource.update(
        where={"id": resource_id},
        data=data,
    )
