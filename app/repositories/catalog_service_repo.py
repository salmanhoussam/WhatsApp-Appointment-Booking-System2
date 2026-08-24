"""
CatalogService Repository — Prisma queries for the CatalogService model (something a customer
books a Reservation for, distinct from CatalogItem). Phase 3.7C (2026-08-08). Named
catalog_service_repo.py, not service_repo.py -- that file already exists for the unrelated `Service`
(smar property add-on) model; same naming collision this project has hit before, avoided here on
purpose. All queries MUST filter by clientId. No business logic here.
"""

from typing import Optional
from app.db.client import prisma_client


async def list_catalog_services(client_id: str, include_inactive: bool = False, category_id: Optional[str] = None) -> list:
    where: dict = {"clientId": client_id}
    if not include_inactive:
        where["isActive"] = True
    if category_id:
        where["categoryId"] = category_id
    return await prisma_client.catalogservice.find_many(
        where=where,
        order=[{"sortOrder": "asc"}, {"createdAt": "asc"}],
    )


async def find_catalog_service(client_id: str, service_id: str):
    """Single service scoped to tenant (any active state)."""
    return await prisma_client.catalogservice.find_first(
        where={"id": service_id, "clientId": client_id}
    )


async def create_catalog_service(data: dict):
    """Insert a new CatalogService row."""
    return await prisma_client.catalogservice.create(data=data)


async def update_catalog_service(client_id: str, service_id: str, data: dict):
    """Update a CatalogService by primary key, scoped to tenant.

    Multi-tenant DB Integrity Audit (Study 7, Customer Identity + WhatsApp Booking Study,
    2026-08-24) -- previously unscoped (`where={"id": service_id}` only); the caller already
    pre-checks ownership via `find_catalog_service()`, but this query itself didn't enforce it.
    Same `update_many()` + re-fetch fix as `barber_repo.update_barber()`.
    """
    await prisma_client.catalogservice.update_many(
        where={"id": service_id, "clientId": client_id},
        data=data,
    )
    return await find_catalog_service(client_id, service_id)
