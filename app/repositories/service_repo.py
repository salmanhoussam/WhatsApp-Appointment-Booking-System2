"""
Service Repository — Prisma queries for a tenant's stay/booking add-on services.

REPOINTED 2026-09-07 (Data Model Consolidation, Phase 2c). These functions used to query the
legacy `Service` model (`services` table). That model is retired: its rows now live in
`CatalogService`, which since Phase 2a carries the three columns it was missing
(`propertyId`, `pricingUnit`, `isIncluded`).

Why this file still exists rather than callers moving to catalog_service_service.py: this is the
property/unit-scoped add-on path (breakfast, massage, pool access — priced per stay and attached to
a Booking), and catalog_service_service.py is the appointment path (priced per slot and attached to
a Reservation). Same table now, genuinely different use cases, and the admin route above this file
has its own authorization rules. Merging the two write paths is a separate decision, not something
to do silently inside a data migration.

All queries MUST filter by clientId. No business logic here.
"""

from typing import Optional

from app.db.client import prisma_client

# Every tenant's add-on services live under one category per tenant. The migration
# (scripts/cleanup/migrate_legacy_services_to_catalog.py) used exactly this name and reused the
# tenant's existing one where there was one, so a service created through this repo lands beside
# the migrated rows rather than in a second parallel category.
SERVICES_CATEGORY_NAME_AR = "الخدمات"
SERVICES_CATEGORY_NAME_EN = "Services"


async def list_services(client_id: str, property_id: Optional[str] = None) -> list:
    where: dict = {"clientId": client_id}
    if property_id:
        where["propertyId"] = property_id
    return await prisma_client.catalogservice.find_many(
        where=where,
        order=[{"sortOrder": "asc"}, {"createdAt": "asc"}],
    )


async def find_service(client_id: str, service_id: str):
    """Single service scoped to tenant."""
    return await prisma_client.catalogservice.find_first(
        where={"id": service_id, "clientId": client_id}
    )


async def find_first_property(client_id: str):
    """Resolve the tenant's first active property (for propertyId FK)."""
    return await prisma_client.property.find_first(
        where={"clientId": client_id, "isActive": True},
        order={"createdAt": "asc"},
    )


async def find_or_create_services_category(client_id: str):
    """The category a new add-on service belongs to.

    CatalogService.categoryId is NOT NULL, unlike the legacy Service model which had no category at
    all — so this is a real new requirement of the target model, not an invention. Reuses the
    tenant's existing 'الخدمات' category when it has one; only creates when it genuinely has none.
    """
    existing = await prisma_client.catalogcategory.find_first(
        where={"clientId": client_id, "moduleKey": "catalog",
               "nameAr": SERVICES_CATEGORY_NAME_AR}
    )
    if existing:
        return existing
    return await prisma_client.catalogcategory.create(
        data={
            "clientId": client_id,
            "moduleKey": "catalog",
            "nameAr": SERVICES_CATEGORY_NAME_AR,
            "nameEn": SERVICES_CATEGORY_NAME_EN,
            "sortOrder": 0,
        }
    )


async def create_service(data: dict):
    """Insert a new add-on service row."""
    return await prisma_client.catalogservice.create(data=data)


async def update_service(service_id: str, client_id: str, data: dict):
    """Update a service by primary key, scoped to tenant.

    Tenant Isolation Audit (2026-08-30) -- previously unscoped (`where={"id": service_id}` only);
    the caller (`admin/services.py`) already pre-checks ownership via `find_service()` first, so
    this was never exploitable in practice, but the function itself didn't independently enforce
    scoping. `update_many()` + re-fetch, same shape as this project's other Study 7 fixes.
    """
    await prisma_client.catalogservice.update_many(
        where={"id": service_id, "clientId": client_id},
        data=data,
    )
    return await find_service(client_id, service_id)


async def delete_service(service_id: str, client_id: str):
    """Hard-delete a service by primary key, scoped to tenant."""
    return await prisma_client.catalogservice.delete_many(
        where={"id": service_id, "clientId": client_id}
    )
