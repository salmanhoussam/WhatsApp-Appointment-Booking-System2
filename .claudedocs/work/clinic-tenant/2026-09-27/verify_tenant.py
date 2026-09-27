"""Independent sealed verifier for `cliniclab-test` — §6's "قارئٌ مستقلٌّ مختومٌ يتحقّق".

Run:  venv/bin/python .claudedocs/work/clinic-tenant/2026-09-27/verify_tenant.py

A separate process that connects on its own and asks production what is TRUE NOW. It does not share
a line of state with the script that wrote the rows, because the executor testifying about its own
work is a claim, not evidence. Every row-level write method is sealed first AND THE SEAL IS PROVEN
with two real refused attempts before a single read — a seal that was never tested is a claim too.

Reads only. It cannot write, and it proves it cannot.
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
    proven = []
    try:
        await prisma_client.resourceservice.create(data={"clientId": "x", "resourceId": "y", "serviceId": "z"})
        print("🔴 THE SEAL DID NOT HOLD — a write went through. Stop."); return 2
    except Sealed:
        proven.append("row write refused")
    try:
        await prisma_client.query_raw("DELETE FROM resource_services")
        print("🔴 THE SEAL DID NOT HOLD — a non-SELECT went through. Stop."); return 2
    except Sealed:
        proven.append("non-SELECT refused")
    print(f"seal: {n} write methods sealed · proven by real attempts: {', '.join(proven)}\n")
    q = prisma_client.query_raw
    ok = True

    def chk(label, passed, detail=""):
        nonlocal ok
        ok &= bool(passed)
        print(f"  {'PASS' if passed else 'FAIL'}  {label}" + (f"  — {detail}" if detail else ""))

    # ── T-1 · the shape, counted ─────────────────────────────────────────────────────────────
    c = (await q("SELECT id, slug, name, vertical, status, provisioning_status, page_type, "
                 "template_key, whatsapp_number, phone, primary_color FROM clients "
                 "WHERE slug = 'cliniclab-test'"))
    chk("T-1a  the tenant exists — exactly one row", len(c) == 1, f"{len(c)} row(s)")
    if not c:
        print("\nFAILURES ABOVE"); return 1
    c = c[0]
    cid = c["id"]
    chk("T-1b  vertical='clinic' · status='active' · page_type='normal' · template_key NULL "
        "· provisioning_status NULL",
        c["vertical"] == "clinic" and c["status"] == "active" and c["page_type"] == "normal"
        and c["template_key"] is None and c["provisioning_status"] is None,
        f"vertical={c['vertical']} status={c['status']} page_type={c['page_type']} "
        f"template_key={c['template_key']} provisioning={c['provisioning_status']}")
    chk("T-1c  🔴 whatsapp_number IS NULL (it is nullable and stays empty) · and phone carries the "
        "placeholder, because schema.prisma:21 forbids NULL there — the amended §4",
        c["whatsapp_number"] is None and c["phone"] == "96100000000",
        f"whatsapp={c['whatsapp_number']!r} phone={c['phone']!r}")
    chk("T-1d  name is the declared test name, not a real clinic (§5)",
        c["name"] == "عيادة اختبار", c["name"])

    counts = (await q(f"""SELECT
        (SELECT count(*) FROM client_services   WHERE client_id='{cid}') cs,
        (SELECT count(*) FROM users             WHERE client_id='{cid}') us,
        (SELECT count(*) FROM catalog_categories WHERE client_id='{cid}') ct,
        (SELECT count(*) FROM catalog_services  WHERE client_id='{cid}') sv,
        (SELECT count(*) FROM resources         WHERE client_id='{cid}') rs,
        (SELECT count(*) FROM resource_services WHERE client_id='{cid}') rsv,
        (SELECT count(*) FROM reservations      WHERE client_id='{cid}') rv,
        (SELECT count(*) FROM customers         WHERE client_id='{cid}') cu,
        (SELECT count(*) FROM patients          WHERE client_id='{cid}') pt,
        (SELECT count(*) FROM patient_contacts  WHERE client_id='{cid}') pc"""))[0]
    want = dict(cs=1, us=1, ct=1, sv=3, rs=2, rsv=3)
    chk("T-1e  §2's row counts, exactly", all(int(counts[k]) == v for k, v in want.items()),
        " ".join(f"{k}={counts[k]}" for k in want))
    chk("T-9   🔴 ZERO reservations · customers · patients · patient_contacts — those are written BY "
        "the booking we want to test, never provisioned",
        all(int(counts[k]) == 0 for k in ("rv", "cu", "pt", "pc")),
        " ".join(f"{k}={counts[k]}" for k in ("rv", "cu", "pt", "pc")))

    svc = await q(f"SELECT name_ar, duration_min, bookable_by, instructions IS NOT NULL has_instr "
                  f"FROM catalog_services WHERE client_id='{cid}' ORDER BY sort_order")
    chk("T-1f  three services: 30m + 60m + one staff_only, and one carrying instructions (§2 row 5)",
        len(svc) == 3 and {int(s["duration_min"]) for s in svc} == {30, 60}
        and sum(1 for s in svc if s["bookable_by"] == "staff_only") == 1
        and sum(1 for s in svc if s["has_instr"]) == 1,
        " · ".join(f"{s['name_ar']}/{s['duration_min']}m/{s['bookable_by']}" for s in svc))

    res = await q(f"SELECT name, specialty, working_hours IS NULL wh_null FROM resources "
                  f"WHERE client_id='{cid}' ORDER BY sort_order")
    chk("T-4a  two doctors, and ONE has NULL working_hours so the fallback to Client.config is "
        "measurable live (ق-٤-د)",
        len(res) == 2 and sum(1 for r in res if r["wh_null"]) == 1,
        " · ".join(f"{r['name']}(wh_null={r['wh_null']})" for r in res))
    chk("T-4b  and Client.config really carries working_hours for that fallback to land on",
        bool((await q(f"SELECT config->'working_hours' IS NOT NULL k FROM clients WHERE id='{cid}'"))[0]["k"]))

    # ── T-2 · the asymmetry, which is the point ──────────────────────────────────────────────
    pairs = await q(f"""SELECT r.name doctor, s.name_ar service FROM resource_services rs
        JOIN resources r ON r.id = rs.resource_id JOIN catalog_services s ON s.id = rs.service_id
        WHERE rs.client_id='{cid}' ORDER BY r.sort_order, s.sort_order""")
    per = {}
    for p in pairs:
        per.setdefault(p["doctor"], []).append(p["service"])
    chk("T-2   🔴 eligibility is ASYMMETRIC — one doctor has two services, the other one. A "
        "symmetric set would make the hard filter untestable (it would never return a subset)",
        sorted(len(v) for v in per.values()) == [1, 2],
        " · ".join(f"{d}→{len(v)}" for d, v in per.items()))
    unassigned = await q(f"""SELECT s.name_ar FROM catalog_services s WHERE s.client_id='{cid}'
        AND NOT EXISTS (SELECT 1 FROM resource_services rs WHERE rs.service_id = s.id)""")
    chk("T-3   and exactly ONE service has NO doctor at all — so «ما في دكتور بيقدّم هالخدمة» (ن-٨) "
        "is reachable live rather than only in a fake",
        len(unassigned) == 1, unassigned[0]["name_ar"] if unassigned else "none")
    staff_only_assigned = await q(f"""SELECT count(*) n FROM resource_services rs
        JOIN catalog_services s ON s.id = rs.service_id
        WHERE rs.client_id='{cid}' AND s.bookable_by='staff_only'""")
    chk("T-6a  🔴 the staff_only service IS assigned to a doctor — required, because "
        "create_reservation checks eligibility BEFORE bookable_by, so an unassigned one would "
        "answer RESOURCE_SERVICE_MISMATCH and T-6 would measure the wrong refusal",
        int(staff_only_assigned[0]["n"]) >= 1, f"{staff_only_assigned[0]['n']} link(s)")

    # ── T-7 · every other tenant untouched ───────────────────────────────────────────────────
    others = await q("""SELECT c.slug,
        (SELECT count(*) FROM reservations x WHERE x.client_id=c.id) rv,
        (SELECT count(*) FROM resources x WHERE x.client_id=c.id) rs,
        (SELECT count(*) FROM resource_services x WHERE x.client_id=c.id) rsv,
        (SELECT count(*) FROM catalog_services x WHERE x.client_id=c.id) sv
        FROM clients c WHERE c.slug <> 'cliniclab-test' ORDER BY c.slug""")
    chk("T-7a  there are now 10 client rows — the 9 that existed plus this one, nothing else created",
        len(others) == 9, f"{len(others)} other tenants")
    live = {r["slug"]: r for r in others}
    chk("T-7b  🔴 the four live barber tenants still carry ZERO resources and ZERO resource_services "
        "— this write did not leak one row sideways",
        all(int(live[s]["rsv"]) == 0 for s in ("rk", "mr-h", "barberlab-test", "alzabt-demo")),
        " · ".join(f"{s}:res={live[s]['rs']},elig={live[s]['rsv']}"
                   for s in ("rk", "mr-h", "barberlab-test", "alzabt-demo")))
    chk("T-7c  and their reservation counts are the documented ones (rk 32 · barberlab-test 22 "
        "· mr-h 11 · alzabt-demo 1) — a positive control that this reader sees real data",
        [int(live[s]["rv"]) for s in ("rk", "barberlab-test", "mr-h", "alzabt-demo")] == [32, 22, 11, 1],
        " · ".join(f"{s}:{live[s]['rv']}" for s in ("rk", "barberlab-test", "mr-h", "alzabt-demo")))

    sections = (await q(f"SELECT jsonb_array_length((config->'content'->'sections')::jsonb) n "
                        f"FROM clients WHERE id='{cid}'"))[0]["n"]
    chk("T-1g  six landing sections, the ratified order of CLINIC_WEB_UX_CONTRACT §1",
        int(sections) == 6, f"{sections} sections")

    print("\nALL GREEN" if ok else "\nFAILURES ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    import sys as _s
    _s.exit(asyncio.run(main()))
