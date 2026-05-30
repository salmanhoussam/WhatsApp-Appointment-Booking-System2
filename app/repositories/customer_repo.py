from prisma import Prisma
from typing import Optional

class CustomerRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def get_by_phone(self, phone: str, client_id: str):
        """Fetch a customer by phone number and client ID."""
        return await self.db.customer.find_first(
            where={
                "phone": phone,
                "clientId": client_id
            }
        )

    async def create(self, client_id: str, data: dict):
        """Create a new customer profile."""
        return await self.db.customer.create(
            data={
                **data,
                "clientId": client_id
            }
        )

    async def upsert_system_customer(self, client_id: str, phone: str):
        """Upsert a deterministic system customer (used for admin block records)."""
        return await self.db.customer.upsert(
            where={"phone": phone},
            data={
                "create": {
                    "clientId": client_id,
                    "phone":    phone,
                    "name":     "Admin Block",
                },
                "update": {},
            },
        )
