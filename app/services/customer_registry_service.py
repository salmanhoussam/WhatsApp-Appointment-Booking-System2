"""
Customer Registry Service — business logic for the tenant-wide Customer Registry.

Query-time aggregation only, no new Customer table (Salman's explicit decision, 2026-08-20:
"لن ننشئ جدول عملاء جديد الآن"). Merges Reservation (Services) and StoreOrder (Products) rows for
one tenant by phone number, the chosen primary identifier -- the only real "group by customer"
precedent anywhere in this codebase (reservation_service.list_my_clients(), STAFF-scoped) does the
same fetch-all-then-Python-dedupe shape, not a DB-level GROUP BY; this mirrors it, tenant-wide,
across both models.

No Prisma calls here -- all DB access via app/repositories/reservation_repo.py and
app/repositories/store_admin_repo.py.
"""

from app.db.client import prisma_client
from app.repositories.reservation_repo import ReservationRepository
import app.repositories.store_admin_repo as store_admin_repo

_NO_PHONE_KEY = "__no_phone__"


def _norm_phone(phone: str | None) -> str | None:
    normalized = (phone or "").strip()
    return normalized or None


def _bump_last(bucket: dict, at) -> None:
    if at is None:
        return
    if bucket["last_interaction_at"] is None or at > bucket["last_interaction_at"]:
        bucket["last_interaction_at"] = at


def _bucket_for(registry: dict, phone: str | None, name: str) -> dict:
    key = _norm_phone(phone) or _NO_PHONE_KEY
    if key not in registry:
        registry[key] = {
            "phone": _norm_phone(phone),  # None for the shared no-phone bucket
            # First-seen name wins if the same phone shows two different spellings across
            # reservations/orders -- a real, accepted limitation, not a silent smart-merge.
            "name": name,
            "has_reservations": False,
            "has_orders": False,
            "reservation_count": 0,
            "order_count": 0,
            "last_interaction_at": None,
            "reservations": [],
            "orders": [],
        }
    return registry[key]


async def list_customer_registry(client_id: str) -> list[dict]:
    reservation_repo = ReservationRepository(prisma_client)
    reservations = await reservation_repo.list_all_for_client_with_service(client_id)
    orders = await store_admin_repo.list_all_orders_with_items(client_id)

    registry: dict[str, dict] = {}

    for r in reservations:
        bucket = _bucket_for(registry, r.customerPhone, r.customerName)
        bucket["has_reservations"] = True
        bucket["reservation_count"] += 1
        bucket["reservations"].append({
            "id": r.id,
            "service_name_ar": r.service.nameAr if r.service else None,
            "reserved_at": r.reservedAt.isoformat() if r.reservedAt else None,
            "status": r.status,
        })
        _bump_last(bucket, r.reservedAt)

    for o in orders:
        # Every StoreOrder with no customerPhone (CheckoutIn.customer_phone is Optional) lands in
        # the ONE shared no-phone bucket -- never merged into a same-named phoned customer by
        # coincidence, never silently dropped.
        bucket = _bucket_for(registry, o.customerPhone, o.customerName)
        bucket["has_orders"] = True
        bucket["order_count"] += 1
        bucket["orders"].append({
            "id": o.id,
            "total_price": o.totalPrice,
            "status": o.status,
            "created_at": o.createdAt.isoformat() if o.createdAt else None,
            "items": [
                {
                    "name_ar": item.catalogItem.nameAr if item.catalogItem else None,
                    "quantity": item.quantity,
                    "unit_price": item.unitPrice,
                }
                for item in (o.items or [])
            ],
        })
        _bump_last(bucket, o.createdAt)

    result = []
    for key, bucket in registry.items():
        if bucket["has_reservations"] and bucket["has_orders"]:
            badge = "both"
        elif bucket["has_reservations"]:
            badge = "services_only"
        else:
            badge = "store_only"
        result.append({
            "phone": bucket["phone"],
            "name": bucket["name"],
            "badge": badge,
            "reservation_count": bucket["reservation_count"],
            "order_count": bucket["order_count"],
            "last_interaction_at": (
                bucket["last_interaction_at"].isoformat() if bucket["last_interaction_at"] else None
            ),
            "reservations": bucket["reservations"],
            "orders": bucket["orders"],
            "no_phone": key == _NO_PHONE_KEY,
        })

    result.sort(key=lambda c: c["last_interaction_at"] or "", reverse=True)
    return result
