"""
Fleet Repository — Prisma queries for FleetVehicle and FleetDriver.
CRUD only. No business logic.
"""

from datetime import datetime, timezone
from app.db.client import prisma_client


# ── Vehicles ──────────────────────────────────────────────────────────────────

async def get_all_vehicles(client_id: str):
    return await prisma_client.fleetvehicle.find_many(
        where={"clientId": client_id},
        include={"driver": True},
        order_by={"createdAt": "asc"},
    )


async def get_vehicle_by_samsara_id(samsara_id: str):
    return await prisma_client.fleetvehicle.find_first(
        where={"samsaraId": samsara_id},
        include={"driver": True},
    )


async def get_vehicle(vehicle_id: str, client_id: str):
    return await prisma_client.fleetvehicle.find_first(
        where={"id": vehicle_id, "clientId": client_id},
        include={"driver": True},
    )


async def create_vehicle(client_id: str, data: dict):
    return await prisma_client.fleetvehicle.create(
        data={"clientId": client_id, **data}
    )


async def update_vehicle_status(vehicle_id: str, status: str) -> None:
    await prisma_client.fleetvehicle.update(
        where={"id": vehicle_id},
        data={"status": status, "lastSeenAt": datetime.now(timezone.utc)},
    )


async def update_vehicle_gps(vehicle_id: str, lat: float, lng: float) -> None:
    await prisma_client.fleetvehicle.update(
        where={"id": vehicle_id},
        data={
            "lastLat":    lat,
            "lastLng":    lng,
            "lastSeenAt": datetime.now(timezone.utc),
        },
    )


async def count_by_status(client_id: str) -> dict:
    """Returns {'active': N, 'idle': N, 'offline': N, 'maintenance': N}."""
    vehicles = await prisma_client.fleetvehicle.find_many(
        where={"clientId": client_id},
        select={"status": True},
    )
    counts: dict[str, int] = {}
    for v in vehicles:
        counts[v.status] = counts.get(v.status, 0) + 1
    return counts


# ── Drivers ───────────────────────────────────────────────────────────────────

async def get_all_drivers(client_id: str):
    return await prisma_client.fleetdriver.find_many(
        where={"clientId": client_id, "isActive": True},
        include={"vehicle": True},
    )


async def get_driver(driver_id: str):
    return await prisma_client.fleetdriver.find_unique(
        where={"id": driver_id},
    )


async def get_driver_by_samsara_id(samsara_id: str):
    return await prisma_client.fleetdriver.find_first(
        where={"samsaraId": samsara_id},
    )


async def create_driver(client_id: str, data: dict):
    return await prisma_client.fleetdriver.create(
        data={"clientId": client_id, **data}
    )


async def update_driver_safety_score(driver_id: str, score: float) -> None:
    await prisma_client.fleetdriver.update(
        where={"id": driver_id},
        data={"safetyScore": score},
    )


async def delete_driver_data(client_id: str, driver_id: str) -> None:
    """DSGVO Right to Erasure — wipes personal data for this driver."""
    await prisma_client.fleetdriver.update(
        where={"id": driver_id, "clientId": client_id},
        data={
            "name":        "DELETED",
            "phone":       None,
            "uberToken":   None,
            "isActive":    False,
            "samsaraId":   None,
            "uberDriverId": None,
        },
    )
