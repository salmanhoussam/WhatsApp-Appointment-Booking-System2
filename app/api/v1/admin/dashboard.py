"""
app/api/v1/admin/dashboard.py
Admin dashboard stats — requires a valid admin JWT.

GET /api/v1/admin/dashboard?year=2025&month=6

Response shape:
{
  "period":   { "year": 2025, "month": 6 },
  "bookings": { "total": 42, "confirmed_revenue": "18500.00",
                "by_status": { "confirmed": 30, "pending": 8, "cancelled": 4 } },
  "upcoming_checkins": [ { "id": "...", "unit": {...}, "customer": {...},
                           "check_in": "2025-06-10", "guests": 3 }, ... ],
  "occupancy": [
    { "property_id": "...", "property_name": "...",
      "total_units": 8, "booked_nights": 45, "available_nights": 248,
      "occupancy_rate": 0.18 },
    ...
  ]
}
"""

import asyncio
import calendar
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.db.client import prisma_client
from app.core.tenant import get_current_admin_user, get_current_tenant
from app.repositories.dashboard_repo import DashboardRepository

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin Dashboard"])


def _get_repo() -> DashboardRepository:
    return DashboardRepository(prisma_client)


@router.get("/dashboard")
async def get_dashboard(
    request: Request,
    year:  int = Query(default=None, description="Year (defaults to current year)"),
    month: int = Query(default=None, ge=1, le=12, description="Month 1–12 (defaults to current month)"),
    tenant: dict = Depends(get_current_tenant),
    repo: DashboardRepository = Depends(_get_repo),
):
    """
    Admin dashboard — returns booking stats, upcoming arrivals, and
    occupancy rate per property for the requested month.

    Requires any valid tenant JWT (client OR admin user token).
    """
    today = date.today()
    year  = year  or today.year
    month = month or today.month

    client_id = tenant["id"]

    num_days    = calendar.monthrange(year, month)[1]
    month_start = date(year, month, 1)
    month_end   = date(year, month, num_days)

    # ── Run all queries concurrently ──────────────────────────────────────────
    import asyncio
    booking_stats, upcoming, occupancy_bookings, properties = await asyncio.gather(
        repo.get_monthly_booking_stats(client_id, year, month),
        repo.get_upcoming_checkins(client_id, days_ahead=7),
        repo.get_occupancy_data(client_id, month_start, month_end),
        repo.get_properties_with_units(client_id),
    )

    # ── Compute occupancy per property ────────────────────────────────────────
    # Build: property_id → { booked_nights: int }
    booked_nights_by_property: dict[str, int] = {}
    for booking in occupancy_bookings:
        prop_id = getattr(booking.unit, "propertyId", None) if booking.unit else None
        if not prop_id:
            continue
        # Clip booking to the month window
        b_start = max(booking.checkIn,  month_start)
        b_end   = min(booking.checkOut, month_end + timedelta(days=1))
        nights  = max(0, (b_end - b_start).days)
        booked_nights_by_property[prop_id] = (
            booked_nights_by_property.get(prop_id, 0) + nights
        )

    occupancy_report = []
    for prop in properties:
        unit_count = len(prop.units) if prop.units else 0
        if unit_count == 0:
            continue
        available_nights = unit_count * num_days
        booked = booked_nights_by_property.get(prop.id, 0)
        rate   = round(booked / available_nights, 4) if available_nights else 0.0

        occupancy_report.append({
            "property_id":       prop.id,
            "property_name":     prop.name,
            "total_units":       unit_count,
            "booked_nights":     booked,
            "available_nights":  available_nights,
            "occupancy_rate":    rate,
            "occupancy_pct":     f"{rate * 100:.1f}%",
        })

    # ── Format upcoming check-ins ─────────────────────────────────────────────
    upcoming_formatted = []
    for b in upcoming:
        upcoming_formatted.append({
            "booking_id":        b.id,
            "booking_reference": b.bookingRef,
            "check_in":          b.checkIn.isoformat() if b.checkIn else None,
            "check_out":         b.checkOut.isoformat() if b.checkOut else None,
            "guests":            b.guests,
            "status":            b.status,
            "unit": {
                "id":   b.unit.id   if b.unit else None,
                "name": (b.unit.name_ar or b.unit.unitNumber) if b.unit else None,
            },
            "customer": {
                "id":    b.customer.id    if b.customer else None,
                "name":  b.customer.name  if b.customer else None,
                "phone": b.customer.phone if b.customer else None,
            },
        })

    return {
        "period": {"year": year, "month": month},
        "bookings": booking_stats,
        "upcoming_checkins": upcoming_formatted,
        "occupancy": occupancy_report,
    }


@router.get("/dashboard/stats")
async def get_quick_stats(tenant: dict = Depends(get_current_tenant)):
    """
    4 KPI numbers for the top of the Bookings tab.
    Returns: today_bookings, pending_count, monthly_revenue, available_units.
    """
    today     = date.today()
    tomorrow  = today + timedelta(days=1)
    month_start = date(today.year, today.month, 1)

    today_start    = datetime.combine(today,       datetime.min.time())
    tomorrow_start = datetime.combine(tomorrow,    datetime.min.time())
    month_start_dt = datetime.combine(month_start, datetime.min.time())

    client_id = tenant["id"]

    today_bookings_task = prisma_client.booking.count(where={
        "clientId": client_id,
        "checkIn":  {"gte": today_start, "lt": tomorrow_start},
    })
    pending_task = prisma_client.booking.count(where={
        "clientId": client_id,
        "status":   "pending",
    })
    revenue_task = prisma_client.booking.find_many(where={
        "clientId": client_id,
        "status":   "confirmed",
        "checkIn":  {"gte": month_start_dt},
    })
    units_task = prisma_client.unit.count(where={
        "clientId":    client_id,
        "isAvailable": True,
        "isActive":    True,
    })

    today_count, pending_count, revenue_bookings, available_units = await asyncio.gather(
        today_bookings_task, pending_task, revenue_task, units_task
    )

    monthly_revenue = round(sum(float(b.totalPrice) for b in revenue_bookings), 2)

    return {
        "today_bookings":  today_count,
        "pending_count":   pending_count,
        "monthly_revenue": monthly_revenue,
        "available_units": available_units,
    }
