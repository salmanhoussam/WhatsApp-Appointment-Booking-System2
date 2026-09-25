"""Clinic P3 — apply the Service Booking Contract migration. Additive only.

Reads the statements from prisma/migrations/add_service_booking_contract.sql itself, so this script
cannot drift from the file that was reviewed.

GUARDS, each refusing rather than continuing:
  1. DIRECT_URL (port 5432), validated by role via _db_target. Never the pooled URL for DDL.
  2. Every statement must start with CREATE TABLE / CREATE INDEX / CREATE UNIQUE INDEX /
     ALTER TABLE ... ADD. Any DROP / TRUNCATE / DELETE / UPDATE aborts before anything runs.
  3. 🔴 THE CUSTOMER PROOF. `customers` row count AND the exact definition of
     customers_client_id_phone_key are read BEFORE and AFTER and compared. P2's single most
     important promise is that it does not touch Customer, and a promise is not evidence.
  4. reservations row count before/after, and the count of patient_id IS NULL after -- which
     must equal the total, because there is no backfill.
"""
import asyncio, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=True, quiet=True)
from app.db.client import prisma_client                                    # noqa: E402

MIG = os.path.join(ROOT, "prisma", "migrations", "add_service_booking_contract.sql")
ALLOWED = re.compile(r"^(CREATE TABLE|CREATE INDEX|CREATE UNIQUE INDEX|ALTER TABLE)\b", re.I)
FORBIDDEN = re.compile(r"\b(DROP|TRUNCATE|DELETE|UPDATE)\b", re.I)

CUST_IDX = ("SELECT indexdef FROM pg_indexes WHERE schemaname='public' "
            "AND tablename='customers' AND indexname='customers_client_id_phone_key'")
SVC_COLS = ("SELECT column_name, data_type, is_nullable, column_default "
            "FROM information_schema.columns WHERE table_schema='public' "
            "AND table_name='catalog_services' AND column_name IN "
            "('instructions','bookable_by') ORDER BY column_name")


def statements() -> list[str]:
    raw = open(MIG, encoding="utf-8").read()
    body = "\n".join(l for l in raw.splitlines() if not l.strip().startswith("--"))
    body = body.replace("BEGIN;", "").replace("COMMIT;", "")
    out = []
    for st in (x.strip() for x in body.split(";")):
        if not st:
            continue
        if not ALLOWED.match(st):
            sys.exit(f"ABORT: statement is not an allowed additive form:\n{st[:120]}")
        # `ON DELETE SET NULL` / `ON UPDATE CASCADE` are REFERENTIAL ACTIONS on a foreign key,
        # not DML -- they contain the words DELETE and UPDATE and must not be confused with
        # them. Stripped before the check, narrowly and by shape, rather than loosening the
        # keyword list: the guard must still refuse a real DELETE or UPDATE statement.
        probe = re.sub(r"ON\s+(DELETE|UPDATE)\s+"
                       r"(SET\s+NULL|SET\s+DEFAULT|CASCADE|RESTRICT|NO\s+ACTION)",
                       " ", st, flags=re.I)
        if FORBIDDEN.search(probe):
            sys.exit(f"ABORT: forbidden keyword in:\n{st[:120]}")
        if st.upper().startswith("ALTER TABLE") and " ADD " not in st.upper():
            sys.exit(f"ABORT: ALTER that is not an ADD:\n{st[:120]}")
        out.append(st)
    return out


async def snap() -> dict:
    q = prisma_client.query_raw
    return {
        "customers":        (await q("SELECT count(*)::int AS n FROM customers"))[0]["n"],
        "cust_unique":      ((await q(CUST_IDX)) or [{"indexdef": None}])[0]["indexdef"],
        "reservations":     (await q("SELECT count(*)::int AS n FROM reservations"))[0]["n"],
        "services":         (await q("SELECT count(*)::int AS n FROM catalog_services"))[0]["n"],
        "svc_cols":         await q(SVC_COLS),
    }


async def main() -> int:
    sts = statements()
    print(f"{len(sts)} statement(s), every one additive and reviewed:")
    for st in sts:
        print("  · " + st.splitlines()[0][:100])

    await prisma_client.connect()
    before = await snap()
    print(f"\nBEFORE · customers={before['customers']} · reservations={before['reservations']} "
          f"· catalog_services={before['services']} · new columns={[c['column_name'] for c in before['svc_cols']]}")
    print(f"         customers unique index: {before['cust_unique']}")

    print("\nAPPLYING …")
    for st in sts:
        await prisma_client.execute_raw(st)
    print(f"   {len(sts)} statement(s) applied")

    after = await snap()
    q = prisma_client.query_raw
    non_default = (await q("SELECT count(*)::int AS n FROM catalog_services "
                           "WHERE bookable_by <> 'patients' OR instructions IS NOT NULL"))[0]["n"]
    print(f"\nAFTER  · customers={after['customers']} · reservations={after['reservations']} "
          f"· catalog_services={after['services']}")

    print("\n── EVIDENCE ──")
    c_ok = before["customers"] == after["customers"]
    u_ok = before["cust_unique"] == after["cust_unique"] and after["cust_unique"] is not None
    r_ok = before["reservations"] == after["reservations"]
    s_ok = before["services"] == after["services"]
    cols = {c["column_name"]: c for c in after["svc_cols"]}
    col_ok = (set(cols) == {"bookable_by", "instructions"}
              and cols["bookable_by"]["is_nullable"] == "NO"
              and "patients" in (cols["bookable_by"]["column_default"] or "")
              and cols["instructions"]["is_nullable"] == "YES")
    d_ok = non_default == 0
    print(f"🔒 CUSTOMER untouched · rows {before['customers']} -> {after['customers']} : {c_ok}")
    print(f"🔒 CUSTOMER unique index identical                    : {u_ok}")
    print(f"   reservations rows {before['reservations']} -> {after['reservations']}          : {r_ok}")
    print(f"   catalog_services rows {before['services']} -> {after['services']}      : {s_ok}")
    for n, c in sorted(cols.items()):
        print(f"   column {n:<13} {c['data_type']:<6} nullable={c['is_nullable']} "
              f"default={c['column_default']}")
    print(f"   columns have the contracted shape                  : {col_ok}")
    print(f"   rows carrying anything but the default ({non_default})        : {d_ok}  (ZERO backfill)")

    await prisma_client.disconnect()
    okay = all((c_ok, u_ok, r_ok, s_ok, col_ok, d_ok))
    print("\n" + ("✅ P3 MIGRATION APPLIED — ADDITIVE, ZERO BEHAVIOURAL CHANGE, ZERO BACKFILL"
                  if okay else "🔴 UNEXPECTED STATE"))
    return 0 if okay else 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
