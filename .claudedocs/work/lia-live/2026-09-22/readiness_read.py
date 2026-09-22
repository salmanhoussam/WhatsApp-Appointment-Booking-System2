"""READ ONLY — is barberlab-test ready for Salman to test the daily log himself?
Reuses the proven seal in scripts/lia_live_evidence.py (275 write methods, proven by attempt)."""
import asyncio, os, sys
ROOT = "/home/musicmaster/Downloads/WhatsApp-Appointment-Booking-System2-main"
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target
os.environ["DATABASE_URL"] = _db_target.resolve(direct=False, quiet=True)
from app.db.client import prisma_client
import lia_live_evidence as ev

async def main():
    await prisma_client.connect()
    n = ev.seal(prisma_client)
    try:
        await prisma_client.catalogitem.create(data={"nameAr": "SEAL-TEST"})
        print("🔴 SEAL FAILED"); return 2
    except ev.WriteAttempted:
        pass
    print(f"sealed {n} · proven")
    for slug in ("barberlab-test", "rk"):
        c = await prisma_client.client.find_first(where={"slug": slug})
        if not c: print(slug, "NOT FOUND"); continue
        print(f"\n=== {slug}  id={c.id}  currency={getattr(c,'currency',None)}")
        svcs = await prisma_client.clientservice.find_many(where={"clientId": c.id})
        print("  services:", [(s.serviceKey, s.isActive) for s in svcs])
        users = await prisma_client.user.find_many(where={"clientId": c.id})
        for u in users:
            print(f"  user {u.email} phone={u.phone!r} role={u.role} perms={'yes' if getattr(u,'permissions',None) else 'NULL'} scope={getattr(u,'scope',None)}")
        barbers = await prisma_client.barber.find_many(where={"clientId": c.id})
        for b in barbers:
            print(f"  barber {b.name!r} id={b.id} userId={getattr(b,'userId',None)} active={getattr(b,'isActive',None)}")
        cs = await prisma_client.catalogservice.find_many(where={"clientId": c.id})
        print("  catalog services:", [(s.nameAr, str(s.price), s.durationMin, s.isActive) for s in cs])
        from datetime import datetime, timedelta
        d0 = datetime(2026,9,22); d1 = d0 + timedelta(days=1)
        res = await prisma_client.reservation.find_many(where={"clientId": c.id, "reservedAt": {"gte": d0, "lt": d1}})
        print(f"  reservations dated 2026-09-22: {len(res)}")
        for r in res:
            print(f"    · {r.reservedAt} {r.customerName!r} {r.status} src={r.source} barber={r.barberId}")
    print("\nattempted writes:", ev.attempted)
    return 0

sys.exit(asyncio.run(main()))
