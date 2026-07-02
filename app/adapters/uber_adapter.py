"""
Uber adapter — CSV trip history parser.

Uber's Driver API requires explicit approval (access is limited).
MVP approach: fleet operators export CSV from Uber Fleet Portal and upload here.

The CSV column names vary by country/region:
  - Germany: may split date/time into two columns, use EUR symbols
  - US:      uses '$', single datetime column
This parser handles both formats.
"""

import csv
import logging
from datetime import datetime
from io import StringIO

logger = logging.getLogger(__name__)

# Datetime formats Uber uses across regions
_DT_FORMATS = [
    "%Y-%m-%d %H:%M",
    "%Y-%m-%dT%H:%M:%S",
    "%m/%d/%Y %H:%M",
    "%d/%m/%Y %H:%M",
]


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    raw = raw.strip()
    for fmt in _DT_FORMATS:
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    logger.warning("Could not parse datetime: %r", raw)
    return None


def _parse_money(raw: str | None) -> float:
    if not raw:
        return 0.0
    cleaned = raw.replace("€", "").replace("$", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _parse_distance(raw: str | None) -> float:
    if not raw:
        return 0.0
    cleaned = raw.replace("km", "").replace("mi", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def parse_uber_trips_csv(file_bytes: bytes) -> list[dict]:
    """
    Parse a CSV exported from the Uber Fleet Portal.
    Returns a list of normalised trip dicts ready to insert as FleetTrip rows.
    Rows with no start_time or duplicate uber_trip_ref are skipped.
    """
    # utf-8-sig strips the BOM that Excel-exported CSVs include
    content = file_bytes.decode("utf-8-sig", errors="replace")
    reader  = csv.DictReader(StringIO(content))
    trips   = []
    skipped = 0

    for row in reader:
        # ── Trip reference ────────────────────────────────────────────────
        trip_ref = row.get("Trip ID") or row.get("UUID") or row.get("trip_id")

        # ── Start time: may be one column or two (date + time) ────────────
        start_raw = (
            row.get("Start Time")
            or row.get("Trip Start Time")
            or row.get("start_time")
        )
        if not start_raw:
            date_col = row.get("Start Date") or row.get("start_date")
            time_col = row.get("Start Time") or row.get("start_time") or "00:00"
            if date_col:
                start_raw = f"{date_col} {time_col}"

        start_time = _parse_dt(start_raw)
        if not start_time:
            skipped += 1
            continue

        # ── End time ─────────────────────────────────────────────────────
        end_raw = (
            row.get("End Time")
            or row.get("Trip End Time")
            or row.get("end_time")
        )
        end_time = _parse_dt(end_raw)

        # ── Revenue: Uber may add VAT / service fee columns ───────────────
        # Use "Earnings" or "Fare" as the net amount paid to the driver
        revenue = _parse_money(
            row.get("Earnings")
            or row.get("Driver Earnings")
            or row.get("Fare")
            or row.get("Net Earnings")
        )

        # ── Distance ──────────────────────────────────────────────────────
        distance_km = _parse_distance(
            row.get("Distance")
            or row.get("Trip Distance")
            or row.get("distance")
        )

        trips.append({
            "uber_trip_ref": trip_ref,
            "start_time":    start_time,
            "end_time":      end_time,
            "revenue":       revenue,
            "distance_km":   distance_km,
            "city":          row.get("City") or row.get("Marketplace") or row.get("city"),
            "status":        "completed",
            "source":        "csv",
        })

    if skipped:
        logger.warning("Skipped %d rows with unparseable start_time", skipped)

    return trips
