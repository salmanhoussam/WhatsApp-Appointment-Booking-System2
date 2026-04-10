from prisma import Prisma
from typing import Optional

class ClientRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def get_by_slug(self, slug: str):
        """Resolve a tenant/client slug to its UUID and details."""
        return await self.db.client.find_unique(
            where={"slug": slug}
        )

    async def get_by_id(self, client_id: str):
        """Fetch client by UUID."""
        return await self.db.client.find_unique(
            where={"id": client_id}
        )
