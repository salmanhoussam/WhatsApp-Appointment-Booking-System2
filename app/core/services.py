"""
client_services gate — every module endpoint must call require_service() first.

Usage:
    @router.get("/menu")
    async def get_menu(
        tenant=Depends(get_current_tenant),
        _svc=Depends(require_service("restaurant")),
    ):
        client_id = tenant["id"]
        ...
"""

from typing import Callable

from fastapi import Depends, HTTPException
from prisma import Json

from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.core.db_resilience import with_db_resilience

# Maps service_type (from Client.service_type or conversation extraction)
# to the list of service keys to seed on tenant creation.
SERVICE_TYPE_MAP: dict[str, list[str]] = {
    "real_estate": ["booking", "gallery", "whatsapp_ordering"],
    "hotel":       ["booking", "gallery", "whatsapp_ordering"],
    "restaurant":  ["restaurant", "whatsapp_ordering", "restaurant.menu"],
    "ecommerce":   ["store", "store.products", "store.cart"],
    "services":    ["catalog"],   # صالون، ميكانيكي، أي خدمة عامة
}

DEFAULT_SERVICES = ["booking", "gallery", "whatsapp_ordering"]


def require_service(service_key: str) -> Callable:
    """Dependency factory — raises 403 if tenant doesn't have service active.

    Wrapped in with_db_resilience (2026-08-10) -- this dependency is the first thing every
    gated route touches, so a transient DB/pooler hiccup here previously failed the ENTIRE
    request (every route in the app), not just whatever business logic came after it. See
    app/core/db_resilience.py's own docstring for the confirmed root cause.
    """
    async def _check(tenant: dict = Depends(get_current_tenant)):
        svc = await with_db_resilience(
            lambda: prisma_client.clientservice.find_first(
                where={
                    "clientId": tenant["id"],
                    "serviceKey": service_key,
                    "isActive": True,
                }
            ),
            label=f"require_service:{service_key}",
        )
        if not svc:
            raise HTTPException(
                status_code=403,
                detail=f"Service '{service_key}' is not activated for this tenant.",
            )
        return svc
    return _check


async def seed_services_for_client(client_id: str, service_type: str) -> None:
    """Seed client_services rows when a new tenant is created.
    Called from registration_service.py after Client record is created.
    """
    keys = SERVICE_TYPE_MAP.get(service_type, DEFAULT_SERVICES)
    for key in keys:
        await prisma_client.clientservice.upsert(
            where={"clientId_serviceKey": {"clientId": client_id, "serviceKey": key}},
            data={
                "create": {"clientId": client_id, "serviceKey": key, "isActive": True},
                "update": {"isActive": True},
            },
        )


async def get_client_services(client_id: str) -> list[str]:
    """Return list of active service keys for a client."""
    rows = await prisma_client.clientservice.find_many(
        where={"clientId": client_id, "isActive": True}
    )
    return [r.serviceKey for r in rows]


async def sync_selected_services(client_id: str) -> None:
    """Rebuild Client.selected_services from active client_services rows.
    Call this after any ClientService create/update/delete.
    """
    keys = await get_client_services(client_id)
    await prisma_client.client.update(
        where={"id": client_id},
        data={"selected_services": Json(keys)},
    )
