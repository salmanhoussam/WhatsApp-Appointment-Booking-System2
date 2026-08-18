"""
Content Capability — Service (Tenant OS: Contract -> Service -> Repository -> Database).

Content is its own Capability, per .claudedocs/architecture/capabilities/site-configuration.md's
Ownership Matrix: kept separate from Site Configuration
even though both currently persist into Client.config -- Capability (what the client can do) and
Persistence (where it's stored) are different axes; Design Principle 5 ("One Capability. One
Service.") means Content gets its own canonical Service rather than sharing client_service.py's
update_client (whose ClientUpdate schema only covers name/slug/phone/email/password anyway -- it
was never actually usable for Content's page-copy fields, so this is genuinely new Implementation-
stage work, not a rerouting of an existing path).

The raw section-array read-merge-write mechanic now lives in
app/repositories/content_sections_repo.py, shared with Media Capability's own media_service.py
(Sprint 2) -- extracted once a second Capability needed the identical shape, per the Abstraction
Rule. This file keeps only Content's own business-meaning wrappers (which section type, which
field) and its own public function names; content.py's routes still call these by name, not a
generic Dispatcher.
"""

from typing import Optional

from app.repositories import content_sections_repo as _sections


async def update_hero_title(
    client_id: str,
    title_ar: Optional[str] = None,
    title_en: Optional[str] = None,
):
    return await _sections.update_section_field(client_id, "hero", title_ar=title_ar, title_en=title_en)


async def get_hero_title(client_id: str):
    """Read-side helper for Discovery/verification -- not itself a write path."""
    return await _sections.get_section_field(client_id, "hero", "title_ar")


async def update_story_heading(
    client_id: str,
    heading_ar: Optional[str] = None,
    heading_en: Optional[str] = None,
):
    return await _sections.update_section_field(client_id, "story", heading_ar=heading_ar, heading_en=heading_en)


async def get_story_heading(client_id: str):
    return await _sections.get_section_field(client_id, "story", "heading_ar")


async def set_section_enabled(client_id: str, section_type: str, enabled: bool):
    return await _sections.set_section_enabled(client_id, section_type, enabled)


async def reorder_sections(client_id: str, ordered_types: list[str]):
    return await _sections.reorder_sections(client_id, ordered_types)
