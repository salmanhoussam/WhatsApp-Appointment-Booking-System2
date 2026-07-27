"""
Media Capability — Service (Tenant OS: Contract -> Service -> Repository -> Database).

Sprint 2, first real field: the Hero section's background image (`bg_image_url`). Media is its
own Capability, per .claudedocs/architecture/capabilities/media.md (real sub-capability: "Upload
image/video into a specific context (hero, logo, product, unit gallery)") -- distinct from
Content, even though this particular field lives in the exact same `hero` section Content's own
`title_ar` does. Capability and Persistence are different axes (ratified
.claudedocs/reviews/editing-engine-review.md §1a); Media owns
"where a URL gets written once uploaded," Content owns "the page copy" -- the raw section
read-merge-write mechanic is shared via content_sections_repo.py, not duplicated a third time.

The actual file upload is NOT this Service's job -- it reuses the existing, real
`POST /api/v1/admin/upload/` endpoint (context=`page_hero`), which already uploads to Supabase
storage and returns a URL without deciding where that URL is used. This Service's only job is the
second step: writing an already-uploaded URL into the right place.
"""

from typing import Optional

from app.repositories import content_sections_repo as _sections


async def replace_hero_image(client_id: str, image_url: str):
    return await _sections.update_section_field(client_id, "hero", bg_image_url=image_url)


async def get_hero_image(client_id: str):
    return await _sections.get_section_field(client_id, "hero", "bg_image_url")
