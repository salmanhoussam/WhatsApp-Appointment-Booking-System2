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


def _report(result, what: str, who: str, ref: str = "") -> bool:
    """Log the REAL outcome of one send, and hand it back to the caller.

    Phase 0 — Channel Proof (2026-09-10). Every helper below used to log an unconditional "✅ sent"
    the moment `await wa.send_text(...)` returned without raising — and it never raises. So the
    server log asserted delivery in every failure mode there is: no credentials, a dead token, a
    closed 24-hour window, a bad recipient. `send_staff_setup_link` was fixed on 2026-09-08 after
    that cost جعفر six days locked out; this generalises the same discipline to all of them.

    The helpers keep their "never raises" contract — a failed notification must not roll back the
    real booking or account that scheduled it — but a swallowed exception is no longer allowed to
    read as success.
    """
    tail = f" (ref={ref})" if ref else ""
    if result:
        # "accepted", not "delivered" — and the distinction is not pedantic. Proven on production
        # 2026-09-11: this exact line logged "delivered" for a message Meta accepted with a wamid
        # and then failed to deliver with 131047 (closed 24-hour window). Delivery is only ever
        # knowable from the statuses[] callback in webhook.py, which arrives seconds to minutes
        # later under the SAME wamid. A send helper can report acceptance and nothing more.
        logger.info("✅ %s accepted by Meta for %s%s — wamid=%s", what, who, tail,
                    getattr(result, "wamid", None) or "—")
        return True
    logger.error("🔥 %s REJECTED for %s%s — %s", what, who, tail,
                 result.log_suffix() if hasattr(result, "log_suffix") else result)
    return False


async def send_booking_confirmation(
    customer_phone: str,
    booking_ref: str,
    unit_name: str,
    check_in: str,
    check_out: str,
    client_name: str = "",
) -> bool:
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
        return _report(await wa.send_text(to=customer_phone, text=message),
                       "Booking confirmation", customer_phone, booking_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send booking confirmation to %s: %s",
            customer_phone, exc, exc_info=True,
        )
        return False


async def send_booking_cancellation(
    customer_phone: str,
    booking_ref: str,
    client_name: str = "",
) -> bool:
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
        return _report(await wa.send_text(to=customer_phone, text=message),
                       "Cancellation notice", customer_phone, booking_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send cancellation notice to %s: %s",
            customer_phone, exc, exc_info=True,
        )
        return False


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
) -> bool:
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
        return _report(await wa.send_text(to=customer_phone, text=message),
                       "Reservation confirmation", customer_phone, reservation_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send reservation confirmation to %s: %s",
            customer_phone, exc, exc_info=True,
        )
        return False


async def send_reservation_cancellation(
    customer_phone: str,
    reservation_ref: str,
    client_name: str = "",
) -> bool:
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
        return _report(await wa.send_text(to=customer_phone, text=message),
                       "Reservation cancellation notice", customer_phone, reservation_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send reservation cancellation notice to %s: %s",
            customer_phone, exc, exc_info=True,
        )
        return False


async def send_reservation_reschedule(
    customer_phone: str,
    reservation_ref: str,
    service_name: str,
    barber_name: str,
    reserved_at: str,
    client_name: str = "",
) -> bool:
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
        return _report(await wa.send_text(to=customer_phone, text=message),
                       "Reservation reschedule notice", customer_phone, reservation_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send reservation reschedule notice to %s: %s",
            customer_phone, exc, exc_info=True,
        )
        return False


# ── Staff invite (2026-09-07) ──────────────────────────────────────────────────
# Sent from the CENTRAL WhatsApp number, the same transport every notification above uses. Same
# "never raises, logs instead" contract: an invite whose WhatsApp delivery fails must not fail the
# account creation that scheduled it -- the setup link is also returned in the API response, so the
# owner can always deliver it by hand.

async def send_staff_setup_link(
    staff_phone: str,
    staff_name: str,
    setup_url: str,
    client_name: str = "",
) -> bool:
    """WhatsApp a new team member their one-time account-setup link.

    Returns True only if the send actually succeeded. Still never raises — a failed invite must not
    roll back the account that was just created — but the caller now gets the real outcome instead
    of having to assume one. Established 2026-09-08 (`.claude/rules/phone-numbers.md`, "A send is
    not 'sent' until it succeeded"): جعفر's invite failed silently on 2026-09-07 while the owner was
    shown "sent", and he was still locked out six days later.
    """
    try:
        wa = WhatsAppService()
        message = (
            f"مرحباً {staff_name} 👋\n\n"
            f"تمّ إنشاء حسابك في *{client_name}*.\n"
            f"لتفعيل الحساب واختيار كلمة السر، افتح هذا الرابط:\n"
            f"{setup_url}\n\n"
            f"⚠️ الرابط لمرة واحدة وينتهي خلال 7 أيام.\n"
            f"لا تشاركه مع أحد."
        )
        # The reason classification this function used to derive by hand moved into SendResult
        # (2026-09-10, Phase 0) so that every other helper gets the same diagnosis instead of only
        # this one. `reason` still says WHO fixes it — credentials_missing is a Railway env var,
        # meta_401 is a dead access token, meta_400 with code 131047 is the 24-hour window.
        return _report(await wa.send_text(to=staff_phone, text=message),
                       f"Staff setup link ({staff_name})", staff_phone)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send staff setup link to %s: %s",
            staff_phone, exc, exc_info=True,
        )
        return False


# ── Merchant-side alert (2026-09-07) ──────────────────────────────────────────
# Every notification above this line goes to the CUSTOMER. Until now nothing told the shop that a
# booking had arrived — the owner only found out by opening the dashboard. Salman's requirement:
# "أول ما يصير حجز، ينبعت لصاحب المحل، وإذا صار حجز عند manager، ينبعت لاثنين."
#
# Same "never raises, logs instead" contract as every helper above: a merchant alert that fails
# must never roll back the customer's real booking.

async def send_new_reservation_to_merchant(
    recipient_phone: str,
    recipient_label: str,
    reservation_ref: str,
    customer_name:   str,
    customer_phone:  str,
    service_name:    str,
    barber_name:     str,
    reserved_at:     str,
) -> bool:
    """Tell the shop (owner, and the assigned staff member) that a booking just came in.

    Deliberately includes the customer's real phone number: the whole point for the merchant is
    being able to call back, and it is their own customer's data on their own tenant.
    """
    try:
        wa = WhatsAppService()
        lines = [
            "🔔 *حجز جديد*",
            "",
            f"الزبون: *{customer_name or '—'}*",
            f"الرقم: {customer_phone or '—'}",
        ]
        if service_name:
            lines.append(f"الخدمة: {service_name}")
        if barber_name:
            lines.append(f"الموظف: {barber_name}")
        lines += [
            f"الموعد: {reserved_at}",
            "",
            f"رقم الحجز: *{reservation_ref}*",
        ]
        return _report(await wa.send_text(to=recipient_phone, text="\n".join(lines)),
                       f"New-reservation alert ({recipient_label})", recipient_phone,
                       reservation_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send new-reservation alert to %s (%s): %s",
            recipient_phone, recipient_label, exc, exc_info=True,
        )
        return False
