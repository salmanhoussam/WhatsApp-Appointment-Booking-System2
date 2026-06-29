"""
app/db/dependencies.py
Re-exports the canonical tenant/auth dependencies from app.core.tenant.

All route files should prefer importing from here for a stable import path.
The actual resolution logic lives in app/core/tenant.py.
"""

from fastapi import Request
from fastapi.security import HTTPAuthorizationCredentials

from app.core.tenant import (
    get_current_tenant,
    get_current_admin_user,
    invalidate_tenant_cache,
)


async def get_current_client(
    request: Request,
    credentials: HTTPAuthorizationCredentials = None,
) -> str:
    """
    Lightweight variant used by older route files (e.g. admin/units.py).
    Returns just the client UUID string instead of the full tenant dict.
    Delegates fully to get_current_tenant.
    """
    tenant = await get_current_tenant(request, credentials)
    return tenant["id"]


__all__ = [
    "get_current_tenant",
    "get_current_admin_user",
    "get_current_client",
    "invalidate_tenant_cache",
]
