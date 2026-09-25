"""P0.5 — Clinic pre-implementation production evidence. READ ONLY. SELECT ONLY.

Authorised by Salman, 2026-09-25, for U1 only:
    Customer count · Reservation count · WALK_IN rows · Resource rows ·
    module_key="clinic" rows · module_key distribution ·
    whatever is needed to judge the Patient migration's impact on existing data.

EXPLICITLY FORBIDDEN in this phase, and structurally prevented below:
    INSERT · UPDATE · DELETE · migration · prisma db push · creating a clinic tenant ·
    creating a Resource · creating a Patient · touching Customer · provisioning ·
    changing capability/registry.

THE SEAL IS THE SAME ONE Gate ① PROVED (scripts/lia_live_evidence.py): every
`prisma.actions.*Actions` write method is replaced, plus execute_raw / execute_raw_unsafe /
batch_. The seal is then PROVEN by a real write attempt BEFORE a single row is read; if the
proof fails the script exits rather than continuing.

ONE ADDITION over that script: `query_raw` is wrapped so it refuses any statement that does not
begin with SELECT. This script needs pg_indexes/pg_constraint, and "SELECT only" should be a
checkable property of the code, not a promise in a comment.
"""
import asyncio
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=False, quiet=True)

from app.db.client import prisma_client                                    # noqa: E402

_WRITES = ("create", "create_many", "update", "update_many", "upsert", "delete", "delete_many")
attempted: list[str] = []


class WriteAttempted(RuntimeError):
    pass


def seal(client) -> int:
    import prisma.actions as pactions
    sealed = 0
    for cls_name in dir(pactions):
        cls = getattr(pactions, cls_name)
        if not isinstance(cls, type) or not cls_name.endswith("Actions"):
            continue
        for meth in _WRITES:
            if not hasattr(cls, meth):
                continue
            def raiser(*a, _m=f"{cls_name}.{meth}", **kw):
                attempted.append(_m)
                raise WriteAttempted(_m)
            try:
                setattr(cls, meth, raiser)
                sealed += 1
            except Exception as exc:
                sys.exit(f"ABORT: could not seal {cls_name}.{meth} ({exc}) — refusing to read")
    for meth in ("execute_raw", "execute_raw_unsafe", "batch_"):
        if hasattr(type(client), meth):
            def raiser(*a, _m=meth, **kw):
                attempted.append(_m)
                raise WriteAttempted(_m)
            try:
                setattr(type(client), meth, raiser)
                sealed += 1
            except Exception as exc:
                sys.exit(f"ABORT: could not seal {meth} ({exc}) — refusing to read")

    # SELECT-only guard on the one raw path this script legitimately needs.
    _orig_qr = type(client).query_raw
    async def guarded(self, query, *a, **kw):
        if not str(query).strip().upper().startswith("SELECT"):
            attempted.append("query_raw(non-SELECT)")
            raise WriteAttempted("query_raw must begin with SELECT")
        return await _orig_qr(self, query, *a, **kw)
    setattr(type(client), "query_raw", guarded)
    sealed += 1
    return sealed


_AR_FOLD = (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ى", "ي"), ("ة", "ه"), ("ـ", ""))


def fold(text: str) -> str:
    """The SAME folding Lia matches names with."""
    import re
    low = (text or "").strip().lower()
    for a, b in _AR_FOLD:
        low = low.replace(a, b)
    low = re.sub(r"[ً-ْ]", "", low)
    low = re.sub(r"[^\w\s]", " ", low, flags=re.UNICODE)
    return " ".join(low.split())


def h(title: str) -> None:
    print(f"\n── {title} " + "─" * max(0, 70 - len(title)))


async def main() -> int:
    await prisma_client.connect()
    sealed = seal(prisma_client)
    try:
        await prisma_client.catalogitem.create(data={"nameAr": "SEAL-TEST"})
        print("🔴 THE SEAL DID NOT HOLD — stopping before any read")
        return 2
    except WriteAttempted:
        pass
    try:
        await prisma_client.query_raw("UPDATE customers SET name = 'x'")
        print("🔴 THE SELECT-ONLY GUARD DID NOT HOLD — stopping before any read")
        return 2
    except WriteAttempted:
        pass
    attempted.clear()
    print(f"sealed {sealed} write methods · seal proven by a real write attempt")
    print("SELECT-only guard on query_raw proven by a real non-SELECT attempt")

    # ── Tenants ───────────────────────────────────────────────────────────────
    h("TENANTS")
    clients = await prisma_client.client.find_many()
    by_id = {c.id: c for c in clients}
    print(f"   {len(clients)} client row(s)")
    for c in sorted(clients, key=lambda x: x.slug):
        print(f"   · {c.slug:<22} vertical={str(c.vertical):<8} status={c.status}")

    # ── Customer ──────────────────────────────────────────────────────────────
    h("CUSTOMER")
    customers = await prisma_client.customer.find_many()
    print(f"   TOTAL rows: {len(customers)}")
    per_tenant: dict[str, int] = {}
    for cu in customers:
        per_tenant[cu.clientId] = per_tenant.get(cu.clientId, 0) + 1
    for cid, n in sorted(per_tenant.items(), key=lambda kv: -kv[1]):
        slug = by_id[cid].slug if cid in by_id else cid
        print(f"   · {slug:<22} {n}")
    no_name = [cu for cu in customers if not (cu.name or "").strip()]
    print(f"   rows with NO name: {len(no_name)}")
    walkin_cust = [cu for cu in customers if cu.phone == "WALK_IN"]
    print(f"   rows with phone == 'WALK_IN': {len(walkin_cust)}")
    for cu in walkin_cust:
        slug = by_id[cu.clientId].slug if cu.clientId in by_id else cu.clientId
        print(f"      · {slug} · id={cu.id} · name={cu.name!r}")

    # ── Reservation ───────────────────────────────────────────────────────────
    h("RESERVATION")
    res = await prisma_client.reservation.find_many()
    print(f"   TOTAL rows: {len(res)}")
    mk: dict[str, int] = {}
    st: dict[str, int] = {}
    src: dict[str, int] = {}
    for r in res:
        mk[r.moduleKey] = mk.get(r.moduleKey, 0) + 1
        st[r.status] = st.get(r.status, 0) + 1
        src[str(r.source)] = src.get(str(r.source), 0) + 1
    print(f"   module_key distribution: {mk}")
    print(f"   status distribution:     {st}")
    print(f"   source distribution:     {src}")
    print(f"   module_key == 'clinic':  {mk.get('clinic', 0)}")
    print(f"   rows with resourceId set: {len([r for r in res if r.resourceId])}")
    print(f"   rows with barberId set:   {len([r for r in res if r.barberId])}")
    print(f"   rows with serviceId set:  {len([r for r in res if r.serviceId])}")
    print(f"   rows with customerId set: {len([r for r in res if r.customerId])}")
    print(f"   rows with customerId NULL:{len([r for r in res if not r.customerId])}")
    wi = [r for r in res if r.customerPhone == "WALK_IN"]
    print(f"   rows with customerPhone == 'WALK_IN': {len(wi)}")
    per_t: dict[str, int] = {}
    for r in res:
        per_t[r.clientId] = per_t.get(r.clientId, 0) + 1
    for cid, n in sorted(per_t.items(), key=lambda kv: -kv[1]):
        slug = by_id[cid].slug if cid in by_id else cid
        print(f"   · {slug:<22} {n}")

    # ── 🔴 Patient-migration impact: is Contact != Patient ALREADY happening? ──
    h("PATIENT MIGRATION IMPACT — one phone, how many names?")
    names_by_customer: dict[str, set] = {}
    raw_by_customer: dict[str, list] = {}
    for r in res:
        if not r.customerId:
            continue
        names_by_customer.setdefault(r.customerId, set()).add(fold(r.customerName))
        raw_by_customer.setdefault(r.customerId, []).append(r.customerName)
    multi = {k: v for k, v in names_by_customer.items() if len(v) > 1}
    print(f"   customers linked to >=1 reservation: {len(names_by_customer)}")
    print(f"   customers whose reservations carry MORE THAN ONE folded name: {len(multi)}")
    for cid_, folded in multi.items():
        cu = next((c for c in customers if c.id == cid_), None)
        slug = by_id[cu.clientId].slug if cu and cu.clientId in by_id else "?"
        print(f"      · {slug} · customer={cid_[:8]} · stored_name={cu.name!r} "
              f"· names_used={sorted(set(raw_by_customer[cid_]))}")
    multi_res = {k: v for k, v in raw_by_customer.items() if len(v) > 1}
    print(f"   customers with MORE THAN ONE reservation: {len(multi_res)}")

    h("PATIENT MIGRATION IMPACT — duplicate customer names inside one tenant")
    for cid, slug in sorted(((c.id, c.slug) for c in clients), key=lambda kv: kv[1]):
        rows = [cu for cu in customers if cu.clientId == cid and (cu.name or "").strip()]
        seen: dict[str, list] = {}
        for cu in rows:
            seen.setdefault(fold(cu.name), []).append(cu)
        dups = {k: v for k, v in seen.items() if len(v) > 1}
        if dups:
            print(f"   · {slug}: {len(dups)} duplicated folded name(s)")
            for k, v in dups.items():
                print(f"      - {k!r} x{len(v)} · phones={[c.phone for c in v]}")
    print("   (an empty list above means no tenant has two customers sharing a folded name)")

    # ── Resource ──────────────────────────────────────────────────────────────
    h("RESOURCE")
    resources = await prisma_client.resource.find_many()
    print(f"   TOTAL rows: {len(resources)}")
    types: dict[str, int] = {}
    for rr in resources:
        types[rr.type] = types.get(rr.type, 0) + 1
    print(f"   type values in use: {types or '{} (none)'}")
    for rr in resources:
        slug = by_id[rr.clientId].slug if rr.clientId in by_id else rr.clientId
        print(f"   · {slug} · {rr.name!r} type={rr.type} active={rr.isActive} "
              f"hours={'set' if rr.workingHours else 'NULL'}")

    # ── Barber (for comparison only — NOT touched) ────────────────────────────
    h("BARBER (comparison only)")
    barbers = await prisma_client.barber.find_many()
    print(f"   TOTAL rows: {len(barbers)}  · active: {len([b for b in barbers if b.isActive])}")
    print(f"   with own workingHours: {len([b for b in barbers if b.workingHours])}")

    # ── CatalogService ────────────────────────────────────────────────────────
    h("CATALOG SERVICE")
    svcs = await prisma_client.catalogservice.find_many()
    print(f"   TOTAL rows: {len(svcs)} · active: {len([s for s in svcs if s.isActive])}")
    durs: dict[int, int] = {}
    for s_ in svcs:
        durs[s_.durationMin] = durs.get(s_.durationMin, 0) + 1
    print(f"   durationMin distribution: {dict(sorted(durs.items()))}")
    bs = await prisma_client.barberservice.find_many()
    print(f"   BarberService link rows: {len(bs)}")

    # ── WhatsApp conversation identity ────────────────────────────────────────
    h("WHATSAPP CONVERSATION")
    convs = await prisma_client.whatsappconversation.find_many()
    print(f"   TOTAL rows: {len(convs)}")
    print(f"   with customerId set:  {len([c for c in convs if c.customerId])}")
    print(f"   with customerId NULL: {len([c for c in convs if not c.customerId])}")

    # ── Real indexes/constraints (SELECT only) ────────────────────────────────
    h("INDEXES on reservations / customers / resources / patients")
    rows = await prisma_client.query_raw(
        "SELECT tablename, indexname, indexdef FROM pg_indexes "
        "WHERE schemaname='public' AND tablename IN "
        "('reservations','customers','resources','patients','patient_contacts','resource_services') "
        "ORDER BY tablename, indexname"
    )
    for row in rows:
        print(f"   · {row['tablename']:<14} {row['indexname']}")
        print(f"       {row['indexdef']}")

    h("SEAL — final state")
    print(f"   write attempts intercepted during the read: {len(attempted)} {attempted}")
    await prisma_client.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
