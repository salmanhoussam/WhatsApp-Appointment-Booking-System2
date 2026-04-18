from fastapi import APIRouter
from . import properties, bookings, dashboard, units, settings, team

router = APIRouter()

router.include_router(properties.router, prefix="/properties", tags=["Admin Properties"])
router.include_router(bookings.router,   prefix="/bookings",   tags=["Admin Bookings"])
router.include_router(units.router)      # mounts /api/v1/admin/units (prefix defined in router)
router.include_router(dashboard.router)  # mounts GET /dashboard at /api/v1/admin/dashboard
router.include_router(settings.router)   # mounts GET/PATCH /settings at /api/v1/admin/settings
router.include_router(team.router)       # mounts GET/POST/DELETE /team at /api/v1/admin/team
