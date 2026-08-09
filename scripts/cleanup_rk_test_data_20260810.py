"""
One-time cleanup: delete the 42 confirmed-safe test/QA rows from rk's real data before its
2026-08-31 production launch, per Salman's explicit approval on the deletion review
(.claudedocs/work/production-data-hygiene/2026-08-10/deletion-review.md).

Explicit ID lists only -- never a pattern/LIKE delete. The 7 uncertain Reservation rows are
listed too, but ONLY for verification that they remain untouched; never included in any delete.

Every delete is scoped by both id AND clientId (defense in depth, matches this project's own
multi-tenancy discipline even though these are already-verified globally-unique UUIDs). Runs
inside a single transaction -- either all 42 deletes succeed or none do.

Usage: venv/bin/python3 scripts/cleanup_rk_test_data_20260810.py
"""

import asyncio
import sys

sys.path.insert(0, "/home/musicmaster/Downloads/WhatsApp-Appointment-Booking-System2-main")
from prisma import Prisma

CLIENT_ID = "7ef5c8c9-3d47-4aa9-b5e0-43b746ee2657"  # rk, RK Barber Shop

BARBER_IDS = [
    "0d87ed78-c8a4-44a3-beee-cac2c4eb7b88",  # Test Staff 1786124916
    "ba5033de-b478-4d25-a7f4-e702968b0ee2",  # Test Staff NetCheck 1786131600
    "87d6c11a-fe22-4d08-8ead-22ef0e0138e5",  # Regression Check Barber
]

CATALOG_SERVICE_IDS = [
    "eaaabf7c-efd5-42d2-be32-e33ce3f098a5",  # خدمة اختبار المتصفح
    "867e7a28-cdcf-4025-b422-3537f82c5ed5",  # خدمة تحقق نهائي
]

STORE_ORDER_IDS = [
    "c8ba498e-dd6e-4a61-9ee9-03d01f19bcd0",
    "966b0cc5-ae37-40e3-851c-cb57b13e18c2",
    "744566b9-bed9-4525-ae0e-b48806e0bb55",
    "0daaba62-8c2b-43a4-9f71-c2826ac2f95d",
    "84ff956a-0dd0-4abb-9580-e801b471c4ae",
]

RESERVATION_IDS = [
    "895e49a2-12e6-44ac-a026-c7c14f7e7617", "15c4f1fd-faa8-414b-8de3-d2833f334f74",
    "ebabb2a0-7332-48a5-9295-9c9b2c5b5b59", "b43098be-f6e0-482b-8da9-7d05428d7b4e",
    "35963527-f834-4a6f-bb54-8ba8a305b5f9", "c29a9ef5-2b7c-4fa0-a692-8136d8ba732f",
    "f62baecb-f8ad-471e-bf70-343be15f44e1", "a8bda88f-3880-43ce-b900-79507ac7a361",
    "9865fad1-6192-4684-afbc-ef78870b416d", "00c93dd0-4e79-4d1c-9c72-a0ee81937ccc",
    "c237bf16-6310-48c5-8138-568f7cbcc620", "ec20df7e-a9f8-4e05-9aeb-6dc1b630c8c4",
    "abc22337-c712-4938-9b01-e52e5939026e", "9f95968c-6b03-4990-9458-8e15d986e4a7",
    "e4ab87b1-224f-4016-869e-f01012f7176a", "2a2612bb-aa66-4619-b493-ae90e7dabd21",
    "f97bf576-b186-4327-9049-ffc4a9163f05", "fa480c8a-8b03-4bcb-9ce8-9558b9c80760",
    "66a3e85d-fae5-4452-9d95-773de966f8ff", "215dd50b-7f02-4709-8efc-06c996277ec0",
    "6268e2e7-d2ff-49b1-86ae-befb0de70f76", "9aa6c103-dcb5-402e-98c8-0d8ba45a0d0e",
    "c9f34665-c783-4b93-ad8d-f5b0f5d981c6", "bec27e28-d0c5-4fa0-adaa-a7b9360d14a1",
    "54478f5c-af76-4888-ba00-e43b6dc52279", "c91bee72-6093-40ea-8af7-23a14f8afafb",
    "5ed06d0a-1ac1-4b3e-aae8-f17f850d5573", "97d39b6b-3835-4783-9397-a1f43c748178",
    "796bfe3c-168c-4f4b-9b05-a9824ec31f72", "fedf7a5e-5f5a-40e3-b35e-9978150edf1d",
    "67c0efe9-64fb-479f-a519-f5043f2ca1ee", "1f57f5ff-af5a-4011-b84f-acaaf9b9899f",
]

# NEVER deleted -- listed only so this script can positively verify they're untouched.
UNCERTAIN_RESERVATION_IDS = [
    "7bc899e1-2dc3-4289-93bb-4792f1b46098", "63c0f3c5-8862-4c4c-8c17-13d68e56e759",
    "1cc82257-b37e-4236-a9d2-a4dbab4fbd9c", "2b8c74f2-2df1-4a88-8742-348c29ccf402",
    "0ba470a6-e36e-4587-bada-60f006b94396", "391568ee-d3d5-47b1-8419-da5615af7c0e",
    "a08640be-3b9e-46dc-a382-103ed82c1377",
]

assert len(BARBER_IDS) == 3
assert len(CATALOG_SERVICE_IDS) == 2
assert len(STORE_ORDER_IDS) == 5
assert len(RESERVATION_IDS) == 32
assert len(UNCERTAIN_RESERVATION_IDS) == 7
assert len(BARBER_IDS) + len(CATALOG_SERVICE_IDS) + len(STORE_ORDER_IDS) + len(RESERVATION_IDS) == 42


def row_fingerprint(row) -> tuple:
    """A comparable snapshot of a row's mutable-ish fields, for exact before/after equality
    checks on the 7 uncertain rows and on every non-deleted row."""
    d = row.dict()
    d.pop("updatedAt", None)  # not expected to change, but not the signal we care about either
    return tuple(sorted(d.items(), key=lambda kv: kv[0]))


async def main():
    db = Prisma()
    await db.connect()

    print("=" * 70)
    print("STEP 1 -- Final pre-delete re-verification")
    print("=" * 70)

    # Re-confirm every one of the 42 IDs still exists and still belongs to rk.
    barbers = await db.barber.find_many(where={"id": {"in": BARBER_IDS}, "clientId": CLIENT_ID})
    services = await db.catalogservice.find_many(where={"id": {"in": CATALOG_SERVICE_IDS}, "clientId": CLIENT_ID})
    orders = await db.storeorder.find_many(where={"id": {"in": STORE_ORDER_IDS}, "clientId": CLIENT_ID})
    reservations = await db.reservation.find_many(where={"id": {"in": RESERVATION_IDS}, "clientId": CLIENT_ID})

    assert len(barbers) == 3, f"Expected 3 barbers, found {len(barbers)} -- ABORTING"
    assert len(services) == 2, f"Expected 2 services, found {len(services)} -- ABORTING"
    assert len(orders) == 5, f"Expected 5 orders, found {len(orders)} -- ABORTING"
    assert len(reservations) == 32, f"Expected 32 reservations, found {len(reservations)} -- ABORTING"
    print(f"OK: all 42 target rows re-confirmed present (3 barbers, 2 services, 5 orders, 32 reservations)")

    # Re-confirm the cascading-effects check: zero reservations reference the 3 test barbers or
    # 2 test services (re-run fresh, not trusting the earlier investigation's cached result).
    ref_by_barber = await db.reservation.find_many(where={"clientId": CLIENT_ID, "barberId": {"in": BARBER_IDS}})
    ref_by_service = await db.reservation.find_many(where={"clientId": CLIENT_ID, "serviceId": {"in": CATALOG_SERVICE_IDS}})
    assert len(ref_by_barber) == 0, f"FOUND {len(ref_by_barber)} reservations referencing a test barber -- ABORTING"
    assert len(ref_by_service) == 0, f"FOUND {len(ref_by_service)} reservations referencing a test service -- ABORTING"
    print("OK: re-confirmed zero reservations reference any of the 3 test barbers or 2 test services")

    print()
    print("=" * 70)
    print("STEP 2 -- Pre-delete snapshot")
    print("=" * 70)

    pre_barber_count = await db.barber.count(where={"clientId": CLIENT_ID})
    pre_service_count = await db.catalogservice.count(where={"clientId": CLIENT_ID})
    pre_order_count = await db.storeorder.count(where={"clientId": CLIENT_ID})
    pre_reservation_count = await db.reservation.count(where={"clientId": CLIENT_ID})
    pre_orderitem_count = await db.storeorderitem.count(where={"order": {"is": {"clientId": CLIENT_ID}}})
    print(f"Pre-delete counts (clientId={CLIENT_ID}):")
    print(f"  Barber={pre_barber_count}  CatalogService={pre_service_count}  StoreOrder={pre_order_count}"
          f"  StoreOrderItem={pre_orderitem_count}  Reservation={pre_reservation_count}")

    # Full fingerprint of every row that must remain byte-identical: the 7 uncertain reservations,
    # plus every barber/service/order/reservation NOT in a deletion list.
    uncertain_before = await db.reservation.find_many(where={"id": {"in": UNCERTAIN_RESERVATION_IDS}})
    assert len(uncertain_before) == 7, f"Expected 7 uncertain rows present, found {len(uncertain_before)} -- ABORTING"
    uncertain_fingerprints_before = {r.id: row_fingerprint(r) for r in uncertain_before}

    all_barbers_before = await db.barber.find_many(where={"clientId": CLIENT_ID})
    all_services_before = await db.catalogservice.find_many(where={"clientId": CLIENT_ID})
    all_orders_before = await db.storeorder.find_many(where={"clientId": CLIENT_ID})
    all_reservations_before = await db.reservation.find_many(where={"clientId": CLIENT_ID})

    untouched_barbers_before = {r.id: row_fingerprint(r) for r in all_barbers_before if r.id not in BARBER_IDS}
    untouched_services_before = {r.id: row_fingerprint(r) for r in all_services_before if r.id not in CATALOG_SERVICE_IDS}
    untouched_orders_before = {r.id: row_fingerprint(r) for r in all_orders_before if r.id not in STORE_ORDER_IDS}
    untouched_reservations_before = {
        r.id: row_fingerprint(r) for r in all_reservations_before
        if r.id not in RESERVATION_IDS
    }
    print(f"Fingerprinted {len(untouched_barbers_before)} untouched barbers, "
          f"{len(untouched_services_before)} untouched services, "
          f"{len(untouched_orders_before)} untouched orders, "
          f"{len(untouched_reservations_before)} untouched reservations (includes the 7 uncertain)")

    print()
    print("=" * 70)
    print("STEP 3 -- Delete (single transaction, children first)")
    print("=" * 70)

    async with db.tx(timeout=30000) as tx:
        del_reservations = await tx.reservation.delete_many(
            where={"id": {"in": RESERVATION_IDS}, "clientId": CLIENT_ID}
        )
        del_barbers = await tx.barber.delete_many(
            where={"id": {"in": BARBER_IDS}, "clientId": CLIENT_ID}
        )
        del_services = await tx.catalogservice.delete_many(
            where={"id": {"in": CATALOG_SERVICE_IDS}, "clientId": CLIENT_ID}
        )
        del_orders = await tx.storeorder.delete_many(
            where={"id": {"in": STORE_ORDER_IDS}, "clientId": CLIENT_ID}
        )

    print(f"Deleted: {del_reservations} reservations, {del_barbers} barbers, "
          f"{del_services} services, {del_orders} orders")
    total_deleted = del_reservations + del_barbers + del_services + del_orders
    assert total_deleted == 42, f"Expected exactly 42 rows deleted, got {total_deleted} -- INVESTIGATE IMMEDIATELY"
    print(f"OK: exactly 42 rows deleted")

    print()
    print("=" * 70)
    print("STEP 4 -- Post-delete verification")
    print("=" * 70)

    post_barber_count = await db.barber.count(where={"clientId": CLIENT_ID})
    post_service_count = await db.catalogservice.count(where={"clientId": CLIENT_ID})
    post_order_count = await db.storeorder.count(where={"clientId": CLIENT_ID})
    post_reservation_count = await db.reservation.count(where={"clientId": CLIENT_ID})
    post_orderitem_count = await db.storeorderitem.count(where={"order": {"is": {"clientId": CLIENT_ID}}})
    print(f"Post-delete counts: Barber={post_barber_count}  CatalogService={post_service_count}  "
          f"StoreOrder={post_order_count}  StoreOrderItem={post_orderitem_count}  "
          f"Reservation={post_reservation_count}")

    assert post_barber_count == pre_barber_count - 3
    assert post_service_count == pre_service_count - 2
    assert post_order_count == pre_order_count - 5
    assert post_reservation_count == pre_reservation_count - 32
    assert post_orderitem_count == 0, f"Expected 0 StoreOrderItem left (cascade), found {post_orderitem_count}"
    print("OK: every table's count dropped by exactly the expected amount; StoreOrderItem cascade confirmed (0 left)")

    # 7 uncertain rows: must still exist, byte-identical.
    uncertain_after = await db.reservation.find_many(where={"id": {"in": UNCERTAIN_RESERVATION_IDS}})
    assert len(uncertain_after) == 7, f"UNCERTAIN ROWS MISSING: expected 7, found {len(uncertain_after)}"
    for r in uncertain_after:
        assert row_fingerprint(r) == uncertain_fingerprints_before[r.id], f"UNCERTAIN ROW {r.id} CHANGED"
    print("OK: all 7 uncertain reservations still present and byte-identical to their pre-delete state")

    # Everything else: must still exist, byte-identical.
    all_barbers_after = {r.id: row_fingerprint(r) for r in await db.barber.find_many(where={"clientId": CLIENT_ID})}
    all_services_after = {r.id: row_fingerprint(r) for r in await db.catalogservice.find_many(where={"clientId": CLIENT_ID})}
    all_orders_after = {r.id: row_fingerprint(r) for r in await db.storeorder.find_many(where={"clientId": CLIENT_ID})}
    all_reservations_after = {r.id: row_fingerprint(r) for r in await db.reservation.find_many(where={"clientId": CLIENT_ID})}

    assert all_barbers_after == untouched_barbers_before, "UNTOUCHED BARBER ROWS CHANGED -- INVESTIGATE"
    assert all_services_after == untouched_services_before, "UNTOUCHED SERVICE ROWS CHANGED -- INVESTIGATE"
    assert all_orders_after == untouched_orders_before, "UNTOUCHED ORDER ROWS CHANGED -- INVESTIGATE"
    assert all_reservations_after == untouched_reservations_before, "UNTOUCHED RESERVATION ROWS CHANGED -- INVESTIGATE"
    print("OK: every non-deleted row in all 4 tables is byte-identical to its pre-delete state")

    print()
    print("ALL CHECKS PASSED.")
    print(f"Deleted IDs -- Barber: {BARBER_IDS}")
    print(f"Deleted IDs -- CatalogService: {CATALOG_SERVICE_IDS}")
    print(f"Deleted IDs -- StoreOrder: {STORE_ORDER_IDS}")
    print(f"Deleted IDs -- Reservation ({len(RESERVATION_IDS)}): {RESERVATION_IDS}")

    await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
