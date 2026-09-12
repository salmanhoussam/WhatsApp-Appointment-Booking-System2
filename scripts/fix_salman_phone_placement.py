"""
Take Salman's personal number off `smar`, and store it properly on `barberlab-test`.

SALMAN'S INSTRUCTION (2026-09-12): *"Smar انا عدلت اسم المالك ورقمه فيه رقمي ماله شغل هناك عطله
ورقمي 96178727986 يمكن شلتو بربرلاب رجعه"* — his own number has no business on `smar`, and
`barberlab-test` should carry it.

WHAT A READ-ONLY AUDIT FOUND FIRST, because both of these are live rows:

    smar            Admin       admin@salmansaas.com            78727986   pw=YES  login=never
    barberlab-test  Barberlab   barberlab-test@demo.sal...      78727986   pw=YES  login=2026-09-11
    barberlab-test  Client      phone AND whatsapp_number = 96178727986  (already correct)

So "رجعه" needed nothing on the Client — the number was never removed there. What is actually
wrong is that BOTH user rows store it WITHOUT its country code, the same defect class as the
جعفر incident (`.claude/rules/phone-numbers.md`).

WHY CLEARING smar's PHONE CANNOT LOCK ANYONE OUT — checked, not assumed: that account has a
password and an email, and `lastLoginAt` is NULL, so it has never once logged in by any route.
Email login is unaffected; only the phone route disappears, and it was never used.

Both writes go through `normalize_for_storage`, so the value stored is the value the rule
mandates, no matter what is typed here.

    Dry run (default — reads only):
        venv/bin/python scripts/fix_salman_phone_placement.py
    Apply:
        venv/bin/python scripts/fix_salman_phone_placement.py --apply
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import scripts._db_target as db_target                       # noqa: E402
from app.core.phone import normalize_for_storage             # noqa: E402

os.environ["DATABASE_URL"] = db_target.resolve(direct=True)

from prisma import Prisma                                    # noqa: E402

SALMAN = "96178727986"

# (email, new phone or None to clear, why)
TARGETS: list[tuple[str, str | None, str]] = [
    ("admin@salmansaas.com",
     None,
     "smar — Salman's personal number does not belong on a tenant admin account"),
    ("barberlab-test@demo.salmansaas.com",
     SALMAN,
     "barberlab-test — the test lab; stored WITH its country code"),
]

APPLY = "--apply" in sys.argv


async def main() -> int:
    db = Prisma()
    await db.connect()
    planned: list[tuple[str, str, str, str | None]] = []
    failures: list[str] = []
    try:
        for email, new_phone, why in TARGETS:
            user = await db.user.find_first(where={"email": email})
            if not user:
                failures.append(f"{email}: no such user")
                continue
            client = await db.client.find_unique(where={"id": user.clientId})
            stored = normalize_for_storage(new_phone) if new_phone else None
            if new_phone and not stored:
                failures.append(f"{email}: {new_phone!r} normalises to nothing")
                continue
            # Refuse to clear the ONLY way into an account that is actually in use.
            if stored is None and not user.password_hash:
                failures.append(f"{email}: has no password — clearing its phone could lock it out")
                continue
            planned.append((client.slug if client else "?", email, user.phone or "NULL", stored))
            print(f"  {(client.slug if client else '?'):<16}{email:<38}"
                  f"{(user.phone or 'NULL'):<13} -> {stored or 'NULL'}")
            print(f"       {why}")

        if failures:
            print("\nABORT — nothing was written:")
            for f in failures:
                print(f"  · {f}")
            return 1

        if not APPLY:
            print(f"\nDRY RUN — {len(planned)} row(s) would change. Re-run with --apply.")
            return 0

        for _slug, email, _before, stored in planned:
            n = await db.user.update_many(where={"email": email}, data={"phone": stored})
            print(f"  ✅ {email}: {n} row(s) -> {stored or 'NULL'}")

        print("\nVerifying by reading the rows back:")
        for _slug, email, _before, expected in planned:
            row = await db.user.find_first(where={"email": email})
            got = row.phone if row else "<missing>"
            print(f"  {'OK  ' if got == expected else 'FAIL'} {email}: {got!r}")
        return 0
    finally:
        await db.disconnect()


if __name__ == "__main__":
    print(f"fix_salman_phone_placement — {'APPLY' if APPLY else 'DRY RUN'}\n")
    sys.exit(asyncio.run(main()))
