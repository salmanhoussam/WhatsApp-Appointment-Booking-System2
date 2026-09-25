"""U8 — origin/intent of `Dr. Faisal` and `Dr. Sara`. READ ONLY. SELECT ONLY.

Authorised by Salman, 2026-09-25: "تحقيق تاريخي read-only قبل أي قرار ... ولا حذف حتى بعد ذلك
بدون قرار منفصل."

Same seal as read_evidence.py in this folder (276 write methods + query_raw SELECT-only guard,
both proven by a real attempt before any read).
"""
import asyncio, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=False, quiet=True)
from app.db.client import prisma_client                                    # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from read_evidence import seal, WriteAttempted, h                          # noqa: E402


async def main() -> int:
    await prisma_client.connect()
    sealed = seal(prisma_client)
    try:
        await prisma_client.catalogitem.create(data={"nameAr": "SEAL-TEST"})
        print("🔴 SEAL DID NOT HOLD"); return 2
    except WriteAttempted:
        pass
    try:
        await prisma_client.query_raw("DELETE FROM resources")
        print("🔴 SELECT-ONLY GUARD DID NOT HOLD"); return 2
    except WriteAttempted:
        pass
    print(f"sealed {sealed} write methods · both guards proven by real attempts")

    clients = await prisma_client.client.find_many()
    by_id = {c.id: c for c in clients}

    h("THE TWO ROWS — every field")
    rows = await prisma_client.resource.find_many()
    for r in rows:
        slug = by_id[r.clientId].slug if r.clientId in by_id else r.clientId
        print(f"   · id           {r.id}")
        print(f"     tenant       {slug}  ({r.clientId})")
        print(f"     name         {r.name!r}")
        print(f"     type         {r.type!r}")
        print(f"     specialty    {r.specialty!r}")
        print(f"     phone        {r.phone!r}")
        print(f"     isActive     {r.isActive}")
        print(f"     sortOrder    {r.sortOrder}")
        print(f"     workingHours {r.workingHours}")
        print(f"     createdAt    {r.createdAt.isoformat()}")
        print(f"     updatedAt    {r.updatedAt.isoformat()}")
        print(f"     changed after creation? {'YES' if r.updatedAt != r.createdAt else 'no'}")
        print()

    h("ANY Reservation referencing them — ever, any status")
    for r in rows:
        n = await prisma_client.reservation.count(where={"resourceId": r.id})
        print(f"   · {r.name!r}: {n} reservation(s)")

    h("WHAT ELSE was created on that tenant around the same time")
    if rows:
        cid = rows[0].clientId
        lo = min(r.createdAt for r in rows)
        hi = max(r.createdAt for r in rows)
        from datetime import timedelta
        lo2, hi2 = lo - timedelta(hours=12), hi + timedelta(hours=12)
        print(f"   window: {lo2.isoformat()} .. {hi2.isoformat()}  (tenant of the rows)")
        for label, coll in (("Barber", prisma_client.barber),
                            ("CatalogService", prisma_client.catalogservice),
                            ("Reservation", prisma_client.reservation),
                            ("Customer", prisma_client.customer),
                            ("User", prisma_client.user)):
            try:
                hits = await coll.find_many(where={"clientId": cid,
                                                   "createdAt": {"gte": lo2, "lte": hi2}})
            except Exception as exc:
                print(f"   · {label}: query failed ({exc})"); continue
            print(f"   · {label}: {len(hits)}")
            for x in hits:
                nm = getattr(x, "name", None) or getattr(x, "nameAr", None) \
                     or getattr(x, "customerName", None) or getattr(x, "fullName", None)
                print(f"       - {nm!r}  created={x.createdAt.isoformat()}")

    h("SecurityAuditLog around that window")
    if rows:
        from datetime import timedelta
        lo = min(r.createdAt for r in rows) - timedelta(hours=12)
        hi = max(r.createdAt for r in rows) + timedelta(hours=12)
        try:
            logs = await prisma_client.securityauditlog.find_many(
                where={"timestamp": {"gte": lo, "lte": hi}}, order={"timestamp": "asc"})
            print(f"   {len(logs)} row(s)")
            for lg in logs:
                print(f"   · {lg.timestamp.isoformat()} {lg.eventType} actor={lg.actor} "
                      f"endpoint={lg.endpoint}")
        except Exception as exc:
            print(f"   query failed ({exc})")

    h("EARLIEST rows on that tenant, for reference")
    if rows:
        cid = rows[0].clientId
        cl = by_id.get(cid)
        if cl:
            print(f"   Client {cl.slug} createdAt = {cl.createdAt.isoformat()}")
    await prisma_client.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
