"""ONE production write on the TEST tenant: deactivate the duplicate «مشط خشب».

WHY: `barberlab-test` carries the same product twice (both `isActive`, same price, same
category) since 2026-09-17 — the row D1's duplicate branch was built from. Salman asked to clean
it while closing the barber vertical («نظّف وادفع»).

WHAT IT DOES, and does not: sets `isActive=False` on the NEWER row. It does not delete: a delete
would erase a row other tables may reference, and «duplicate» is a state, not a mistake worth
losing history over. Reversible with one flag.

GUARDS: the tenant is resolved by slug and re-checked; both rows must still carry the same folded
name, the same price and the same category; the OLDER row must stay active.
"""
import asyncio, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *[os.pardir] * 4))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=False, quiet=True)

from app.db.client import prisma_client                                    # noqa: E402

SLUG, NAME = "barberlab-test", "مشط خشب"
KEEP, DROP = "8ec69af2-9b34-4adb-92fe-163c7a53f91d", "c88fc1c4-8847-4cfb-b1fa-9576cf4bd240"


async def main() -> int:
    await prisma_client.connect()
    client = await prisma_client.client.find_first(where={"slug": SLUG})
    if not client or client.slug != SLUG:
        print(f"ABORT: {SLUG} not resolved"); return 2

    rows = {r.id: r for r in await prisma_client.catalogitem.find_many(
        where={"clientId": client.id, "nameAr": NAME})}
    if set(rows) != {KEEP, DROP}:
        print(f"ABORT: expected exactly the two known ids, found {sorted(rows)}"); return 2
    keep, drop = rows[KEEP], rows[DROP]
    if str(keep.price) != str(drop.price) or keep.categoryId != drop.categoryId:
        print("ABORT: the two rows are not the same product after all"); return 2
    if drop.createdAt <= keep.createdAt:
        print("ABORT: the row to drop is not the newer one"); return 2

    print(f"BEFORE  keep {KEEP[:8]} active={keep.isActive}  ·  drop {DROP[:8]} active={drop.isActive}")
    if not drop.isActive:
        print("NO-OP: already inactive"); return 0

    await prisma_client.catalogitem.update(where={"id": DROP}, data={"isActive": False})

    after = {r.id: r for r in await prisma_client.catalogitem.find_many(
        where={"clientId": client.id, "nameAr": NAME})}
    print(f"AFTER   keep {KEEP[:8]} active={after[KEEP].isActive}  ·  "
          f"drop {DROP[:8]} active={after[DROP].isActive}")
    ok = after[KEEP].isActive is True and after[DROP].isActive is False
    print("RESULT:", "✅ one active «مشط خشب» left, nothing deleted" if ok else "🔴 unexpected")
    return 0 if ok else 2


sys.exit(asyncio.run(main()))
