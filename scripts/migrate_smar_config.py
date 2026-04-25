"""
scripts/migrate_smar_config.py
Populate the `config` JSON column for the 'smar' client with structured
homepage assets, social links, and branding metadata.

Run once (safe to re-run — merges into existing config, does not overwrite):
    python -m scripts.migrate_smar_config
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# Use DIRECT_URL for schema-level operations
_direct = os.environ.get("DIRECT_URL")
if _direct:
    os.environ["DATABASE_URL"] = _direct

from prisma import Prisma

# ── Smar config payload ───────────────────────────────────────────────────────

_BASE = "https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar"

SMAR_CONFIG = {
    "branding": {
        "logo_url":        f"{_BASE}/homepage/logo.png",
        "favicon_url":     f"{_BASE}/homepage/favicon.ico",
        "primary_color":   "#d4a853",
        "font_ar":         "Cairo",
        "font_en":         "Cormorant Garamond",
    },
    "homepage_assets": {
        "hero_video_url":  f"{_BASE}/homepage/Logo_Formation_Video_Ready.mp4",
        "hero_poster_url": f"{_BASE}/homepage/hero_poster.jpg",
        "gallery_folder":  f"{_BASE}/gallery/",
    },
    "social_links": {
        "whatsapp":  "96178727986",
        "instagram": "https://www.instagram.com/beitsmar",
        "maps_url":  None,
    },
    "booking": {
        "currency":         "USD",
        "payment_methods":  ["cash", "card", "whatsapp", "whish", "omt"],
        "min_stay_nights":  1,
        "check_in_time":    "15:00",
        "check_out_time":   "12:00",
    },
    "features": {
        "spatial":    True,
        "listings":   True,
        "booking":    True,
        "payment":    True,
        "gallery":    True,
    },
}


async def main():
    db = Prisma()
    await db.connect()

    try:
        client = await db.client.find_first(where={"slug": "smar"})
        if not client:
            print("❌  No client with slug='smar' found. Run backfill_smar.py first.")
            return

        existing_config = getattr(client, "config", None) or {}

        # Deep-merge: existing keys win, new keys are added
        merged = {**SMAR_CONFIG, **existing_config}

        updated = await db.client.update(
            where={"id": client.id},
            data={"config": merged},
        )

        print(f"✅  config updated for client '{updated.slug}' (id={updated.id})")
        import json
        print(json.dumps(merged, indent=2, ensure_ascii=False))

    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
