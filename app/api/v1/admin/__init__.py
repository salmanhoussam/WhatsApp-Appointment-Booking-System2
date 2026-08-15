from fastapi import APIRouter, Depends
from app.core.tenant import get_authenticated_tenant
from . import properties, bookings, dashboard, units, settings, team, services, gallery, restaurant, store, catalog, upload, reservations, resources, barbers, client_services, fleet, content, media, catalog_services, provisioning

router = APIRouter()

# settings.py manages its own auth gate end-to-end, including the ADR-0002
# §9.1 Soft-Block allowlist ordering (allow_during_soft_block must run BEFORE
# any tenant/admin-user dependency in that route's own signature — see its
# docstring in app/core/tenant.py). A blanket router-level dependency runs
# BEFORE a route's own signature-declared Depends() regardless of declared
# order, which would break that ordering guarantee. Mounted directly, not
# wrapped by the floor below.
router.include_router(settings.router)         # mounts GET/PATCH /settings

# ── Mandatory floor for every other admin route ────────────────────────────
# Requires a real, valid JWT (Client-type or Admin-type — both already work
# identically for every existing legitimate flow, see
# .claudedocs/reviews/SECURITY-2026-07-30-admin-authorization-bypass.md).
# Closes the X-Tenant-Slug header / ?client_slug= query param / subdomain
# anonymous-access fallback for the admin surface. Fine-grained role
# authorization (require_roles(...)) stays exactly where it already is, per
# route — this only guarantees SOME authenticated identity exists first.
_protected = APIRouter(dependencies=[Depends(get_authenticated_tenant)])

_protected.include_router(properties.router,      prefix="/properties",      tags=["Admin Properties"])
_protected.include_router(bookings.router,         prefix="/bookings",        tags=["Admin Bookings"])
_protected.include_router(units.router)            # mounts /api/v1/admin/units           (prefix in router)
_protected.include_router(services.router)         # mounts /api/v1/admin/services        (prefix in router)
_protected.include_router(gallery.router)          # mounts /api/v1/admin/gallery         (prefix in router)
_protected.include_router(upload.router)           # mounts /api/v1/admin/upload          (prefix in router)
_protected.include_router(dashboard.router)        # mounts GET /dashboard
_protected.include_router(team.router)             # mounts GET/POST/DELETE /team
_protected.include_router(content.router)          # mounts /api/v1/admin/content         (prefix in router)
_protected.include_router(media.router)            # mounts /api/v1/admin/media           (prefix in router)
_protected.include_router(restaurant.router,       prefix="/restaurant",      tags=["Admin Restaurant"])
_protected.include_router(store.router,            prefix="/store",           tags=["Admin Store"])
_protected.include_router(catalog.router,          prefix="/catalog",         tags=["Admin Catalog"])
_protected.include_router(reservations.router,     prefix="/reservations",    tags=["Admin Reservations"])
_protected.include_router(resources.router)        # mounts /api/v1/admin/resources       (prefix in router)
_protected.include_router(barbers.router)          # mounts /api/v1/admin/barbers         (prefix in router)
_protected.include_router(catalog_services.router) # mounts /api/v1/admin/catalog-services (prefix in router)
_protected.include_router(provisioning.router)      # mounts /api/v1/admin/provisioning     (prefix in router)
_protected.include_router(client_services.router)  # mounts /api/v1/admin/client-services (prefix in router)
_protected.include_router(fleet.router)            # mounts /api/v1/admin/fleet           (prefix in router)

router.include_router(_protected)
