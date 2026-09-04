"""
app/api/v1/webhook.py
WhatsApp Cloud API webhook — mounted at /api/v1/webhook in main.py.

GET  /api/v1/webhook/whatsapp  → Meta verification challenge
POST /api/v1/webhook/whatsapp  → incoming messages (routed to whatsapp_flow)
"""

import hashlib
import hmac
import json
import logging
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from app.core.config import settings
from app.services.whatsapp_flow import handle_incoming_message

logger = logging.getLogger(__name__)

# Note: no prefix here — main.py mounts at /api/v1/webhook
router = APIRouter(tags=["Webhooks"])


@router.get("/whatsapp")
async def verify_webhook(request: Request):
    """
    Meta calls this once to verify webhook ownership.
    Must echo back hub.challenge as plain integer.
    """
    params = request.query_params
    mode      = params.get("hub.mode")
    token     = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("✅ WhatsApp webhook verified.")
        return int(challenge)

    logger.warning("❌ WhatsApp webhook verification failed (token mismatch).")
    raise HTTPException(status_code=403, detail="Verification failed.")


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Receives incoming WhatsApp messages from Meta.

    Every POST must carry a valid X-Hub-Signature-256 (HMAC-SHA256 of the raw
    body, keyed with WHATSAPP_APP_SECRET) — verified BEFORE the body is
    parsed or any state-machine logic runs. Missing/invalid signatures are
    rejected with 403.

    The handler is dispatched as a background task so we immediately
    return HTTP 200 to Meta (required within 20 s or Meta will retry).
    The actual state-machine logic runs asynchronously after the response.
    """
    raw_body = await request.body()

    if not _verify_signature(raw_body, request.headers.get("x-hub-signature-256")):
        logger.warning("❌ WhatsApp webhook POST rejected — missing or invalid X-Hub-Signature-256.")
        raise HTTPException(status_code=403, detail="Invalid signature.")

    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    # Meta sends status updates (delivered, read) alongside messages —
    # skip them early to avoid unnecessary processing.
    if not _has_messages(payload):
        return {"status": "ok"}

    background_tasks.add_task(handle_incoming_message, payload)
    return {"status": "received"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _verify_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """
    Verify Meta's X-Hub-Signature-256 header: HMAC-SHA256 of the exact raw
    request body, keyed with the Meta App Secret. Constant-time comparison
    (hmac.compare_digest) to avoid timing side-channels. Fails closed —
    returns False (never raises) whenever verification cannot be performed,
    including when WHATSAPP_APP_SECRET itself is not configured.
    """
    if not settings.WHATSAPP_APP_SECRET:
        logger.error(
            "WHATSAPP_APP_SECRET is not configured — every WhatsApp webhook POST will be "
            "rejected until it is set. This is a required Railway env var, not a code gap."
        )
        return False
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected = hmac.new(
        settings.WHATSAPP_APP_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    provided = signature_header[len("sha256="):]
    return hmac.compare_digest(expected, provided)


def _has_messages(payload: dict) -> bool:
    """Return True only if the payload contains at least one user message."""
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("value", {}).get("messages"):
                return True
    return False
