"""
app/repositories/availability_repo.py
Raw DB queries for the availability calendar.
Only this file touches prisma for availability — no business logic here.
"""

from datetime import date
from prisma import Prisma


class AvailabilityRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def get_prices_for_range(
        self, unit_id: str, client_id: str, start: date, end: date
    ):
        """
        Fetch all Price rows for a unit within [start, end] (inclusive).
        Each row carries: date, price, available, minStay, currency.
        """
        return await self.db.price.find_many(
            where={
                "unitId": unit_id,
                "clientId": client_id,
                "date": {"gte": start, "lte": end},
            },
            order={"date": "asc"},
        )

    async def get_overlapping_bookings(
        self, unit_id: str, client_id: str, start: date, end: date
    ):
        """
        Fetch all active bookings that overlap with [start, end].
        Overlap condition:  checkIn < end  AND  checkOut > start
        Only pending/confirmed bookings block dates.
        """
        return await self.db.booking.find_many(
            where={
                "unitId": unit_id,
                "clientId": client_id,
                "status": {"in": ["pending", "confirmed"]},
                "checkIn": {"lt": end},
                "checkOut": {"gt": start},
            }
        )
