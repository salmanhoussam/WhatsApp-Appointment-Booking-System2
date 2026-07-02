"""
Samsara API adapter — HTTP client + webhook signature verification.
All communication with the Samsara REST API lives here.
Callers: samsara_service.py (business logic), fleet_repo.py (never calls this directly).

Samsara webhook signature format:
    X-Samsara-Signature: t=<unix_timestamp>,v0=<sha256_hex>
    Signed string: "{timestamp}.{raw_body}"
"""

import hashlib
import hmac
import os
import time
import logging

import httpx
from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)

SAMSARA_BASE_URL = "https://api.samsara.com"
_WEBHOOK_SECRET  = os.getenv("SAMSARA_WEBHOOK_SECRET", "")
_API_TOKEN       = os.getenv("SAMSARA_API_TOKEN", "")

_headers = lambda: {"Authorization": f"Bearer {_API_TOKEN}"}


# ── Webhook signature verification ────────────────────────────────────────────

async def verify_samsara_webhook(request: Request, raw_body: bytes) -> None:
    """
    Raise HTTP 403 if the Samsara webhook signature is invalid or replayed.
    Must be called BEFORE reading the body as JSON.
    """
    sig_header = request.headers.get("X-Samsara-Signature", "")
    if not sig_header:
        raise HTTPException(403, "Missing X-Samsara-Signature header")

    # Parse "t=1234567890,v0=abcdef..."
    parsed: dict[str, str] = {}
    for part in sig_header.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            parsed[k.strip()] = v.strip()

    timestamp = parsed.get("t")
    sig_hash  = parsed.get("v0")
    if not timestamp or not sig_hash:
        raise HTTPException(403, "Malformed X-Samsara-Signature header")

    # Replay attack guard: reject if older than 5 minutes
    try:
        age = abs(time.time() - int(timestamp))
    except ValueError:
        raise HTTPException(403, "Invalid timestamp in signature")
    if age > 300:
        raise HTTPException(403, "Webhook timestamp too old (replay protection)")

    # Build signed string and compare
    signed_payload = f"{timestamp}.{raw_body.decode('utf-8')}".encode()
    expected = hmac.new(
        _WEBHOOK_SECRET.encode(), signed_payload, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, sig_hash):
        raise HTTPException(403, "Webhook signature mismatch")


# ── REST API helpers ──────────────────────────────────────────────────────────

async def get_vehicles() -> list[dict]:
    """List all vehicles in the fleet account."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SAMSARA_BASE_URL}/fleet/vehicles",
            headers=_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("data", [])


async def get_vehicle_stats(vehicle_id: str) -> dict:
    """Fetch latest GPS, fuel level, and engine status for one vehicle."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SAMSARA_BASE_URL}/fleet/vehicles/stats",
            headers=_headers(),
            params={"vehicleIds": vehicle_id, "types": "gps,fuelPercents,engineStates"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])
        return data[0] if data else {}


async def get_driver_safety_score(driver_id: str, start_ms: int, end_ms: int) -> dict:
    """Fetch Samsara safety score for a driver over a time range."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SAMSARA_BASE_URL}/fleet/safety/driver-stats",
            headers=_headers(),
            params={"driverId": driver_id, "startMs": start_ms, "endMs": end_ms},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("driverSafetyScore", {})


async def get_drivers() -> list[dict]:
    """List all drivers in the fleet account."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SAMSARA_BASE_URL}/fleet/drivers",
            headers=_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("data", [])


async def register_webhook(endpoint_url: str, event_types: list[str]) -> dict:
    """
    Register a webhook endpoint in Samsara for the given event types.
    Must be called once per customer when onboarding a new fleet tenant.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SAMSARA_BASE_URL}/webhooks",
            headers=_headers(),
            json={"name": "VicaleFleet", "url": endpoint_url, "eventTypes": event_types},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
