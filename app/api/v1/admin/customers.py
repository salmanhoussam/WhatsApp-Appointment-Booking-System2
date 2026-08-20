"""
Admin Customer Registry API — /api/v1/admin/customers/

JWT required, TENANT_ADMIN-gated -- tenant-wide, deliberately distinct from the STAFF-scoped
GET /reservations/my-clients (app/api/v1/admin/reservations.py), which stays untouched. Query-time
aggregation only, no new Customer table (Salman's explicit decision, 2026-08-20). Merges
Reservation (Services) + StoreOrder (Products) rows by phone number, the chosen primary
identifier -- see app/services/customer_registry_service.py for the real merge logic.

No require_service(...) gate here on purpose -- this endpoint is meaningful for a
reservations-only, store-only, or both-capabilities tenant alike; gating it on one specific
capability would wrongly 403 a tenant that only has the other one active.
"""

from fastapi import APIRouter, Depends

from app.core.tenant import require_roles
from app.services import customer_registry_service

router = APIRouter()


@router.get("/")
async def list_customers(
    user=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    data = await customer_registry_service.list_customer_registry(str(user.clientId))
    return {"success": True, "data": data}
