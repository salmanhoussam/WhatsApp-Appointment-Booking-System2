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
from app.repositories import gallery_repo as _gallery


async def replace_hero_image(client_id: str, image_url: str):
    return await _sections.update_section_field(client_id, "hero", bg_image_url=image_url)


async def get_hero_image(client_id: str):
    return await _sections.get_section_field(client_id, "hero", "bg_image_url")


# ── Media/Content Foundation (2026-08-17) ───────────────────────────────────────────────────────
# Real replacement for the JSON-blob write path above: hero media (image OR video) now lives in a
# real GalleryImage row (imageType="page_hero"), not a hardcoded field in Client.config.content.
# The read side is public_service.py's own job (it injects this into the public config response,
# so HeroSection.jsx needs zero changes) -- this Service only owns the write + a direct read.

async def replace_page_media(client_id: str, image_type: str, url: str, media_type: str = "image", alt_text: Optional[str] = None):
    """The one real Operation this Sprint adds: ReplaceMedia on any page-level singleton slot
    (page_hero, page_logo, ...), image or video, same function either way."""
    return await _gallery.replace_page_media(client_id, image_type, url, media_type, alt_text)


async def get_page_media(client_id: str, image_type: str):
    """Direct read (used by the admin Renderer to show what's currently set); the public-facing
    read happens via public_service.py's own injection into the tenant config response."""
    row = await _gallery.find_active_page_media(client_id, image_type)
    if not row:
        return None
    return {"url": row.url, "media_type": row.mediaType, "alt_text": row.altText}


# ── Homepage Phase 2.4 (2026-08-18) — collection-shaped page media (page_gallery, ...) ─────────
# Same Capability, a different Operation shape: AddMedia/RemoveMedia/ReorderMedia on a collection,
# not ReplaceMedia on a singleton. Kept in this same Service file (one Capability, one Service),
# backed by gallery_repo.py's new collection functions.

async def list_page_media(client_id: str, image_type: str):
    rows = await _gallery.list_page_media(client_id, image_type)
    return [
        {
            "id": row.id,
            "url": row.url,
            "media_type": row.mediaType,
            "alt_text": row.altText,
            "caption_ar": row.caption_ar,
            "sort_order": row.sort_order,
        }
        for row in rows
    ]


async def add_page_media(
    client_id: str,
    image_type: str,
    url: str,
    media_type: str = "image",
    alt_text: Optional[str] = None,
    caption_ar: Optional[str] = None,
):
    return await _gallery.add_page_media(client_id, image_type, url, media_type, alt_text, caption_ar)


async def remove_page_media(client_id: str, media_id: str):
    return await _gallery.remove_page_media(client_id, media_id)


async def reorder_page_media(client_id: str, image_type: str, ordered_ids: list[str]):
    return await _gallery.reorder_page_media(client_id, image_type, ordered_ids)
