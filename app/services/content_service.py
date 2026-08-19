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

from app.repositories import content_sections_repo as _sections


# hero.title/story.heading's dedicated update_hero_title/get_hero_title/update_story_heading/
# get_story_heading wrappers were retired here (TOS-005 Phase A, 2026-08-19) -- both fields go
# through update_section_fields below now, the same as every other section's scalar fields. Both
# always wrote/read the identical content_sections_repo.update_section_field/get_section_field
# calls this file's generic wrapper already makes, so removing them changes no data path.


async def set_section_enabled(client_id: str, section_type: str, enabled: bool):
    return await _sections.set_section_enabled(client_id, section_type, enabled)


async def reorder_sections(client_id: str, ordered_types: list[str]):
    return await _sections.reorder_sections(client_id, ordered_types)


async def list_sections(client_id: str):
    """Read side for the Dashboard's Section Settings view (Homepage Phase 2.6, 2026-08-18)."""
    return await _sections.list_sections(client_id)


# ── Generic field update (Homepage Phase 2.6, 2026-08-18) ──────────────────────────────────────
# This file's own header says content.py's routes call named wrappers "by name, not a generic
# Dispatcher" -- a real, deliberate design decision from editing-engine-review.md S1a/Q7, deferred
# "until a second real Capability/Operation proves the routing shape actually repeats." That
# threshold is now met for real: ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md names 9 real
# sections needing the identical "update named text fields on a named section" shape -- writing 9
# near-identical hero-title-style functions/routes would itself be the anti-pattern this project's
# own Abstraction Rule warns about (duplication that IS costly, not merely present). The underlying
# repo function (update_section_field) was already fully generic; this wrapper is the first place
# that's actually exercised as one.

async def update_section_fields(client_id: str, section_type: str, fields: dict):
    return await _sections.update_section_field(client_id, section_type, **fields)


# ── Repeatable-group fields (TOS-005 Phase C, 2026-08-19) ──────────────────────────────────────
# Thin wrappers, same relationship to content_sections_repo.py as every function above -- field/
# item validation against app/schemas/section_schemas.py happens in content.py's routes, before
# these are ever called, not duplicated here.

async def list_repeatable_items(client_id: str, section_type: str, field: str):
    return await _sections.list_repeatable_items(client_id, section_type, field)


async def add_repeatable_item(client_id: str, section_type: str, field: str, item):
    return await _sections.add_repeatable_item(client_id, section_type, field, item)


async def update_repeatable_item(client_id: str, section_type: str, field: str, index: int, item):
    return await _sections.update_repeatable_item(client_id, section_type, field, index, item)


async def delete_repeatable_item(client_id: str, section_type: str, field: str, index: int):
    return await _sections.delete_repeatable_item(client_id, section_type, field, index)


async def reorder_repeatable_items(client_id: str, section_type: str, field: str, ordered_indices: list[int]):
    return await _sections.reorder_repeatable_items(client_id, section_type, field, ordered_indices)
