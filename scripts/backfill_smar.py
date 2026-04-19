"""
scripts/backfill_smar.py
Backfill null branding/config fields for the 'smar' client.

Run once:
    python -m scripts.backfill_smar

Safe to re-run — only updates fields that are currently null.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import os
_direct = os.environ.get("DIRECT_URL")
if _direct:
    os.environ["DATABASE_URL"] = _direct

from prisma import Prisma

# ── Defaults to inject when fields are null ───────────────────────────────────
SMAR_DEFAULTS = {
    "primary_color":   "#d4a853",
    "whatsapp_number": "96171000000",
    "instagram_url":   "https://www.instagram.com/beitsmar",
    "currency":        "USD",
    # hero_video_url left intentionally — set via Admin Settings UI
}


async def main():
    db = Prisma()
    await db.connect()
    print("\n==========================================")
    print("  Phase A - Backfill smar Null Fields")
    print("==========================================\n")
    try:
        client = await db.client.find_unique(where={"slug": "smar"})
        if not client:
            print("[ERR] Client 'smar' not found in DB.")
            return

        print(f"Found: {client.name} (id={client.id})\n")

        patch = {}
        for field, default in SMAR_DEFAULTS.items():
            current = getattr(client, field, None)
            if not current:
                patch[field] = default
                print(f"  [SET] {field}: null -> '{default}'")
            else:
                print(f"  [OK]  {field}: '{current}' - already set, skipped")

        if patch:
            await db.client.update(where={"id": client.id}, data=patch)
            print(f"\n[DONE] Updated {len(patch)} field(s) for '{client.slug}'")
        else:
            print("\n[DONE] All fields already populated - nothing to update")

        print("\n==========================================\n")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
