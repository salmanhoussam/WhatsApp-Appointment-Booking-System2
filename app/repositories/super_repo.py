from prisma import Prisma


class SuperRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def list_all_clients(self):
        return await self.db.client.find_many(
            order={"createdAt": "desc"},
        )

    async def update_client_status(self, client_id: str, status: str):
        return await self.db.client.update(
            where={"id": client_id},
            data={"status": status},
        )
