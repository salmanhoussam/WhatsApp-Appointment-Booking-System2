"""
app/services/availability_service.py
Availability calendar business logic.

For each day in the requested month this service produces one of four statuses:
  - available  → Price row exists, available=true, no booking overlap
  - booked     → A pending/confirmed booking covers this date
  - blocked    → Price row exists but available=false (owner blocked it)
  - no_price   → No Price row for this date (implicitly unavailable)

Status priority:  booked  >  blocked  >  available  >  no_price
"""

import calendar
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from app.repositories.availability_repo import AvailabilityRepository
from app.core.exceptions import BusinessLogicError, NotFoundError


# ── Response schema (plain dict — serialised by the route layer) ─────────────

def _day_entry(
    d: date,
    status: str,
    price: Optional[Decimal] = None,
    min_stay: Optional[int] = None,
    currency: Optional[str] = None,
) -> dict:
    return {
        "date": d.isoformat(),
        "status": status,
        "price": str(price) if price is not None else None,
        "min_stay": min_stay,
        "currency": currency,
    }


class AvailabilityService:
    def __init__(self, repo: AvailabilityRepository):
        self.repo = repo

    async def get_monthly_availability(
        self,
        unit_id: str,
        client_id: str,
        year: int,
        month: int,
    ) -> dict:
        """
        Returns the full availability calendar for a unit in a given month.

        {
          "unit_id": "...",
          "year": 2025,
          "month": 6,
          "days": [ {"date": "2025-06-01", "status": "available", "price": "450.00",
                     "min_stay": 2, "currency": "SAR"}, ... ]
        }
        """
        if not 1 <= month <= 12:
            raise BusinessLogicError(f"Invalid month: {month}. Must be 1–12.")

        num_days = calendar.monthrange(year, month)[1]
        period_start = date(year, month, 1)
        period_end = date(year, month, num_days)

        # ── Fetch raw data (two parallel DB queries) ─────────────────────────
        prices_raw, bookings_raw = await _fetch_both(
            self.repo, unit_id, client_id, period_start, period_end
        )

        # ── Build lookup structures ───────────────────────────────────────────
        price_map: dict[date, object] = {p.date: p for p in prices_raw}

        booked_dates: set[date] = set()
        for booking in bookings_raw:
            cur = booking.checkIn
            # checkOut is exclusive (guest leaves that morning)
            while cur < booking.checkOut:
                booked_dates.add(cur)
                cur += timedelta(days=1)

        # ── Compute per-day status ─────────────────────────────────────────────
        days = []
        for day_num in range(1, num_days + 1):
            d = date(year, month, day_num)

            if d in booked_dates:
                days.append(_day_entry(d, "booked"))
                continue

            price_row = price_map.get(d)
            if price_row is None:
                days.append(_day_entry(d, "no_price"))
            elif not price_row.available:
                days.append(_day_entry(d, "blocked"))
            else:
                days.append(_day_entry(
                    d, "available",
                    price=price_row.price,
                    min_stay=price_row.minStay,
                    currency=price_row.currency,
                ))

        return {
            "unit_id": unit_id,
            "year": year,
            "month": month,
            "days": days,
        }


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _fetch_both(repo, unit_id, client_id, start, end):
    """Run both DB queries concurrently via asyncio.gather."""
    import asyncio
    return await asyncio.gather(
        repo.get_prices_for_range(unit_id, client_id, start, end),
        repo.get_overlapping_bookings(unit_id, client_id, start, end),
    )
