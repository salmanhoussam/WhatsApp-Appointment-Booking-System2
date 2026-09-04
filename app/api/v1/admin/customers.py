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

from app.core.permissions import require_permission
from app.services import customer_registry_service

router = APIRouter()


@router.get("/")
async def list_customers(
    # Slice 3 (PHASE_2B_5_SLICE3_DESIGN.md §3). Legacy accounts are still checked against this
    # route's OWN existing tuple -- ("SUPER_ADMIN","TENANT_ADMIN"), unchanged, so
    # MANAGER_RESERVATIONS stays denied here exactly as before (I1). Permission-based accounts are
    # checked against customers.read.
    #
    # There is deliberately no customers.write: this file has no POST/PATCH/DELETE at all. The
    # registry is query-time aggregation over Reservation + StoreOrder merged by phone (no Customer
    # table, Salman's 2026-08-20 decision), so there is nothing to write and no permission to name.
    user=Depends(require_permission("customers.read", "SUPER_ADMIN", "TENANT_ADMIN")),
):
    data = await customer_registry_service.list_customer_registry(str(user.clientId))
    return {"success": True, "data": data}
