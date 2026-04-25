from fastapi import APIRouter
from . import properties, bookings, dashboard, units, settings, team, services, gallery

router = APIRouter()

router.include_router(properties.router, prefix="/properties", tags=["Admin Properties"])
router.include_router(bookings.router,   prefix="/bookings",   tags=["Admin Bookings"])
router.include_router(units.router)      # mounts /api/v1/admin/units    (prefix in router)
router.include_router(services.router)   # mounts /api/v1/admin/services (prefix in router)
router.include_router(gallery.router)    # mounts /api/v1/admin/gallery  (prefix in router)
router.include_router(dashboard.router)  # mounts GET /dashboard
router.include_router(settings.router)   # mounts GET/PATCH /settings
router.include_router(team.router)       # mounts GET/POST/DELETE /team
