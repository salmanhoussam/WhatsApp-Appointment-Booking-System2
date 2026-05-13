"""
app/api/v1/ai_settings_agent.py
WhatsApp AI Settings Agent — POST /api/v1/webhook/ai-settings

Receives a natural-language WhatsApp message + client_slug from n8n,
uses Claude Haiku tool calling to extract the desired settings change,
applies it to the DB, and returns an Arabic confirmation message
for n8n to relay back to the tenant via WhatsApp.
"""

import logging
from typing import Optional

import anthropic
from fastapi import APIRouter, Header, HTTPException
from prisma import Json
from pydantic import BaseModel

from app.core.config import settings
from app.core.tenant import invalidate_tenant_cache
from app.db.client import prisma_client

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class AISettingsRequest(BaseModel):
    message: str       # النص الخام من واتساب
    client_slug: str   # slug الـ tenant


# ── Claude tool definition ────────────────────────────────────────────────────

_SETTINGS_TOOL = {
    "name": "update_client_settings",
    "description": (
        "Updates the tenant's visual settings based on the user's WhatsApp request. "
        "Call this once with all the settings the user wants to change, "
        "plus a friendly Arabic confirmation message."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "page_type": {
                "type": "string",
                "enum": ["normal", "showcase", "landing"],
                "description": "Hero template: normal=بسيط, showcase=واجهة, landing=هبوط",
            },
            "primary_color": {
                "type": "string",
                "description": "Hex color like #d4a853 or #6d28d9",
            },
            "catalog_layout": {
                "type": "string",
                "enum": ["grid", "list", "showcase"],
                "description": "Catalog display layout: grid=شبكة, list=قائمة, showcase=عرض",
            },
            "font": {
                "type": "string",
                "enum": ["Cairo", "Tajawal", "Inter"],
                "description": "Font family for the page",
            },
            "name_ar": {
                "type": "string",
                "description": "Arabic business name",
            },
            "whatsapp_number": {
                "type": "string",
                "description": "WhatsApp contact number in international format",
            },
            "response_message": {
                "type": "string",
                "description": (
                    "Arabic confirmation message to send back to the user. "
                    "Be friendly and specific about what changed. 1-2 sentences max."
                ),
            },
        },
        "required": ["response_message"],
    },
}


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/ai-settings")
async def ai_settings_agent(
    payload: AISettingsRequest,
    x_onboarding_secret: Optional[str] = Header(default=None),
):
    """
    يستقبل رسالة واتساب طبيعية من n8n، يفهمها بالذكاء الاصطناعي،
    يحدّث إعدادات الـ tenant مباشرةً، ويُرجع رسالة تأكيد عربية.
    """
    _verify_secret(x_onboarding_secret)

    client = await prisma_client.client.find_first(where={"slug": payload.client_slug})
    if not client:
        raise HTTPException(status_code=404, detail=f"Client '{payload.client_slug}' not found")

    tool_input = await _run_claude_agent(payload.message, client)

    update_data = _build_update_data(tool_input, client)
    if update_data:
        await prisma_client.client.update(
            where={"id": client.id},
            data=update_data,
        )
        invalidate_tenant_cache(payload.client_slug)
        logger.info("AI agent updated settings for '%s': %s", payload.client_slug, list(update_data.keys()))

    return {
        "success": True,
        "response": tool_input.get("response_message", "تم تحديث الإعدادات"),
        "updated_fields": list(update_data.keys()) if update_data else [],
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _verify_secret(secret: Optional[str]) -> None:
    expected = getattr(settings, "ONBOARDING_SECRET", None)
    if not expected:
        return
    if secret != expected:
        raise HTTPException(status_code=401, detail="Invalid secret")


def _build_update_data(tool_input: dict, client) -> dict:
    """Converts Claude's tool output into a prisma-safe update dict."""
    _CAMEL = {"page_type": "pageType"}
    data = {}
    config_patch = {}

    for key, value in tool_input.items():
        if key == "response_message" or value is None:
            continue
        if key in ("catalog_layout", "font"):
            config_patch[key] = value
        elif key in _CAMEL:
            data[_CAMEL[key]] = value
        else:
            data[key] = value

    if config_patch:
        existing = getattr(client, "config", None) or {}
        data["config"] = Json({**existing, **config_patch})

    return data


async def _run_claude_agent(message: str, client) -> dict:
    """Sends the WhatsApp message to Claude with tool use to extract settings intent."""
    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    current_config = getattr(client, "config", None) or {}
    system = f"""أنت مساعد ذكي لمنصة SalmanSaaS. تساعد أصحاب المنشآت على تعديل مظهر صفحاتهم عبر واتساب.

الإعدادات الحالية لـ "{client.name_ar or client.name_en or client.slug}":
- نمط الصفحة: {getattr(client, 'pageType', None) or 'normal'}
- اللون الأساسي: {client.primary_color or '#6d28d9'}
- عرض الكتالوج: {current_config.get('catalog_layout', 'grid')}
- الخط: {current_config.get('font', 'Cairo')}

القيم المتاحة:
- نمط الصفحة: normal (بسيط), showcase (واجهة), landing (هبوط)
- عرض الكتالوج: grid (شبكة), list (قائمة), showcase (عرض فاخر)
- الخط: Cairo, Tajawal, Inter

استخدم update_client_settings لتطبيق ما طلبه المستخدم.
إذا كانت الرسالة غير واضحة، أرجع response_message فقط (بدون تغيير أي حقل آخر)."""

    anthropic_client = anthropic.AsyncAnthropic(api_key=api_key)

    try:
        response = await anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=system,
            tools=[_SETTINGS_TOOL],
            tool_choice={"type": "any"},
            messages=[{"role": "user", "content": message}],
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {e}")

    for block in response.content:
        if block.type == "tool_use" and block.name == "update_client_settings":
            return block.input

    return {"response_message": "عذراً، لم أتمكن من معالجة الطلب. أرسل تفاصيل أوضح."}
