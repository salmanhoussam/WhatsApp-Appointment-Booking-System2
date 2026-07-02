"""
Uber Import Service — processes a CSV upload and inserts FleetTrip rows.
Skips rows with duplicate uberTripRef (idempotent — safe to re-upload).
"""

import logging

from app.adapters.uber_adapter import parse_uber_trips_csv
from app.repositories import trip_repo

logger = logging.getLogger(__name__)


async def import_trips_from_csv(
    client_id: str,
    vehicle_id: str,
    driver_id: str | None,
    file_bytes: bytes,
) -> dict:
    """
    Parse the uploaded Uber CSV and insert new trips for the given vehicle.
    Returns a summary: total rows parsed, inserted, skipped (duplicates).
    """
    parsed = parse_uber_trips_csv(file_bytes)
    if not parsed:
        return {"parsed": 0, "inserted": 0, "skipped": 0}

    to_insert = []
    skipped   = 0

    for row in parsed:
        ref = row.get("uber_trip_ref")
        # Skip duplicates without a DB round-trip per row using trip_ref lookup
        if ref and await trip_repo.trip_exists(ref):
            skipped += 1
            continue

        to_insert.append({
            "clientId":    client_id,
            "vehicleId":   vehicle_id,
            "driverId":    driver_id,
            "uberTripRef": ref,
            "startTime":   row["start_time"],
            "endTime":     row.get("end_time"),
            "revenue":     row.get("revenue"),
            "distanceKm":  row.get("distance_km"),
            "city":        row.get("city"),
            "status":      row.get("status", "completed"),
            "source":      "csv",
        })

    inserted = await trip_repo.bulk_create_trips(to_insert)
    logger.info(
        "CSV import for client=%s vehicle=%s: parsed=%d inserted=%d skipped=%d",
        client_id, vehicle_id, len(parsed), inserted, skipped,
    )
    return {"parsed": len(parsed), "inserted": inserted, "skipped": skipped}
