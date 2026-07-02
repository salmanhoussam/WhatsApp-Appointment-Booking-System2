"""
Samsara Service — business logic for all incoming Samsara webhook events.

Event routing:
  SpeedingEventStarted / SevereSpeedingEnded → handle_speeding()
  GeofenceEntry / GeofenceExit               → handle_geofence()
  AlertIncident                               → handle_alert_incident()
  EngineOn / EngineOff                        → handle_engine()
  DriverCreated / DriverUpdated               → handle_driver_update()

Rule: 3 speeding events in one day for the same vehicle → send WhatsApp to manager.
"""

import logging
from datetime import datetime, timezone

from app.repositories import fleet_repo, samsara_event_repo

logger = logging.getLogger(__name__)

# WhatsApp deep-link notification (no WhatsApp Business API required)
_WA_LINK = "https://wa.me/{phone}?text={message}"


def _today_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _wa_notify(phone: str, text: str) -> str:
    import urllib.parse
    return _WA_LINK.format(phone=phone, message=urllib.parse.quote(text))


async def _resolve_vehicle(samsara_vehicle_id: str | None, client_id: str):
    """Return the DB vehicle record for a Samsara vehicle ID, or None."""
    if not samsara_vehicle_id:
        return None
    vehicle = await fleet_repo.get_vehicle_by_samsara_id(samsara_vehicle_id)
    if not vehicle:
        logger.warning("Samsara vehicle %s not found in DB for client %s", samsara_vehicle_id, client_id)
    return vehicle


async def handle_speeding(client_id: str, payload: dict) -> dict:
    """
    SpeedingEventStarted or SevereSpeedingEnded.
    Creates a SamsaraEvent + DriverAlert.
    If ≥3 speeding events today for the same vehicle → critical alert.
    """
    vehicle_data = payload.get("vehicle", {})
    samsara_vid  = vehicle_data.get("id")
    location     = payload.get("location", {})
    speed_mph    = payload.get("speed")

    event_type = payload.get("eventType", "SpeedingEventStarted")
    severity   = "critical" if "Severe" in event_type else "warning"

    vehicle = await _resolve_vehicle(samsara_vid, client_id)
    vehicle_id = vehicle.id if vehicle else None
    driver     = vehicle.driver if vehicle else None

    lat = location.get("latitude")
    lng = location.get("longitude")

    await samsara_event_repo.create_event(
        client_id  = client_id,
        event_type = event_type,
        raw_payload= payload,
        vehicle_id = vehicle_id,
        severity   = severity,
        lat        = lat,
        lng        = lng,
        speed      = speed_mph,
    )

    result = {"action": "event_logged", "severity": severity}

    if driver and vehicle_id:
        plate   = vehicle.plateNumber if vehicle else "?"
        speed_s = f"{speed_mph} mph" if speed_mph else "high speed"
        msg     = f"تحذير: السيارة {plate} تجاوزت السرعة ({speed_s})"

        alert = await samsara_event_repo.create_alert(
            client_id  = client_id,
            driver_id  = driver.id,
            alert_type = "speeding",
            message    = msg,
            severity   = severity,
        )

        # Check if 3+ speeding events today → escalate
        count = await samsara_event_repo.count_events_today(
            client_id  = client_id,
            vehicle_id = vehicle_id,
            event_type = "SpeedingEventStarted",
            since      = _today_start(),
        )
        if count >= 3:
            result["escalated"] = True
            result["wa_link"] = _wa_notify(
                "",  # manager phone — injected by route from JWT client
                f"🚨 تنبيه: {plate} تجاوزت السرعة {count} مرات اليوم!"
            )

    return result


async def handle_geofence(client_id: str, payload: dict) -> dict:
    """GeofenceEntry or GeofenceExit."""
    event_type  = payload.get("eventType", "GeofenceExit")
    vehicle_data= payload.get("vehicle", {})
    samsara_vid = vehicle_data.get("id")
    geofence    = payload.get("geofence", {})
    location    = payload.get("location", {})

    vehicle    = await _resolve_vehicle(samsara_vid, client_id)
    vehicle_id = vehicle.id if vehicle else None
    driver     = vehicle.driver if vehicle else None

    await samsara_event_repo.create_event(
        client_id  = client_id,
        event_type = event_type,
        raw_payload= payload,
        vehicle_id = vehicle_id,
        lat        = location.get("latitude"),
        lng        = location.get("longitude"),
    )

    if driver:
        geofence_name = geofence.get("name", "منطقة غير معروفة")
        direction     = "دخلت" if event_type == "GeofenceEntry" else "خرجت من"
        plate         = vehicle.plateNumber if vehicle else "?"
        await samsara_event_repo.create_alert(
            client_id  = client_id,
            driver_id  = driver.id,
            alert_type = "geofence",
            message    = f"السيارة {plate} {direction} {geofence_name}",
            severity   = "info",
        )

    return {"action": "geofence_logged", "event_type": event_type}


async def handle_alert_incident(client_id: str, payload: dict) -> dict:
    """AlertIncident — generic safety alert from Samsara (harsh brake, cornering, etc.)."""
    vehicle_data = payload.get("vehicle", {})
    samsara_vid  = vehicle_data.get("id")
    alert_type   = payload.get("alertType", "unknown")
    severity_raw = payload.get("severity", "medium")

    severity_map = {"high": "critical", "medium": "warning", "low": "info"}
    severity     = severity_map.get(severity_raw, "warning")

    vehicle    = await _resolve_vehicle(samsara_vid, client_id)
    vehicle_id = vehicle.id if vehicle else None
    driver     = vehicle.driver if vehicle else None
    location   = payload.get("location", {})

    await samsara_event_repo.create_event(
        client_id  = client_id,
        event_type = "AlertIncident",
        raw_payload= payload,
        vehicle_id = vehicle_id,
        severity   = severity,
        lat        = location.get("latitude"),
        lng        = location.get("longitude"),
    )

    if driver:
        type_labels = {
            "harshAccel":   "تسارع مفاجئ",
            "harshBrake":   "فرملة مفاجئة",
            "harshTurn":    "تحويل مفاجئ",
            "rollingStop":  "توقف متحرك",
            "speeding":     "سرعة زائدة",
        }
        label = type_labels.get(alert_type, alert_type)
        plate = vehicle.plateNumber if vehicle else "?"
        await samsara_event_repo.create_alert(
            client_id  = client_id,
            driver_id  = driver.id,
            alert_type = "harsh_brake" if "Brake" in alert_type else alert_type,
            message    = f"حادثة أمان: {label} — السيارة {plate}",
            severity   = severity,
        )

    return {"action": "alert_logged", "alert_type": alert_type}


async def handle_engine(client_id: str, payload: dict) -> dict:
    """EngineOn / EngineOff — update vehicle status in DB."""
    event_type   = payload.get("eventType", "EngineOff")
    vehicle_data = payload.get("vehicle", {})
    samsara_vid  = vehicle_data.get("id")
    location     = payload.get("location", {})

    vehicle = await _resolve_vehicle(samsara_vid, client_id)
    if not vehicle:
        return {"action": "vehicle_not_found"}

    new_status = "active" if event_type == "EngineOn" else "idle"
    await fleet_repo.update_vehicle_status(vehicle.id, new_status)

    lat = location.get("latitude")
    lng = location.get("longitude")
    if lat and lng:
        await fleet_repo.update_vehicle_gps(vehicle.id, lat, lng)

    await samsara_event_repo.create_event(
        client_id  = client_id,
        event_type = event_type,
        raw_payload= payload,
        vehicle_id = vehicle.id,
        lat        = lat,
        lng        = lng,
    )

    return {"action": "vehicle_status_updated", "status": new_status}


async def handle_driver_update(client_id: str, payload: dict) -> dict:
    """DriverCreated / DriverUpdated — log event (driver sync handled separately)."""
    event_type = payload.get("eventType", "DriverUpdated")
    await samsara_event_repo.create_event(
        client_id  = client_id,
        event_type = event_type,
        raw_payload= payload,
    )
    return {"action": "driver_event_logged"}


# ── Event router ──────────────────────────────────────────────────────────────

_HANDLERS = {
    "SpeedingEventStarted": handle_speeding,
    "SpeedingEventEnded":   handle_speeding,
    "SevereSpeedingEnded":  handle_speeding,
    "GeofenceEntry":        handle_geofence,
    "GeofenceExit":         handle_geofence,
    "AlertIncident":        handle_alert_incident,
    "EngineOn":             handle_engine,
    "EngineOff":            handle_engine,
    "DriverCreated":        handle_driver_update,
    "DriverUpdated":        handle_driver_update,
}


async def dispatch_event(client_id: str, payload: dict) -> dict:
    """
    Route a verified Samsara webhook payload to the correct handler.
    Unknown event types are logged and ignored (not an error — Samsara adds new types).
    """
    event_type = payload.get("eventType", "")
    handler    = _HANDLERS.get(event_type)

    if not handler:
        logger.info("Unhandled Samsara event type: %s", event_type)
        return {"action": "ignored", "event_type": event_type}

    try:
        return await handler(client_id, payload)
    except Exception:
        logger.exception("Error handling Samsara event %s", event_type)
        return {"action": "error", "event_type": event_type}
