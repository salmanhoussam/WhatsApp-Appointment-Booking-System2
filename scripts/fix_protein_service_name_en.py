"""Fill the missing English name on barberlab-test's protein service. Dry run by default.

SALMAN'S DECISION (2026-09-13): a data correction, not an architecture task. He had said he
would do it from the dashboard, then approved doing it here instead.

WHY IT MATTERS AT ALL, stated honestly: nothing is broken today. The text matcher ignores a NULL
`name_en` and invents no translation for it (verified: "beard trim" and "styling" return None on
`rk`, whose rows are also NULL). The single consequence is that a customer typing "protein" in
Latin script reaches nothing on barberlab-test, while "البروتين للشعر" works. So this is an
improvement, not a defect fix -- which is exactly why it is one row and one column.

SCOPE, deliberately narrow:

  * ONE tenant: barberlab-test, the test surface. No live tenant is touched.
  * ONE service, matched by its exact Arabic name.
  * ONE column: nameEn. Price, duration, category, isActive -- untouched.
  * Refuses to run if the row already has an English name, so it can never overwrite a value
    someone set from the dashboard.

    Dry run (default -- reads only):
        venv/bin/python scripts/fix_protein_service_name_en.py
    Apply:
        venv/bin/python scripts/fix_protein_service_name_en.py --apply
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import scripts._db_target as db_target                       # noqa: E402

os.environ["DATABASE_URL"] = db_target.resolve(direct=True)

from prisma import Prisma                                    # noqa: E402

SLUG     = "barberlab-test"
NAME_AR  = "البروتين للشعر"
NAME_EN  = "Hair Protein"

APPLY = "--apply" in sys.argv


async def main() -> int:
    db = Prisma()
    await db.connect()
    try:
        client = await db.client.find_first(where={"slug": SLUG})
        if not client:
            print(f"ABORT: no tenant with slug {SLUG!r}")
            return 1

        rows = await db.catalogservice.find_many(
            where={"clientId": client.id, "nameAr": NAME_AR}
        )
        if len(rows) != 1:
            print(f"ABORT: expected exactly 1 service named {NAME_AR!r} on {SLUG}, found {len(rows)}")
            return 1
        svc = rows[0]

        print(f"tenant   {SLUG}")
        print(f"service  id={svc.id[:8]}  nameAr={svc.nameAr!r}")
        print(f"         nameEn={svc.nameEn!r}  price={svc.price}  durationMin={svc.durationMin}")

        if svc.nameEn:
            print(f"\nNOTHING TO DO -- it already carries nameEn={svc.nameEn!r}. Refusing to "
                  f"overwrite a value someone set deliberately.")
            return 0

        print(f"\nWOULD CHANGE  nameEn: None -> {NAME_EN!r}   (and nothing else)")
        if not APPLY:
            print("\nDRY RUN -- re-run with --apply.")
            return 0

        await db.catalogservice.update(where={"id": svc.id}, data={"nameEn": NAME_EN})

        print("\nVerifying by reading back:")
        back = await db.catalogservice.find_unique(where={"id": svc.id})
        ok = back and back.nameEn == NAME_EN
        print(f"  {'OK  ' if ok else 'FAIL'} nameEn={back.nameEn!r}")
        print(f"  OK   nameAr={back.nameAr!r}  price={back.price}  durationMin={back.durationMin}"
              f"  isActive={back.isActive}   (unchanged)")
        return 0 if ok else 1
    finally:
        await db.disconnect()


if __name__ == "__main__":
    print(f"fix_protein_service_name_en — {'APPLY' if APPLY else 'DRY RUN'}\n")
    sys.exit(asyncio.run(main()))
