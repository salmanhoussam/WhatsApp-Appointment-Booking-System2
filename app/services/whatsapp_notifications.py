"""
app/services/whatsapp_notifications.py
Fire-and-forget helpers for sending WhatsApp messages.

Usage (in a route, with a real FastAPI BackgroundTasks object):
    background_tasks.add_task(
        send_booking_confirmation,
        customer_phone=...,
        booking_ref=...,
        unit_name=...,
        check_in=...,
        check_out=...,
        client_name=...,
    )

Reservation notifications below (Phase D, Customer Experience, 2026-08-24) are instead scheduled
via asyncio.create_task() directly from reservation_service.py's own mutation functions
(update_status(), edit_reservation(), cancel_by_customer()) rather than a route-supplied
BackgroundTasks object -- those functions are already called from contexts with no such object
available (the WhatsApp webhook's own background task has none), and this way every caller
(admin dashboard routes, customer self-cancel, the WhatsApp bot flow) gets the same notification
behavior "for free" from the one shared Service, instead of each route having to remember to
schedule it itself. Every function below still follows the same "never raises, logs instead"
contract either way -- safe to schedule fire-and-forget through either mechanism.
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


# ── Reservation Engine notifications (Phase D, Customer Experience, 2026-08-24) ────────────────
# Same "never raises, logs instead" contract as the Booking helpers above -- scheduled via
# asyncio.create_task() from reservation_service.py, not a route-supplied BackgroundTasks object
# (see this module's own docstring for why).

async def send_reservation_confirmation(
    customer_phone: str,
    reservation_ref: str,
    service_name: str,
    barber_name: str,
    reserved_at: str,
    client_name: str = "",
) -> None:
    """Sent when a reservation's status is explicitly moved to "confirmed" -- distinct from the
    WhatsApp bot's own immediate "we received your booking" ack (sent at creation time, while the
    real status is still "pending") -- this is the first real notification tied to the actual
    business confirming the appointment, and the first one that reaches a customer regardless of
    which channel (website or WhatsApp) the reservation was created through."""
    try:
        wa = WhatsAppService()
        message = (
            f"✅ *تم تأكيد موعدك!*\n\n"
            f"رقم الحجز: *{reservation_ref}*\n"
            f"الخدمة: {service_name}\n"
            f"الحلاق: {barber_name}\n"
            f"الموعد: {reserved_at}\n\n"
            f"نراك قريباً في {client_name} 💈"
        )
        await wa.send_text(to=customer_phone, text=message)
        logger.info("✅ Reservation confirmation sent to %s (ref=%s)", customer_phone, reservation_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send reservation confirmation to %s: %s",
            customer_phone, exc, exc_info=True,
        )


async def send_reservation_cancellation(
    customer_phone: str,
    reservation_ref: str,
    client_name: str = "",
) -> None:
    """Sent when a reservation's status is moved to "cancelled" -- whether by an admin/STAFF
    action (update_status()) or the customer's own self-cancel (cancel_by_customer()); both real
    callers of this function share the same message, since either way the customer's real-world
    next action (rebook if it was a mistake) is identical."""
    try:
        wa = WhatsAppService()
        message = (
            f"❌ *تم إلغاء موعدك*\n\n"
            f"رقم الحجز: *{reservation_ref}*\n\n"
            f"إذا كان الإلغاء بالخطأ أو تريد حجز موعد آخر،\n"
            f"تواصل مع {client_name} مباشرةً."
        )
        await wa.send_text(to=customer_phone, text=message)
        logger.info("✅ Reservation cancellation notice sent to %s (ref=%s)", customer_phone, reservation_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send reservation cancellation notice to %s: %s",
            customer_phone, exc, exc_info=True,
        )


async def send_reservation_reschedule(
    customer_phone: str,
    reservation_ref: str,
    service_name: str,
    barber_name: str,
    reserved_at: str,
    client_name: str = "",
) -> None:
    """Sent when edit_reservation() actually changes the schedule (time/duration/barber) -- never
    fired for a name/phone/service-only edit, matching edit_reservation()'s own
    schedule_changed distinction."""
    try:
        wa = WhatsAppService()
        message = (
            f"🔄 *تم تعديل موعدك*\n\n"
            f"رقم الحجز: *{reservation_ref}*\n"
            f"الخدمة: {service_name}\n"
            f"الحلاق: {barber_name}\n"
            f"الموعد الجديد: {reserved_at}\n\n"
            f"نراك في {client_name} 💈"
        )
        await wa.send_text(to=customer_phone, text=message)
        logger.info("✅ Reservation reschedule notice sent to %s (ref=%s)", customer_phone, reservation_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send reservation reschedule notice to %s: %s",
            customer_phone, exc, exc_info=True,
        )
