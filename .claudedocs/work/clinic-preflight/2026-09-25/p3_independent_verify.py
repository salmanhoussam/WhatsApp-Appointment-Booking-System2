"""P3 review gate — INDEPENDENT verification of production state. READ ONLY, sealed.

Deliberately NOT the applier script. That one reported its own success; this one is a separate
reader asking the database what is true NOW.
"""
import asyncio, os, sys
ROOT = "/home/musicmaster/Downloads/WhatsApp-Appointment-Booking-System2-main"
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, ".claudedocs/work/clinic-preflight/2026-09-25"))
import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=False, quiet=True)
from app.db.client import prisma_client                                    # noqa: E402
from read_evidence import seal, WriteAttempted                             # noqa: E402


async def main() -> int:
    await prisma_client.connect()
    n = seal(prisma_client)
    try:
        await prisma_client.catalogitem.create(data={"nameAr": "SEAL-TEST"}); print("🔴 SEAL FAILED"); return 2
    except WriteAttempted: pass
    try:
        await prisma_client.query_raw("DELETE FROM catalog_services"); print("🔴 GUARD FAILED"); return 2
    except WriteAttempted: pass
    print(f"sealed {n} write methods · both guards proven\n")
    q = prisma_client.query_raw

    rows = await q("SELECT count(*)::int AS n FROM catalog_services")
    active = await q("SELECT count(*)::int AS n FROM catalog_services WHERE is_active")
    byval = await q("SELECT bookable_by, count(*)::int AS n FROM catalog_services "
                    "GROUP BY bookable_by ORDER BY bookable_by")
    instr = await q("SELECT count(*)::int AS n FROM catalog_services WHERE instructions IS NOT NULL")
    cols = await q("SELECT column_name, data_type, is_nullable, column_default "
                   "FROM information_schema.columns WHERE table_schema='public' "
                   "AND table_name='catalog_services' AND column_name IN "
                   "('instructions','bookable_by') ORDER BY column_name")
    cust = await q("SELECT count(*)::int AS n FROM customers")
    cidx = await q("SELECT indexdef FROM pg_indexes WHERE schemaname='public' "
                   "AND tablename='customers' AND indexname='customers_client_id_phone_key'")
    res = await q("SELECT count(*)::int AS n FROM reservations")
    pnull = await q("SELECT count(*)::int AS n FROM reservations WHERE patient_id IS NULL")
    pats = await q("SELECT count(*)::int AS n FROM patients")
    lnks = await q("SELECT count(*)::int AS n FROM patient_contacts")
    ridx = await q("SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname='public' "
                   "AND tablename='reservations'")

    print("── P3 · catalog_services ──")
    print(f"  rows {rows[0]['n']}  (active {active[0]['n']})")
    print(f"  bookable_by distribution : {[(r['bookable_by'], r['n']) for r in byval]}")
    print(f"  rows with instructions   : {instr[0]['n']}")
    for c in cols:
        print(f"  column {c['column_name']:<13} {c['data_type']:<5} nullable={c['is_nullable']} "
              f"default={c['column_default']}")
    print("\n── P1 / P2 · untouched by P3 ──")
    print(f"  customers rows           : {cust[0]['n']}")
    print(f"  customers unique index   : {'PRESENT' if cidx else 'MISSING'}")
    print(f"  reservations rows        : {res[0]['n']}   (patient_id NULL on {pnull[0]['n']})")
    print(f"  patients / patient_contacts : {pats[0]['n']} / {lnks[0]['n']}")
    print(f"  indexes on reservations  : {ridx[0]['n']}")

    okay = (rows[0]["n"] == 38 and active[0]["n"] == 37
            and [(r["bookable_by"], r["n"]) for r in byval] == [("patients", 38)]
            and instr[0]["n"] == 0
            and cust[0]["n"] == 10 and bool(cidx)
            and res[0]["n"] == 66 and pnull[0]["n"] == 66
            and pats[0]["n"] == 0 and lnks[0]["n"] == 0
            and ridx[0]["n"] == 9)
    await prisma_client.disconnect()
    print("\n" + ("✅ PRODUCTION MATCHES THE GATE REPORT, read independently"
                  if okay else "🔴 MISMATCH — do not approve"))
    return 0 if okay else 2


raise SystemExit(asyncio.run(main()))
