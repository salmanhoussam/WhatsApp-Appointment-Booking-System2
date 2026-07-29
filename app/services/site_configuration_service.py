"""
Site Configuration Capability — Service layer.

Owns the write path for every field `.claudedocs/architecture/capabilities/site-configuration.md`
assigns to Site Configuration (Brand, Contact, Currency, Theme). Replaces `client_service.py`
(deleted — confirmed zero real callers, Sprint 3 Phase 2) rather than reviving it, matching this
project's one-Service-per-Capability naming (`content_service.py`, `media_service.py`,
`catalog_service.py`).

Deliberately does not port `client_service.py`'s old `create_client` — that was dead code with no
real caller, and tenant creation is registration's concern, not Site Configuration's Contract.
Ported only `get_client`/`update` — the two responsibilities this Capability actually owns.
"""

from prisma import Json

from app.repositories import admin_client_repo

_CAMEL = {"page_type": "pageType", "template_key": "templateKey"}
_JSON_FIELDS = ("config", "features")


async def get_client(client_id: str):
    return await admin_client_repo.find_client_by_id(client_id)


async def update_settings(client_id: str, raw_fields: dict) -> dict:
    """
    Site Configuration's single write path. Takes only the fields the caller explicitly set
    (already filtered to non-None by the route), applies the camelCase mapping and Prisma Json()
    wrapping that used to live inline in `settings.py`'s route handler — real transformation
    logic belongs here, not in the Route (`rules/backend/api-rules.md` §1).
    """
    update_data = {_CAMEL.get(k, k): v for k, v in raw_fields.items()}
    for json_field in _JSON_FIELDS:
        if json_field in update_data and isinstance(update_data[json_field], dict):
            update_data[json_field] = Json(update_data[json_field])
    return await admin_client_repo.update_client(client_id, update_data)
