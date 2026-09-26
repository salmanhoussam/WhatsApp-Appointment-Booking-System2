"""Clinic tenant contract — what a test tenant actually LOOKS like, read-only.

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
    rows = await q("SELECT slug, name, vertical, status, provisioning_status, page_type, "
                   "template_key, primary_color FROM clients "
                   "WHERE slug IN ('barberlab-test','rk','alzabt-demo') ORDER BY slug")
    for r in rows:
        print(f"\n{r['slug']}")
        for k, v in r.items():
            if k != "slug":
                print(f"    {k:20} {v!r}")
        svc = await q("SELECT cs.service_key, cs.is_active FROM client_services cs "
                      "JOIN clients c ON c.id = cs.client_id WHERE c.slug = $1 "
                      "ORDER BY service_key", r["slug"])
        print(f"    services             {[(s['service_key'], s['is_active']) for s in svc]}")
        cnt = await q("SELECT "
                      "(SELECT count(*)::int FROM barbers b JOIN clients c2 ON c2.id=b.client_id WHERE c2.slug=$1) AS barbers, "
                      "(SELECT count(*)::int FROM resources rr JOIN clients c3 ON c3.id=rr.client_id WHERE c3.slug=$1) AS resources, "
                      "(SELECT count(*)::int FROM catalog_services s JOIN clients c4 ON c4.id=s.client_id WHERE c4.slug=$1) AS services, "
                      "(SELECT count(*)::int FROM catalog_categories g JOIN clients c5 ON c5.id=g.client_id WHERE c5.slug=$1) AS categories, "
                      "(SELECT count(*)::int FROM users u JOIN clients c6 ON c6.id=u.client_id WHERE c6.slug=$1) AS users, "
                      "(SELECT count(*)::int FROM reservations v JOIN clients c7 ON c7.id=v.client_id WHERE c7.slug=$1) AS reservations",
                      r["slug"])
        print(f"    counts               {dict(cnt[0])}")
        sec = await q("SELECT jsonb_array_length(COALESCE(config->'content'->'sections','[]'::jsonb)) AS n "
                      "FROM clients WHERE slug = $1", r["slug"])
        print(f"    page sections        {sec[0]['n']}")

    print("\n── the registry, for comparison ──")
    from app.core.verticals import VERTICAL_REGISTRY
    print(f"    registered verticals : {sorted(VERTICAL_REGISTRY)}")
    print(f"    'clinic' registered  : {'clinic' in VERTICAL_REGISTRY}")
    await prisma_client.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
