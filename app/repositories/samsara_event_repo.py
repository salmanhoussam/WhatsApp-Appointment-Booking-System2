"""
Samsara Event + Driver Alert + Driver Consent Repository.
CRUD only. No business logic.
"""

from datetime import datetime, timezone
from app.db.client import prisma_client


# ── Samsara Events ────────────────────────────────────────────────────────────

async def create_event(
    client_id: str,
    event_type: str,
    raw_payload: dict,
    vehicle_id: str | None = None,
    severity: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    speed: float | None = None,
    occurred_at: datetime | None = None,
):
    return await prisma_client.samsaraevent.create(
        data={
            "clientId":   client_id,
            "vehicleId":  vehicle_id,
            "eventType":  event_type,
            "severity":   severity,
            "lat":        lat,
            "lng":        lng,
            "speed":      speed,
            "rawPayload": raw_payload,
            "occurredAt": occurred_at or datetime.now(timezone.utc),
        }
    )


async def count_events_today(
    client_id: str,
    vehicle_id: str,
    event_type: str,
    since: datetime,
) -> int:
    return await prisma_client.samsaraevent.count(
        where={
            "clientId":  client_id,
            "vehicleId": vehicle_id,
            "eventType": event_type,
            "occurredAt": {"gte": since},
        }
    )


# ── Driver Alerts ─────────────────────────────────────────────────────────────

async def create_alert(
    client_id: str,
    driver_id: str,
    alert_type: str,
    message: str,
    severity: str = "warning",
):
    return await prisma_client.driveralert.create(
        data={
            "clientId": client_id,
            "driverId": driver_id,
            "type":     alert_type,
            "message":  message,
            "severity": severity,
        }
    )


async def get_unread_alerts(client_id: str, limit: int = 50):
    return await prisma_client.driveralert.find_many(
        where={"clientId": client_id, "isRead": False},
        include={"driver": True},
        order_by={"createdAt": "desc"},
        take=limit,
    )


async def get_unread_count(client_id: str) -> int:
    return await prisma_client.driveralert.count(
        where={"clientId": client_id, "isRead": False}
    )


async def mark_alert_read(alert_id: str, client_id: str) -> None:
    await prisma_client.driveralert.update_many(
        where={"id": alert_id, "clientId": client_id},
        data={"isRead": True},
    )


async def mark_whatsapp_sent(alert_id: str) -> None:
    await prisma_client.driveralert.update(
        where={"id": alert_id},
        data={"sentWhatsApp": True},
    )


# ── Driver Consent (DSGVO) ────────────────────────────────────────────────────

async def create_consent(
    client_id: str,
    driver_id: str,
    consent_type: str,
    signed_by: str,
    ip_address: str | None = None,
):
    return await prisma_client.driverconsent.create(
        data={
            "clientId":    client_id,
            "driverId":    driver_id,
            "consentType": consent_type,
            "signedBy":    signed_by,
            "ipAddress":   ip_address,
        }
    )


async def revoke_consent(client_id: str, driver_id: str, consent_type: str) -> None:
    await prisma_client.driverconsent.update_many(
        where={
            "clientId":    client_id,
            "driverId":    driver_id,
            "consentType": consent_type,
            "revokedAt":   None,
        },
        data={"revokedAt": datetime.now(timezone.utc)},
    )
