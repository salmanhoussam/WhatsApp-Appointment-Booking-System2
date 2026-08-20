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


async def add_section(client_id: str, section_type: str, enabled: bool = True):
    """
    Appends a new, schema-known section type to this tenant's stored sections[] if not already
    present -- idempotent, a no-op returning the unchanged list if it's already there. Closes the
    same "materialize on first touch" gap Phase 5 Part B found and stopped on for Footer
    (.claudedocs/implementation/TENANT_OS_SECTION_EDITOR/PHASE_5.md) -- every other function in
    this file (set_section_enabled, update_section_field, the repeatable-field helpers) requires
    the section to already exist in storage; nothing before this could ever add one. Validation
    that `section_type` is real (`in SECTION_SCHEMAS`) is the caller's job (content_service.py),
    not this Repository's -- same division of labor as every other function here.
    """
    client = await _client_repo.find_client_by_id(client_id)
    if not client:
        raise ValueError("Client not found")

    config = dict(getattr(client, "config", None) or {})
    content = dict(config.get("content") or {})
    sections = list(content.get("sections") or [])

    if any(s.get("type") == section_type for s in sections):
        return sections

    next_order = max((s.get("order", 0) for s in sections), default=-1) + 1
    # Real, required field every other section entry already has (`s_hero`, `s_featured`, ...) --
    # DynamicPage.jsx keys its rendered sections on `id`, not `type` (`key={section.id}`), and
    # Footer.jsx's own QUICK_LINKS scroll-anchors target these same ids. Omitting it (a real bug,
    # caught live via a React "duplicate key" console error during this Track's own verification)
    # would silently break both.
    sections.append({
        "id": f"s_{section_type}", "type": section_type,
        "order": next_order, "enabled": enabled, "data": {},
    })

    content["sections"] = sections
    config["content"] = content
    await _client_repo.update_client(client_id, {"config": Json(config)})
    return sections


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


# ── Repeatable-group fields (TOS-005 Phase C, 2026-08-19) ──────────────────────────────────────
# Same read-merge-write shape as the functions above, applied to one `data[field]` array instead
# of a scalar `data[field]` value. Shape-agnostic on purpose -- an "item" here is whatever Python
# value the caller passes (a dict for object-shaped repeatables like why_choose_us.items, a bare
# string for location.tags); validating that shape against the section's own schema is the
# Route/Service layer's job (app/schemas/section_schemas.py), not this Repository's.

async def _load_section_data(client_id: str, section_type: str):
    """Shared helper: real client/config/content/sections/section/data, ready for a repeatable
    field's items list to be read out of or written back into."""
    client = await _client_repo.find_client_by_id(client_id)
    if not client:
        raise ValueError("Client not found")
    config = dict(getattr(client, "config", None) or {})
    content = dict(config.get("content") or {})
    sections = list(content.get("sections") or [])
    section = next((s for s in sections if s.get("type") == section_type), None)
    if section is None:
        raise ValueError(f"This tenant's page has no {section_type} section")
    data = dict(section.get("data") or {})
    return config, content, sections, section, data


async def _save_repeatable_items(client_id, config, content, sections, section, data, field, items):
    data[field] = items
    section["data"] = data
    content["sections"] = sections
    config["content"] = content
    await _client_repo.update_client(client_id, {"config": Json(config)})
    return items


async def list_repeatable_items(client_id: str, section_type: str, field: str):
    _config, _content, _sections, _section, data = await _load_section_data(client_id, section_type)
    return list(data.get(field) or [])


async def add_repeatable_item(client_id: str, section_type: str, field: str, item):
    config, content, sections, section, data = await _load_section_data(client_id, section_type)
    items = list(data.get(field) or [])
    items.append(item)
    return await _save_repeatable_items(client_id, config, content, sections, section, data, field, items)


async def update_repeatable_item(client_id: str, section_type: str, field: str, index: int, item):
    config, content, sections, section, data = await _load_section_data(client_id, section_type)
    items = list(data.get(field) or [])
    if index < 0 or index >= len(items):
        raise ValueError(f"Index {index} out of range for {section_type}.{field} ({len(items)} items)")
    items[index] = item
    return await _save_repeatable_items(client_id, config, content, sections, section, data, field, items)


async def delete_repeatable_item(client_id: str, section_type: str, field: str, index: int):
    config, content, sections, section, data = await _load_section_data(client_id, section_type)
    items = list(data.get(field) or [])
    if index < 0 or index >= len(items):
        raise ValueError(f"Index {index} out of range for {section_type}.{field} ({len(items)} items)")
    items.pop(index)
    return await _save_repeatable_items(client_id, config, content, sections, section, data, field, items)


async def reorder_repeatable_items(client_id: str, section_type: str, field: str, ordered_indices: list[int]):
    config, content, sections, section, data = await _load_section_data(client_id, section_type)
    items = list(data.get(field) or [])
    if sorted(ordered_indices) != list(range(len(items))):
        raise ValueError(
            f"ordered_indices must be a permutation of 0..{len(items) - 1} for {section_type}.{field}"
        )
    reordered = [items[i] for i in ordered_indices]
    return await _save_repeatable_items(client_id, config, content, sections, section, data, field, reordered)


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
