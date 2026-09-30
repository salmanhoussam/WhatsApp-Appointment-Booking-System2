#!/usr/bin/env python3
"""Give every existing catalog item a SKU. One-off backfill, A-Q3.

    DRY RUN (default, writes nothing):   venv/bin/python scripts/backfill_catalog_skus.py caracas arizona
    EXECUTE:                             venv/bin/python scripts/backfill_catalog_skus.py caracas arizona --execute

WHY A BACKFILL AT ALL
---------------------
`prisma/migrations/add_catalog_item_sku.sql` (executed 2026-09-30) added a NULLABLE `sku`, because
181 rows predated it and a paper menu carries no SKUs. Nullable was right for the migration and is
useless for its purpose: a menu update joins on the SKU, and a NULL joins to nothing. This assigns
one to every live item so the new menu can be matched against the old.

DRY RUN IS THE DEFAULT, AND THAT IS THE POINT
---------------------------------------------
Every SKU here is DERIVED FROM A NAME, and names are messy: Arabic-only names normalise to nothing,
`caracas` holds five duplicate names, and a typo becomes a permanent key (A-Q3, accepted
deliberately -- the SKU is internal, the customer sees nameAr/nameEn, and the owner may fix a
display name at any time without touching the SKU). So the whole plan is printed and reviewed
before a single row is written.

WHY psycopg2 AND NOT PRISMA
---------------------------
The Prisma query engine cannot start in this local environment -- a pre-existing, separately
tracked defect (P1001 / EngineConnectionError), unrelated to this work; psycopg2 connects to the
same database from the same `.env` without trouble. A one-off backfill is exactly the place to use
the client that actually works rather than to block on the one that does not. Nothing in `app/`
changes; this script alone speaks SQL.

WHAT IT WILL NOT DO
-------------------
* It never touches a row that already HAS a SKU -- re-running it is safe and idempotent.
* It never touches an INACTIVE row. A retired item's SKU belongs to `sku_tool.archive()`, not here,
  and giving a clean SKU to a retired item would occupy a key the new menu wants (A-Q6).
* It writes `sku` and nothing else. No name, no price, no category, no isActive.
"""
import os
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv  # noqa: E402

load_dotenv(str(Path(__file__).resolve().parent.parent / ".env"))

import psycopg2  # noqa: E402

from app.core import sku as sku_tool  # noqa: E402


class Row:
    """One catalog_items row, named so the planning code reads the same as the schema."""

    __slots__ = ("id", "nameAr", "nameEn", "sku", "isActive", "categoryId", "sortOrder", "createdAt")

    def __init__(self, *v):
        (self.id, self.nameAr, self.nameEn, self.sku,
         self.isActive, self.categoryId, self.sortOrder, self.createdAt) = v


def plan_for(cur, slug: str):
    cur.execute("SELECT id FROM clients WHERE slug = %s", (slug,))
    got = cur.fetchone()
    if not got:
        return None, [], []
    client_id = got[0]

    # Everything this tenant already holds, so the counter cannot collide with an existing key --
    # including archived ones, which still occupy the unique index.
    cur.execute("""SELECT id, name_ar, name_en, sku, is_active, category_id, sort_order, created_at
                     FROM catalog_items WHERE client_id = %s""", (client_id,))
    existing = [Row(*r) for r in cur.fetchall()]
    taken = {i.sku for i in existing if i.sku}

    # Only LIVE rows with no SKU. Ordered so a re-run produces the same numbering: a backfill that
    # assigned SHAWARMA-01 to a different row on each run would be worse than no backfill.
    todo = sorted(
        (i for i in existing if i.isActive and not i.sku),
        key=lambda i: (str(i.categoryId or ""), i.sortOrder, str(i.createdAt), str(i.id)),
    )

    rows = []
    for item in todo:
        sku = sku_tool.generate(item.nameEn, item.nameAr, taken)
        taken.add(sku)
        rows.append((item, sku))
    return client_id, rows, [i for i in existing if i.sku]


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    execute = "--execute" in sys.argv
    if not args:
        print("usage: backfill_catalog_skus.py <slug> [<slug>...] [--execute]")
        return 2

    conn = psycopg2.connect(os.getenv("DIRECT_URL").split("?")[0], connect_timeout=30)
    conn.autocommit = False
    cur = conn.cursor()
    try:
        grand = 0
        for slug in args:
            client_id, rows, already = plan_for(cur, slug)
            if client_id is None:
                print(f"\n🔴 {slug}: لا يوجد تينانت بهذا الاسم — تُخُطّي")
                continue

            print(f"\n=== {slug} ===")
            print(f"  تحمل SKU سلفاً: {len(already)}   ·   ستُسنَد الآن: {len(rows)}")

            # The two cases worth seeing before writing, not after.
            opaque = [(i, s) for i, s in rows if s.startswith("ITEM-")]
            bases = Counter(s.rsplit("-", 1)[0] for _, s in rows)
            collided = {b: n for b, n in bases.items() if n > 1}
            if opaque:
                print(f"  ⚠️  {len(opaque)} صنفاً بلا اسمٍ إنكليزيٍّ ⇒ مفتاحٌ مبهمٌ ITEM-xx "
                      f"(المولّد لا يحاول رومنة العربيّة — مفتاحٌ مبهمٌ فريدٌ أصدقُ من مفتاحٍ مقروءٍ خاطئ)")
            if collided:
                print(f"  ⚠️  أسماءٌ مكرّرة فُرِّقت بالعدّاد: "
                      + " · ".join(f"{b}×{n}" for b, n in sorted(collided.items())[:6]))

            for item, sku in rows[:12]:
                name = (item.nameEn or item.nameAr or "—")[:38]
                print(f"    {sku:28s} ← {name}")
            if len(rows) > 12:
                print(f"    … و{len(rows) - 12} أخرى")

            if execute:
                written = 0
                for item, sku in rows:
                    # Scoped by client_id as well as id: `rules/global.md`, no exception, even in a
                    # one-off script.
                    cur.execute(
                        "UPDATE catalog_items SET sku = %s WHERE id = %s AND client_id = %s",
                        (sku, item.id, client_id),
                    )
                    written += cur.rowcount
                conn.commit()   # one commit per tenant, after every row of that tenant succeeded
                print(f"  ✅ كُتب {written} صفّاً")
                grand += written
            else:
                grand += len(rows)

        print(f"\n{'✅ كُتب' if execute else '🟡 تجربة جافّة — لم يُكتب شيء. المخطَّط:'} {grand} صفّاً")
        if not execute:
            print("   أضف --execute للتنفيذ.")
        return 0
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
