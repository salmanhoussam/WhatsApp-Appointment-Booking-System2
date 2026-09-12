"""
Set the operational WhatsApp phone for the three real barbers.

WHY THIS EXISTS. A2-b resolves a barber action's actor from the inbound sender number
(`barber_repo.find_active_barber_by_phones`). A read-only audit on 2026-09-12 found **all 8**
Barber rows carry `phone = NULL`, so that resolution can never succeed today and every tap would
be refused as `sender_not_staff`. This fills in the three real people's numbers; nothing else.

SALMAN'S INSTRUCTION (2026-09-12): the earlier "delete every barber except three" plan is
**cancelled**. All eight rows stay, alzabt-demo's included. Nothing here deletes or deactivates.

THE NUMBERS BELOW ARE REAL, and were taken from `users` (Salman, 2026-09-12) rather than
retyped — a read-only audit of that table is what they were verified against, and it caught a
transcription error that would have made the fix silently useless:

    جعفر  96170764479   confirmed: users.phone on jaafar@rk.salmansaas.com
    حسين  96176985477   confirmed: users.phone on rkbarber@dev.invalid
    Ali   96171455767   DERIVED. The number given was "961455767" — nine digits, which matched
                        ZERO user rows. The real stored value is `71455767` on
                        admin@ali-barber.local at mr-h: a leading 7 had been dropped.
                        normalize_for_storage("71455767") -> "96171455767".

Two things that audit found, recorded because they are real and neither is fixed here:
  * `71455767` is stored WITHOUT its country code on a TENANT_ADMIN account — the exact defect
    class of the جعفر incident, on a live account. Not touched: this script writes `barbers`, and
    fixing `users.phone` is a separate decision with its own blast radius.
  * حسين's and Ali's User rows are NOT linked to their Barber rows (`User.barberId` is NULL), so
    `reservation_service`'s staff recipient lookup (`find_user_by_barber_id`) finds nothing for
    them. A2-b does not need that link — it resolves by `Barber.phone`, which is what this fills —
    but the staff alert does.

WHY slug + name AND NOT AN ID. Barber ids are uuids nobody can eyeball; a wrong one writes to the
wrong person silently. `(slug, name)` is verifiable by reading this file, and the script REFUSES
unless each pair matches exactly one row — so an ambiguity stops it instead of being guessed past.
Note the two tenants: Ali is at `mr-h`, not `rk`. That is real, and was a measured surprise.

PHONES ARE NORMALISED, NOT TRUSTED. Whatever gets typed below goes through
`normalize_for_storage` — the Phone Numbers rule's single write-side guarantee
(`.claude/rules/phone-numbers.md`). So `+961 70 111 222`, `070111222` and `96170111222` all store
identically, and a typed `+` never reaches the column.

    Dry run (default — reads only, writes nothing):
        venv/bin/python scripts/set_barber_phones.py
    Apply:
        venv/bin/python scripts/set_barber_phones.py --apply
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import scripts._db_target as db_target                       # noqa: E402
from app.core.phone import normalize_for_storage             # noqa: E402

os.environ["DATABASE_URL"] = db_target.resolve(direct=True)

from prisma import Prisma                                    # noqa: E402

# (tenant slug, barber name as stored, phone as a human would type it)
TARGETS: list[tuple[str, str, str]] = [
    ("rk",   "جعفر", "96170764479"),    # = users.phone on jaafar@rk.salmansaas.com
    ("rk",   "حسين", "96176985477"),    # = users.phone on rkbarber@dev.invalid
    ("mr-h", "Ali",  "71455767"),       # = users.phone on admin@ali-barber.local, un-prefixed
]                                        #   there; normalised to 96171455767 on write

APPLY = "--apply" in sys.argv


async def main() -> int:
    db = Prisma()
    await db.connect()
    failures: list[str] = []
    planned: list[tuple[str, str, str, str]] = []
    try:
        for slug, name, typed in TARGETS:
            client = await db.client.find_first(where={"slug": slug})
            if not client:
                failures.append(f"tenant '{slug}' not found")
                continue

            matches = await db.barber.find_many(where={"clientId": client.id, "name": name})
            if len(matches) != 1:
                failures.append(
                    f"'{name}' at '{slug}' matched {len(matches)} rows — expected exactly 1"
                )
                continue

            barber = matches[0]
            stored = normalize_for_storage(typed)
            if not stored:
                failures.append(f"'{name}' at '{slug}': {typed!r} normalises to nothing")
                continue

            planned.append((slug, name, barber.phone or "NULL", stored))
            print(f"  {slug:<8} {name:<8} {barber.phone or 'NULL':<14} -> {stored}"
                  f"   (typed {typed!r})")

        if failures:
            print("\nABORT — nothing was written:")
            for f in failures:
                print(f"  · {f}")
            return 1

        if not APPLY:
            print(f"\nDRY RUN — {len(planned)} row(s) would change. Re-run with --apply to write.")
            return 0

        for slug, name, _before, stored in planned:
            client = await db.client.find_first(where={"slug": slug})
            # update_many, scoped by BOTH clientId and name -- never a bare id update.
            n = await db.barber.update_many(
                where={"clientId": client.id, "name": name},
                data={"phone": stored},
            )
            print(f"  ✅ {slug} {name}: {n} row(s) -> {stored}")

        print("\nVerifying by reading the rows back:")
        for slug, name, _b, expected in planned:
            client = await db.client.find_first(where={"slug": slug})
            row = await db.barber.find_first(where={"clientId": client.id, "name": name})
            got = row.phone if row else None
            print(f"  {'OK  ' if got == expected else 'FAIL'} {slug} {name}: {got!r}")
        return 0
    finally:
        await db.disconnect()


if __name__ == "__main__":
    print(f"set_barber_phones — {'APPLY' if APPLY else 'DRY RUN'}\n")
    sys.exit(asyncio.run(main()))
