"""
Content Capability — Service (Tenant OS: Contract -> Service -> Repository -> Database).

Content is its own Capability, per TENANT_OS_PLAN.md S1a: kept separate from Site Configuration
even though both currently persist into Client.config -- Capability (what the client can do) and
Persistence (where it's stored) are different axes; Design Principle 5 ("One Capability. One
Service.") means Content gets its own canonical Service rather than sharing client_service.py's
update_client (whose ClientUpdate schema only covers name/slug/phone/email/password anyway -- it
was never actually usable for Content's page-copy fields, so this is genuinely new Implementation-
stage work, not a rerouting of an existing path).

Sprint 1 scope only: the Hero section's title field. Other Content fields (About/Story copy, SEO)
are real per TENANT_OS_PLAN.md S13 but not touched here.
"""

from typing import Optional

from prisma import Json

from app.repositories import admin_client_repo as _client_repo


async def update_hero_title(
    client_id: str,
    title_ar: Optional[str] = None,
    title_en: Optional[str] = None,
):
    """
    Update the Hero section's title within Client.config.content.sections[].

    Reads the current config, patches only the hero section's title fields, writes the whole
    config back -- matches the same read-merge-write shape scripts/seed_page_content.py already
    uses for this same field.
    """
    client = await _client_repo.find_client_by_id(client_id)
    if not client:
        raise ValueError("Client not found")

    config = dict(getattr(client, "config", None) or {})
    content = dict(config.get("content") or {})
    sections = list(content.get("sections") or [])

    hero_section = next((s for s in sections if s.get("type") == "hero"), None)
    if hero_section is None:
        raise ValueError("This tenant's page has no hero section to update")

    data = dict(hero_section.get("data") or {})
    if title_ar is not None:
        data["title_ar"] = title_ar
    if title_en is not None:
        data["title_en"] = title_en
    hero_section["data"] = data

    content["sections"] = sections
    config["content"] = content

    return await _client_repo.update_client(client_id, {"config": Json(config)})


async def get_hero_title(client_id: str):
    """Read-side helper for Discovery/verification -- not itself a write path."""
    client = await _client_repo.find_client_by_id(client_id)
    if not client:
        raise ValueError("Client not found")
    config = dict(getattr(client, "config", None) or {})
    content = dict(config.get("content") or {})
    sections = list(content.get("sections") or [])
    hero_section = next((s for s in sections if s.get("type") == "hero"), None)
    if hero_section is None:
        return None
    return (hero_section.get("data") or {}).get("title_ar")
