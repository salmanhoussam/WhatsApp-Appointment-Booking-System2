"""
Fleet Dashboard Service — aggregates fleet data for the admin dashboard.
Reads from fleet_repo, trip_repo, samsara_event_repo.
No Prisma calls here — only repository imports.
"""

import logging
from datetime import datetime, timezone

from app.repositories import fleet_repo, trip_repo, samsara_event_repo

logger = logging.getLogger(__name__)


def _today_utc() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


async def get_fleet_dashboard(client_id: str) -> dict:
    """
    Returns a single JSON-serialisable dict the frontend consumes directly.
    All DB reads run concurrently where possible.
    """
    import asyncio

    today = _today_utc()

    # Fan-out parallel queries
    vehicles_task       = fleet_repo.get_all_vehicles(client_id)
    status_counts_task  = fleet_repo.count_by_status(client_id)
    today_trips_task    = trip_repo.get_trips_after(client_id, today)
    unread_count_task   = samsara_event_repo.get_unread_count(client_id)
    unread_alerts_task  = samsara_event_repo.get_unread_alerts(client_id, limit=10)
    revenue_task        = trip_repo.get_revenue_per_driver(client_id, today)

    (
        vehicles,
        status_counts,
        today_trips,
        unread_count,
        unread_alerts,
        driver_revenue,
    ) = await asyncio.gather(
        vehicles_task,
        status_counts_task,
        today_trips_task,
        unread_count_task,
        unread_alerts_task,
        revenue_task,
    )

    # ── Revenue ──────────────────────────────────────────────────────────────
    today_revenue = sum(t.revenue or 0 for t in today_trips)

    # ── Top driver (by revenue today) ─────────────────────────────────────
    top_driver = None
    if driver_revenue:
        top_id = max(driver_revenue, key=driver_revenue.get)
        top_v  = driver_revenue[top_id]
        # Resolve driver name from vehicles list
        for v in vehicles:
            if v.driver and v.driver.id == top_id:
                top_driver = {"name": v.driver.name, "revenue": round(top_v, 2)}
                break

    # ── Fleet health score (simple: % of non-offline vehicles) ───────────
    total       = len(vehicles)
    offline_cnt = status_counts.get("offline", 0)
    health      = round(((total - offline_cnt) / total * 100) if total else 0)

    # ── Vehicle list for map ──────────────────────────────────────────────
    vehicle_list = [
        {
            "id":       v.id,
            "plate":    v.plateNumber,
            "make":     v.make,
            "model":    v.model,
            "status":   v.status,
            "lat":      v.lastLat,
            "lng":      v.lastLng,
            "driver":   v.driver.name if v.driver else None,
            "driver_id":v.driver.id   if v.driver else None,
        }
        for v in vehicles
    ]

    # ── Alert list for feed ───────────────────────────────────────────────
    alert_list = [
        {
            "id":       a.id,
            "driver":   a.driver.name if a.driver else None,
            "type":     a.type,
            "message":  a.message,
            "severity": a.severity,
            "time":     a.createdAt.isoformat(),
        }
        for a in unread_alerts
    ]

    return {
        "total_vehicles":  total,
        "active_now":      status_counts.get("active", 0),
        "idle":            status_counts.get("idle", 0),
        "offline":         offline_cnt,
        "maintenance":     status_counts.get("maintenance", 0),
        "today_revenue":   round(today_revenue, 2),
        "today_trips":     len(today_trips),
        "unread_alerts":   unread_count,
        "fleet_health":    health,
        "top_driver":      top_driver,
        "vehicles":        vehicle_list,
        "alerts":          alert_list,
        "generated_at":    datetime.now(timezone.utc).isoformat(),
    }
