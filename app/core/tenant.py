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
from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.client import prisma_client
from app.core.security import decode_token
from app.core.config import settings
from app.services.security_audit_service import log_security_event

# ── In-process TTL cache ─────────────────────────────────────────────────────
# slug → ({"id": str, "slug": str}, status, monotonic_timestamp)
# `status` is cached alongside the tenant dict (not inside it, to keep the
# returned shape unchanged) specifically so ADR-0001 enforcement re-checks it
# on every access, cache hit or miss — not only on the first fetch. Relying
# solely on invalidate_tenant_cache() being called from every future
# status-mutating code path would repeat the exact "remember to do it
# everywhere" fragility Finding 2 already flagged.
_tenant_cache: dict[str, tuple[dict, Optional[str], float]] = {}
_CACHE_TTL: float = 300.0  # 5 minutes

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# Hosts that are NOT tenants
RESERVED_HOSTS = {"localhost", "127.0.0.1"}
MAIN_DOMAIN = "salmansaas.com"
LOCAL_SUFFIX = ".localhost"

# ADR-0001 §8.1/§8.2: both statuses hard-block, identical mechanism.
_BLOCKED_STATUSES = {"suspended", "expired"}


def is_status_blocked(status: Optional[str]) -> bool:
    """
    ADR-0001 §8.4/§8.4b — public, non-raising status check for callers that
    aren't in a synchronous HTTP-request context (e.g. background tasks
    processing a webhook after the 200 response was already sent, where
    raising HTTPException would have no one to catch it). Callers are
    responsible for their own logging via security_audit_service and for
    deciding what "blocked" means for their own flow (e.g. skip a mutation,
    not necessarily reject an entire request).
    """
    return status in _BLOCKED_STATUSES


# ── Internal helpers ─────────────────────────────────────────────────────────

async def _assert_status_allowed(
    status: Optional[str], client_id: str, slug: str, endpoint: Optional[str] = None
) -> None:
    """
    ADR-0001 (Tenant Status Enforcement) — Client.status is the sole source
    of truth (see .claudedocs/decisions/0001-*). Raises 403 for
    suspended/expired tenants; a denial is also recorded in the Security
    Audit Log (best-effort — see security_audit_service, a logging failure
    here never changes this function's decision). Takes the raw status
    value rather than a client object so both a freshly-fetched row and a
    cached one can call the same check (see _tenant_cache above).
    """
    if status not in _BLOCKED_STATUSES:
        return

    await log_security_event(
        event_type=f"tenant_{status}",
        client_id=client_id,
        endpoint=endpoint,
        detail={"status": status, "slug": slug},
    )

    if status == "suspended":
        message = "This tenant account has been suspended. Contact support for assistance."
    else:  # "expired"
        message = "This tenant's subscription has expired. Please renew to restore access."
    raise HTTPException(status_code=403, detail=message)


async def _assert_client_active(client, endpoint: Optional[str] = None) -> None:
    """Convenience wrapper for a freshly-fetched Prisma client object."""
    await _assert_status_allowed(
        getattr(client, "status", None), client.id, client.slug, endpoint=endpoint
    )


async def _verify_tenant(slug: str, endpoint: Optional[str] = None) -> dict:
    """
    Confirm slug exists in DB and is not suspended/expired (ADR-0001);
    cache the result for CACHE_TTL seconds. Returns {"id": str, "slug": str}.
    Status is re-checked on every call, cache hit or miss.
    """
    now = time.monotonic()
    cached = _tenant_cache.get(slug)
    if cached and (now - cached[2]) < _CACHE_TTL:
        logger.debug("⚡ Tenant cache hit: %s", slug)
        tenant, status, _ = cached
        await _assert_status_allowed(status, tenant["id"], tenant["slug"], endpoint=endpoint)
        return tenant

    client = await prisma_client.client.find_unique(where={"slug": slug})
    if not client:
        logger.warning("⚠️  Tenant slug not found in DB: '%s'", slug)
        raise HTTPException(status_code=404, detail=f"Tenant '{slug}' not found.")

    await _assert_client_active(client, endpoint=endpoint)

    tenant = {"id": client.id, "slug": client.slug, "currency": client.currency}
    _tenant_cache[slug] = (tenant, client.status, now)
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

    endpoint = request.url.path

    # ── 1. JWT Bearer ────────────────────────────────────────────────────────
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload:
            slug = payload.get("slug")
            if slug:
                logger.info("🔑 Tenant from JWT: %s", slug)
                return await _verify_tenant(slug, endpoint=endpoint)

    # ── 2. X-Tenant-Slug header ──────────────────────────────────────────────
    slug = request.headers.get("X-Tenant-Slug")
    if slug:
        logger.info("📋 Tenant from X-Tenant-Slug header: %s", slug)
        return await _verify_tenant(slug, endpoint=endpoint)

    # ── 3. ?client_slug= query param ─────────────────────────────────────────
    slug = request.query_params.get("client_slug")
    if slug:
        logger.info("🔗 Tenant from query param: %s", slug)
        return await _verify_tenant(slug, endpoint=endpoint)

    # ── 4. Subdomain ─────────────────────────────────────────────────────────
    host = request.headers.get("host", "").split(":")[0].lower()

    if host not in RESERVED_HOSTS:
        if host.endswith(f".{MAIN_DOMAIN}"):
            slug = host[: -len(f".{MAIN_DOMAIN}")].split(".")[0]
            logger.info("🌐 Tenant from production subdomain: %s", slug)
            return await _verify_tenant(slug, endpoint=endpoint)

        if host.endswith(LOCAL_SUFFIX):
            slug = host[: -len(LOCAL_SUFFIX)].split(".")[0]
            logger.info("🏠 Tenant from localhost subdomain: %s", slug)
            return await _verify_tenant(slug, endpoint=endpoint)

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

    await _assert_client_active(user.client, endpoint=request.url.path)

    return user


async def require_super_admin(request: Request):
    """
    FastAPI dependency for Super Admin endpoints.

    Accepts EITHER:
      - Admin JWT (type='admin') with role='SUPER_ADMIN'
      - Client JWT (type='client') whose slug matches settings.SUPER_ADMIN_SLUG
        (used by the platform owner who logs in as a Client, not a User)

    Raises 401 for missing/invalid token, 403 for wrong role.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    payload = decode_token(auth_header[7:])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    token_type = payload.get("type")

    if token_type == "admin":
        role = payload.get("role", "")
        if role == "SUPER_ADMIN":
            return payload
        raise HTTPException(status_code=403, detail="SUPER_ADMIN role required.")

    if token_type == "client":
        if payload.get("slug") == settings.SUPER_ADMIN_SLUG:
            return payload
        raise HTTPException(status_code=403, detail="Platform owner access required.")

    raise HTTPException(status_code=401, detail="Unrecognised token type.")


async def resolve_tenant_status(slug: str, endpoint: Optional[str] = None) -> dict:
    """
    Public entry point for ADR-0001 status enforcement (.claudedocs/decisions/
    0001-*) for callers that already have a known slug from the URL path
    (e.g. `/{slug}/config`-style public routes) and therefore don't go
    through get_current_tenant()'s header/JWT/query/subdomain resolution —
    get_current_tenant() never reads path params, so it cannot be reused
    as-is for these routes without breaking path-only callers. This is a
    thin public alias for _verify_tenant() — same caching, same status
    check, same audit logging — so there remains exactly one implementation
    of tenant status enforcement, not a second one.
    """
    return await _verify_tenant(slug, endpoint=endpoint)


async def assert_client_active(client, endpoint: Optional[str] = None) -> None:
    """
    ADR-0001 §8.3 — public raising variant for synchronous request handlers
    that already hold a freshly-fetched Client object (avoiding a redundant
    second lookup) and are NOT in a background-task context, so raising
    HTTPException is meaningful (unlike is_status_blocked(), used by the
    webhook background tasks in §8.4/§8.4b). Thin public alias for
    _assert_client_active() — same check, same audit logging, no second
    implementation.
    """
    await _assert_client_active(client, endpoint=endpoint)


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
