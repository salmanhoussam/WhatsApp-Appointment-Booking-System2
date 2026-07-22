"""
Content Sections Repository — Prisma-adjacent JSON manipulation for
Client.config.content.sections[], shared across any Capability whose data lives there.

Extracted from content_service.py's private helpers once a second Capability (Media, Sprint 2)
needed the exact same shape -- per CONTENT_CAPABILITY_ARCHITECTURE_REVIEW.md, this is real,
mechanical section-array manipulation with no business logic of its own (find a section by
`type`, read/patch one `data` field, write the whole config back), which belongs at the
Repository layer, not duplicated as a private helper inside each Capability's own Service.

Each Capability (content_service.py, media_service.py, ...) still owns its own business meaning,
validation, and public function names -- this repo only owns the raw read-merge-write mechanic.
No Prisma calls happen anywhere else for this shape; this file is the one place that does.
"""

from prisma import Json

from app.repositories import admin_client_repo as _client_repo


async def get_section_field(client_id: str, section_type: str, field: str):
    """Find a section by `type`, return one of its `data` fields (or None)."""
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


async def update_section_field(client_id: str, section_type: str, **fields):
    """
    Find a section by `type`, patch the given `data` fields (only where not None), write the
    whole config back. Matches the same read-merge-write shape scripts/seed_page_content.py
    already uses.
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
