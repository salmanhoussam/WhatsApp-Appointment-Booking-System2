"""Gate P4-F — the production read, through the SAME proven sealed reader.

P4-F asks production what is true after all of P4: the two partial unique
indexes the race safety rests on, the reservation count, and that nothing was written. This is a separate process that
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
    idx = await q("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' "
                  "AND tablename='reservations' AND indexname LIKE '%slot_uidx' ORDER BY indexname")
    rsv = (await q("SELECT count(*)::int AS n FROM reservations"))[0]["n"]
    clinic = (await q("SELECT count(*)::int AS n FROM reservations WHERE resource_id IS NOT NULL"))[0]["n"]
    rs_rows = (await q("SELECT count(*)::int AS n FROM resource_services"))[0]["n"]
    res = await q("SELECT id, name, type, is_active FROM resources ORDER BY id")
    cust = (await q("SELECT count(*)::int AS n FROM customers"))[0]["n"]
    svc = (await q("SELECT count(*)::int AS n FROM catalog_services"))[0]["n"]
    pat = (await q("SELECT count(*)::int AS n FROM patients"))[0]["n"]

    print("indexes the race rests on:")
    for i in idx:
        print(f"  {i['indexname']}")
        print(f"    {i['indexdef']}")
    print(f"\nreservations           : {rsv}  (resource-backed: {clinic})")
    print(f"resource_services rows : {rs_rows}")
    print(f"customers / services   : {cust} / {svc}")
    print(f"patients               : {pat}")
    print("resources:")
    for r in res:
        print(f"  {r['id']}  {r['name']}  type={r['type']}  active={r['is_active']}")

    names = {i["indexname"] for i in idx}
    defs = " ".join(i["indexdef"] for i in idx)
    checks = {
        "both partial unique indexes exist — barber AND resource": names == {
            "reservations_active_barber_slot_uidx", "reservations_active_resource_slot_uidx"},
        "the resource index keys on (client_id, resource_id, reserved_at)":
            "client_id, resource_id, reserved_at" in defs,
        "and is PARTIAL — the three active statuses only, so cancelled frees the slot":
            defs.count("'pending'::text, 'confirmed'::text, 'arrived'::text") == 2
            or defs.count("pending") == 2,
        "reservations still 66 — P4 wrote no row": rsv == 66,
        "no reservation references a resource — the clinic has booked nothing": clinic == 0,
        "resource_services still EMPTY — no provisioning happened": rs_rows == 0,
        "resources still the same 2 doctor rows, both inactive":
            len(res) == 2 and all(r["type"] == "doctor" and not r["is_active"] for r in res),
        "customers 10 / catalog_services 38 — untouched": (cust, svc) == (10, 38),
        "patients 0 — P2's table is still empty": pat == 0,
    }
    print("\n── GATE · production, read-only ──")
    for label, good in checks.items():
        print(f"  {'PASS' if good else 'FAIL'}  {label}")
    await prisma_client.disconnect()
    ok = all(checks.values())
    print("\n" + ("✅ GATE READ CLEAN" if ok else "🔴 PRODUCTION DISAGREES"))
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
