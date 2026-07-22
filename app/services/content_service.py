"""
Content Capability — Service (Tenant OS: Contract -> Service -> Repository -> Database).

Content is its own Capability, per TENANT_OS_PLAN.md S1a: kept separate from Site Configuration
even though both currently persist into Client.config -- Capability (what the client can do) and
Persistence (where it's stored) are different axes; Design Principle 5 ("One Capability. One
Service.") means Content gets its own canonical Service rather than sharing client_service.py's
update_client (whose ClientUpdate schema only covers name/slug/phone/email/password anyway -- it
was never actually usable for Content's page-copy fields, so this is genuinely new Implementation-
stage work, not a rerouting of an existing path).

Two real fields today: the Hero section's title, the Story section's heading. Both followed the
identical read-merge-write shape -- exactly two independent instances of the same behavior, which
is the Abstraction Rule's own stated bar for extraction (per CONTENT_CAPABILITY_ARCHITECTURE_
REVIEW.md). Extracted into _get_section_field/_update_section_field below; the named per-field
functions are now thin wrappers, kept because content.py's routes are deliberately NOT merged into
one generic endpoint yet -- that's the Operation-execution Dispatcher question, still deferred.
"""

from typing import Optional

from prisma import Json

from app.repositories import admin_client_repo as _client_repo


async def _get_section_field(client_id: str, section_type: str, field: str):
    """Real, shared read: find a section by type, return one of its data fields."""
    client = await _client_repo.find_client_by_id(client_id)
    if not client:
        raise ValueError("Client not found")
    config = dict(getattr(client, "config", None) or {})
    content = dict(config.get("content") or {})
    sections = list(content.get("sections") or [])
    section = next((s for s in sections if s.get("type") == section_type), None)
    if section is None:
        return None
    return (section.get("data") or {}).get(field)


async def _update_section_field(client_id: str, section_type: str, **fields):
    """
    Real, shared write: find a section by type, patch the given data fields, write the whole
    config back -- matches the same read-merge-write shape scripts/seed_page_content.py already
    uses. `fields` are only applied when not None (partial update).
    """
    client = await _client_repo.find_client_by_id(client_id)
    if not client:
        raise ValueError("Client not found")

    config = dict(getattr(client, "config", None) or {})
    content = dict(config.get("content") or {})
    sections = list(content.get("sections") or [])

    section = next((s for s in sections if s.get("type") == section_type), None)
    if section is None:
        raise ValueError(f"This tenant's page has no {section_type} section to update")

    data = dict(section.get("data") or {})
    for key, value in fields.items():
        if value is not None:
            data[key] = value
    section["data"] = data

    content["sections"] = sections
    config["content"] = content

    return await _client_repo.update_client(client_id, {"config": Json(config)})


async def update_hero_title(
    client_id: str,
    title_ar: Optional[str] = None,
    title_en: Optional[str] = None,
):
    return await _update_section_field(client_id, "hero", title_ar=title_ar, title_en=title_en)


async def get_hero_title(client_id: str):
    """Read-side helper for Discovery/verification -- not itself a write path."""
    return await _get_section_field(client_id, "hero", "title_ar")


async def update_story_heading(
    client_id: str,
    heading_ar: Optional[str] = None,
    heading_en: Optional[str] = None,
):
    return await _update_section_field(client_id, "story", heading_ar=heading_ar, heading_en=heading_en)


async def get_story_heading(client_id: str):
    return await _get_section_field(client_id, "story", "heading_ar")
