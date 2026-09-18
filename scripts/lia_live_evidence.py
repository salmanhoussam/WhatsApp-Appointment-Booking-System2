"""Lia live verification — what ACTUALLY landed in the database. READ ONLY.

Run:  venv/bin/python scripts/lia_live_evidence.py [--since "2026-09-18T12:30"] [--minutes 45]

WHY THIS EXISTS, in Salman's own words: «لا تعتمد على رسالة WhatsApp وحدها». Lia saying
«تمام، سجّلت» proves what Lia SAID. This proves what was WRITTEN — and the two are different
claims, which is the whole reason the 2026-09-17 live test could look like it was working while
it was quietly creating a duplicate.

THE WRITE BAN IS ENFORCED AT THE PRISMA BOUNDARY, NOT AT THE SERVICE BOUNDARY.
    Every `prisma.actions.*Actions` class has its create/update/upsert/delete methods replaced,
    plus `execute_raw`, `execute_raw_unsafe` and `batch_`. The seal is then PROVEN by a real
    attempt before a single row is read; if the proof fails the script exits rather than
    continuing. Sealing one service instead would only block the path we expect -- the general
    seal is what caught `log_security_event` writing a real `securityauditlog` row during a run
    that was called read-only (Gate ①, 2026-09-18).

NEGATIVE BOUNDARY. The deployment reaches `rk` and `mr-h` as well as the tenant under test, so
their emptiness during the window is REPORTED, not assumed. And per the plan's own rule: an
absent row is equally consistent with a bug and with a safe refusal, so the audit log is read
alongside it -- a refusal that left no trace is not proof that anything was refused.
"""
import argparse
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=False, quiet=True)

from app.db.client import prisma_client                                    # noqa: E402

TARGET = "barberlab-test"
BOUNDARY = ("rk", "mr-h")
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
    return sealed


_AR_FOLD = (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ى", "ي"), ("ة", "ه"), ("ـ", ""))


def fold(text: str) -> str:
    """The SAME folding Lia matches names with — so 'is this a duplicate' is asked her way."""
    import re
    low = (text or "").strip().lower()
    for a, b in _AR_FOLD:
        low = low.replace(a, b)
    low = re.sub(r"[ً-ْ]", "", low)
    low = re.sub(r"[^\w\s]", " ", low, flags=re.UNICODE)
    return " ".join(low.split())


def h(title: str) -> None:
    print(f"\n── {title} " + "─" * max(0, 68 - len(title)))


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", help="ISO local wall clock, e.g. 2026-09-18T12:30")
    ap.add_argument("--minutes", type=int, default=45, help="window when --since is absent")
    args = ap.parse_args()

    # The window is built in UTC because `createdAt` is a REAL instant (default now()), unlike
    # `reservedAt`, which is the wall-clock-labelled-UTC value this platform stores everywhere.
    # Mixing the two conventions is exactly the mistake the timezone gate was opened for.
    since = (datetime.fromisoformat(args.since).astimezone(timezone.utc) if args.since
             else datetime.now(timezone.utc) - timedelta(minutes=args.minutes))

    await prisma_client.connect()
    sealed = seal(prisma_client)
    try:
        await prisma_client.catalogitem.create(data={"nameAr": "SEAL-TEST"})
        print("🔴 THE SEAL DID NOT HOLD — stopping before any read")
        return 2
    except WriteAttempted:
        pass
    attempted.clear()
    print(f"sealed {sealed} write methods · seal proven by a real attempt")
    print(f"window: since {since.isoformat()} (UTC)   ·   target: {TARGET}")

    ids = {}
    for slug in (TARGET, *BOUNDARY):
        row = await prisma_client.client.find_first(where={"slug": slug})
        if row:
            ids[slug] = row.id
    if TARGET not in ids:
        print(f"🔴 {TARGET} not found"); return 2
    cid = ids[TARGET]

    h("RESERVATIONS created in the window")
    res = await prisma_client.reservation.find_many(
        where={"clientId": cid, "createdAt": {"gte": since}}, order={"createdAt": "asc"})
    print(f"   {len(res)} row(s)")
    for r in res:
        print(f"   · id={r.id}")
        print(f"     customer={r.customerName!r} phone={r.customerPhone!r} customerId={r.customerId}")
        # RAW, never reformatted: the stored value IS a local wall clock wearing a UTC label, and
        # printing a converted instant here would hide the one defect this field can carry.
        print(f"     reservedAt(RAW)={r.reservedAt}  duration={r.durationMin}  status={r.status}")
        print(f"     source={r.source!r}  module={r.moduleKey!r}  barberId={r.barberId}  "
              f"serviceId={r.serviceId}")
        print(f"     metadata={r.metadata}  clientId={r.clientId}")
        if r.clientId != cid:
            print("     🔴 WRONG TENANT")

    h("CUSTOMERS created in the window  (the walk-in merge is measured here)")
    cust = await prisma_client.customer.find_many(
        where={"clientId": cid, "createdAt": {"gte": since}}, order={"createdAt": "asc"})
    print(f"   {len(cust)} row(s)")
    for c in cust:
        print(f"   · id={c.id}  phone={c.phone!r}  name={c.name!r}")
    walk = await prisma_client.customer.find_many(where={"clientId": cid, "phone": "WALK_IN"})
    if walk:
        for w in walk:
            linked = await prisma_client.reservation.count(where={"customerId": w.id})
            print(f"   🟡 WALK_IN row {w.id} name={w.name!r} — {linked} reservation(s) point at it")
        print("   ⇒ record as 'Confirmed behavior / Product risk', never PASS")

    h("CATALOG rows created in the window")
    items = await prisma_client.catalogitem.find_many(
        where={"clientId": cid, "createdAt": {"gte": since}}, order={"createdAt": "asc"})
    svcs = await prisma_client.catalogservice.find_many(
        where={"clientId": cid, "createdAt": {"gte": since}}, order={"createdAt": "asc"})
    for label, rows in (("CatalogItem (product)", items), ("CatalogService (bookable)", svcs)):
        print(f"   {label}: {len(rows)}")
        for r in rows:
            extra = f" duration={r.durationMin}" if hasattr(r, "durationMin") else ""
            print(f"   · id={r.id} {r.nameAr!r} price={r.price} active={r.isActive}{extra}")

    h("DUPLICATE CHECK — the whole active catalogue, folded (D1's own question)")
    all_items = await prisma_client.catalogitem.find_many(where={"clientId": cid, "isActive": True})
    groups: dict[str, list] = {}
    for i in all_items:
        groups.setdefault(fold(i.nameAr), []).append(i)
    dups = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"   active items: {len(all_items)}   ·   duplicate names: {len(dups)}")
    for name, rows in dups.items():
        print(f"   🔴 {name!r} ×{len(rows)}  ids={[r.id for r in rows]}  "
              f"prices={[str(r.price) for r in rows]}")

    h("AUDIT TRAIL — every Lia decision in the window, refusals included")
    logs = await prisma_client.securityauditlog.find_many(
        where={"timestamp": {"gte": since}, "eventType": {"startswith": "lia"}},
        order={"timestamp": "asc"})
    print(f"   {len(logs)} row(s)")
    for l in logs:
        tenant = next((s for s, i in ids.items() if i == l.clientId), l.clientId)
        print(f"   · {l.timestamp:%H:%M:%S}  {l.eventType:<28} tenant={tenant}  actor={l.actor}")
        print(f"     {l.detail}")

    h("NEGATIVE BOUNDARY — the deployment reaches these, the test does not")
    for slug in BOUNDARY:
        if slug not in ids:
            print(f"   {slug}: not found"); continue
        b = ids[slug]
        counts = {
            "reservations": await prisma_client.reservation.count(
                where={"clientId": b, "createdAt": {"gte": since}}),
            "items": await prisma_client.catalogitem.count(
                where={"clientId": b, "createdAt": {"gte": since}}),
            "services": await prisma_client.catalogservice.count(
                where={"clientId": b, "createdAt": {"gte": since}}),
            "customers": await prisma_client.customer.count(
                where={"clientId": b, "createdAt": {"gte": since}}),
        }
        bad = any(counts.values())
        print(f"   {'🔴' if bad else '✅'} {slug}: {counts}")
    print("   ⚠️  zero rows is NECESSARY, not SUFFICIENT — pair it with a refusal in the audit")

    h("what left this process")
    print(f"   production writes attempted: {len(attempted) or 0}  {attempted or ''}")
    print("   WhatsApp sends: 0 — this script has no send boundary at all")
    await prisma_client.disconnect()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
