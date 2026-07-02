"""
Trip Repository — Prisma queries for FleetTrip.
CRUD only. No business logic.
"""

from datetime import datetime
from app.db.client import prisma_client


async def get_trips_for_client(client_id: str, limit: int = 100):
    return await prisma_client.fleettrip.find_many(
        where={"clientId": client_id},
        include={"driver": True, "vehicle": True},
        order_by={"startTime": "desc"},
        take=limit,
    )


async def get_trips_after(client_id: str, since: datetime):
    """Return all completed trips after a given UTC datetime."""
    return await prisma_client.fleettrip.find_many(
        where={"clientId": client_id, "startTime": {"gte": since}},
        include={"driver": True, "vehicle": True},
    )


async def trip_exists(uber_trip_ref: str) -> bool:
    row = await prisma_client.fleettrip.find_first(
        where={"uberTripRef": uber_trip_ref}
    )
    return row is not None


async def bulk_create_trips(rows: list[dict]) -> int:
    """Insert multiple trips; returns count of rows created."""
    if not rows:
        return 0
    result = await prisma_client.fleettrip.create_many(
        data=rows, skip_duplicates=True
    )
    return result.count


async def get_daily_revenue(client_id: str, since: datetime) -> float:
    trips = await prisma_client.fleettrip.find_many(
        where={
            "clientId": client_id,
            "startTime": {"gte": since},
            "status":   "completed",
        },
        select={"revenue": True},
    )
    return sum(t.revenue or 0 for t in trips)


async def get_revenue_per_driver(client_id: str, since: datetime) -> dict[str, float]:
    """Returns {driver_id: total_revenue} for the given period."""
    trips = await prisma_client.fleettrip.find_many(
        where={
            "clientId": client_id,
            "startTime": {"gte": since},
            "driverId":  {"not": None},
        },
        select={"driverId": True, "revenue": True},
    )
    totals: dict[str, float] = {}
    for t in trips:
        if t.driverId:
            totals[t.driverId] = totals.get(t.driverId, 0) + (t.revenue or 0)
    return totals
