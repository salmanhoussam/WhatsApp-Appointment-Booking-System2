"""
app/core/tenant.py
Multi-strategy tenant resolution with in-process TTL cache.

Resolution priority (highest → lowest):
  1. JWT Bearer token  → extracts 'slug' from payload
  2. X-Tenant-Slug header
  3. ?client_slug= query param
  4. Subdomain  (e.g. demo.yourdomain.com  or  demo.localhost)

Admin-user guard:
  get_current_admin_user() → validates JWT with type=="admin", returns User record.
"""

import logging
import time

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.client import prisma_client
from app.core.security import decode_token

# ── In-process TTL cache ─────────────────────────────────────────────────────
# slug → ({"id": str, "slug": str}, monotonic_timestamp)
_tenant_cache: dict[str, tuple[dict, float]] = {}
_CACHE_TTL: float = 300.0  # 5 minutes

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# Hosts that are NOT tenants
RESERVED_HOSTS = {"localhost", "127.0.0.1"}
MAIN_DOMAIN = "yourdomain.com"     # ← update to your production domain
LOCAL_SUFFIX = ".localhost"


# ── Internal helpers ─────────────────────────────────────────────────────────

async def _verify_tenant(slug: str) -> dict:
    """
    Confirm slug exists in DB; cache the result for CACHE_TTL seconds.
    Returns {"id": str, "slug": str}.
    """
    now = time.monotonic()
    cached = _tenant_cache.get(slug)
    if cached and (now - cached[1]) < _CACHE_TTL:
        logger.debug("⚡ Tenant cache hit: %s", slug)
        return cached[0]

    client = await prisma_client.client.find_unique(where={"slug": slug})
    if not client:
        logger.warning("⚠️  Tenant slug not found in DB: '%s'", slug)
        raise HTTPException(status_code=404, detail=f"Tenant '{slug}' not found.")

    tenant = {"id": client.id, "slug": client.slug, "currency": client.currency}
    _tenant_cache[slug] = (tenant, now)
    logger.info("✅ Tenant verified and cached: %s", slug)
    return tenant


# ── Public dependencies ──────────────────────────────────────────────────────

async def get_current_tenant(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency — resolves the current tenant for ANY route
    (public or admin). Returns {"id": str, "slug": str}.

    Raises 401 when no tenant context can be determined.
    Raises 404 when the resolved slug is not in the DB.
    """

    # ── 1. JWT Bearer ────────────────────────────────────────────────────────
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload:
            slug = payload.get("slug")
            if slug:
                logger.info("🔑 Tenant from JWT: %s", slug)
                return await _verify_tenant(slug)

    # ── 2. X-Tenant-Slug header ──────────────────────────────────────────────
    slug = request.headers.get("X-Tenant-Slug")
    if slug:
        logger.info("📋 Tenant from X-Tenant-Slug header: %s", slug)
        return await _verify_tenant(slug)

    # ── 3. ?client_slug= query param ─────────────────────────────────────────
    slug = request.query_params.get("client_slug")
    if slug:
        logger.info("🔗 Tenant from query param: %s", slug)
        return await _verify_tenant(slug)

    # ── 4. Subdomain ─────────────────────────────────────────────────────────
    host = request.headers.get("host", "").split(":")[0].lower()

    if host not in RESERVED_HOSTS:
        if host.endswith(f".{MAIN_DOMAIN}"):
            slug = host[: -len(f".{MAIN_DOMAIN}")].split(".")[0]
            logger.info("🌐 Tenant from production subdomain: %s", slug)
            return await _verify_tenant(slug)

        if host.endswith(LOCAL_SUFFIX):
            slug = host[: -len(LOCAL_SUFFIX)].split(".")[0]
            logger.info("🏠 Tenant from localhost subdomain: %s", slug)
            return await _verify_tenant(slug)

    raise HTTPException(
        status_code=401,
        detail=(
            "Tenant context is required. "
            "Use an Authorization Bearer token, the X-Tenant-Slug header, "
            "?client_slug= query param, or a tenant subdomain."
        ),
    )


async def get_current_admin_user(request: Request):
    """
    FastAPI dependency — validates a User-level JWT (type == 'admin').

    Expects: Authorization: Bearer <token>
    Payload must contain: type=='admin', user_id, client_id, role

    Returns the active User record from the database.
    Raises 401 on any failure.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Expected: Bearer <token>",
        )

    token = auth_header[7:]
    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    if payload.get("type") != "admin":
        raise HTTPException(
            status_code=401,
            detail="Token type mismatch. Expected an admin token.",
        )

    user_id = payload.get("user_id")
    client_id = payload.get("client_id")
    if not user_id or not client_id:
        raise HTTPException(status_code=401, detail="Malformed token payload.")

    user = await prisma_client.user.find_first(
        where={"id": user_id, "clientId": client_id, "isActive": True},
        include={"client": True},
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive.")

    return user


def invalidate_tenant_cache(slug: str) -> None:
    """Remove a slug from the in-process cache (call after client updates)."""
    _tenant_cache.pop(slug, None)
    logger.info("🗑️  Tenant cache invalidated: %s", slug)


def require_roles(*allowed_roles: str):
    """
    Dependency factory — raises 403 if the admin user's role is not in allowed_roles.

    Usage:
        @router.patch("/settings")
        async def update_settings(
            user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
        ): ...
    """
    async def _dependency(request: Request):
        user = await get_current_admin_user(request)
        role = user.role.value if hasattr(user.role, "value") else str(user.role)
        if role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{role}' is not authorized. Required: {list(allowed_roles)}",
            )
        return user
    return _dependency
