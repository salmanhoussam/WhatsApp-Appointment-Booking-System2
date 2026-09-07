"""
app/services/security_audit_service.py
Single writer for the Security Audit Log (ADR-0001, .claudedocs/decisions/0001-*).

Best-effort by design (principle confirmed 2026-07-18, before this file was
written): audit persistence is a secondary concern and must NEVER affect the
outcome of the request being audited. Security enforcement must never depend
on successful audit persistence. log_security_event() never raises — a DB
outage, a Prisma error, or a slow write are all caught (and, for slowness,
time-bounded) and logged internally via the standard logger, never
propagated to the caller.

Generic by design so any future event type (authorization failures, invalid
signatures, login failures, tenant enforcement, admin actions...) reuses this
one write path instead of each growing its own ad hoc logging code.
"""

import asyncio
import logging
from typing import Optional

from prisma import Json

from app.db.client import prisma_client

logger = logging.getLogger(__name__)

_WRITE_TIMEOUT_SECONDS = 3.0


async def log_security_event(
    event_type: str,
    client_id: Optional[str] = None,
    endpoint: Optional[str] = None,
    detail: Optional[dict] = None,
    actor: Optional[str] = None,
) -> None:
    """
    Best-effort write to the Security Audit Log. Never raises.

    event_type is free-form by design (ADR-0001 §10), not an enum, so new
    event types never require a schema change — examples: "tenant_suspended",
    "tenant_expired", "authorization_denied", "invalid_signature",
    "login_failed", "admin_action", "policy_violation".
    """
    try:
        data: dict = {"eventType": event_type}
        if client_id is not None:
            data["clientId"] = client_id
        if endpoint is not None:
            data["endpoint"] = endpoint
        if detail is not None:
            data["detail"] = Json(detail)
        if actor is not None:
            data["actor"] = actor

        await asyncio.wait_for(
            prisma_client.securityauditlog.create(data=data),
            timeout=_WRITE_TIMEOUT_SECONDS,
        )
    except Exception as exc:  # noqa: BLE001 - intentional, see module docstring:
        # audit-write failures must NEVER propagate and must NEVER affect the
        # security decision already made by the caller.
        logger.error(
            "Security audit log write failed — event_type=%s client_id=%s endpoint=%s: %s",
            event_type, client_id, endpoint, exc,
        )

# ── Authentication events (Auth Audit Trail, 2026-09-07) ──────────────────────
#
# One helper, deliberately, so the five auth paths NOT wired in this first slice
# (magic-link, set-password, register, customer register/login) each become a single call rather
# than a fifth copy-paste. That is not a style preference: copy-pasting `_verify_secret` is exactly
# how the fail-open webhook defect ended up living in two files at once, found on production the
# same day this was written.

_IDENTIFIER_MAX = 120


def client_ip_from(request) -> str:
    """Best guess at the real client IP.

    Railway terminates TLS at a proxy, so `request.client.host` is the PROXY's address, not the
    visitor's -- the only place in this codebase reading it today (ai_chat.py:137) has that same
    blind spot. X-Forwarded-For's FIRST hop is the originating client; everything after it is
    infrastructure. X-Real-IP is the common single-value fallback.

    NOT yet verified against Railway's actual headers -- both values are recorded so the question
    can be settled from real rows instead of assumption. Never raises: an audit helper must not be
    able to break a login.
    """
    try:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
        real = request.headers.get("x-real-ip")
        if real:
            return real.strip()
        return request.client.host if request.client else "unknown"
    except Exception:  # noqa: BLE001 - see module docstring
        return "unknown"


async def record_auth_event(
    request,
    event_type: str,
    actor: str,
    client_id: Optional[str] = None,
    reason: Optional[str] = None,
    identifier: Optional[str] = None,
) -> None:
    """Record one authentication outcome.

    event_type is one of exactly four strings -- admin_login_success / admin_login_failed /
    client_login_success / client_login_failed. The FAILURE REASON is deliberately not part of the
    event type: event_type is indexed and is what you group by ("how many failures today"), so
    splitting it per reason would fragment the vocabulary and destroy that. The reason travels in
    `detail` where it belongs, as a filter.

    `actor` stays clean and queryable:
        user:{id} / client:{id}   whenever the account is known -- INCLUDING a wrong-password
                                  attempt against a real account, which is the case that makes
                                  "show me every failed attempt on this account" answerable, and
                                  is the foundation any future brute-force lockout would build on
        anon                      identifier matched nothing
    The raw submitted identifier goes in `detail`, truncated -- putting attacker-controlled text
    straight into an indexed column would fill it with noise and make it useless to query.
    """
    detail: dict = {
        "ip": client_ip_from(request),
        # Recorded raw alongside the resolved value until Railway's real header behaviour is
        # confirmed from live rows.
        "xff": (request.headers.get("x-forwarded-for") or "")[:_IDENTIFIER_MAX] or None,
    }
    if reason:
        detail["reason"] = reason
    if identifier:
        detail["identifier_submitted"] = str(identifier)[:_IDENTIFIER_MAX]

    await log_security_event(
        event_type=event_type,
        client_id=client_id,
        endpoint=str(getattr(getattr(request, "url", None), "path", "")) or None,
        detail=detail,
        actor=actor,
    )
