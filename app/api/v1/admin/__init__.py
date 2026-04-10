from fastapi import APIRouter
from . import properties, bookings, dashboard

router = APIRouter()

router.include_router(properties.router, prefix="/properties", tags=["Admin Properties"])
router.include_router(bookings.router,   prefix="/bookings",   tags=["Admin Bookings"])
router.include_router(dashboard.router)  # mounts GET /dashboard at /api/v1/admin/dashboard
