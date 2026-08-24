import httpx
import logging
from typing import List, Dict, Optional
from urllib.parse import quote
from app.core.config import settings

logger = logging.getLogger(__name__)

class WhatsAppService:
    BASE_URL = "https://graph.facebook.com/v18.0"

    def __init__(self, phone_number_id: Optional[str] = None, access_token: Optional[str] = None):
        # ✅ استخدم الأسماء الصحيحة من settings
        self.phone_number_id = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID
        self.access_token = access_token or settings.WHATSAPP_ACCESS_TOKEN

        if not self.phone_number_id or not self.access_token:
            logger.warning("⚠️ WhatsApp credentials missing. Messages will not be sent.")

    async def _send_request(self, data: dict):
        if not self.phone_number_id or not self.access_token:
            logger.error("❌ Missing WhatsApp credentials. Cannot send message.")
            return None

        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        url = f"{self.BASE_URL}/{self.phone_number_id}/messages"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=data, timeout=10.0)
                if response.status_code != 200:
                    logger.error(f"❌ WhatsApp API Error (status {response.status_code}): {response.text}")
                else:
                    logger.info("✅ WhatsApp message sent successfully")
                return response
            except Exception as e:
                logger.error(f"❌ WhatsApp Connection Error: {e}", exc_info=True)
                return None

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