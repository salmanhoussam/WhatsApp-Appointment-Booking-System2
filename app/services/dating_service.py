"""
Dating Service (Phase 75) — Business logic for personalized date invitation pages.

MVP uses:
  - wa.me links for WhatsApp interaction (zero Meta approval required)
  - ntfy.sh push notifications to Salman's phone

TODO (WhatsApp Cloud API migration):
  When WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID env vars are available,
  replace every wa.me string with an httpx.post to:
    https://graph.facebook.com/v17.0/{PHONE_NUMBER_ID}/messages
  See .claudedocs/plans/integration to whatsapp token.md for the full migration guide.
"""

import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import httpx

import app.repositories.dating_repo as dating_repo

# ── Constants ──────────────────────────────────────────────────────────────────
DATING_NTFY_TOPIC = "salman-dating-2026"
PAGE_BASE_URL = "https://demo.salmansaas.com/dating"
DEFAULT_EXPIRY_DAYS = 30


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_page_url(slug: str) -> str:
    return f"{PAGE_BASE_URL}/{slug}"


def _make_wa_link(phone: str, message: str) -> str:
    """
    Build a wa.me deep-link with a pre-filled message.

    TODO (WhatsApp Cloud API): Replace calls to this function with an async
    httpx.post to Meta's /messages endpoint using a pre-approved template.
    Template name suggestion: "date_page_invite" (language: ar).
    Example payload:
        {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": "date_page_invite",
                "language": {"code": "ar"},
                "components": [{"type": "body", "parameters": [...]}],
            },
        }
    Authorization header: f"Bearer {WHATSAPP_API_TOKEN}"
    """
    return f"https://wa.me/{phone}?text={quote(message)}"


async def _send_ntfy(message: str) -> None:
    """Fire-and-forget push notification to Salman's ntfy.sh topic."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"https://ntfy.sh/{DATING_NTFY_TOPIC}",
                content=message.encode("utf-8"),
                headers={"Title": "SalmanSaaS Dating", "Priority": "high"},
            )
    except Exception:
        pass  # notification failure must never break the main flow


# ── Public API ─────────────────────────────────────────────────────────────────

async def create_date_page(payload: dict) -> dict:
    """
    Create a new DatePage and return the page record + share links.

    Expected payload keys:
        her_name      str
        owner_phone   str          (digits only, e.g. "9613XXXXXX")
        her_phone     str | None
        config        dict         ({ theme, message, food_options, emoji, ... })
        slug          str | None   (auto-generated when absent)
    """
    slug = payload.get("slug") or secrets.token_urlsafe(6)
    expires_at = datetime.now(timezone.utc) + timedelta(days=DEFAULT_EXPIRY_DAYS)

    page = await dating_repo.create_date_page(
        {
            "slug": slug,
            "her_name": payload["her_name"],
            "config": payload.get("config", {}),
            "ntfy_topic": DATING_NTFY_TOPIC,
            "owner_phone": payload["owner_phone"],
            "her_phone": payload.get("her_phone"),
            "expires_at": expires_at,
        }
    )

    page_url = _make_page_url(slug)

    # TODO (WhatsApp Cloud API): Replace this wa.me link with an httpx.post
    # to Meta's /messages API using the "date_page_invite" template so the
    # invitation is sent automatically without the owner needing to click a link.
    owner_message = (
        f"صفحة الدعوة الرومانسية لـ {payload['her_name']} جاهزة! 🌹\n"
        f"الرابط: {page_url}\n"
        f"أرسليه لها وانتظر ردها 💌"
    )
    wa_link = _make_wa_link(payload["owner_phone"], owner_message)

    return {"page": page, "page_url": page_url, "wa_link": wa_link}


async def get_page(slug: str):
    """Fetch a public DatePage by slug (None if not found or deleted)."""
    return await dating_repo.get_date_page(slug)


async def submit_answer(
    slug: str,
    answer: str,
    chosen_food: str,
    event_date: datetime,
) -> dict:
    """
    Record the girl's answer, notify Salman via ntfy.sh, and build the
    owner wa.me link so she can send the result directly.

    Returns: { page, wa_link }
    """
    page = await dating_repo.record_answer(slug, answer, chosen_food, event_date)

    emoji_map = {"yes": "✅🌹", "later": "⏳", "no": "❌"}
    emoji = emoji_map.get(answer, "💌")

    ntfy_message = (
        f"{emoji} {page.her_name} ردّت على الصفحة!\n"
        f"الجواب: {answer}\n"
        f"الأكل: {chosen_food or '—'}\n"
        f"التاريخ: {event_date.strftime('%Y-%m-%d') if event_date else '—'}"
    )
    await _send_ntfy(ntfy_message)

    # Build owner notification link — she sends the result to him.
    # TODO (WhatsApp Cloud API): Replace this wa.me link with an httpx.post
    # background task that automatically notifies the owner via Meta's API
    # using the "date_response_alert" template, so no manual click is needed.
    owner_phone = page.owner_phone
    owner_message = (
        f"مرحبا! أنا {page.her_name} 🌸\n"
        f"جوابي على دعوتك: {answer} {emoji}\n"
        f"اخترت: {chosen_food or '—'}\n"
        f"التاريخ المقترح: {event_date.strftime('%Y-%m-%d') if event_date else '—'}"
    )
    wa_link = _make_wa_link(owner_phone, owner_message)

    return {"page": page, "wa_link": wa_link}


async def cleanup_expired() -> int:
    """Soft-delete all expired DatePage rows. Called by the daily cron job."""
    return await dating_repo.soft_delete_expired()
