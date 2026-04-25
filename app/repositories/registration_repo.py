from prisma import Prisma


class RegistrationRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def slug_exists(self, slug: str) -> bool:
        return await self.db.client.find_unique(where={"slug": slug}) is not None

    async def user_email_exists(self, email: str) -> bool:
        return await self.db.user.find_first(where={"email": email}) is not None

    async def create_client(self, data: dict):
        return await self.db.client.create(data=data)

    async def create_user(self, data: dict):
        return await self.db.user.create(data=data)
