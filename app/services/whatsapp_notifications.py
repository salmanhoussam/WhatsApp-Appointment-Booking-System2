"""
app/services/whatsapp_notifications.py
Fire-and-forget helpers for sending WhatsApp messages as FastAPI BackgroundTasks.

Usage (in a route):
    background_tasks.add_task(
        send_booking_confirmation,
        customer_phone=...,
        booking_ref=...,
        unit_name=...,
        check_in=...,
        check_out=...,
        client_name=...,
    )
"""

import logging
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)


async def send_booking_confirmation(
    customer_phone: str,
    booking_ref: str,
    unit_name: str,
    check_in: str,
    check_out: str,
    client_name: str = "",
) -> None:
    """
    Send a booking confirmation WhatsApp message to the customer.
    Designed to run as a BackgroundTask — never raises, logs errors instead.
    """
    try:
        wa = WhatsAppService()
        message = (
            f"🎉 *تم تأكيد حجزك بنجاح!*\n\n"
            f"رقم الحجز: *{booking_ref}*\n"
            f"الوحدة: {unit_name}\n"
            f"الوصول: {check_in}\n"
            f"المغادرة: {check_out}\n\n"
            f"شكراً لاختيارك {client_name} 🏡\n"
            f"للاستفسار أو التعديل تواصل معنا."
        )
        await wa.send_text(to=customer_phone, text=message)
        logger.info("✅ Booking confirmation sent to %s (ref=%s)", customer_phone, booking_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send booking confirmation to %s: %s",
            customer_phone, exc, exc_info=True,
        )


async def send_booking_cancellation(
    customer_phone: str,
    booking_ref: str,
    client_name: str = "",
) -> None:
    """
    Notify the customer that their booking has been cancelled.
    Designed to run as a BackgroundTask — never raises.
    """
    try:
        wa = WhatsAppService()
        message = (
            f"❌ *تم إلغاء الحجز*\n\n"
            f"رقم الحجز: *{booking_ref}*\n\n"
            f"إذا كان الإلغاء بالخطأ أو تريد إعادة الحجز،\n"
            f"تواصل مع {client_name} مباشرةً."
        )
        await wa.send_text(to=customer_phone, text=message)
        logger.info("✅ Cancellation notice sent to %s (ref=%s)", customer_phone, booking_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send cancellation notice to %s: %s",
            customer_phone, exc, exc_info=True,
        )
