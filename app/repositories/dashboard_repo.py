"""
app/repositories/dashboard_repo.py
Raw DB queries for the admin dashboard.
All queries are tenant-isolated by client_id.
"""

from datetime import date, timedelta
from decimal import Decimal
from prisma import Prisma


class DashboardRepository:
    def __init__(self, db: Prisma):
        self.db = db

    # ── Booking counts & revenue ──────────────────────────────────────────────

    async def get_monthly_booking_stats(self, client_id: str, year: int, month: int) -> dict:
        """
        Returns total bookings and confirmed revenue for the given month.
        Revenue counts only confirmed + completed bookings.
        createdAt is Timestamptz — pass datetime objects, not date strings.
        """
        import calendar
        from datetime import datetime
        num_days    = calendar.monthrange(year, month)[1]
        # Timestamptz column: use datetime objects (naive = UTC assumed by Postgres)
        month_start_dt = datetime(year, month, 1, 0, 0, 0)
        month_end_dt   = datetime(year, month, num_days, 23, 59, 59)

        all_bookings = await self.db.booking.find_many(
            where={
                "clientId": client_id,
                "createdAt": {
                    "gte": month_start_dt,
                    "lte": month_end_dt,
                },
            }
        )

        total = len(all_bookings)
        revenue = sum(
            Decimal(str(b.totalPrice))
            for b in all_bookings
            if b.status in ("confirmed", "completed")
        )

        status_counts: dict[str, int] = {}
        for b in all_bookings:
            status_counts[b.status] = status_counts.get(b.status, 0) + 1

        return {
            "total_bookings": total,
            "confirmed_revenue": str(revenue),
            "by_status": status_counts,
        }

    # ── Upcoming check-ins ────────────────────────────────────────────────────

    async def get_upcoming_checkins(self, client_id: str, days_ahead: int = 7):
        """
        Fetch bookings whose check_in falls within the next N days.
        """
        today = date.today()
        until = today + timedelta(days=days_ahead)

        from datetime import datetime
        if isinstance(today, date) and not isinstance(today, datetime):
            today = datetime.combine(today, datetime.min.time())
        if isinstance(until, date) and not isinstance(until, datetime):
            until = datetime.combine(until, datetime.min.time())

        return await self.db.booking.find_many(
            where={
                "clientId": client_id,
                "status": {"in": ["pending", "confirmed"]},
                "checkIn": {"gte": today, "lte": until},
            },
            include={"unit": True, "customer": True},
            order={"checkIn": "asc"},
        )

    # ── Occupancy ─────────────────────────────────────────────────────────────

    async def get_occupancy_data(
        self, client_id: str, start: date, end: date
    ) -> list:
        """
        Returns all active bookings (pending/confirmed) in the period,
        with their unit+property included. Used to compute occupancy.
        """
        from datetime import datetime
        if isinstance(start, date) and not isinstance(start, datetime):
            start = datetime.combine(start, datetime.min.time())
        if isinstance(end, date) and not isinstance(end, datetime):
            end = datetime.combine(end, datetime.min.time())

        return await self.db.booking.find_many(
            where={
                "clientId": client_id,
                "status": {"in": ["pending", "confirmed"]},
                "checkIn": {"lt": end},
                "checkOut": {"gt": start},
            },
            include={"unit": {"include": {"property": True}}},
        )

    async def get_properties_with_units(self, client_id: str) -> list:
        """Fetch all active properties with their active units."""
        return await self.db.property.find_many(
            where={"clientId": client_id, "isActive": True},
            include={
                "units": {
                    "where": {"isActive": True},
                }
            },
        )
