"""
One-off: add the new `products` homepage section to rk's real stored config.sections[].

Products/Services Separation, Track B (2026-08-20) -- rk is the only real tenant with live Store
data today (real "منتجات العناية" / Grooming Products category, module_key='store'; confirmed via
the Capability-to-Section Audit, .claudedocs/work/capability-to-section-audit/2026-08-20/summary.md).
Not run for mr-h -- it has no `store` capability active, and ProductsSection.jsx self-gates to
null regardless, so this would be a no-op there.

Calls app/services/content_service.py's real add_section() (Tenant OS Section Editor Phase 5's
"materialize on first touch" gap, closed for real use this Track) -- through the validated Service
boundary, never raw Prisma against Client.config directly, per section_schemas.py's own
going-forward convention (2026-08-19): any script touching section content must call
content_service.py.
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

from app.db.client import prisma_client
from app.services import content_service

SLUG = "rk"


async def main():
    await prisma_client.connect()
    client = await prisma_client.client.find_unique(where={"slug": SLUG})
    if client is None:
        print(f"no client found for slug={SLUG!r} -- nothing to do")
        await prisma_client.disconnect()
        return

    before = await content_service.list_sections(client.id)
    print("BEFORE:", [s.get("type") for s in before])

    after = await content_service.add_section(client.id, "products", enabled=True)
    print("AFTER:", [(s.get("type"), s.get("order"), s.get("enabled")) for s in after])

    await prisma_client.disconnect()


asyncio.run(main())
