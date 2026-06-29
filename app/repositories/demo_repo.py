"""
app/repositories/demo_repo.py
Repository — DB queries for trial tenant creation.
Follows 4-layer rule: all prisma_client calls live here only.
"""
from prisma import Prisma


class DemoRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def slug_exists(self, slug: str) -> bool:
        return await self.db.client.find_unique(where={"slug": slug}) is not None

    async def create_client(self, data: dict):
        return await self.db.client.create(data=data)

    async def create_user(self, data: dict):
        return await self.db.user.create(data=data)

    async def seed_services(self, client_id: str, service_keys: list[str]) -> None:
        for key in service_keys:
            await self.db.clientservice.upsert(
                where={"clientId_serviceKey": {"clientId": client_id, "serviceKey": key}},
                data={
                    "create": {"clientId": client_id, "serviceKey": key, "isActive": True},
                    "update": {"isActive": True},
                },
            )
