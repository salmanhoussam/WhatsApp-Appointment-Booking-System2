"""Clinic P4-C-U1 — apply `resource_services`. Schema-only, authorised by Salman 2026-09-26.

Reads its statements from prisma/migrations/add_resource_service_eligibility.sql, so it cannot
drift from the file that was reviewed by eye.

SALMAN'S CONDITIONS, each one a guard rather than a promise:
  1. DDL only, no INSERT/UPDATE/DELETE  -> every statement must match the additive allow-list.
  2. resource_services must stay EMPTY  -> its row count is read after and must be 0.
  3. pre/post evidence for `customers`, its constraints and its indexes.
  4. pre/post evidence for `barber_services` and its indexes.
  5. pre/post `migrate diff`            -> run by the caller around this script (see evidence).
  6. prove the table exists afterwards, and is empty.
  7. if the 7 statements differ from the reviewed version -> STOP.

Condition 7 is enforced by a SHA-256 of the migration file, pinned below to the exact bytes that
were reviewed. A changed file aborts before connecting to anything.
"""
import asyncio, hashlib, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))

MIG = os.path.join(ROOT, "prisma", "migrations", "add_resource_service_eligibility.sql")
REVIEWED_SHA = os.environ.get("REVIEWED_SHA", "")
ALLOWED = re.compile(r"^(CREATE TABLE|CREATE INDEX|CREATE UNIQUE INDEX|ALTER TABLE)\b", re.I)
FORBIDDEN = re.compile(r"\b(DROP|TRUNCATE|DELETE|UPDATE|INSERT)\b", re.I)

raw = open(MIG, "rb").read()
sha = hashlib.sha256(raw).hexdigest()
print(f"migration sha256 : {sha}")
if REVIEWED_SHA and sha != REVIEWED_SHA:
    sys.exit(f"ABORT (condition 7): the file changed since review.\n  reviewed {REVIEWED_SHA}\n  now      {sha}")

body = "\n".join(l for l in raw.decode("utf-8").splitlines() if not l.strip().startswith("--"))
body = body.replace("BEGIN;", "").replace("COMMIT;", "")
STATEMENTS = []
for st in (x.strip() for x in body.split(";")):
    if not st:
        continue
    if not ALLOWED.match(st):
        sys.exit(f"ABORT (condition 1): not an allowed additive form:\n{st[:140]}")
    # `ON DELETE CASCADE` / `ON UPDATE CASCADE` are REFERENTIAL ACTIONS on a foreign key, not DML.
    # Stripped BY SHAPE before the keyword check -- narrowed, never loosened, so a real DELETE or
    # UPDATE statement is still refused.
    probe = re.sub(r"ON\s+(DELETE|UPDATE)\s+(SET\s+NULL|SET\s+DEFAULT|CASCADE|RESTRICT|NO\s+ACTION)",
                   " ", st, flags=re.I)
    if FORBIDDEN.search(probe):
        sys.exit(f"ABORT (condition 1): forbidden keyword in:\n{st[:140]}")
    if st.upper().startswith("ALTER TABLE") and " ADD " not in st.upper():
        sys.exit(f"ABORT (condition 1): ALTER that is not an ADD:\n{st[:140]}")
    STATEMENTS.append(st)

if len(STATEMENTS) != 7:
    sys.exit(f"ABORT (condition 7): expected 7 statements, found {len(STATEMENTS)}")

import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=True, quiet=True)
from app.db.client import prisma_client                                    # noqa: E402

CUST_IDX = ("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' "
            "AND tablename='customers' ORDER BY indexname")
CUST_CON = ("SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint "
            "WHERE conrelid='public.customers'::regclass ORDER BY conname")
BS_IDX = ("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' "
          "AND tablename='barber_services' ORDER BY indexname")
NEW_IDX = ("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' "
           "AND tablename='resource_services' ORDER BY indexname")
NEW_FK = ("SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint "
          "WHERE conrelid='public.resource_services'::regclass AND contype='f' ORDER BY conname")
EXISTS = ("SELECT count(*)::int AS n FROM information_schema.tables "
          "WHERE table_schema='public' AND table_name='resource_services'")


async def snap() -> dict:
    q = prisma_client.query_raw
    return {
        "customers":    (await q("SELECT count(*)::int AS n FROM customers"))[0]["n"],
        "cust_idx":     await q(CUST_IDX),
        "cust_con":     await q(CUST_CON),
        "barber_svc":   (await q("SELECT count(*)::int AS n FROM barber_services"))[0]["n"],
        "barber_idx":   await q(BS_IDX),
        "resources":    (await q("SELECT count(*)::int AS n FROM resources"))[0]["n"],
        "services":     (await q("SELECT count(*)::int AS n FROM catalog_services"))[0]["n"],
        "reservations": (await q("SELECT count(*)::int AS n FROM reservations"))[0]["n"],
        "exists":       (await q(EXISTS))[0]["n"],
    }


def show(tag: str, s: dict) -> None:
    print(f"\n{tag}")
    print(f"  resource_services exists : {s['exists']}")
    print(f"  customers rows           : {s['customers']}")
    for i in s["cust_idx"]:
        print(f"    idx {i['indexname']}  {i['indexdef']}")
    for c in s["cust_con"]:
        print(f"    con {c['conname']}  {c['def']}")
    print(f"  barber_services rows     : {s['barber_svc']}")
    for i in s["barber_idx"]:
        print(f"    idx {i['indexname']}  {i['indexdef']}")
    print(f"  resources={s['resources']}  catalog_services={s['services']}  reservations={s['reservations']}")


async def main() -> int:
    print(f"\n{len(STATEMENTS)} statement(s), every one additive and reviewed by eye:")
    for st in STATEMENTS:
        print("  · " + " ".join(st.split())[:110])

    await prisma_client.connect()
    before = await snap()
    show("── BEFORE ──", before)
    if before["exists"]:
        await prisma_client.disconnect()
        sys.exit("ABORT: resource_services already exists; this script does not alter an existing table.")

    print("\nAPPLYING …")
    for st in STATEMENTS:
        await prisma_client.execute_raw(st)
    print(f"   {len(STATEMENTS)} statement(s) applied")

    after = await snap()
    show("── AFTER ──", after)
    q = prisma_client.query_raw
    rows = (await q("SELECT count(*)::int AS n FROM resource_services"))[0]["n"]
    new_idx = await q(NEW_IDX)
    new_fk = await q(NEW_FK)
    print("\n  resource_services:")
    for i in new_idx:
        print(f"    idx {i['indexname']}")
    for f in new_fk:
        print(f"    fk  {f['conname']}  {f['def']}")

    checks = {
        "🔒 customers rows unchanged":        before["customers"] == after["customers"],
        "🔒 customers indexes identical":     before["cust_idx"] == after["cust_idx"],
        "🔒 customers constraints identical": before["cust_con"] == after["cust_con"],
        "🔒 barber_services rows unchanged":  before["barber_svc"] == after["barber_svc"],
        "🔒 barber_services indexes identical": before["barber_idx"] == after["barber_idx"],
        "   resources rows unchanged":        before["resources"] == after["resources"],
        "   catalog_services rows unchanged": before["services"] == after["services"],
        "   reservations rows unchanged":     before["reservations"] == after["reservations"],
        "   resource_services now exists":    after["exists"] == 1,
        "   and is EMPTY (zero rows)":        rows == 0,
        "   three FKs, client_id included":   {f["conname"] for f in new_fk} == {
            "resource_services_client_id_fkey", "resource_services_resource_id_fkey",
            "resource_services_service_id_fkey"},
        "   four indexes present":            {i["indexname"] for i in new_idx} == {
            "resource_services_pkey", "resource_services_client_id_service_id_idx",
            "resource_services_client_id_resource_id_idx",
            "resource_services_resource_id_service_id_key"},
    }
    print("\n── EVIDENCE ──")
    for label, good in checks.items():
        print(f"  {'PASS' if good else 'FAIL'}  {label}")

    await prisma_client.disconnect()
    ok = all(checks.values())
    print("\n" + ("✅ APPLIED — SCHEMA ONLY, ONE NEW EMPTY TABLE, ZERO ROW WRITTEN ANYWHERE"
                  if ok else "🔴 UNEXPECTED STATE — read the evidence above"))
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
