"""
One-off: set Mister H's real instagram_url/whatsapp_number, needed for the new Footer.

Real values already extracted this session (2026-08-18) from the tenant's real Instagram
screenshot: handle @mr.salon.h, phone 71455767 (already used inside LocationSection's para_ar).
Formatted whatsapp_number the same way RK's real value is stored (full international digits, no
"+", no spaces -- confirmed via a live read of RK's own Client row: "96176985477").
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

from prisma import Prisma


async def main():
    db = Prisma()
    await db.connect()
    updated = await db.client.update(
        where={"slug": "mr-h"},
        data={
            "instagram_url": "https://instagram.com/mr.salon.h",
            "whatsapp_number": "96171455767",
        },
    )
    print("instagram_url:", updated.instagram_url)
    print("whatsapp_number:", updated.whatsapp_number)
    await db.disconnect()


asyncio.run(main())
