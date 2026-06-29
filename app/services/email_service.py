"""
app/services/email_service.py
Transactional email via Resend API.
Requires RESEND_API_KEY in env vars.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_API_KEY = os.getenv("RESEND_API_KEY")
_FROM    = os.getenv("RESEND_FROM_EMAIL", "SalmanSaaS <noreply@salmansaas.com>")

try:
    import resend
    resend.api_key = _API_KEY
    _client = resend if _API_KEY else None
except ImportError:
    _client = None

if not _client:
    logger.warning("⚠️  Resend not configured — RESEND_API_KEY missing or resend not installed")


async def send_booking_confirmation(
    to_email: str,
    customer_name: str,
    unit_name: str,
    check_in: str,
    check_out: str,
    business_name: str,
    whatsapp_number: Optional[str] = None,
) -> bool:
    """Send booking confirmation email to customer. Returns True if sent."""
    if not _client:
        return False

    whatsapp_line = (
        f'<p style="margin:0;color:#6b6b80;font-size:13px;">واتساب: <a href="https://wa.me/{whatsapp_number}" style="color:#d4a853;">{whatsapp_number}</a></p>'
        if whatsapp_number else ""
    )

    html = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Cairo',Arial,sans-serif;">
      <div style="max-width:520px;margin:40px auto;background:#12121a;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;">
        <div style="background:#d4a853;padding:24px 32px;">
          <h1 style="margin:0;color:#0a0a0f;font-size:20px;font-weight:900;">{business_name}</h1>
          <p style="margin:6px 0 0;color:rgba(0,0,0,0.6);font-size:13px;">تأكيد الحجز</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#f0f0f5;font-size:16px;margin:0 0 24px;">مرحباً {customer_name}،</p>
          <p style="color:rgba(255,255,255,0.55);font-size:14px;line-height:1.7;margin:0 0 24px;">
            تم تأكيد حجزك بنجاح. إليك تفاصيل الحجز:
          </p>
          <div style="background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.2);border-radius:8px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="color:rgba(255,255,255,0.4);font-size:12px;padding:6px 0;">الوحدة</td><td style="color:#f0f0f5;font-size:14px;font-weight:700;text-align:left;">{unit_name}</td></tr>
              <tr><td style="color:rgba(255,255,255,0.4);font-size:12px;padding:6px 0;">الوصول</td><td style="color:#d4a853;font-size:14px;font-weight:700;text-align:left;">{check_in}</td></tr>
              <tr><td style="color:rgba(255,255,255,0.4);font-size:12px;padding:6px 0;">المغادرة</td><td style="color:#d4a853;font-size:14px;font-weight:700;text-align:left;">{check_out}</td></tr>
            </table>
          </div>
          <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0;">للاستفسار تواصل معنا:</p>
          {whatsapp_line}
        </div>
        <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;">powered by <span style="color:#d4a853;">SalmanSaaS</span></p>
        </div>
      </div>
    </body>
    </html>
    """

    try:
        import asyncio
        def _send():
            return _client.Emails.send({
                "from":    _FROM,
                "to":      [to_email],
                "subject": f"تأكيد حجزك في {business_name} ✓",
                "html":    html,
            })
        await asyncio.to_thread(_send)
        logger.info(f"✅ Booking confirmation sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Resend failed: {e}")
        return False


async def send_welcome_email(
    to_email: str,
    business_name: str,
    slug: str,
    temp_password: Optional[str] = None,
) -> bool:
    """Send welcome email to new tenant admin. Returns True if sent."""
    if not _client:
        return False

    dashboard_url = f"https://demo.salmansaas.com/login"
    password_line = (
        f'<p style="color:rgba(255,255,255,0.55);font-size:13px;">كلمة المرور المؤقتة: <code style="background:rgba(212,168,83,0.1);color:#d4a853;padding:2px 8px;border-radius:4px;">{temp_password}</code></p>'
        if temp_password else ""
    )

    html = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Cairo',Arial,sans-serif;">
      <div style="max-width:520px;margin:40px auto;background:#12121a;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#d4a853,#b8882a);padding:32px;">
          <h1 style="margin:0;color:#0a0a0f;font-size:22px;font-weight:900;">مرحباً بك في SalmanSaaS</h1>
        </div>
        <div style="padding:32px;">
          <p style="color:#f0f0f5;font-size:16px;margin:0 0 16px;">أهلاً وسهلاً بـ <strong style="color:#d4a853;">{business_name}</strong></p>
          <p style="color:rgba(255,255,255,0.55);font-size:14px;line-height:1.7;margin:0 0 24px;">تم إنشاء حسابك بنجاح. يمكنك الآن الدخول إلى لوحة التحكم وإدارة منشأتك.</p>
          {password_line}
          <a href="{dashboard_url}" style="display:inline-block;background:#d4a853;color:#0a0a0f;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">الدخول للوحة التحكم ←</a>
          <p style="color:rgba(255,255,255,0.25);font-size:12px;margin-top:24px;">رابط منشأتك: <span style="color:#d4a853;">{slug}.salmansaas.com</span></p>
        </div>
      </div>
    </body>
    </html>
    """

    try:
        import asyncio
        def _send():
            return _client.Emails.send({
                "from":    _FROM,
                "to":      [to_email],
                "subject": f"مرحباً بـ {business_name} في SalmanSaaS ✓",
                "html":    html,
            })
        await asyncio.to_thread(_send)
        logger.info(f"✅ Welcome email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Resend welcome failed: {e}")
        return False
