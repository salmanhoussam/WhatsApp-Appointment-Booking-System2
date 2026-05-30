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
        """Update a unit (admin only). Client isolation enforced. Raises ValueError if not found."""
        existing = await self.db.unit.find_first(
            where={"id": unit_id, "clientId": client_id}
        )
        if not existing:
            raise ValueError(f"Unit {unit_id} not found for this client.")
        return await self.db.unit.update(
            where={"id": unit_id},
            data={k: v for k, v in data.items() if v is not None},
        )

    async def update_raw(self, unit_id: str, data: dict):
        """Update a unit by primary key (caller must pre-verify ownership)."""
        return await self.db.unit.update(
            where={"id": unit_id},
            data=data,
        )

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

    async def delete_unit(self, unit_id: str):
        """Hard-delete a unit by primary key (cascade at DB level)."""
        return await self.db.unit.delete(where={"id": unit_id})

    async def count_available(self, client_id: str) -> int:
        """Count active + available units for a tenant (for dashboard KPIs)."""
        return await self.db.unit.count(where={
            "clientId":    client_id,
            "isAvailable": True,
            "isActive":    True,
        })
