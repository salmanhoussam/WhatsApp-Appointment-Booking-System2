import logging
import secrets
import string

import anthropic
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.db.client import prisma_client
from app.services.registration_service import register_new_tenant

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class OnboardingWebhookPayload(BaseModel):
    extracted_json: str   # النص الخام من n8n / واتساب بوت
    lang: str = "ar"


class ClientExtract(BaseModel):
    slug: str
    business_name_ar: str
    owner_name: str
    whatsapp_number: str          # ✅ يطابق ما تتوقعه registration_service
    email: str
    service_type: str             # real_estate | restaurant | store | services
    primary_color: str = "#d4a853"
    template_key: str | None = None
    page_type: str = "normal"     # normal | showcase
    active_services: list[str] = []
    trial_days: int = 14


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _generate_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _verify_secret(secret: str | None) -> None:
    expected = getattr(settings, "ONBOARDING_SECRET", None)
    if not expected:
        return                    # secret غير مُفعَّل في التطوير
    if secret != expected:
        raise HTTPException(status_code=401, detail="Invalid onboarding secret")


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/onboarding/process")
async def onboarding_webhook(
    payload: OnboardingWebhookPayload,
    x_onboarding_secret: str | None = Header(default=None),
):
    """
    يستقبل نصاً خاماً من n8n/WhatsApp بعد محادثة العميل،
    يرسله لـ Claude Haiku ليستخرج JSON منظّم،
    ثم ينشئ الـ tenant تلقائياً ويُرجع رابط الداشبورد.
    """
    _verify_secret(x_onboarding_secret)

    # 1. استخراج البيانات المنظمة
    try:
        extracted = await _extract_with_claude(payload.extracted_json)
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY invalid or expired — update .env")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {e}")

    # 2. توليد كلمة مرور قوية (تُرسَل للعميل عبر واتساب)
    auto_password = _generate_password()

    # 3. تسجيل الـ tenant
    #    registration_service تعتني بـ: إنشاء Client + User + seed services + Sheets
    data = extracted.model_dump()
    data["password"] = auto_password
    data["venue_type"] = extracted.service_type   # mapping للحقل المتوقع

    try:
        result = await register_new_tenant(prisma_client, data)
    except ValueError as e:
        # Known domain errors from registration_service (slug conflict, email taken…)
        logger.warning("Onboarding rejected for slug '%s': %s", extracted.slug, e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Unexpected DB/infra error — log full detail, never leak to caller
        logger.error("Onboarding failed unexpectedly for slug '%s': %s", extracted.slug, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")

    # 4. إرجاع كل ما يحتاجه n8n لإرسال رسالة واتساب للعميل
    return {
        "success": True,
        "message": "مرحباً بك! موقعك أصبح جاهزاً",
        "dashboard_url": result["data"]["dashboard_url"],
        "trial_ends_at": result["data"]["trial_ends_at"],
        "temp_password": auto_password,     # n8n يرسلها للعميل مرة واحدة فقط
        "slug": extracted.slug,
    }


# ─── Claude Extraction ────────────────────────────────────────────────────────

async def _extract_with_claude(raw_text: str) -> ClientExtract:
    """يرسل النص الخام لـ Claude Haiku ويعيد ClientExtract منظّم."""

    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = anthropic.AsyncAnthropic(api_key=api_key)

    system_prompt = """
أنت مساعد خبير في استخراج بيانات العملاء لمنصة SalmanSaaS.
من النص المقدم، استخرج المعلومات التالية وأعدها بصيغة JSON صارمة.

الحقول المطلوبة:
- slug: معرف فريد من كلمة واحدة بالإنجليزية (مثال: "beitsmar", "caracas")
- business_name_ar: اسم المنشأة بالعربية
- owner_name: اسم المالك
- whatsapp_number: رقم الهاتف بصيغة دولية (مثال: +96171234567)
- email: البريد الإلكتروني
- service_type: نوع الخدمة — أحد هذه القيم فقط: real_estate | restaurant | store | services
- primary_color: اللون الأساسي (#RRGGBB)، افتراضياً "#d4a853" إذا لم يُذكر
- template_key: مفتاح القالب إن ذُكر، وإلا null
- page_type: "showcase" إذا طلب تصميم سينمائي/احترافي، وإلا "normal"
- active_services: مصفوفة الخدمات — أمثلة:
    ["booking","gallery"] للعقارات
    ["restaurant","whatsapp_ordering"] للمطاعم
    ["store"] للمتاجر
- trial_days: 14

أخرج JSON فقط بدون أي نص أو شرح إضافي.
"""

    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",  # haiku 4.5 — أسرع وأرخص
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": raw_text}],
    )

    content = response.content[0].text
    content = content.strip().removeprefix("```json").removesuffix("```").strip()

    try:
        return ClientExtract.model_validate_json(content)
    except Exception:
        raise HTTPException(
            status_code=422,
            detail=f"Claude returned invalid JSON. Missing required fields. Raw: {content[:300]}"
        )
