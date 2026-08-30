from prisma import Prisma
from typing import List, Optional

class UnitRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def get_all_by_property(self, property_id: str, client_id: str):
        """Fetch all units for a property with client isolation."""
        return await self.db.unit.find_many(
            where={
                "propertyId": property_id,
                "clientId": client_id
            },
            include={"prices": True}
        )

    async def get_all_by_client(
        self,
        client_id: str,
        unit_type: Optional[str] = None,
        exclude_ids: Optional[List[str]] = None,
        min_capacity: int = 1,
    ):
        """
        Fetch active+available units for a client.
        Supports type filter (villa|chalet|restaurant|pool) and
        exclusion of already-booked unit IDs.
        Multi-tenancy: always filtered by client_id at DB level.
        """
        where: dict = {
            "clientId": client_id,
            "isActive": True,
            "isAvailable": True,
            "capacity": {"gte": min_capacity},
        }
        if unit_type and unit_type != "all":
            where["unit_type"] = unit_type
        if exclude_ids:
            where["id"] = {"notIn": exclude_ids}

        return await self.db.unit.find_many(
            where=where,
            order={"sort_order": "asc"},
        )

    async def get_by_id(self, unit_id: str, client_id: str):
        """Fetch a specific unit with client isolation."""
        return await self.db.unit.find_first(
            where={
                "id": unit_id,
                "clientId": client_id
            }
        )

    async def create(self, client_id: str, property_id: str, data: dict):
        """Create a new unit for a property."""
        return await self.db.unit.create(
            data={
                **data,
                "clientId": client_id,
                "propertyId": property_id
            }
        )

    async def update(self, unit_id: str, client_id: str, data: dict):
        """Update a unit (admin only). Client isolation enforced. Raises ValueError if not found.

        Tenant Isolation Audit (2026-08-30) -- the pre-check below already guarded this in
        practice, but the mutating call itself was still only scoped by `id` (`where={"id":
        unit_id}`), not independently enforcing this file's own isolation. `update_many()` +
        re-fetch, same shape as this project's other Study 7 fixes.
        """
        existing = await self.db.unit.find_first(
            where={"id": unit_id, "clientId": client_id}
        )
        if not existing:
            raise ValueError(f"Unit {unit_id} not found for this client.")
        await self.db.unit.update_many(
            where={"id": unit_id, "clientId": client_id},
            data={k: v for k, v in data.items() if v is not None},
        )
        return await self.db.unit.find_first(where={"id": unit_id, "clientId": client_id})

    async def update_raw(self, unit_id: str, client_id: str, data: dict):
        """Update a unit by primary key, scoped to tenant.

        Tenant Isolation Audit (2026-08-30) -- previously unscoped (`where={"id": unit_id}` only,
        with a docstring trusting the caller to pre-verify ownership); every real caller
        (`admin/units.py`) already does via `get_by_id()` first, so this was never exploitable in
        practice, but the function itself didn't independently enforce scoping.
        """
        await self.db.unit.update_many(
            where={"id": unit_id, "clientId": client_id},
            data=data,
        )
        return await self.db.unit.find_first(where={"id": unit_id, "clientId": client_id})

    async def get_all_admin(self, client_id: str) -> list:
        """Return ALL units for a tenant (active + inactive) — admin view."""
        return await self.db.unit.find_many(
            where={"clientId": client_id},
            order=[{"unit_type": "asc"}, {"sort_order": "asc"}],
        )

    async def find_first_active_property(self, client_id: str):
        """Resolve tenant's first active property (for propertyId FK on unit create)."""
        return await self.db.property.find_first(
            where={"clientId": client_id, "isActive": True},
            order={"createdAt": "asc"},
        )

    async def create_unit(self, data: dict):
        """Insert a new Unit row (data must already include clientId + propertyId)."""
        return await self.db.unit.create(data=data)

    async def delete_unit(self, unit_id: str, client_id: str):
        """Hard-delete a unit by primary key, scoped to tenant (cascade at DB level).

        Tenant Isolation Audit (2026-08-30) -- previously unscoped; the caller (`admin/units.py`)
        already pre-checks ownership via `get_by_id()` first, so this was never exploitable in
        practice, but the function itself didn't independently enforce scoping.
        """
        return await self.db.unit.delete_many(where={"id": unit_id, "clientId": client_id})

    async def count_available(self, client_id: str) -> int:
        """Count active + available units for a tenant (for dashboard KPIs)."""
        return await self.db.unit.count(where={
            "clientId":    client_id,
            "isAvailable": True,
            "isActive":    True,
        })
