from prisma import Prisma


class PlanRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def find_by_key(self, key: str):
        return await self.db.plan.find_unique(where={"key": key})

    async def find_by_id(self, plan_id: str):
        return await self.db.plan.find_unique(where={"id": plan_id})

    async def list_all(self):
        return await self.db.plan.find_many(order={"monthly_price": "asc"})

    async def create(self, data: dict):
        return await self.db.plan.create(data=data)
