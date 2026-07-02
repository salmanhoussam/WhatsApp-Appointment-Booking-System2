"""
POST /api/v1/webhooks/samsara

Public endpoint (no JWT) — Samsara calls this.
Security: HMAC-SHA256 signature verified before any processing.

The client_id is resolved from the webhook payload's organizationId field.
If no matching client is found the webhook is accepted (200) and silently ignored
to prevent Samsara from disabling the endpoint on repeated 404s.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import JSONResponse

from app.adapters.samsara_adapter import verify_samsara_webhook
from app.db.client import prisma_client
from app.services.samsara_service import dispatch_event

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Fleet — Samsara Webhook"])


@router.post("/samsara")
async def samsara_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Entry point for all Samsara fleet events.
    1. Read raw body (needed for signature verification).
    2. Verify HMAC signature.
    3. Dispatch to samsara_service in a background task.
    """
    raw_body = await request.body()

    # Signature verification — raises 403 on failure
    await verify_samsara_webhook(request, raw_body)

    payload = await request.json()
    logger.info("Samsara webhook received: type=%s", payload.get("eventType"))

    # Resolve tenant from the webhook payload
    # Samsara includes orgId or we fall back to a single-tenant slug from env
    import os, json as _json

    org_id = (
        payload.get("organizationId")
        or payload.get("orgId")
        or os.getenv("SAMSARA_DEFAULT_SLUG", "")
    )

    # Background — fire and forget so we return 200 fast
    background_tasks.add_task(_process_event, org_id, payload)

    return JSONResponse({"received": True}, status_code=200)


async def _process_event(org_identifier: str, payload: dict) -> None:
    """Resolve client by slug then dispatch. Runs in background task."""
    try:
        client = await prisma_client.client.find_first(where={"slug": org_identifier})
        if not client:
            logger.warning("No client found for Samsara org '%s' — ignoring", org_identifier)
            return
        await dispatch_event(client.id, payload)
    except Exception:
        logger.exception("Error processing Samsara event for org=%s", org_identifier)
