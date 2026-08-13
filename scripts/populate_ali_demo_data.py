"""
scripts/populate_ali_demo_data.py

One-off: populate the `ali` tenant with market-realistic (NOT customer-supplied, NOT copied from
a single real shop) demo data, per Salman's explicit reclassification of `ali` as a demo tenant
(2026-08-14) -- superseding the earlier "hold, wait for real customer data" decision from the same
session, once Salman clarified the actual goal is a convincing product demo, not a real customer
onboarding.

Full sourcing, methodology, and decision record:
.claudedocs/work/ali-demo-market-data/2026-08-14/summary.md

What this script does (backend data only -- page_content/settings.json are seeded separately via
the existing `seed_page_content.py` pipeline, not duplicated here):

1. Updates the 6 existing CatalogService rows' prices from the placeholder flat $5.00 to
   market-realistic, varied prices built from real Beirut/Mount Lebanon barbershop listings
   (5 real shops cross-referenced via Fresha) -- durations unchanged (already reasonable).
2. Assigns the "Ali" barber to all 6 services via BarberService (was 0 rows -- explicitly held
   until pricing was real, per the same session's earlier decision).
3. Sets Client.primary_color -- a professional navy, distinct from RK's (#2F4F4F, teal-slate) and
   Alzabt's own marketing violet (#7C3AED), never applied to tenant surfaces per the Two Distinct
   Brand Layers principle.

Explicitly NOT done here (deliberate, see the summary doc):
- No WhatsApp number set -- left null. Salman's instruction allowed a "clear placeholder OR
  disabled"; disabled is the more conservative of the two explicitly-sanctioned options.
- No `image_url` populated on any CatalogService -- every other tenant in this platform (RK,
  alzabt-demo, every Demo Builder tenant) uses the icon-only fallback, not photos; staying
  consistent rather than introducing photography risk for one tenant only.
- catalog/store service NOT activated -- no clear demo reason to sell retail products.

Usage:
    python scripts/populate_ali_demo_data.py              # preview only
    python scripts/populate_ali_demo_data.py --execute    # actually write
"""

import asyncio
import os
import sys
import argparse

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv()

from prisma import Prisma

SLUG = "ali"
BARBER_ID = "ae6a4ed7-40d8-40fc-b431-4af59a0bae86"
PRIMARY_COLOR = "#1C3D5A"  # professional navy -- distinct from RK/Alzabt, tenant's own brand only

# Real-market-informed prices (USD) -- built from 5 real Beirut/Mount Lebanon barbershops
# (London Base Hazmieh, Crew Cuts, The Chop House, Edy Atallah Men's Hair Specialist, The Fade
# Cartel), cross-referenced via Fresha's real Lebanon barber listings, 2026-08-14. Not copied
# verbatim from any single shop's own price tier -- deliberately varied within the real observed
# range. keyed by name_ar (matches the existing CatalogService rows, not re-created).
PRICES = {
    "شعر":            15.0,  # Haircut -- matches London Base ($15) / Edy Atallah ($15) directly
    "دقن":             8.0,  # Beard -- between Crew Cuts ($5) and Chop House ($7)/higher quotes
    "شعر ودقن":       20.0,  # Haircut & Beard -- between Chop House ($15) and Edy Atallah/London Base ($20-25)
    "تمشيط أو تسريح": 10.0,  # Styling -- grooming add-on tier, below a full haircut
    "حنة أو صبغة":    25.0,  # Henna/Dye -- barbershop-tier touch-up, well below full-salon color ($95+)
    "كرياتين":        40.0,  # Keratin -- anchored to Edy Atallah's real "from $30" barbershop quote, +90min
}


async def main(execute: bool):
    db = Prisma()
    await db.connect()
    try:
        client = await db.client.find_unique(where={"slug": SLUG})
        if not client:
            print(f"[ERROR] Client '{SLUG}' not found.")
            return
        client_id = client.id

        # -- 1. Update CatalogService prices ---------------------------------------------------
        services = await db.catalogservice.find_many(where={"clientId": client_id})
        updated_ids = []
        for s in services:
            new_price = PRICES.get(s.nameAr)
            if new_price is None:
                print(f"[SKIP] No researched price for '{s.nameAr}' -- left unchanged (${s.price}).")
                continue
            print(f"[PLAN] {s.nameAr}: ${s.price} -> ${new_price}")
            if execute:
                await db.catalogservice.update(where={"id": s.id}, data={"price": new_price})
                print(f"[OK] Updated {s.nameAr} -> ${new_price}")
            updated_ids.append(s.id)

        # -- 2. Assign the barber to all services (was 0 rows) ---------------------------------
        existing_assignments = await db.barberservice.find_many(
            where={"clientId": client_id, "barberId": BARBER_ID}
        )
        if existing_assignments:
            print(f"[OK] {len(existing_assignments)} BarberService row(s) already exist -- reusing.")
        else:
            print(f"[PLAN] Assign barber {BARBER_ID} to {len(updated_ids)} services.")
            if execute:
                for sid in updated_ids:
                    await db.barberservice.create(data={
                        "clientId": client_id, "barberId": BARBER_ID, "serviceId": sid,
                    })
                print(f"[OK] BarberService: barber assigned to {len(updated_ids)} services.")

        # -- 3. Set primary_color ----------------------------------------------------------------
        if client.primary_color:
            print(f"[OK] primary_color already set: {client.primary_color}")
        else:
            print(f"[PLAN] Set primary_color = {PRIMARY_COLOR}")
            if execute:
                await db.client.update(where={"id": client_id}, data={"primary_color": PRIMARY_COLOR})
                print(f"[OK] primary_color set to {PRIMARY_COLOR}")

        if not execute:
            print("\n[DRY RUN] Pass --execute to apply these changes.")
            return

        print("\n--- Summary ---")
        print(f"client_id: {client_id}")
        print("[DONE] Ali demo data populated -- market-realistic, not customer-supplied.")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Actually apply changes (default: dry run)")
    args = parser.parse_args()
    asyncio.run(main(args.execute))
