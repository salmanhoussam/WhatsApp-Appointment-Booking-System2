"""One-off: add the new why_choose_us section (real Arabic content) to Mister H (mr-h)."""
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

    existing_types = {s.get("type") for s in sections}
    if "why_choose_us" in existing_types:
        print("why_choose_us already exists -- no-op")
        await db.disconnect()
        return

    new_section = {
        "id": "s_why_choose_us",
        "type": "why_choose_us",
        "order": 99,
        "data": {
            "heading_ar": "ليش تختارنا",
            "items": [
                {"icon_key": "classic", "title_ar": "قص عصري وكلاسيكي", "body_ar": "ستايلات تناسب ذوقك، من الكلاسيكي إلى العصري"},
                {"icon_key": "quick_booking", "title_ar": "حجز سريع", "body_ar": "احجز موعدك خلال ثوانٍ عبر واتساب"},
                {"icon_key": "pro_stylists", "title_ar": "حلاقين محترفين", "body_ar": "بإيد خبيرة ولمسة دقيقة بكل التفاصيل"},
                {"icon_key": "luxury", "title_ar": "أجواء فاخرة", "body_ar": "تجربة استرخاء حقيقية بديكور داكن وذهبي"},
            ],
        },
    }
    sections.append(new_section)
    content["sections"] = sections
    config["content"] = content

    updated = await db.client.update(where={"id": client.id}, data={"config": Json(config)})
    print("sections now:", [s["type"] for s in updated.config["content"]["sections"]])
    await db.disconnect()


asyncio.run(main())
