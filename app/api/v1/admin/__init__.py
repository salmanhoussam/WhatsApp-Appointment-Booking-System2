from fastapi import APIRouter
from . import properties, bookings, dashboard, units, settings, team, services, gallery, restaurant, store, catalog, upload, reservations, client_services

router = APIRouter()

router.include_router(properties.router,      prefix="/properties",      tags=["Admin Properties"])
router.include_router(bookings.router,         prefix="/bookings",        tags=["Admin Bookings"])
router.include_router(units.router)            # mounts /api/v1/admin/units           (prefix in router)
router.include_router(services.router)         # mounts /api/v1/admin/services        (prefix in router)
router.include_router(gallery.router)          # mounts /api/v1/admin/gallery         (prefix in router)
router.include_router(upload.router)           # mounts /api/v1/admin/upload          (prefix in router)
router.include_router(dashboard.router)        # mounts GET /dashboard
router.include_router(settings.router)         # mounts GET/PATCH /settings
router.include_router(team.router)             # mounts GET/POST/DELETE /team
router.include_router(restaurant.router,       prefix="/restaurant",      tags=["Admin Restaurant"])
router.include_router(store.router,            prefix="/store",           tags=["Admin Store"])
router.include_router(catalog.router,          prefix="/catalog",         tags=["Admin Catalog"])
router.include_router(reservations.router,     prefix="/reservations",    tags=["Admin Reservations"])
router.include_router(client_services.router)  # mounts /api/v1/admin/client-services (prefix in router)
