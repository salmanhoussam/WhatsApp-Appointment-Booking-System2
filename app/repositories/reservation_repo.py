"""
Reservation Repository — CRUD only, no business logic.
All queries MUST filter by clientId.
"""

from datetime import datetime, timedelta
from prisma import Prisma


class ReservationRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def create(self, data: dict):
        return await self.db.reservation.create(data=data)

    async def find_by_id(self, reservation_id: str, client_id: str):
        return await self.db.reservation.find_first(
            where={"id": reservation_id, "clientId": client_id}
        )

    async def find_by_id_and_phone(self, reservation_id: str, client_id: str, customer_phone: str):
        return await self.db.reservation.find_first(
            where={
                "id":            reservation_id,
                "clientId":      client_id,
                "customerPhone": customer_phone,
            }
        )

    async def list_by_client(
        self,
        client_id: str,
        module_key: str | None = None,
        status: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 50,
    ) -> list:
        where: dict = {"clientId": client_id}
        if module_key:
            where["moduleKey"] = module_key
        if status:
            where["status"] = status
        if date_from or date_to:
            where["reservedAt"] = {}
            if date_from:
                where["reservedAt"]["gte"] = date_from
            if date_to:
                where["reservedAt"]["lte"] = date_to

        return await self.db.reservation.find_many(
            where=where,
            order={"reservedAt": "asc"},
            take=limit,
        )

    async def find_overlapping(
        self,
        client_id: str,
        module_key: str,
        reserved_at: datetime,
        duration_min: int,
        exclude_id: str | None = None,
    ) -> list:
        """Fetch active reservations in a ±4h window for conflict checking."""
        window_start = reserved_at - timedelta(hours=4)
        window_end   = reserved_at + timedelta(hours=4)
        where: dict = {
            "clientId":  client_id,
            "moduleKey": module_key,
            "status":    {"in": ["pending", "confirmed", "arrived"]},
            "reservedAt": {"gte": window_start, "lte": window_end},
        }
        if exclude_id:
            where["id"] = {"not": exclude_id}
        return await self.db.reservation.find_many(where=where)

    async def update_status(self, reservation_id: str, client_id: str, status: str):
        result = await self.db.reservation.update_many(
            where={"id": reservation_id, "clientId": client_id},
            data={"status": status},
        )
        if result.count == 0:
            return None
        return await self.find_by_id(reservation_id, client_id)

    async def cancel(self, reservation_id: str, client_id: str, customer_phone: str):
        result = await self.db.reservation.update_many(
            where={
                "id":            reservation_id,
                "clientId":      client_id,
                "customerPhone": customer_phone,
                "status":        {"in": ["pending", "confirmed"]},
            },
            data={"status": "cancelled"},
        )
        return result.count > 0
