"""G2 / F0.4 — activate `lia` for the two approved tenants.

    DRY RUN BY DEFAULT.   venv/bin/python scripts/activate_lia_capability.py
    APPLY (production write, Salman's explicit approval per tenant):   ... --apply

THIS USES THE EXISTING WRITE PATH. IT DOES NOT INVENT ONE.

    `POST /api/v1/admin/client-services/activate` performs exactly three steps, and this script
    performs the same three, in the same order, through the same functions:

        1. reject any key not in ACTIVATABLE_KEYS   (app/api/v1/admin/client_services.py:124)
        2. client_services_repo.upsert_client_service(client_id, key, is_active=True)      (:143)
        3. core.services.sync_selected_services(client_id)                                  (:147)

    Nothing is re-implemented: both write functions are imported from where the route imports
    them. The one thing the route does that a script cannot is derive the tenant from a JWT, so the
    tenant is named here by SLUG and resolved by a read — and the script refuses to write to any
    slug not on the approved list below, which is the narrower guarantee, not a weaker one.

    Step 3 matters and is easy to miss: `Client.selected_services` is a denormalised mirror of the
    active rows, and `app/services/sheets_service.py:112` reads it. Doing the upsert without the
    sync would leave the mirror stale — a second write path by omission.

SCOPE, AS APPROVED

    barberlab-test  ✅ activate        rk  ✅ activate        mr-h  ⛔ DEFERRED, deliberately
                                                                   (re-seed pending; it keeps
                                                                    working through F0.3's
                                                                    tolerant `lia OR reservations`)
    alzabt-demo     ⛔ not a tenant at all (decision D0)

    The slug allowlist is enforced in code below. A slug outside it is refused, so a typo cannot
    activate a capability on a shop nobody approved.

IDEMPOTENT, AND HONEST ABOUT IT

    `upsert_client_service` is an upsert, so re-running is safe by construction. But an upsert also
    silently rewrites, so this script READS FIRST and reports one of three states per tenant:
    already active (skip, touch nothing), inactive row present (re-activate — a real change), or
    no row (create). "Nothing to do" is printed as such rather than performed as a no-op write.
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts import _db_target                                        # noqa: E402

os.environ["DATABASE_URL"] = _db_target.resolve(direct=True)

# `app.db.client` first, deliberately: importing the admin route module on its own trips a real
# circular import (admin/__init__ -> core.tenant -> db -> dependencies -> core.tenant). Importing
# the client first resolves the chain the way the running app does.
from app.db.client import prisma_client                              # noqa: E402

# The SAME gate and the SAME two write functions the admin route uses — imported from where the
# route imports them, so there is one definition of each and no second copy to drift.
from app.api.v1.admin.client_services import ACTIVATABLE_KEYS        # noqa: E402,E501  isort:skip
from app.core.services import sync_selected_services                 # noqa: E402
from app.repositories import client_services_repo as _repo           # noqa: E402

KEY = "lia"
APPROVED_SLUGS = ("barberlab-test", "rk")        # G2's whole scope. Nothing else may be written.
DEFERRED_SLUGS = ("mr-h",)                       # named so the report can say it was skipped on
                                                 # purpose rather than leave it unexplained.


async def main(apply: bool) -> int:
    # The route validates before touching the DB; so does this.
    if KEY not in ACTIVATABLE_KEYS:
        print(f"🔴 ABORT: {KEY!r} is not in ACTIVATABLE_KEYS — F0.2 is not in place.")
        return 1

    await prisma_client.connect()
    try:
        clients = await prisma_client.client.find_many()
        by_slug = {c.slug: c for c in clients}

        missing = [s for s in APPROVED_SLUGS if s not in by_slug]
        if missing:
            print(f"🔴 ABORT: approved slug(s) not found in this database: {missing}")
            return 1

        rows = await prisma_client.clientservice.find_many()
        total_before = len(rows)
        lia_before = [r for r in rows if r.serviceKey == KEY]

        print(f"client_services rows before      = {total_before}")
        print(f"rows with serviceKey={KEY!r}        = {len(lia_before)}\n")

        plan = []
        for slug in APPROVED_SLUGS:
            cid = by_slug[slug].id
            existing = next((r for r in rows if r.clientId == cid and r.serviceKey == KEY), None)
            if existing is None:
                plan.append((slug, cid, "CREATE"))
            elif existing.isActive:
                plan.append((slug, cid, "ALREADY ACTIVE — skip"))
            else:
                plan.append((slug, cid, "RE-ACTIVATE (row exists, isActive=False)"))

        for slug, _cid, what in plan:
            print(f"  {slug:16} {what}")
        for slug in DEFERRED_SLUGS:
            state = "no lia row" if not any(
                r.clientId == by_slug[slug].id and r.serviceKey == KEY for r in rows
            ) else "HAS a lia row — unexpected"
            print(f"  {slug:16} ⛔ DEFERRED by decision — {state}, and left alone")

        todo = [p for p in plan if p[2] != "ALREADY ACTIVE — skip"]
        if not todo:
            print("\n✅ NOTHING TO DO — both approved tenants already carry an active lia row.")
            return 0

        if not apply:
            print(f"\n⏸  DRY RUN — nothing written. {len(todo)} tenant(s) would change.")
            print("   Re-run with --apply. This IS a production write and needs approval.")
            return 0

        # ── The write, through the route's own two steps ──────────────────────
        written = []
        for slug, cid, what in todo:
            await _repo.upsert_client_service(cid, KEY, is_active=True)
            await sync_selected_services(cid)          # step 3 — the mirror the route also syncs
            written.append(slug)
            print(f"\n✅ {slug}: {what.split(' —')[0]} + selected_services synced")

        # ── Read back, rather than trust the calls ───────────────────────────
        rows_after = await prisma_client.clientservice.find_many()
        lia_after = [r for r in rows_after if r.serviceKey == KEY]
        slug_of = {c.id: c.slug for c in clients}
        print(f"\nclient_services rows after       = {len(rows_after)} "
              f"(before {total_before})")
        print(f"rows with serviceKey={KEY!r}        = {len(lia_after)}")
        for r in sorted(lia_after, key=lambda x: slug_of.get(x.clientId, "")):
            print(f"   {slug_of.get(r.clientId, r.clientId):16} isActive={r.isActive}")
        print(f"\nwritten: {written}")
        print("Lia is now independently switchable on these tenants — turning `lia` off no longer")
        print("requires touching Reservations, which was F1's whole purpose.")
        return 0
    finally:
        await prisma_client.disconnect()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="perform the writes (default: dry run)")
    sys.exit(asyncio.run(main(ap.parse_args().apply)))
