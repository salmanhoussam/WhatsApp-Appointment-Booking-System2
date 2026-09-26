"""
ResourceService Repository — Prisma queries for the `resource_services` join table: which
CatalogServices a Resource (a doctor today) actually performs.

Clinic P4-C-U1, 2026-09-26. Written independently of `barber_service_repo`, not imported from it,
per this vertical's standing instruction: the barber and resource paths stay separate even where
the shape ends up similar. Two differences are real rather than cosmetic:

  * `is_eligible` exists here and has no barber equivalent. The barber path only ever asked "which
    barbers do this service" for a PICKER; the clinic asks the yes/no question in the availability
    engine as well, because ق-٤-ب puts the rule in both places.
  * the direction of an empty answer. For the barber the picker treats "no assignments" as "show
    everyone" (a soft filter, Salman's 2026-08-08 decision, kept for backward compatibility). Here
    an empty answer means NOT OFFERED (ق-٤-ز). Same table shape, opposite reading, and the reading
    lives in the caller -- not in this file, which only ever reports what rows exist.

All queries filter by clientId. No business logic here.
"""

from app.db.client import prisma_client


async def list_service_ids_for_resource(client_id: str, resource_id: str) -> list[str]:
    rows = await prisma_client.resourceservice.find_many(
        where={"clientId": client_id, "resourceId": resource_id},
    )
    return [r.serviceId for r in rows]


async def list_resource_ids_for_service(client_id: str, service_id: str) -> list[str]:
    rows = await prisma_client.resourceservice.find_many(
        where={"clientId": client_id, "serviceId": service_id},
    )
    return [r.resourceId for r in rows]


async def is_eligible(client_id: str, resource_id: str, service_id: str) -> bool:
    """Does this resource perform this service, for this tenant?

    `find_first` rather than reading a list and testing it in Python: the pair is unique and
    indexed by (client_id, resource_id), so the database answers it, which is also what
    rules/backend/architecture.md requires -- filtering after the fetch is the thing it forbids.
    """
    row = await prisma_client.resourceservice.find_first(
        where={"clientId": client_id, "resourceId": resource_id, "serviceId": service_id},
    )
    return row is not None


async def set_services_for_resource(client_id: str, resource_id: str, service_ids: list[str]) -> None:
    """Full replace -- clear this resource's assignments, then create the given set.

    No route calls this yet, deliberately: the admin surface for editing a doctor's services is
    API work and belongs to P4-D. It exists now because the enforcement it feeds is meaningless
    without a way to populate the table, and provisioning a clinic will need exactly this call.
    """
    await prisma_client.resourceservice.delete_many(
        where={"clientId": client_id, "resourceId": resource_id},
    )
    if service_ids:
        await prisma_client.resourceservice.create_many(
            data=[
                {"clientId": client_id, "resourceId": resource_id, "serviceId": sid}
                for sid in service_ids
            ],
        )
