"""
One-off: fix Mister H's real cta section data.

Real, pre-existing bug found live 2026-08-18 while wiring the CtaSection banner variant: Mister H's
cta section used field names (heading_ar/body_ar/cta_text_ar) that CtaSection.jsx never reads --
it expects text_ar/subtext_ar/button_ar/link. Confirmed live: the section rendered a real HTML
structure (729 chars) but zero visible text -- innerText was empty. RK's own cta data already uses
the correct field names (text_ar/link), confirming this was a one-off seeding mistake for Mister H
specifically, not a component bug.

Also sets `variant: "banner"` (Homepage Phase 2.3) -- the one deliberate full-gold "break the
black dominance" surface, per the Design Spec, applied to Mister H's real, final closing CTA.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

_direct = os.environ.get("DIRECT_URL")
if _direct:
    os.environ["DATABASE_URL"] = _direct

from prisma import Prisma, Json


async def main():
    db = Prisma()
    await db.connect()
    client = await db.client.find_unique(where={"slug": "mr-h"})
    config = dict(client.config or {})
    content = dict(config.get("content") or {})
    sections = list(content.get("sections") or [])

    cta = next((s for s in sections if s.get("type") == "cta"), None)
    if cta is None:
        print("no cta section found -- nothing to fix")
        await db.disconnect()
        return

    old_data = dict(cta.get("data") or {})
    print("BEFORE:", old_data)

    new_data = {
        "text_ar": old_data.get("heading_ar", "جاهز تحجز؟"),
        "subtext_ar": old_data.get("body_ar", "اختر الخدمة والوقت المناسب — التأكيد فوري."),
        "button_ar": old_data.get("cta_text_ar", "احجز الآن"),
        "link": "/mr-h/reserve",
        "variant": "banner",
    }
    cta["data"] = new_data
    content["sections"] = sections
    config["content"] = content

    updated = await db.client.update(where={"id": client.id}, data={"config": Json(config)})
    fixed_cta = next(s for s in updated.config["content"]["sections"] if s["type"] == "cta")
    print("AFTER:", fixed_cta["data"])
    await db.disconnect()


asyncio.run(main())
