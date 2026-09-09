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

    # Delivery receipts. Log-only — no behaviour change, no state written, no task scheduled.
    # Phase 0 — Channel Proof (2026-09-10): until now these were dropped unread, which meant
    # "delivered" was unprovable and a message Meta accepted (HTTP 200) but never actually
    # delivered looked identical to one the customer read. Nothing else in this vision can be
    # trusted until this is observable, so it lands in Phase 0 rather than as an optimisation.
    _log_statuses(payload)

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


def _log_statuses(payload: dict) -> None:
    """Log every delivery receipt Meta sends. Never raises — this runs inside the webhook's own
    request path, and an exception here would return 500 to Meta and trigger a retry storm.

    A status entry carries the `wamid` that `WhatsAppService._send_request` captured at send time,
    so the two halves of one message can finally be correlated. `failed` entries carry an `errors`
    array whose `code` is the same numeric namespace as a send-time rejection — `131047` for the
    closed 24-hour customer-service window, `131026` for an undeliverable recipient — which is how
    Gate 0's hypothesis gets settled with an observation instead of an assumption.
    """
    try:
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                for st in (change.get("value", {}) or {}).get("statuses", []) or []:
                    state = st.get("status")
                    errors = st.get("errors") or []
                    line = (
                        f"wamid={st.get('id')} status={state} "
                        f"recipient={st.get('recipient_id')} ts={st.get('timestamp')}"
                    )
                    if errors or state == "failed":
                        first = errors[0] if isinstance(errors, list) and errors else {}
                        detail = (first.get("error_data") or {}).get("details") if isinstance(
                            first.get("error_data"), dict
                        ) else None
                        logger.error(
                            "📵 WhatsApp delivery FAILED — %s meta_code=%s title=%s detail=%s",
                            line, first.get("code"), first.get("title"),
                            detail or first.get("message"),
                        )
                    else:
                        logger.info("📬 WhatsApp delivery status — %s", line)
    except Exception as exc:  # pragma: no cover — defensive, must never break the webhook
        logger.warning("Could not read WhatsApp statuses[]: %s", exc)


def _has_messages(payload: dict) -> bool:
    """Return True only if the payload contains at least one user message."""
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("value", {}).get("messages"):
                return True
    return False
