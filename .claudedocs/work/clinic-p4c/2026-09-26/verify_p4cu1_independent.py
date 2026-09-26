"""Independent verification of P4-C-U1 — a SEALED READER, not the applier's own report.

The applier saying "PASS" is the executor witnessing itself. This is a separate process that
connects on its own and asks the database what is true NOW. Every row-level write method on the
Prisma client is sealed first, and THE SEAL IS PROVEN with a real write attempt before any read --
a seal that was never tested is a claim, not a guarantee.
"""
import asyncio, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=False, quiet=True)   # pooled: reads only
from app.db.client import prisma_client                                    # noqa: E402


class Sealed(Exception):
    pass


def _seal():
    n = 0
    for attr in dir(prisma_client):
        if attr.startswith("_"):
            continue
        actions = getattr(prisma_client, attr, None)
        # ONLY the generated model action objects. `dir()` also yields plain dicts and other
        # attributes that happen to own a method called `update`, and blindly writing to those is
        # how the first version of this seal crashed on `__dict__.update`.
        if type(actions).__name__ not in ("Actions",) and not type(actions).__name__.endswith("Actions"):
            continue
        # Sealed on the CLASS, not the instance: the generated action objects refuse attribute
        # assignment, so an instance-level patch raises instead of sealing -- and a seal that
        # raised on its way in would have left the write path WIDE OPEN while looking installed.
        klass = type(actions)
        for m in ("create", "create_many", "update", "update_many", "upsert",
                  "delete", "delete_many"):
            if callable(getattr(klass, m, None)):
                setattr(klass, m, _refuse)
                n += 1
    pk = type(prisma_client)                       # same reason: the instance refuses assignment
    for m in ("execute_raw", "execute_raw_unsafe", "batch_"):
        if callable(getattr(pk, m, None)):
            setattr(pk, m, _refuse)
            n += 1
    real_q = prisma_client.query_raw

    # Bound on the CLASS, so `self` arrives as the first argument. `real_q` was captured from the
    # INSTANCE before the patch, so it is already bound and must not be handed `self` again.
    async def select_only(self, q, *a, **k):
        if not q.strip().upper().startswith("SELECT"):
            raise Sealed("query_raw is SELECT-only in this reader")
        return await real_q(q, *a, **k)
    pk.query_raw = select_only
    return n


def _refuse(*a, **k):
    raise Sealed("this reader cannot write")


async def main() -> int:
    n = _seal()
    await prisma_client.connect()

    # PROVE the seal, both halves, before trusting any read.
    proven = []
    try:
        await prisma_client.resourceservice.create(data={"clientId": "x", "resourceId": "y", "serviceId": "z"})
        print("🔴 THE SEAL DID NOT HOLD — a write went through. Stop.")
        return 2
    except Sealed:
        proven.append("row write refused")
    try:
        await prisma_client.query_raw("DELETE FROM resource_services")
        print("🔴 THE SEAL DID NOT HOLD — a non-SELECT went through. Stop.")
        return 2
    except Sealed:
        proven.append("non-SELECT refused")
    print(f"seal: {n} write methods sealed · proven by real attempts: {', '.join(proven)}\n")

    q = prisma_client.query_raw
    table = (await q("SELECT count(*)::int AS n FROM information_schema.tables "
                     "WHERE table_schema='public' AND table_name='resource_services'"))[0]["n"]
    cols = await q("SELECT column_name, data_type, is_nullable FROM information_schema.columns "
                   "WHERE table_schema='public' AND table_name='resource_services' ORDER BY column_name")
    rows = (await q("SELECT count(*)::int AS n FROM resource_services"))[0]["n"]
    fks = await q("SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint "
                  "WHERE conrelid='public.resource_services'::regclass AND contype='f' ORDER BY conname")
    idx = await q("SELECT indexname FROM pg_indexes WHERE schemaname='public' "
                  "AND tablename='resource_services' ORDER BY indexname")
    cust = (await q("SELECT count(*)::int AS n FROM customers"))[0]["n"]
    cust_u = (await q("SELECT indexdef FROM pg_indexes WHERE schemaname='public' "
                      "AND tablename='customers' AND indexname='customers_client_id_phone_key'"))[0]["indexdef"]
    bs = (await q("SELECT count(*)::int AS n FROM barber_services"))[0]["n"]
    bs_fk = (await q("SELECT count(*)::int AS n FROM pg_constraint "
                     "WHERE conrelid='public.barber_services'::regclass AND contype='f' "
                     "AND conname LIKE '%client_id%'"))[0]["n"]
    res = (await q("SELECT count(*)::int AS n FROM resources"))[0]["n"]
    svc = (await q("SELECT count(*)::int AS n FROM catalog_services"))[0]["n"]
    rsv = (await q("SELECT count(*)::int AS n FROM reservations"))[0]["n"]

    print(f"resource_services exists      : {table}")
    print(f"  columns                     : {[c['column_name'] for c in cols]}")
    print(f"  rows                        : {rows}")
    for f in fks:
        print(f"  fk  {f['conname']}  {f['def']}")
    print(f"  indexes                     : {[i['indexname'] for i in idx]}")
    print(f"customers rows                : {cust}")
    print(f"customers unique index        : {cust_u}")
    print(f"barber_services rows          : {bs} · client_id FKs on it: {bs_fk}")
    print(f"resources={res} catalog_services={svc} reservations={rsv}")

    checks = {
        "resource_services exists":                    table == 1,
        "it is EMPTY — zero rows, zero provisioning":  rows == 0,
        "five columns, exactly the contracted set":    [c["column_name"] for c in cols]
            == ["client_id", "created_at", "id", "resource_id", "service_id"],
        "three foreign keys, client_id among them":    {f["conname"] for f in fks} == {
            "resource_services_client_id_fkey", "resource_services_resource_id_fkey",
            "resource_services_service_id_fkey"},
        "four indexes":                                len(idx) == 4,
        "🔒 customers still 10 rows":                  cust == 10,
        "🔒 customers unique index unchanged":         cust_u == ("CREATE UNIQUE INDEX customers_client_id_phone_key "
                                                                 "ON public.customers USING btree (client_id, phone)"),
        "🔒 barber_services still 41 rows":            bs == 41,
        "🔒 barber_services STILL has no client_id FK — the defect was not 'helpfully' fixed":
                                                       bs_fk == 0,
        "resources 2 · services 38 · reservations 66": (res, svc, rsv) == (2, 38, 66),
    }
    print("\n── INDEPENDENT VERDICT ──")
    for label, good in checks.items():
        print(f"  {'PASS' if good else 'FAIL'}  {label}")
    await prisma_client.disconnect()
    ok = all(checks.values())
    print("\n" + ("✅ VERIFIED INDEPENDENTLY" if ok else "🔴 DISAGREES WITH THE APPLIER"))
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
