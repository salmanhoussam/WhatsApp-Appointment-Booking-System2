from prisma import Prisma


class SuperRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def list_all_clients(self):
        return await self.db.client.find_many(
            order={"createdAt": "desc"},
        )

    async def update_client_status(self, client_id: str, status: str):
        """Tenant Status only (ADR-0001, Hard Block) - active/suspended."""
        return await self.db.client.update(
            where={"id": client_id},
            data={"status": status},
        )

    async def update_client_lifecycle_state(self, client_id: str, lifecycle_state: str):
        """Account Lifecycle State only (ADR-0002 §9) - independent of status."""
        return await self.db.client.update(
            where={"id": client_id},
            data={"lifecycle_state": lifecycle_state},
        )
