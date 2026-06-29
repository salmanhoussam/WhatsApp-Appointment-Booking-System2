"""
app/api/v1/webhook.py
WhatsApp Cloud API webhook — mounted at /api/v1/webhook in main.py.

GET  /api/v1/webhook/whatsapp  → Meta verification challenge
POST /api/v1/webhook/whatsapp  → incoming messages (routed to whatsapp_flow)
"""

import logging
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

    The handler is dispatched as a background task so we immediately
    return HTTP 200 to Meta (required within 20 s or Meta will retry).
    The actual state-machine logic runs asynchronously after the response.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    # Meta sends status updates (delivered, read) alongside messages —
    # skip them early to avoid unnecessary processing.
    if not _has_messages(payload):
        return {"status": "ok"}

    background_tasks.add_task(handle_incoming_message, payload)
    return {"status": "received"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _has_messages(payload: dict) -> bool:
    """Return True only if the payload contains at least one user message."""
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("value", {}).get("messages"):
                return True
    return False
