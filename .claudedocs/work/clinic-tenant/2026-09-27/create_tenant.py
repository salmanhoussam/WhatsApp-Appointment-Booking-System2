"""Create `cliniclab-test` in production — per CLINIC_TEST_TENANT_CONTRACT.md as amended 2026-09-27.

Run:   venv/bin/python .claudedocs/work/clinic-tenant/2026-09-27/create_tenant.py            # dry run
       venv/bin/python .claudedocs/work/clinic-tenant/2026-09-27/create_tenant.py --execute  # writes

AUTHORIZATION (verbatim, Salman 2026-09-27):
    «أوافق على إنشاء cliniclab-test في Production وفق CLINIC_TEST_TENANT_CONTRACT.md، بدون أي
     تغييرات أخرى.»  + option (هـ): the phone is a placeholder and the WhatsApp guarantee is the
     explicit guard in reservation_service.NO_MERCHANT_WHATSAPP_VERTICALS, proven locally by
     scripts/test_clinic_no_merchant_whatsapp.py (barber=1 send, clinic=0).

WHAT §6 REQUIRES OF THIS SCRIPT, AND WHERE EACH IS:
    read before -> write -> read after         `before()`, `write()`, `after()`
    per-tenant row counts compared             `census()`, called on both sides
    refuse if the slug exists                  `guard_slug_absent()`
    refuse if a row would land elsewhere       every create passes clientId explicitly; `after()`
                                               re-counts EVERY other tenant and fails on any delta
    created-ids.json written as it goes        `Ids.save()` after EVERY insert -- so a crash halfway
                                               still leaves a complete rollback manifest (§10.1/T-0)
    DIRECT_URL only                            `_db_target.resolve(direct=True)`
    no db push, no migration                   nothing here touches schema

WHY THE ROW ASSIGNMENT IS WHAT IT IS -- it is not free choice, each gate needs it:
    S1 «معاينة عامة»   30m  patients    + instructions   -> doctor1 AND doctor2   (T-4 both doctors)
    S2 «معاينة مطوّلة»  60m  patients                     -> NOBODY               (T-3 zero + ن-٨ live)
    S3 «إجراء داخلي»   30m  staff_only                   -> doctor1               (T-6 live 409)
    doctor1 has workingHours; doctor2 has NULL            -> falls back to Client.config (ق-٤-د, T-4)
    => resource_services = 3 rows, asymmetric 2 vs 1, exactly §2's "٢-٣".
    🔴 S3 MUST be assigned to doctor1 or T-6 measures the wrong thing: create_reservation checks
    resource eligibility BEFORE bookable_by, so an unassigned staff_only service would return
    RESOURCE_SERVICE_MISMATCH and never reach SERVICE_NOT_BOOKABLE_ONLINE.
"""
import asyncio
import json
import os
import secrets
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _db_target                                                          # noqa: E402
os.environ["DATABASE_URL"] = _db_target.resolve(direct=True, quiet=True)   # DIRECT_URL, §6
from prisma import Json                                                    # noqa: E402
from app.db.client import prisma_client                                    # noqa: E402
from app.core.security import get_password_hash                            # noqa: E402
from app.core.phone import normalize_for_storage                           # noqa: E402

EXECUTE = "--execute" in sys.argv
SLUG = "cliniclab-test"
IDS_PATH = os.path.join(HERE, "created-ids.json")

# §5: an explicit test name, no real clinic, no real person, no routable number.
CLIENT_PHONE = "96100000000"          # placeholder; the guard is what prevents any send (§4 amended)
OWNER_EMAIL = "cliniclab-test@dev.invalid"
OWNER_PHONE = normalize_for_storage("00000001")   # canonical storage form, phone-numbers.md

WORKING_HOURS = {                     # doctor1's own hours, and the Client.config fallback
    "sunday": None,
    "monday": {"open": "09:00", "close": "17:00"},
    "tuesday": {"open": "09:00", "close": "17:00"},
    "wednesday": {"open": "09:00", "close": "17:00"},
    "thursday": {"open": "09:00", "close": "17:00"},
    "friday": {"open": "09:00", "close": "13:00"},
    "saturday": {"open": "10:00", "close": "14:00"},
}

SECTIONS = [                          # CLINIC_WEB_UX_CONTRACT §1, in its ratified order
    {"type": "hero", "data": {
        "title_ar": "عيادة اختبار", "subtitle_ar": "عيادةٌ لاختبار النظام — ليست عيادةً حقيقيّة",
        "cta_text_ar": "احجز موعد", "bg_image_url": "", "bg_type": "color"}},
    {"type": "featured_items", "data": {"heading_ar": "خدماتنا", "limit": 6,
                                        "bg_image_url": "", "bg_type": "color"}},
    {"type": "staff", "data": {"heading_ar": "أطبّاؤنا"}},
    {"type": "hours", "data": {"heading_ar": "أوقات العمل", "rows": [
        {"day_ar": "الاثنين — الخميس", "open_ar": "09:00", "close_ar": "17:00", "closed": False},
        {"day_ar": "الجمعة", "open_ar": "09:00", "close_ar": "13:00", "closed": False},
        {"day_ar": "السبت", "open_ar": "10:00", "close_ar": "14:00", "closed": False},
        {"day_ar": "الأحد", "open_ar": "—", "close_ar": "—", "closed": True}]}},
    {"type": "location", "data": {"para_ar": "عنوانٌ تجريبيّ — لا مكانَ حقيقيّاً لهذه العيادة",
                                  "maps_url": "", "tags": [], "bg_image_url": "", "bg_type": "color"}},
    {"type": "cta", "data": {"text_ar": "احجز موعدك الآن", "link": "", "accent": "#2E7D8F",
                             "bg_image_url": "", "bg_type": "color"}},
]

SERVICES = [
    dict(key="S1", nameAr="معاينة عامة",   durationMin=30, bookableBy="patients",
         instructions="يُفضّل الحضور قبل الموعد بعشر دقائق.", price=None),
    dict(key="S2", nameAr="معاينة مطوّلة", durationMin=60, bookableBy="patients",
         instructions=None, price=None),
    dict(key="S3", nameAr="إجراء داخلي",   durationMin=30, bookableBy="staff_only",
         instructions=None, price=None),
]
RESOURCES = [
    dict(key="D1", name="د. تجربة أولى",  specialty="طب عام",  workingHours=WORKING_HOURS),
    dict(key="D2", name="د. تجربة ثانية", specialty="أسنان",   workingHours=None),
]
ELIGIBILITY = [("D1", "S1"), ("D2", "S1"), ("D1", "S3")]      # asymmetric: 2 vs 1


class Ids:
    """The rollback manifest. Saved after EVERY insert, not at the end (§10.1 / T-0)."""
    def __init__(self):
        self.d = {"slug": SLUG, "created_at_utc": datetime.now(timezone.utc).isoformat(),
                  "client_id": None, "client_service_id": None, "user_id": None,
                  "category_id": None, "service_ids": [], "resource_ids": [],
                  "resource_service_ids": []}

    def save(self):
        with open(IDS_PATH, "w", encoding="utf-8") as f:
            json.dump(self.d, f, ensure_ascii=False, indent=2)


async def census():
    """Row counts per tenant, for every table this script can touch. Compared before/after so a
    stray write to ANY other tenant is measured, not hoped against."""
    rows = await prisma_client.query_raw("""
        SELECT c.slug,
               (SELECT count(*) FROM client_services   x WHERE x.client_id = c.id) AS client_services,
               (SELECT count(*) FROM users             x WHERE x.client_id = c.id) AS users,
               (SELECT count(*) FROM catalog_categories x WHERE x.client_id = c.id) AS categories,
               (SELECT count(*) FROM catalog_services  x WHERE x.client_id = c.id) AS services,
               (SELECT count(*) FROM resources         x WHERE x.client_id = c.id) AS resources,
               (SELECT count(*) FROM resource_services x WHERE x.client_id = c.id) AS resource_services,
               (SELECT count(*) FROM reservations      x WHERE x.client_id = c.id) AS reservations,
               (SELECT count(*) FROM customers         x WHERE x.client_id = c.id) AS customers,
               (SELECT count(*) FROM patients          x WHERE x.client_id = c.id) AS patients
        FROM clients c ORDER BY c.slug
    """)
    return {r["slug"]: {k: int(v) for k, v in r.items() if k != "slug"} for r in rows}


async def guard_slug_absent():
    existing = await prisma_client.client.find_first(where={"slug": SLUG})
    if existing:
        raise SystemExit(f"⛔ REFUSED — slug {SLUG!r} already exists (id={existing.id}). "
                         f"This script creates; it never adopts or edits an existing tenant.")


async def write(ids: Ids):
    client = await prisma_client.client.create(data={
        "name": "عيادة اختبار", "slug": SLUG, "phone": CLIENT_PHONE,
        "name_ar": "عيادة اختبار", "name_en": "Clinic Test",
        "vertical": "clinic", "status": "active", "pageType": "normal",
        "primary_color": "#2E7D8F", "currency": "USD",
        # Prisma Python needs Json() around a dict for a Json column -- a plain dict is
        # rejected outright (the first --execute attempt failed here and wrote NOTHING,
        # which is exactly why the manifest is saved only after a create returns).
        "config": Json({"working_hours": WORKING_HOURS, "content": {"sections": SECTIONS}}),
        # whatsapp_number and templateKey are left unset -> NULL (both nullable). phone CANNOT be
        # NULL (schema.prisma:21) which is the whole reason for the amended §4.
    })
    ids.d["client_id"] = client.id
    ids.save()
    cid = client.id

    cs = await prisma_client.clientservice.create(
        data={"clientId": cid, "serviceKey": "reservations", "isActive": True})
    ids.d["client_service_id"] = cs.id
    ids.save()

    user = await prisma_client.user.create(data={
        "clientId": cid, "email": OWNER_EMAIL,
        # A random password nobody records. Nothing in P5-F needs a login, and writing a real
        # password into a repo file to make one convenient is not a trade worth making.
        "password_hash": get_password_hash(secrets.token_urlsafe(24)),
        "fullName": "مالك عيادة الاختبار", "role": "TENANT_ADMIN", "phone": OWNER_PHONE,
    })
    ids.d["user_id"] = user.id
    ids.save()

    cat = await prisma_client.catalogcategory.create(data={
        "clientId": cid, "moduleKey": "catalog", "nameAr": "معاينات", "sortOrder": 0})
    ids.d["category_id"] = cat.id
    ids.save()

    svc_by_key = {}
    for i, sp in enumerate(SERVICES):
        row = await prisma_client.catalogservice.create(data={
            "clientId": cid, "categoryId": cat.id, "nameAr": sp["nameAr"],
            "durationMin": sp["durationMin"], "bookableBy": sp["bookableBy"],
            "instructions": sp["instructions"], "isActive": True, "sortOrder": i,
        })
        svc_by_key[sp["key"]] = row.id
        ids.d["service_ids"].append(row.id)
        ids.save()

    res_by_key = {}
    for i, rp in enumerate(RESOURCES):
        row = await prisma_client.resource.create(data={
            "clientId": cid, "type": "doctor", "name": rp["name"],
            "specialty": rp["specialty"],
            # doctor2 stays NULL on purpose -> falls back to Client.config (ق-٤-د, T-4)
            "workingHours": Json(rp["workingHours"]) if rp["workingHours"] else None,
            "isActive": True, "sortOrder": i,
        })
        res_by_key[rp["key"]] = row.id
        ids.d["resource_ids"].append(row.id)
        ids.save()

    for dk, sk in ELIGIBILITY:
        row = await prisma_client.resourceservice.create(data={
            "clientId": cid, "resourceId": res_by_key[dk], "serviceId": svc_by_key[sk]})
        ids.d["resource_service_ids"].append(row.id)
        ids.save()

    return cid, svc_by_key, res_by_key


EXPECTED_NEW = {"client_services": 1, "users": 1, "categories": 1, "services": 3,
                "resources": 2, "resource_services": 3,
                "reservations": 0, "customers": 0, "patients": 0}


async def main():
    await prisma_client.connect()
    try:
        print(f"target: DIRECT_URL · slug={SLUG} · mode={'EXECUTE' if EXECUTE else 'DRY RUN'}")
        await guard_slug_absent()
        print("✅ guard — slug absent")

        before = await census()
        print(f"before: {len(before)} tenants")

        if not EXECUTE:
            print("\nDRY RUN — nothing written. Planned:")
            print(f"  clients 1 · client_services 1 · users 1 · categories 1 · services 3 "
                  f"· resources 2 · resource_services 3")
            print(f"  eligibility (asymmetric): {ELIGIBILITY}")
            print("Re-run with --execute to write.")
            return 0

        cid, svcs, ress = await write(Ids())
        print(f"✅ written · client_id={cid}")

        after = await census()

        # every OTHER tenant must be byte-identical
        drift = {s: (before[s], after[s]) for s in before if before[s] != after.get(s)}
        print(f"{'🔴' if drift else '✅'} other tenants unchanged — {len(drift)} drifted"
              + (f": {list(drift)}" if drift else ""))

        got = after.get(SLUG)
        bad = {k: (v, got.get(k)) for k, v in EXPECTED_NEW.items() if got.get(k) != v}
        print(f"{'🔴' if bad else '✅'} new tenant shape matches §2 — {got}")
        if bad:
            print(f"   mismatched: {bad}")
        print(f"✅ ids manifest: {IDS_PATH}")
        return 1 if (drift or bad) else 0
    finally:
        await prisma_client.disconnect()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
