from prisma import Prisma


class SubscriptionRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def find_active_for_client(self, client_id: str):
        """
        The Subscription with endedAt IS NULL for this Client, if any.
        At most one active Subscription per Client (ADR-0002 §11.0b) -
        a business rule enforced here by convention, not a DB constraint.
        """
        return await self.db.subscription.find_first(
            where={"clientId": client_id, "endedAt": None}
        )

    async def create(self, data: dict):
        return await self.db.subscription.create(data=data)

    async def end_subscription(self, subscription_id: str, ended_at):
        return await self.db.subscription.update(
            where={"id": subscription_id},
            data={"endedAt": ended_at},
        )

    async def update_status(self, subscription_id: str, status: str):
        return await self.db.subscription.update(
            where={"id": subscription_id},
            data={"status": status},
        )
