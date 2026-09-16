"""F0.1 — the `lia` row in `platform_services`.

    DRY RUN BY DEFAULT.  venv/bin/python scripts/seed_platform_service_lia.py
    APPLY (one production write, needs its own approval):   ... --apply

WHAT THIS WRITES, AND WHAT IT DOES NOT
    ONE row in `platform_services`, the product catalogue: key, module, names, icon, price, order.
    That table has **zero runtime reads** anywhere outside `app/api/v1/super/platform_services.py`
    (measured 2026-09-16), so this row gates nothing and changes no tenant's behaviour. It exists
    so Lia is a NAMED, listable capability instead of an unlisted one.

    It does NOT activate Lia for anybody. Activation is a `client_services` row, which is **F0.4**
    — a separate production write with its own explicit approval, deliberately not reachable from
    this script. `FOUNDATION READY` is not `PRODUCTION ACTIVATION APPROVED`.

WHY A SCRIPT AND NOT A MIGRATION
    It is catalogue data, not schema. `rules/backend/...` and this project's own hard-won rule
    ("never `prisma db push`") both point the same way: a data row belongs in a reviewable,
    idempotent, dry-runnable script.

IDEMPOTENT AND NARROW
    It refuses to overwrite an existing `lia` row's content, and it touches nothing else. Run it
    twice and the second run reports "already present" rather than rewriting a row someone may
    have edited from the super admin surface.
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts import _db_target                                        # noqa: E402

os.environ["DATABASE_URL"] = _db_target.resolve(direct=True)

from app.db.client import prisma_client                               # noqa: E402

# Wording chosen to match the rows already in the table (Arabic first, one short sentence each).
# `monthlyPrice` is deliberately NULL: Lia's commercial packaging is not decided, and inventing a
# number here would put a price on the product surface that nobody approved.
ROW = {
    "key":           "lia",
    "moduleKey":     "shared",
    "nameAr":        "ليا — مساعدتك الذكية",
    "nameEn":        "Lia — your AI assistant",
    "descriptionAr": "أضِف خدماتك ومواعيدك بالكتابة على واتساب، وليا تتكفّل بالباقي.",
    "descriptionEn": "Add your services and appointments by texting on WhatsApp.",
    "icon":          "sparkles",
    "monthlyPrice":  None,
    "isActive":      True,
    "sortOrder":     90,
}


async def main(apply: bool) -> int:
    await prisma_client.connect()
    try:
        existing = await prisma_client.platformservice.find_unique(where={"key": "lia"})
        total = len(await prisma_client.platformservice.find_many())
        print(f"platform_services rows: {total}")

        if existing is not None:
            print("\n✅ ALREADY PRESENT — nothing to do, and nothing overwritten.")
            print(f"   key={existing.key} module={existing.moduleKey} "
                  f"name_en={existing.nameEn!r} active={existing.isActive} "
                  f"sort={existing.sortOrder} price={existing.monthlyPrice}")
            return 0

        print("\nWOULD INSERT:")
        for k, v in ROW.items():
            print(f"   {k:14} {v!r}")

        if not apply:
            print("\n⏸  DRY RUN — nothing written. Re-run with --apply to insert this one row.")
            print("   Reminder: this is the CATALOGUE row (F0.1). It does not activate Lia for any")
            print("   tenant — that is F0.4, and it needs its own explicit approval.")
            return 0

        created = await prisma_client.platformservice.create(data=ROW)
        print(f"\n✅ INSERTED id={created.id} key={created.key}")
        print("   Still no tenant has Lia activated. F0.4 remains a separate decision.")
        return 0
    finally:
        await prisma_client.disconnect()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="perform the single INSERT (default: dry run)")
    sys.exit(asyncio.run(main(ap.parse_args().apply)))
