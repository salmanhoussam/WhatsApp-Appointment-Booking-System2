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
