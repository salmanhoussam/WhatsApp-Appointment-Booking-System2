"""Clone the RK Barbershop template into a new tenant.

Reads scripts/data/rk/template.json (D5) and provisions a complete, bookable barber tenant.

WHY A TEMPLATE AND NOT A COPY OF RK. RK is a live production tenant and it is contaminated: two
`doctor` Resources from a clinic experiment, a dental row in the legacy services table, QA barbers
and services, 7 test users out of 8 -- and, worst, `barber_services` holds only 3 links of which 2
belong to an INACTIVE barber, i.e. ONE bookable combination out of 21. Cloning RK literally
produces a demo where almost nothing can be booked. The template is a cleaned extraction; every
exclusion is listed in its own `_meta`.

DECISIONS APPLIED (Salman, 2026-09-07) -- see the template's `_meta.decisions_applied`:
  D1  two ACTIVE barbers, so "choose your barber" is a real step. RK's own second barber is a real
      person at a live shop and is NOT copied; the template ships neutral placeholders.
  D2  alzabt-demo's researched prices ($5-25), mapped 1:1 onto RK's six services by duration and
      meaning. RK's own 5.00-everywhere placeholder pricing is not inherited.
  D3  catalog_services ONLY. The duplicate `catalog_items(requires_booking)` model is ignored
      entirely -- its surviving rows were deleted from production 2026-09-07.
  D4  RK itself is never touched by this script. It only reads a JSON file.
  D5  the template lives beside this script's data, so it is read directly.

REUSES THE PROVEN PATH, does not reinvent it: `provisioning_service.provision_barber_domain()`
creates the services category, the six CatalogServices, the first Barber and its cross-links --
the same function the live demo builder calls. This script adds only what that function does not
cover: the Client/User/ClientService rows, the store category and its products, and the SECOND
barber with its own cross-links.

INSERT ORDER follows the blueprint's dependency map exactly (§3), including its three hazards:
  H1  CatalogCategory.parentId is a self-reference -> the template is FLAT, no nesting.
  H2  User.barberId is @unique AND an FK -> the admin is always created with barberId = NULL.
  H3  BarberService.clientId has NO foreign key -> Postgres will silently accept a stale
      client_id. Asserted in code after writing, because the database will not do it.

Usage:
    venv/bin/python scripts/seed_from_rk_template.py --slug demo-barber-x \
        --name-ar "صالون تجريبي" --phone "+9611234567" --dry-run
    venv/bin/python scripts/seed_from_rk_template.py ... --execute
"""
import argparse
import asyncio
import json
import os
import secrets
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

import _db_target  # noqa: E402  -- validates the target before anything connects

from prisma import Json  # noqa: E402
from app.db.client import prisma_client  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.services import provisioning_service  # noqa: E402
from app.repositories import barber_repo, barber_service_repo  # noqa: E402
# Same alias provisioning_service.py itself uses (its line 39) -- the module is
# admin_catalog_repo; there is no `catalog_repo`.
from app.repositories import admin_catalog_repo as catalog_repo  # noqa: E402

TEMPLATE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "rk", "template.json")
TRIAL_DAYS = 14


def load_template() -> dict:
    with open(TEMPLATE_PATH, encoding="utf-8") as fh:
        return json.load(fh)


async def preflight(slug: str, email: str, phone: str) -> list[str]:
    """Collision checks BEFORE any write. Each of these is a real unique constraint."""
    problems = []
    if await prisma_client.client.find_first(where={"slug": slug}):
        problems.append(f"slug '{slug}' already exists")
    if await prisma_client.client.find_first(where={"phone": phone}):
        problems.append(f"Client.phone '{phone}' already exists (it is UNIQUE)")
    if await prisma_client.user.find_first(where={"email": email}):
        problems.append(f"User.email '{email}' already exists (globally unique)")
    return problems


async def run(args) -> None:
    tpl = load_template()
    c = tpl["client"]

    slug     = args.slug
    name_ar  = args.name_ar
    name_en  = args.name_en or slug
    phone    = args.phone
    email    = args.email or f"{slug}@demo.salmansaas.com"
    currency = args.currency or c["currency"]
    colour   = args.primary_color or c["primary_color"]        # F3: parameterised, not hardcoded
    barbers  = [b.strip() for b in args.barbers.split(",")] if args.barbers \
               else [b["name"] for b in tpl["barbers"]]
    services = [(s["name_ar"], s["name_en"], s["duration_min"], s["price"])
                for s in tpl["catalog_services"]]

    print(f"\ntemplate      : {tpl['_meta']['template']} v{tpl['_meta']['version']}")
    print(f"slug          : {slug}")
    print(f"name_ar       : {name_ar}")
    print(f"currency      : {currency}   primary_color: {colour}")
    print(f"barbers  (D1) : {barbers}")
    print(f"services (D2) : {len(services)}  prices {[s[3] for s in services]}")
    print(f"store items   : {len(tpl['catalog_items_store'])}")
    print(f"page sections (D6): {[x['type'] for x in tpl['page_content']['sections']]}")
    print(f"client_services: {tpl['client_services']}")
    print(f"expected barber_services links: {len(barbers)} x {len(services)} = {len(barbers)*len(services)}")

    await prisma_client.connect()
    try:
        problems = await preflight(slug, email, phone)
        for p in problems:
            print(f"  ❌ {p}")
        if problems:
            sys.exit("\nABORT: pre-flight collisions. Nothing was written.")
        print("  ✅ pre-flight: slug / phone / email all free")

        if not args.execute:
            print("\nDRY RUN — nothing written.")
            return

        # ── 1. Client ──────────────────────────────────────────────────────────────
        # F2: config carries working_hours AND hero/story. demo_service's _DEFAULT_CONFIG has
        # hero+story but no working_hours; the alzabt script has working_hours but no hero/story --
        # each path loses what the other supplies. The template has all three.
        from datetime import datetime, timedelta, timezone

        # D6: the page itself. Without content.sections the tenant renders
        # "الصفحة قيد الإعداد" -- bookable but pageless, which fails
        # rules/tenant-onboarding.md's own completion gate. {{name_ar}} is the only placeholder,
        # substituted here so the hero carries the real shop name from the first render.
        sections = json.loads(
            json.dumps(tpl["page_content"]["sections"]).replace("{{name_ar}}", name_ar)
        )
        config = dict(c["config"])
        config["content"] = {"sections": sections}

        client = await prisma_client.client.create(data={
            "name":            name_ar,
            "name_ar":         name_ar,
            "name_en":         name_en,
            "slug":            slug,
            "phone":           phone,
            "primary_color":   colour,
            "currency":        currency,
            "config":          Json(config),
            "payment_methods": c["payment_methods"],
            "unit_types":      [],
            "status":          "active",
            "lifecycle_state": "trial",
            "trial_ends_at":   datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS),
            "service_type":    c["service_type"],
            "vertical":        c["vertical"],
            "pageType":        c["page_type"],
        })
        print(f"\n  1. Client            {client.id}")

        # ── 2. ClientService — must precede anything gated by require_service() ─────
        for key in tpl["client_services"]:
            await prisma_client.clientservice.create(
                data={"clientId": client.id, "serviceKey": key, "isActive": True})
        print(f"  2. ClientService     {tpl['client_services']}")

        # ── 3. TENANT_ADMIN — 3rd on purpose: an email collision surfaces before domain rows ──
        temp_password = secrets.token_urlsafe(9)
        await prisma_client.user.create(data={
            "clientId":      client.id,
            "email":         email,
            "password_hash": get_password_hash(temp_password),
            "fullName":      name_en,
            "role":          "TENANT_ADMIN",
            # H2: never a copied barberId -- it is @unique AND an FK to Barber.
            "barberId":      None,
        })
        print(f"  3. TENANT_ADMIN      {email}")

        # ── 4+7+8+9 (first barber) — the proven shared path ────────────────────────
        await provisioning_service.provision_barber_domain(
            client_id=client.id, barber_name=barbers[0], services=services)
        print(f"  4. services category + {len(services)} CatalogServices + barber '{barbers[0]}' + links")

        svc_rows = await prisma_client.catalogservice.find_many(where={"clientId": client.id})
        service_ids = [s.id for s in svc_rows]

        # ── 8b+9b. D1's second (and any further) barber ────────────────────────────
        for i, bname in enumerate(barbers[1:], start=1):
            b = await barber_repo.create_barber({
                "clientId":     client.id,
                "name":         bname,
                "workingHours": Json(c["config"]["working_hours"]),
                "sortOrder":    i,
            })
            await barber_service_repo.set_services_for_barber(client.id, b.id, service_ids)
            print(f"  5. barber '{bname}' + {len(service_ids)} links")

        # ── 4b+6. Store category and its products ──────────────────────────────────
        store_cat_tpl = next(c2 for c2 in tpl["catalog_categories"] if c2["module_key"] == "store")
        store_cat = await catalog_repo.create_category({
            "clientId":  client.id,
            "moduleKey": "store",
            "nameAr":    store_cat_tpl["name_ar"],
            "nameEn":    store_cat_tpl["name_en"],
            "sortOrder": store_cat_tpl["sort_order"],
        })
        for item in tpl["catalog_items_store"]:
            await prisma_client.catalogitem.create(data={
                "clientId":   client.id,
                "categoryId": store_cat.id,
                "nameAr":     item["name_ar"],
                "nameEn":     item["name_en"],
                "price":      item["price"],
                "currency":   currency,
                "isActive":   True,
                "sortOrder":  item["sort_order"],
            })
        print(f"  6. store category + {len(tpl['catalog_items_store'])} products")

        # ── Verification ───────────────────────────────────────────────────────────
        print("\n  ── verification ──")
        links = await prisma_client.barberservice.find_many(where={"clientId": client.id})
        barber_rows = await prisma_client.barber.find_many(where={"clientId": client.id})
        items = await prisma_client.catalogitem.find_many(where={"clientId": client.id})
        expected = len(barbers) * len(services)

        # H3: BarberService.clientId has NO foreign key. Postgres accepts a stale value silently.
        stale = [l for l in links if str(l.clientId) != str(client.id)]
        print(f"  barbers            {len(barber_rows)} (expect {len(barbers)})")
        print(f"  catalog_services   {len(svc_rows)} (expect {len(services)})")
        print(f"  catalog_items      {len(items)} (expect {len(tpl['catalog_items_store'])})")
        print(f"  barber_services    {len(links)} (expect {expected})")
        print(f"  H3 stale clientId  {len(stale)} (MUST be 0)")
        currencies = {s.currency for s in svc_rows}
        print(f"  F1 service currency {currencies} (expect {{'{currency}'}})")
        fresh = await prisma_client.client.find_unique(where={"id": client.id})
        written = (((fresh.config or {}).get("content") or {}).get("sections")) or []
        expected_sections = len(tpl["page_content"]["sections"])
        print(f"  D6 page sections   {len(written)} (expect {expected_sections}) "
              f"{[x.get('type') for x in written]}")

        ok = (len(barber_rows) == len(barbers) and len(svc_rows) == len(services)
              and len(links) == expected and not stale and currencies == {currency}
              and len(written) == expected_sections)
        print(f"\n  {'✅ ALL CHECKS PASSED' if ok else '❌ CHECKS FAILED — inspect before using this tenant'}")
        base = os.getenv("FRONTEND_URL", "https://demo.salmansaas.com")
        print(f"\n  public    {base}/{slug}")
        print(f"  dashboard {base}/{slug}/dashboard")
        print(f"  login     {email}  /  {temp_password}")
    finally:
        await prisma_client.disconnect()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Clone the RK barbershop template into a new tenant.")
    ap.add_argument("--slug", required=True)
    ap.add_argument("--name-ar", required=True)
    ap.add_argument("--name-en")
    ap.add_argument("--phone", required=True, help="Client.phone is UNIQUE NOT NULL")
    ap.add_argument("--email", help="defaults to {slug}@demo.salmansaas.com")
    ap.add_argument("--currency", help="overrides the template (F1: services inherit it)")
    ap.add_argument("--primary-color", help="overrides the template (F3)")
    ap.add_argument("--barbers", help='comma-separated, overrides the template placeholders (D1)')
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--execute", action="store_true")
    asyncio.run(run(ap.parse_args()))
