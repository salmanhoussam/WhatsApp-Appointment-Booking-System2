"""
Put Salman's real name in the records, and take my diagnostic label out.

SALMAN'S INSTRUCTION (2026-09-12): *"استخدموا Salman Houssam كاسم صاحب القرار في السجلات، وليس
'Salman — A2 check' أو أي label تشخيصي."*

WHY THIS IS MY MESS. Creating a test reservation at 01:40 with customer_name="سلمان — فحص A2"
went through the Customer find-or-create, so the label became his STORED identity at
`barberlab-test` — and the bot then greeted him with it: "أهلاً بعودتك سلمان — فحص A2". A
diagnostic string leaked into a real customer record because I used a real phone number with a
throwaway name.

WHAT IS CHANGED, and what deliberately is not:

  Customer rows            UPDATED — this is the live identity the bot reads and greets by.
  barberlab-test snapshots UPDATED — Reservation.customerName is a frozen snapshot by design,
                           but these two rows are MY test data on a test tenant carrying MY
                           label; freezing a diagnostic label is not what that design protects.
  rk / mr-h snapshots      LEFT ALONE — 'حسام سلمان', 'Adel', 'ابو سلو' and 'houssam salman' are
                           real things real people typed at booking time on LIVE tenants. The
                           schema's own comment says these are "the permanent historical snapshot
                           at booking time (never rewritten if the Customer's own info changes
                           later)", and that is exactly right. They are listed by
                           scripts/… audits as test DATA to decide on, which is a separate
                           question from a name.

    Dry run (default — reads only):
        venv/bin/python scripts/fix_salman_customer_name.py
    Apply:
        venv/bin/python scripts/fix_salman_customer_name.py --apply
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import scripts._db_target as db_target                       # noqa: E402

os.environ["DATABASE_URL"] = db_target.resolve(direct=True)

from prisma import Prisma                                    # noqa: E402

SALMAN_PHONE = "96178727986"
REAL_NAME    = "Salman Houssam"

# Only these two tenants' Customer rows, and only reservation snapshots on the TEST tenant.
CUSTOMER_TENANTS   = ("barberlab-test", "rk")
SNAPSHOT_TENANTS   = ("barberlab-test",)

APPLY = "--apply" in sys.argv


async def main() -> int:
    db = Prisma()
    await db.connect()
    try:
        slugs = {c.id: c.slug for c in await db.client.find_many()}
        by_slug = {v: k for k, v in slugs.items()}

        customers = [
            c for c in await db.customer.find_many(where={"phone": SALMAN_PHONE})
            if slugs.get(c.clientId) in CUSTOMER_TENANTS and c.name != REAL_NAME
        ]
        snapshots = [
            r for r in await db.reservation.find_many(where={"customerPhone": SALMAN_PHONE})
            if slugs.get(r.clientId) in SNAPSHOT_TENANTS and r.customerName != REAL_NAME
        ]

        print("Customer rows (the live identity the bot greets by):")
        for c in customers:
            print(f"  {slugs.get(c.clientId):<16}{c.name!r:<26} -> {REAL_NAME!r}")
        if not customers:
            print("  (nothing to change)")

        print("\nReservation snapshots on the TEST tenant only:")
        for r in snapshots:
            print(f"  {slugs.get(r.clientId):<16}{r.customerName!r:<26} -> {REAL_NAME!r}"
                  f"   id={r.id[:8]}")
        if not snapshots:
            print("  (nothing to change)")

        print("\nDeliberately NOT touched — real names on live tenants, frozen by design:")
        for r in await db.reservation.find_many(where={"customerPhone": SALMAN_PHONE}):
            if slugs.get(r.clientId) not in SNAPSHOT_TENANTS:
                print(f"  {slugs.get(r.clientId):<16}{r.customerName!r:<26}id={r.id[:8]}")

        if not APPLY:
            print(f"\nDRY RUN — {len(customers)} customer + {len(snapshots)} snapshot row(s) "
                  f"would change. Re-run with --apply.")
            return 0

        for c in customers:
            await db.customer.update(where={"id": c.id}, data={"name": REAL_NAME})
            print(f"  ✅ customer {slugs.get(c.clientId)} -> {REAL_NAME!r}")
        for r in snapshots:
            await db.reservation.update(where={"id": r.id}, data={"customerName": REAL_NAME})
            print(f"  ✅ snapshot {r.id[:8]} -> {REAL_NAME!r}")

        print("\nVerifying by reading back:")
        ok = True
        for slug in CUSTOMER_TENANTS:
            cid = by_slug.get(slug)
            row = await db.customer.find_first(where={"clientId": cid, "phone": SALMAN_PHONE})
            if row:
                good = row.name == REAL_NAME
                ok &= good
                print(f"  {'OK  ' if good else 'FAIL'} customer {slug}: {row.name!r}")
        for r in snapshots:
            row = await db.reservation.find_unique(where={"id": r.id})
            good = row and row.customerName == REAL_NAME
            ok &= bool(good)
            shown = repr(row.customerName) if row else "<missing>"
            print(f"  {'OK  ' if good else 'FAIL'} snapshot {r.id[:8]}: {shown}")
        return 0 if ok else 1
    finally:
        await db.disconnect()


if __name__ == "__main__":
    print(f"fix_salman_customer_name — {'APPLY' if APPLY else 'DRY RUN'}\n")
    sys.exit(asyncio.run(main()))
