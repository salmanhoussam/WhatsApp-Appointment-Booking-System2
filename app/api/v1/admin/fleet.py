"""
Admin Fleet Routes — mounted at /api/v1/admin/fleet
JWT required (TENANT_ADMIN or higher).

GET  /fleet/dashboard          → aggregated fleet summary
GET  /fleet/vehicles           → list all vehicles with last GPS
GET  /fleet/alerts             → unread driver alerts
PATCH /fleet/alerts/{id}/read → mark alert as read
POST /fleet/trips/import       → upload Uber CSV for a vehicle
DELETE /fleet/drivers/{id}/data → DSGVO erasure (wipes GPS + personal data)
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Path

from app.core.tenant import get_current_tenant
from app.services import fleet_dashboard_service, uber_import_service
from app.repositories import fleet_repo, samsara_event_repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fleet", tags=["Admin Fleet"])


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_fleet_dashboard(tenant: dict = Depends(get_current_tenant)):
    """Returns the full fleet summary: vehicles, revenue, alerts, health score."""
    client_id = tenant["client_id"]
    return await fleet_dashboard_service.get_fleet_dashboard(client_id)


# ── Vehicles ──────────────────────────────────────────────────────────────────

@router.get("/vehicles")
async def list_vehicles(tenant: dict = Depends(get_current_tenant)):
    client_id = tenant["client_id"]
    vehicles  = await fleet_repo.get_all_vehicles(client_id)
    return {
        "success": True,
        "data": [
            {
                "id":          v.id,
                "plate":       v.plateNumber,
                "make":        v.make,
                "model":       v.model,
                "year":        v.year,
                "status":      v.status,
                "lat":         v.lastLat,
                "lng":         v.lastLng,
                "last_seen":   v.lastSeenAt.isoformat() if v.lastSeenAt else None,
                "driver":      v.driver.name if v.driver else None,
                "safety_score":v.driver.safetyScore if v.driver else None,
            }
            for v in vehicles
        ],
    }


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/alerts")
async def list_alerts(tenant: dict = Depends(get_current_tenant)):
    client_id = tenant["client_id"]
    alerts    = await samsara_event_repo.get_unread_alerts(client_id)
    return {
        "success": True,
        "data": [
            {
                "id":       a.id,
                "driver":   a.driver.name if a.driver else None,
                "type":     a.type,
                "message":  a.message,
                "severity": a.severity,
                "time":     a.createdAt.isoformat(),
            }
            for a in alerts
        ],
    }


@router.patch("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str = Path(...),
    tenant:   dict = Depends(get_current_tenant),
):
    client_id = tenant["client_id"]
    await samsara_event_repo.mark_alert_read(alert_id, client_id)
    return {"success": True}


# ── Trip Import (Uber CSV) ────────────────────────────────────────────────────

@router.post("/trips/import")
async def import_trips(
    vehicle_id: str       = Form(...),
    driver_id:  str | None= Form(None),
    file:       UploadFile = File(...),
    tenant:     dict       = Depends(get_current_tenant),
):
    """
    Upload a CSV exported from Uber Fleet Portal.
    vehicle_id: the FleetVehicle UUID in our DB.
    driver_id:  optional — links trips to a driver.
    """
    client_id = tenant["client_id"]

    # Verify vehicle belongs to this client
    vehicle = await fleet_repo.get_vehicle(vehicle_id, client_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Empty file")

    result = await uber_import_service.import_trips_from_csv(
        client_id  = client_id,
        vehicle_id = vehicle_id,
        driver_id  = driver_id,
        file_bytes = contents,
    )
    return {"success": True, "data": result}


# ── DSGVO Erasure ─────────────────────────────────────────────────────────────

@router.delete("/drivers/{driver_id}/data")
async def erase_driver_data(
    driver_id: str = Path(...),
    tenant:    dict = Depends(get_current_tenant),
):
    """
    DSGVO Right to Erasure (§17 DSGVO).
    Wipes all personal data for the driver: name, phone, GPS events, Uber token.
    Irreversible.
    """
    client_id = tenant["client_id"]
    await fleet_repo.delete_driver_data(client_id, driver_id)
    return {"success": True, "message": "Driver data erased"}
