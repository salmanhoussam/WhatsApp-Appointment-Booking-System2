import httpx
import logging
from dataclasses import dataclass
from typing import Any, List, Dict, Optional
from urllib.parse import quote
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SendResult:
    """The real outcome of one outbound WhatsApp send.

    Phase 0 — Channel Proof (2026-09-10). `_send_request` used to return either an httpx Response
    or None, and every caller but one ignored it, so a rejection by Meta and a successful delivery
    were indistinguishable to the code above. That is how جعفر's invite reported "sent" on
    2026-09-07 while he stayed locked out for six days (`.claude/rules/phone-numbers.md`).

    Two fields carry the whole diagnosis, and they answer different questions:

    - `reason` — OUR classification, and it says WHO fixes it: `credentials_missing` is an unset
      Railway env var, `network_error` is us or the network, `meta_<status>` is Meta rejecting us.
    - `error_code` — META's numeric code, and it says WHAT is wrong. This is the field the
      24-hour-window hypothesis is settled with: `131047` means the customer-service window has
      closed and only a template may be sent, while `190` (with a 401) means the access token
      itself is dead. Until this was captured the two were indistinguishable, and the plan's
      Gate 0 is written to be closed by observing one of them for real.

    `ok` is truth from Meta's HTTP status, never from "we called the function without raising."
    """

    ok: bool
    reason: str = ""
    status_code: Optional[int] = None
    wamid: Optional[str] = None
    error_code: Optional[int] = None
    error_subcode: Optional[int] = None
    error_title: str = ""
    error_detail: str = ""
    body: str = ""

    def __bool__(self) -> bool:
        return self.ok

    def log_suffix(self) -> str:
        """A compact, greppable tail for a caller's own error log."""
        parts = [f"reason={self.reason}"]
        if self.error_code is not None:
            parts.append(f"meta_code={self.error_code}")
        if self.error_subcode is not None:
            parts.append(f"meta_subcode={self.error_subcode}")
        if self.error_detail:
            parts.append(f"detail={self.error_detail[:200]}")
        elif self.error_title:
            parts.append(f"detail={self.error_title[:200]}")
        elif self.body:
            parts.append(f"body={self.body[:200]}")
        return " ".join(parts)


class WhatsAppService:
    BASE_URL = "https://graph.facebook.com/v18.0"

    def __init__(self, phone_number_id: Optional[str] = None, access_token: Optional[str] = None):
        # ✅ استخدم الأسماء الصحيحة من settings
        self.phone_number_id = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID
        self.access_token = access_token or settings.WHATSAPP_ACCESS_TOKEN

        if not self.phone_number_id or not self.access_token:
            logger.warning("⚠️ WhatsApp credentials missing. Messages will not be sent.")

    @staticmethod
    def _parse(response: Any) -> SendResult:
        """Turn one Meta HTTP response into a SendResult. Never raises — a malformed body must
        still produce a usable failure, not an exception inside a fire-and-forget task."""
        status = getattr(response, "status_code", None)
        text = (getattr(response, "text", "") or "")[:1000]

        payload: dict = {}
        try:
            parsed = response.json()
            if isinstance(parsed, dict):
                payload = parsed
        except Exception:
            payload = {}

        if status == 200:
            wamid = None
            messages = payload.get("messages")
            if isinstance(messages, list) and messages and isinstance(messages[0], dict):
                wamid = messages[0].get("id")
            return SendResult(ok=True, reason="ok", status_code=status, wamid=wamid, body=text)

        err = payload.get("error") if isinstance(payload.get("error"), dict) else {}
        data = err.get("error_data") if isinstance(err.get("error_data"), dict) else {}
        return SendResult(
            ok=False,
            reason=f"meta_{status if status is not None else 'unknown'}",
            status_code=status,
            error_code=err.get("code"),
            error_subcode=err.get("error_subcode"),
            error_title=str(err.get("message") or ""),
            error_detail=str(data.get("details") or ""),
            body=text,
        )

    async def _send_request(self, data: dict) -> SendResult:
        if not self.phone_number_id or not self.access_token:
            logger.error("❌ Missing WhatsApp credentials. Cannot send message.")
            return SendResult(ok=False, reason="credentials_missing")

        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        url = f"{self.BASE_URL}/{self.phone_number_id}/messages"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=data, timeout=10.0)
            except Exception as e:
                logger.error(f"❌ WhatsApp Connection Error: {e}", exc_info=True)
                return SendResult(ok=False, reason="network_error", error_detail=str(e)[:300])

        result = self._parse(response)
        if result.ok:
            # The wamid is the only handle Meta gives us to correlate this send with the
            # statuses[] callback that later says delivered/read/failed (webhook.py).
            logger.info("✅ WhatsApp message accepted by Meta (wamid=%s)", result.wamid or "—")
        else:
            logger.error("❌ WhatsApp API rejected the send — %s", result.log_suffix())
        return result

    async def send_text(self, to: str, text: str):
        data = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text}
        }
        return await self._send_request(data)

    async def send_interactive_buttons(self, to: str, text: str, buttons: List[Dict]):
        data = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": text},
                "action": {"buttons": buttons}
            }
        }
        return await self._send_request(data)

    async def send_list_message(self, to: str, header: str, body: str, button_text: str, sections: List[Dict]):
        data = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "list",
                "header": {"type": "text", "text": header},
                "body": {"text": body},
                "action": {"button": button_text, "sections": sections}
            }
        }
        return await self._send_request(data)


def build_central_booking_link(client_slug: str) -> Optional[str]:
    """
    Stage 1 (Central Platform WABA, Phase B) — a wa.me deep link into the shared platform bot
    number, pre-filled with a message the inbound webhook parses to identify which tenant this
    conversation is for (see whatsapp_flow.py's _resolve_client_from_text()). The word "حجز" is
    cosmetic (a natural-looking chat opener); the load-bearing part is the tenant's own slug token.

    Distinct from a tenant's own `config.whatsapp_number` links used elsewhere in this codebase
    (e.g. useReservationBooking.js's post-booking confirmation link) — those message the tenant's
    OWN number directly with no bot/session involved; this one starts a conversation with the
    shared booking bot. Checked at Phase B Contract time (2026-08-24) and confirmed these are two
    genuinely different use cases, not a duplicate to consolidate.

    Returns None when WHATSAPP_CENTRAL_NUMBER isn't configured yet (Stage 1 not live) or the slug
    is empty — callers must treat a None return as "link not available," never build a partial URL.
    """
    if not settings.WHATSAPP_CENTRAL_NUMBER or not client_slug:
        return None
    message = f"حجز {client_slug}"
    return f"https://wa.me/{settings.WHATSAPP_CENTRAL_NUMBER}?text={quote(message)}"