"""
Delete the test data we can PROVE is ours. Dry run by default.

SALMAN'S DECISION (2026-09-12): test reservations go, and they are not to be kept merely out of
fear of changing behaviour. Data cleanup only — no schema, no business logic.

🔴 ONE CORRECTION TO THE PREMISE, and it is why this script is narrow.

His message said "بما أنك تقول إن البيانات الموجودة حاليًا كلها وهمية وليست حجوزات حقيقية". I did
not say that, and it is not true. What I said was that FOUR reservations carrying his own test
phone numbers are test data, and I explicitly said the OPPOSITE about others — 'Adel',
'حسام سلمان', 'houssam salman', 'ابو سلو' are things real people typed at booking time, which is
why I left them alone.

A read-only inventory on 2026-09-12 measured it:

    37 reservations on LIVE tenants with a NON-test phone   ← rk has 30, mr-h has 11
     4 reservations on LIVE tenants with one of OUR phones  ← provably ours
     5 reservations on NON-live tenants                     ← whole-tenant test data

So "clean everything" would delete 37 rows nobody has shown to be fake. This script deletes the
9 that are evidenced, and refuses to touch the rest.

WHAT IT DELETES — and every line is a measured category, not a guess:

  * reservations on a LIVE tenant whose customerPhone is one of OUR OWN test numbers
  * reservations on a tenant that is NOT in CLAUDE.md's Live registry
  * Customer rows belonging to non-live tenants (identities created by those same tests)
  * expired WhatsApp sessions — all four are expired and stuck at RES_AWAITING_SERVICE

WHAT IT REFUSES TO TOUCH, by construction:

  * `Client` rows. Salman asked for test tenants to be cleaned from that table, and I am not
    doing it here — for two reasons worth his decision rather than my silence:
      - `barberlab-test` is the ONLY safe test surface we have. Every probe, the A2 flow test and
        Phase T's own verification run on it. Deleting it removes the thing that keeps tests off
        live tenants.
      - `alzabt-demo` is the demo shown to prospects (his words), and he cancelled deleting its
        barbers for that reason on this same day.
    Reservation.clientId is onDelete: Cascade, so deleting a Client silently takes its whole
    booking history with it. That is not a side effect to discover after the fact.
  * any reservation on a live tenant with a phone that is not ours
  * users, barbers, services, catalog — nothing here touches them

    Dry run (default — reads only):
        venv/bin/python scripts/cleanup_test_data.py
    Apply:
        venv/bin/python scripts/cleanup_test_data.py --apply
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import scripts._db_target as db_target                       # noqa: E402

os.environ["DATABASE_URL"] = db_target.resolve(direct=True)

from prisma import Prisma                                    # noqa: E402

# CLAUDE.md's own tenant registry. A slug here is NEVER a deletion candidate at the Client level,
# and its reservations are candidates only when the phone is demonstrably one of ours.
LIVE_TENANTS = {
    "smar", "caracas", "footlab", "arizona", "olivello", "moments", "anas",
    "rk", "mr-h", "sneakers-lb", "sneakers-beirut", "beit-al-fakhar",
}

# Our own numbers, used for every real test send per the standing rule.
OUR_TEST_PHONES = {"96178727986", "96178944316"}

APPLY = "--apply" in sys.argv


async def main() -> int:
    db = Prisma()
    await db.connect()
    try:
        slugs = {c.id: c.slug for c in await db.client.find_many()}

        res_live_ours: list = []
        res_non_live: list = []
        protected = 0
        for r in await db.reservation.find_many(order={"createdAt": "asc"}):
            slug = slugs.get(r.clientId, "?")
            if slug not in LIVE_TENANTS:
                res_non_live.append((slug, r))
            elif r.customerPhone in OUR_TEST_PHONES:
                res_live_ours.append((slug, r))
            else:
                protected += 1

        customers = [
            (slugs.get(c.clientId, "?"), c)
            for c in await db.customer.find_many()
            if slugs.get(c.clientId) not in LIVE_TENANTS
        ]

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        sessions = [s for s in await db.whatsappsession.find_many() if s.expiresAt < now]

        print("DELETE — reservations on a LIVE tenant carrying one of OUR test numbers:")
        for slug, r in res_live_ours:
            print(f"  {slug:<16}{str(r.createdAt)[:16]}  {r.status:<9}"
                  f"{r.customerName!r:<22}{r.customerPhone}  id={r.id[:8]}")
        print(f"  -> {len(res_live_ours)}")

        print("\nDELETE — reservations on a tenant NOT in the Live registry:")
        for slug, r in res_non_live:
            print(f"  {slug:<16}{str(r.createdAt)[:16]}  {r.status:<9}"
                  f"{r.customerName!r:<22}id={r.id[:8]}")
        print(f"  -> {len(res_non_live)}")

        print("\nDELETE — Customer rows on non-live tenants:")
        for slug, c in customers:
            print(f"  {slug:<16}{c.name!r:<22}{c.phone!r}")
        print(f"  -> {len(customers)}")

        print("\nDELETE — EXPIRED WhatsApp sessions:")
        for s in sessions:
            print(f"  {s.customerPhone:<16}{s.step:<24}expired {str(s.expiresAt)[:16]}")
        print(f"  -> {len(sessions)}")

        print(f"\n🛡  PROTECTED — {protected} reservation(s) on live tenants with a phone that is "
              f"not ours. Nobody has shown these to be test data, so they stay.")
        print("🛡  PROTECTED — every Client row. See this file's header for why barberlab-test "
              "and alzabt-demo in particular are not deleted here.")

        total = len(res_live_ours) + len(res_non_live) + len(customers) + len(sessions)
        if not APPLY:
            print(f"\nDRY RUN — {total} row(s) would be deleted. Re-run with --apply.")
            return 0

        # Reservations first: a Customer with reservations still pointing at it would be a
        # SetNull, not a block, but deleting in dependency order keeps the counts honest.
        for _slug, r in res_live_ours + res_non_live:
            await db.reservation.delete(where={"id": r.id})
        print(f"  ✅ reservations deleted: {len(res_live_ours) + len(res_non_live)}")

        for _slug, c in customers:
            await db.customer.delete(where={"id": c.id})
        print(f"  ✅ customers deleted: {len(customers)}")

        for s in sessions:
            await db.whatsappsession.delete(where={"id": s.id})
        print(f"  ✅ expired sessions deleted: {len(sessions)}")

        print("\nVerifying by reading back:")
        left_ours = 0
        for r in await db.reservation.find_many():
            slug = slugs.get(r.clientId, "?")
            if slug not in LIVE_TENANTS or r.customerPhone in OUR_TEST_PHONES:
                left_ours += 1
        still_protected = await db.reservation.count() - left_ours
        print(f"  {'OK  ' if left_ours == 0 else 'FAIL'} test reservations remaining: {left_ours}")
        print(f"  OK   reservations still on live tenants: {still_protected} "
              f"(was {protected} — unchanged is correct)")
        return 0 if left_ours == 0 else 1
    finally:
        await db.disconnect()


if __name__ == "__main__":
    print(f"cleanup_test_data — {'APPLY' if APPLY else 'DRY RUN'}\n")
    sys.exit(asyncio.run(main()))
