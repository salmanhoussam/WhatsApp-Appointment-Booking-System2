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
import re
from typing import Optional
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)


# ── Message presentation helpers (2026-09-11, Phase 3 / templates) ────────────
# These shape what a merchant or customer actually READS. They live here, in the
# notification layer, on purpose:
#
#   * the per-vertical emoji is NOT allowed into app/core/verticals.py -- that module
#     states its own ownership boundary ("ALLOWED: default_services, page_template,
#     staff_backing_model / NEVER: ... anything that varies per-tenant") and a message
#     emoji is presentation, not provisioning;
#   * the date format is a template PARAMETER value, never template text, so it stays
#     ours to change without a new Meta approval cycle.

# Salman, 2026-09-11: the vertical supplies the emoji ("الـvertical بيعطينا هيد الإشارة").
# One template serves every vertical; putting 💈 in the template's static text would send
# it to a restaurant too. VERTICAL_REGISTRY holds exactly one vertical today (barber), and
# half of production carries vertical=NULL -- so absence is normal and must not be an error.
_VERTICAL_EMOJI = {
    "barber": "💈",
}

# Python's datetime.weekday(): Monday=0 … Sunday=6.
# NOT interchangeable with the frontend's AR_WEEKDAYS (useReservationBooking.js:57), which is
# indexed by JS getUTCDay() where Sunday=0 -- copying that array here shifts every day by one.
_AR_DAYS = ("الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد")


def shop_label(name: str | None, vertical: str | None = None) -> str:
    """The shop's name as a customer/merchant sees it, with its vertical's emoji appended.

    Takes plain values rather than a Client row so this layer stays free of the data model.
    An unknown or missing vertical simply yields no emoji.
    """
    label = (name or "").strip()
    emoji = _VERTICAL_EMOJI.get(vertical or "")
    return f"{label} {emoji}" if (label and emoji) else label


def fmt_reserved_at(dt) -> str:
    """`الاثنين 15-09 · 16:30` — Salman's requested shape, 2026-09-11.

    Deliberately renders `dt` exactly as stored. get_available_slots() writes a naive local
    wall-clock labelled UTC (reservation_service.py:555-563) -- a known, separately-owned
    defect. This formatter must MATCH what the dashboard already displays, never silently
    correct the timezone, or one defect starts looking like two.
    """
    if dt is None:
        return "—"
    try:
        return f"{_AR_DAYS[dt.weekday()]} {dt:%d-%m} · {dt:%H:%M}"
    except Exception:
        return str(dt)


def _or_dash(value) -> str:
    """Never hand a template an empty parameter — Meta rejects the whole send.

    The free-form builders below could drop an empty line entirely; a template cannot drop a
    line, so an absent service or staff member becomes a dash instead of a missing field.
    """
    text = (value or "").strip() if isinstance(value, str) else (value or "")
    return text or "—"


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
    client_name:     str = "",
) -> bool:
    """Tell the shop (owner, and the assigned staff member) that a booking just came in.

    Deliberately includes the customer's real phone number: the whole point for the merchant is
    being able to call back, and it is their own customer's data on their own tenant. A link
    button would not replace it -- Meta forbids wa.me in template buttons outright, and a call
    button's number is fixed in the template, so it cannot carry the customer's.

    `client_name` added 2026-09-11 (Salman): this alert arrives from the shared CENTRAL number,
    so the merchant sees the platform's identity, not his own shop's -- the message was not
    self-contained, least of all for an owner with more than one shop. Keyword-defaulted rather
    than required so this helper keeps its "never breaks a caller" shape.

    The field order below mirrors the `new_reservation_alert` template EXACTLY (submitted
    2026-09-11). That is deliberate: when the approved template replaces this free-form send,
    the merchant sees the same message he already knows, so the switchover is invisible to him
    and any difference is a real defect rather than a cosmetic one.

    Every field goes through _or_dash(): the free-form message below could drop an empty line,
    but the template cannot, and Meta rejects an empty parameter outright. Matching that rule
    here keeps the two paths byte-comparable.

    Correlation is NOT recorded here any more (2026-09-11, Implementation Gate 1). The
    whatsapp_outbound table this used to write was absorbed into whatsapp_messages, whose write
    path belongs to the conversation layer -- a notification helper is the wrong place to own it.
    See .claudedocs/plans/whatsapp-channel-data-model.md §4b.
    """
    try:
        wa = WhatsAppService()

        # ── The approved template first. Two reasons, and both are load-bearing. ──
        #
        # 1. IT REACHES A COLD NUMBER. A merchant is not a customer messaging in, so his 24-hour
        #    window is shut almost always, and free-form outside it is rejected with 131047 -- the
        #    failure RC1 confirmed on production 2026-09-11. Until this line existed, every
        #    merchant alert was a free-form send that Meta could accept and then never deliver,
        #    with only a log line to say so.
        # 2. IT CARRIES THE BUTTONS. A free-form message cannot. تأكيد/إلغاء exist only on the
        #    template, so without this the A2-a handler was unreachable code -- shipped and dead.
        #
        # NO BUTTON COMPONENTS ARE SENT, deliberately: these buttons were authored in WhatsApp
        # Manager with no payload field, so a tap returns their visible Arabic text, which
        # `whatsapp_merchant_actions._CONFIRM_INTENTS` already matches. That is also why
        # send_template()'s existing "no button components" limitation is not a blocker here.
        #
        # PARAMETER ORDER IS THE CONTRACT and is UNVERIFIED against Meta from this machine (no
        # credentials here, and the Railway CLI is not installed). It is taken from this module's
        # own long-standing claim that the free-form body "mirrors the template EXACTLY", plus the
        # approved template's rendered preview. Which is precisely why the fallback below exists.
        params = [client_name, customer_name, customer_phone,
                  service_name, barber_name, reserved_at, reservation_ref]
        result = await wa.send_template(
            to          = recipient_phone,
            name        = MERCHANT_ALERT_TEMPLATE,
            language    = MERCHANT_ALERT_LANGUAGE,
            body_params = [_or_dash(p) for p in params],
        )
        if result:
            return _report(result, f"New-reservation alert ({recipient_label}, template)",
                           recipient_phone, reservation_ref)

        # ── Fallback: exactly today's behaviour, so nothing can regress. ──
        #
        # A wrong parameter count, a language code that is `ar_LB` rather than `ar`, or a template
        # still under review all land here. Inside an open window the free-form send still works;
        # outside one it fails as it already did. Logged as its OWN event rather than folded into
        # the template attempt -- a silent fallback would hide the exact mismatch this guards
        # against, and we would never learn the template is misconfigured.
        logger.warning(
            "⚠️  Template '%s' send failed for %s (%s) — falling back to free-form. "
            "reason=%s error_code=%s",
            MERCHANT_ALERT_TEMPLATE, recipient_phone, recipient_label,
            getattr(result, "reason", None), getattr(result, "error_code", None),
        )
        lines = [
            "🔔 *حجز جديد*",
            "",
            f"المحل: *{_or_dash(client_name)}*",
            f"الزبون: {_or_dash(customer_name)}",
            f"الرقم: {_or_dash(customer_phone)}",
            f"الخدمة: {_or_dash(service_name)}",
            f"الموظف: {_or_dash(barber_name)}",
            f"الموعد: {_or_dash(reserved_at)}",
            f"رقم الحجز: *{_or_dash(reservation_ref)}*",
        ]
        return _report(await wa.send_text(to=recipient_phone, text="\n".join(lines)),
                       f"New-reservation alert ({recipient_label}, free-form fallback)",
                       recipient_phone, reservation_ref)
    except Exception as exc:
        logger.error(
            "🔥 Failed to send new-reservation alert to %s (%s): %s",
            recipient_phone, recipient_label, exc, exc_info=True,
        )
        return False


# ── Barber alert template payload (A2, 2026-09-12) ────────────────────────────
#
# NOT WIRED. This builds the payload only, so the template can be reviewed, diffed and submitted
# to Meta before anything sends it. Salman's instruction: prepare the builder, do not connect it.
#
# WHY A BUILDER AND NOT A send_template() CALL. `WhatsAppService.send_template()` states in its
# own docstring that "quick-reply buttons take none at all" — it emits header/body components and
# nothing else. That was true for `new_reservation_alert`, which has no buttons. This template
# needs BUTTON components, because they are what makes the payload deterministic (see below), so
# the sender has to grow before it can carry this. Returning the complete payload keeps the two
# concerns separable: this function is reviewable today, the transport changes later.
#
# WHY THE BUTTON COMPONENTS ARE NOT OPTIONAL. A quick-reply button's payload can be set per-send
# via {"type":"payload"} parameters. Supply it and the webhook receives `BARBER_DONE`; omit it and
# what comes back is tied to the button's own visible text — Arabic, translatable, and therefore a
# fragile thing to switch behaviour on. Sending the payload explicitly is what lets
# `whatsapp_barber_actions._INTENTS` match a stable constant; its Arabic entries stay only as a
# defensive fallback, not as the design.
#
# Meta allows at most 3 quick-reply buttons per template. This uses 2.

# The OWNER/ADMIN alert template, approved on Meta 2026-09-11 and carrying the تأكيد/إلغاء
# buttons that A2-a now handles. Seven positional parameters, in the order this module's own
# free-form message has always built them.
MERCHANT_ALERT_TEMPLATE     = "new_reservation_alert"
MERCHANT_ALERT_LANGUAGE     = "ar"

BARBER_ALERT_TEMPLATE       = "barber_reservation_alert"
BARBER_ALERT_LANGUAGE       = "ar"
BARBER_ACTION_DONE_PAYLOAD    = "BARBER_DONE"
BARBER_ACTION_NO_SHOW_PAYLOAD = "BARBER_NO_SHOW"


def _param(value: Optional[str]) -> str:
    """One body parameter, in the only shape Meta accepts.

    Mirrors `WhatsAppService._clean_param` deliberately rather than importing it (it is a private
    method on the sender, and this builder must stand alone): Meta rejects a parameter containing
    a newline, a tab, or four or more consecutive spaces, and rejects an empty one outright — so
    every field collapses its whitespace and falls back to an em dash.
    """
    text = re.sub(r"\s+", " ", (value or "").strip())
    return text or "—"


def build_barber_alert_payload(
    to:              str,
    client_name:     str,
    customer_name:   str,
    customer_phone:  str,
    service_name:    str,
    reserved_at:     str,
    reservation_ref: str,
) -> dict:
    """The exact JSON to POST to Meta for a barber's actionable new-reservation alert.

    THE TEMPLATE THIS MATCHES, to register in WhatsApp Manager (category: UTILITY, language: ar):

        Body:
            🔔 *حجز جديد*

            المحل: *{{1}}*
            الزبون: {{2}}
            الرقم: {{3}}
            الخدمة: {{4}}
            الموعد: {{5}}
            رقم الحجز: *{{6}}*
        Buttons (quick reply):
            [0] تم        [1] لم يحضر

    Parameter ORDER IS THE CONTRACT — positional {{1}}..{{6}}. A reordered list is a silently
    wrong message, never an error, exactly as `send_template` warns.

    Differences from `new_reservation_alert` (the owner's template), both deliberate:
      * No "الموظف" line. The recipient IS the barber; naming him to himself is noise.
      * "المحل" is KEPT even so. The alert arrives from the shared central number, so without it
        the message does not say who it is from — the same reason Salman added it to the owner's
        template on 2026-09-11.
    """
    return {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": BARBER_ALERT_TEMPLATE,
            "language": {"code": BARBER_ALERT_LANGUAGE},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": _param(client_name)},
                        {"type": "text", "text": _param(customer_name)},
                        {"type": "text", "text": _param(customer_phone)},
                        {"type": "text", "text": _param(service_name)},
                        {"type": "text", "text": _param(reserved_at)},
                        {"type": "text", "text": _param(reservation_ref)},
                    ],
                },
                {
                    "type": "button",
                    "sub_type": "quick_reply",
                    "index": "0",
                    "parameters": [
                        {"type": "payload", "payload": BARBER_ACTION_DONE_PAYLOAD},
                    ],
                },
                {
                    "type": "button",
                    "sub_type": "quick_reply",
                    "index": "1",
                    "parameters": [
                        {"type": "payload", "payload": BARBER_ACTION_NO_SHOW_PAYLOAD},
                    ],
                },
            ],
        },
    }
