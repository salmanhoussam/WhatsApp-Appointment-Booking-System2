from prisma import Prisma
from typing import List, Optional
from datetime import datetime, timezone, date

class BookingRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def count_by_client(
        self, client_id: str,
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> int:
        """Count bookings for a client, optionally filtered by status and check-in date range."""
        where = {"clientId": client_id}
        if status:
            where["status"] = status
        if date_from or date_to:
            ci: dict = {}
            if date_from: ci["gte"] = date_from
            if date_to:   ci["lte"] = date_to
            where["checkIn"] = ci
        return await self.db.booking.count(where=where)

    async def get_all_by_client(
        self, client_id: str, skip: int = 0, take: int = 20,
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ):
        """Fetch a page of bookings for a specific client UUID, with optional filters."""
        where = {"clientId": client_id}
        if status:
            where["status"] = status
        if date_from or date_to:
            ci: dict = {}
            if date_from: ci["gte"] = date_from
            if date_to:   ci["lte"] = date_to
            where["checkIn"] = ci
        return await self.db.booking.find_many(
            where=where,
            include={"unit": True, "customer": True},
            order={"createdAt": "desc"},
            skip=skip,
            take=take,
        )

    async def get_by_unit(self, unit_id: str, client_id: str):
        """Fetch all bookings for a specific unit (e.g., to check history)."""
        return await self.db.booking.find_many(
            where={
                "unitId": unit_id,
                "clientId": client_id
            }
        )

    async def create(self, client_id: str, unit_id: str, customer_id: str, data: dict):
        """Create a new booking linked to a specific unit and customer."""
        return await self.db.booking.create(
            data={
                **data,
                "clientId": client_id,
                "unitId": unit_id,
                "customerId": customer_id
            }
        )

    async def check_availability(self, unit_id: str, check_in: datetime, check_out: datetime, client_id: str = ""):
        """Check if a unit is available for the given dates (Overlapping check).
        client_id MUST be provided — enforces tenant isolation at DB level.
        """
        if isinstance(check_in, date) and not isinstance(check_in, datetime):
            check_in = datetime.combine(check_in, datetime.min.time()).replace(tzinfo=timezone.utc)
        if isinstance(check_out, date) and not isinstance(check_out, datetime):
            check_out = datetime.combine(check_out, datetime.min.time()).replace(tzinfo=timezone.utc)

        if not client_id:
            raise ValueError("check_availability requires client_id for tenant isolation")

        conflicting_bookings = await self.db.booking.find_many(
            where={
                "unitId":   unit_id,
                "clientId": client_id,
                "status": {"in": ["pending", "confirmed", "blocked"]},
                "OR": [
                    {
                        "AND": [
                            {"checkIn": {"lte": check_in}},
                            {"checkOut": {"gt": check_in}}
                        ]
                    },
                    {
                        "AND": [
                            {"checkIn": {"lt": check_out}},
                            {"checkOut": {"gte": check_out}}
                        ]
                    },
                    {
                        "AND": [
                            {"checkIn": {"gte": check_in}},
                            {"checkOut": {"lte": check_out}}
                        ]
                    }
                ]
            }
        )
        return len(conflicting_bookings) == 0

    async def update_status(self, booking_id: str, client_id: str, status: str):
        """Update booking status — scoped to client for multi-tenancy."""
        return await self.db.booking.update(
            where={"id": booking_id, "clientId": client_id},
            data={"status": status},
            include={"unit": True, "customer": True},
        )

    async def find_by_id(self, booking_id: str, client_id: str):
        """Find a single booking scoped to tenant."""
        return await self.db.booking.find_first(
            where={"id": booking_id, "clientId": client_id}
        )

    async def update_patch(self, booking_id: str, client_id: str, patch: dict):
        """Apply a partial update to a booking, scoped to tenant."""
        return await self.db.booking.update(
            where={"id": booking_id, "clientId": client_id},
            data=patch,
            include={"unit": True, "customer": True},
        )

    async def create_block(self, data: dict):
        """Create a 'blocked' booking record."""
        return await self.db.booking.create(data=data)
