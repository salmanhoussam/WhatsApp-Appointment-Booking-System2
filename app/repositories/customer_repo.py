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
        """Upsert a deterministic system customer (used for admin block records).

        Multi-tenant DB Integrity Audit (Study 7, Customer Identity + WhatsApp Booking Study,
        2026-08-24) -- previously `where={"phone": phone}` alone, no clientId. `phone` is not even
        a valid standalone unique key on Customer (only `id` and the compound `@@unique([clientId,
        phone])` are) -- this could match and silently reattach a DIFFERENT tenant's real customer
        row to this tenant's "Admin Block" record. Fixed to address the real compound unique key,
        same `fieldA_fieldB` selector convention this codebase already uses for ClientService's own
        compound unique (`app/core/services.py`'s `clientId_serviceKey`).
        """
        return await self.db.customer.upsert(
            where={"clientId_phone": {"clientId": client_id, "phone": phone}},
            data={
                "create": {
                    "clientId": client_id,
                    "phone":    phone,
                    "name":     "Admin Block",
                },
                "update": {},
            },
        )
