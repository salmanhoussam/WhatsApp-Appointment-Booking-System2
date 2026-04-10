from prisma import Prisma
from typing import List, Optional

class PropertyRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def count_by_client(self, client_id: str) -> int:
        """Count all properties for a client (used for pagination)."""
        return await self.db.property.count(where={"clientId": client_id})

    async def get_all_by_client(self, client_id: str, skip: int = 0, take: int = 20):
        """Fetch a page of properties for a specific client UUID."""
        return await self.db.property.find_many(
            where={"clientId": client_id},
            order={"createdAt": "desc"},
            skip=skip,
            take=take,
        )

    async def get_by_id(self, property_id: str, client_id: str):
        """Fetch a specific property with client isolation."""
        return await self.db.property.find_first(
            where={
                "id": property_id,
                "clientId": client_id
            },
            include={"units": True, "services": True}
        )

    async def create(self, client_id: str, data: dict):
        """Create a new property for an enterprise client."""
        return await self.db.property.create(
            data={
                **data,
                "clientId": client_id
            }
        )

    async def update(self, property_id: str, client_id: str, data: dict):
        """Update a property with client isolation."""
        return await self.db.property.update_many(
            where={
                "id": property_id,
                "clientId": client_id
            },
            data=data
        )
