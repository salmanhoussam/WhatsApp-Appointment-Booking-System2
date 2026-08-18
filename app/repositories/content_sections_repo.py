"""
Content Sections Repository — Prisma-adjacent JSON manipulation for
Client.config.content.sections[], shared across any Capability whose data lives there.

Extracted from content_service.py's private helpers once a second Capability (Media, Sprint 2)
needed the exact same shape -- per .claudedocs/reviews/content-capability-review.md, this is real,
mechanical section-array manipulation with no business logic of its own (find a section by
`type`, read/patch one `data` field, write the whole config back), which belongs at the
Repository layer, not duplicated as a private helper inside each Capability's own Service.

Each Capability (content_service.py, media_service.py, ...) still owns its own business meaning,
validation, and public function names -- this repo only owns the raw read-merge-write mechanic.
No Prisma calls happen anywhere else for this shape; this file is the one place that does.
"""

from prisma import Json

from app.repositories import admin_client_repo as _client_repo


async def list_sections(client_id: str):
    """
    Every real section for this tenant, as stored (Homepage Phase 2.6, 2026-08-18) -- the read
    side the Dashboard's Section Settings view needs to render a list at all. Raw section objects
    (type/order/enabled/data), not filtered or sorted here -- that's the Service/route's call.
    """
    client = await _client_repo.find_client_by_id(client_id)
    if not client:
        raise ValueError("Client not found")
    config = dict(getattr(client, "config", None) or {})
    content = dict(config.get("content") or {})
    return list(content.get("sections") or [])


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


async def set_section_enabled(client_id: str, section_type: str, enabled: bool):
    """
    Find a section by `type`, set its top-level `enabled` flag (sibling to `type`/`order`/`data`,
    not a `data` field -- rendering visibility, not content). `DynamicPage.jsx` treats a missing
    `enabled` as `true`, so every tenant with no sections ever touched by this function keeps
    rendering exactly as before it existed.
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

    section["enabled"] = enabled
    content["sections"] = sections
    config["content"] = content

    return await _client_repo.update_client(client_id, {"config": Json(config)})


async def reorder_sections(client_id: str, ordered_types: list[str]):
    """
    Re-assign `order` (0-based, matching `ordered_types`' own sequence) to every section named in
    `ordered_types`. Any section on the tenant's page whose type is NOT in `ordered_types` keeps
    its existing `order` value untouched -- a caller reordering only the sections it knows about
    never silently displaces one it doesn't.
    """
    client = await _client_repo.find_client_by_id(client_id)
    if not client:
        raise ValueError("Client not found")

    config = dict(getattr(client, "config", None) or {})
    content = dict(config.get("content") or {})
    sections = list(content.get("sections") or [])

    existing_types = {s.get("type") for s in sections}
    unknown = [t for t in ordered_types if t not in existing_types]
    if unknown:
        raise ValueError(f"This tenant's page has no section(s): {', '.join(unknown)}")

    order_map = {t: i for i, t in enumerate(ordered_types)}
    for section in sections:
        if section.get("type") in order_map:
            section["order"] = order_map[section["type"]]

    content["sections"] = sections
    config["content"] = content

    return await _client_repo.update_client(client_id, {"config": Json(config)})
