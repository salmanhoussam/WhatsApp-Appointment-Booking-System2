"""
Merchant actions from WhatsApp — A2.

Two actors, one machine. The OWNER taps "تأكيد"/"إلغاء" on the new-reservation alert and the
booking moves pending -> confirmed/cancelled; a BARBER taps "تم"/"لم يحضر" on his own booking and
it moves confirmed -> arrived/no_show. Decisions, all Salman's (2026-09-12), recorded in
`.claudedocs/plans/a2-merchant-authorization-from-whatsapp.md` §6:

  A2-a  Confirming belongs to the OWNER, and only from WhatsApp. Managers and staff confirm from
        the dashboard, which is why they receive an alert with no buttons.
  A2-b  The actor is a Barber resolved from the inbound sender number -- there is no
        authenticated User in a webhook.
  A2-c  An unauthorised tap fails SILENTLY to the sender and is written to the audit log,
        matching `whatsapp_flow.py`'s own suspended-tenant precedent.
  A2-d  A BARBER may act only on TODAY's bookings, by BEIRUT local date. This is the project's
        first action-time policy -- `update_status()` has never compared `reservedAt` to now --
        so it lives here, at the channel that needed it, rather than in the shared service where
        it would silently govern the dashboard too.

        IT DOES NOT APPLY TO THE OWNER, deliberately. A booking that arrives today for Saturday
        has to be confirmable NOW; a "today only" rule on the owner would break the core loop the
        whole channel exists for. A2-d was settled in A2-b's context -- marking attendance, which
        is same-day by nature -- and extending it to confirmation would be a decision nobody made.

WHY "تم" MAPS TO `arrived` AND NOT A NEW STATUS. `arrived` ("وصل") is already a terminal state in
the real transition graph and already carries the meaning "the appointment happened". Reservation
has no `completed` concept at all -- that word belongs to `booking_service.py`'s separate unit-
booking vocabulary. Salman's decision: functional equivalence, no new status.
Investigation: `.claudedocs/work/reservation-status-domain/2026-09-12/summary.md`.

THE SAFETY PROPERTY THAT MAKES THIS SMALL. `TRANSITIONS` has no edge from `pending` to `arrived`
or `no_show` -- both are reachable only from `confirmed`. So a barber structurally CANNOT act on a
booking nobody confirmed, and A2-a's boundary is enforced by the domain rather than by a
permission check here. This module adds no authorisation vocabulary; it derives the same
`staff_barber_id` scope `scope_barber_id()` produces for a logged-in staff account, and hands it
to the one existing write path, `reservation_service.update_status()`.

EVERY TAP IS RECORDED IN THE CHANNEL (2026-09-12). It goes into the conversation the alert it
answers already lives in -- `origin.conversationId` -- and NOT into the customer's conversation.
A tap is genuinely an inbound message FROM THE BARBER; filing it under the customer's phone with
`direction: "IN"` would make the channel history assert the CUSTOMER sent it. The owner still sees
it where he needs to, because the row carries `reservationId`: `Reservation.whatsappMessages` is
the join A3 was built for, so the dashboard reads it off the reservation itself.

Recording happens BEFORE the authorisation checks, so a refused tap is visible too -- "someone
tapped and it did not work" and "nothing arrived" must not look identical. And because `wamid` is
UNIQUE, the insert IS the idempotency claim: a Meta webhook retry cannot act twice.

NOT IMPLEMENTED, DELIBERATELY:
  * The SEND side. Today's merchant alert is free-form `send_text` with no buttons, so nothing can
    be tapped yet -- a button-bearing alert needs an approved Meta template. Built receive-first
    on purpose, the same order Gate 1 used: make it real before making it reachable.
"""

import logging
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from app.core.phone import normalize_for_storage
from app.db.client import prisma_client
from app.repositories import barber_repo
from app.repositories.client_repo import ClientRepository
from app.repositories.reservation_repo import ReservationRepository
from app.repositories.whatsapp_channel_repo import WhatsAppChannelRepository
from app.services import reservation_service
from app.services.reservation_service import ReservationAccessDenied
from app.services.security_audit_service import log_security_event

logger = logging.getLogger(__name__)

_ENDPOINT = "/api/v1/webhook/whatsapp"

# A2-d's one knob. Named rather than inlined because "today" is meaningless without the zone it
# is measured in: at 02:00 Beirut the UTC date is still YESTERDAY, so a UTC comparison would
# refuse every legitimate tap for the first three hours of each day. `reservedAt` is a
# Timestamptz and arrives UTC-aware; both sides are converted before the dates are compared.
_LOCAL_TZ = ZoneInfo("Asia/Beirut")

# Button payload -> the status it requests. Payloads are what a template SHOULD carry; the Arabic
# labels are the fallback, because a quick-reply button authored in WhatsApp Manager without a
# payload field arrives with its payload equal to its own visible text.
_INTENTS: dict[str, str] = {
    "BARBER_DONE":    "arrived",
    "BARBER_NO_SHOW": "no_show",
    "تم":              "arrived",
    "تمّ":              "arrived",
    "لم يحضر":         "no_show",
    "ما حضر":          "no_show",
}


# The OWNER's buttons, on the template that has been live since 2026-09-11. Its body promises
# "اضغط تأكيد ليصل الإشعار للزبون" -- and until this handler existed, tapping it did nothing, so
# that promise was already published and unkept.
#
# Both spellings of each word: a quick-reply button authored with no payload field returns its own
# visible Arabic text, and "تاكيد" without the hamza is what a phone keyboard often produces.
_OWNER_INTENTS: dict[str, str] = {
    "OWNER_CONFIRM": "confirmed",
    "OWNER_CANCEL":  "cancelled",
    "تأكيد":          "confirmed",
    "تاكيد":          "confirmed",
    "إلغاء":          "cancelled",
    "الغاء":          "cancelled",
}

# Which actor a tap claims to be. Checked in this order because the two sets are disjoint by
# design -- an overlap would be a real bug, not a precedence question.
_OWNER, _BARBER = "owner", "barber"


def _actor_and_status(payload: str, title: str) -> tuple[Optional[str], Optional[str]]:
    """(actor, requested status) for a tap, or (None, None) when it is not a merchant action."""
    for candidate in (payload, title):
        key = (candidate or "").strip()
        if key in _OWNER_INTENTS:
            return _OWNER, _OWNER_INTENTS[key]
        if key in _INTENTS:
            return _BARBER, _INTENTS[key]
    return None, None


def _phone_candidates(sender: str) -> list[str]:
    """Every stored form the sender's number could legitimately have.

    Meta delivers the sender with its country code and no "+", which is exactly the storage form
    the Phone Numbers rule mandates. The bare national form is included anyway: rows written
    before that rule existed lack the code, and this is a READ -- widening a read is safe, whereas
    widening a write is what the rule forbids.
    """
    normalized = normalize_for_storage(sender)
    out: list[str] = []
    for value in (normalized, sender, (normalized or "")[3:] if normalized else None):
        if value and value not in out:
            out.append(value)
    return out


async def _refuse(reason: str, sender: str, detail: dict, client_id: Optional[str] = None) -> None:
    """A2-c: nothing goes back to the sender; the attempt is recorded.

    Silence is the project's established answer here -- `whatsapp_flow.py`'s suspended-tenant
    branch does the same, and its comment says telling the sender is a business decision made
    elsewhere. It also refuses to confirm to an impersonator that the number is watched.
    """
    logger.warning("🚫 Merchant action refused (%s) from %s — %s", reason, sender, detail)
    await log_security_event(
        event_type = "whatsapp_merchant_action_denied",
        client_id  = client_id,
        endpoint   = _ENDPOINT,
        detail     = {"reason": reason, "sender_phone": sender, **detail},
        actor      = None,
    )


async def try_handle(sender_phone: str, msg: dict, msg_type: str,
                     payload: str, title: str, context_wamid: Optional[str]) -> bool:
    """Handle a merchant's button tap. Returns True when this message was a merchant action.

    True means "fully dealt with, stop processing" -- including every refusal, because a refused
    tap must not then fall through into the customer booking state machine, where "تأكيد" would
    be read as a CUSTOMER's answer and could corrupt a real booking session.
    """
    if msg_type != "template_button":
        return False
    actor, new_status = _actor_and_status(payload, title)
    if actor is None:
        return False

    # ── The anchor (A3). The reservation comes from recorded state, never from the tap. ──
    if not context_wamid:
        await _refuse("no_context", sender_phone, {"payload": payload})
        return True

    channel = WhatsAppChannelRepository(prisma_client)
    origin = await channel.find_message_by_wamid(context_wamid)
    if origin is None:
        await _refuse("unknown_context", sender_phone, {"context_wamid": context_wamid})
        return True
    if not origin.reservationId or not origin.clientId:
        await _refuse("context_not_a_reservation", sender_phone, {
            "context_wamid": context_wamid, "message_id": origin.id,
        }, client_id=origin.clientId)
        return True

    # The tenant is the RESERVATION's, not the channel's. The central number is shared, so
    # display_phone would resolve whichever tenant happens to hold it -- the defect this anchor
    # exists to avoid.
    client_id = origin.clientId

    # ── Record the tap, and let the insert be the idempotency claim. ──
    #
    # Before the authorisation checks on purpose: the channel history should show that a tap
    # arrived even when it is refused. `wamid` is UNIQUE, so a Meta retry loses the race here and
    # returns False rather than acting a second time.
    #
    # `purpose` records what was REQUESTED. The outcome is not duplicated into it -- the
    # reservation's own status is the outcome, and SecurityAuditLog says whether it was allowed.
    tap_wamid = (msg or {}).get("id")
    if tap_wamid:
        claimed = await channel.claim_inbound(
            wamid           = tap_wamid,
            conversation_id = origin.conversationId,
            client_id       = client_id,
            message_type    = "button",
            text            = title,
            purpose         = f"{actor}_action:{new_status}",
            context_type    = "reservation",
            context_id      = origin.reservationId,
            reservation_id  = origin.reservationId,
        )
        if not claimed:
            logger.info("↩️  Merchant tap %s already processed — ignoring Meta retry", tap_wamid)
            return True
    reservations = ReservationRepository(prisma_client)
    reservation = await reservations.find_by_id(origin.reservationId, client_id)
    if reservation is None:
        await _refuse("reservation_missing", sender_phone, {
            "reservation_id": origin.reservationId,
        }, client_id=client_id)
        return True

    # ── The actor, and the scope that goes with it. ──
    #
    # scope_id is what reservation_service.update_status() re-checks independently: None means
    # tenant-wide (the owner, whose scope is "all" in the permission model), a Barber id means
    # that barber's own rows only -- the same value scope_barber_id() derives for a logged-in
    # staff account, reached from a phone instead of a session.
    actor_id: str
    scope_id: Optional[str]

    if actor == _OWNER:
        # A2-a. The owner is whoever the shop's own alert goes to -- reservation_service.py:119's
        # `whatsapp_number or phone`, read here rather than restated, so "who is the owner" has
        # one answer across sending and acting.
        client = await ClientRepository(prisma_client).get_by_id(client_id)
        owner_numbers = [
            normalize_for_storage(n) or n
            for n in (getattr(client, "whatsapp_number", None),
                      getattr(client, "phone", None)) if n
        ] if client else []
        if not any(c in owner_numbers for c in _phone_candidates(sender_phone)):
            await _refuse("sender_not_owner", sender_phone, {
                "reservation_id": reservation.id,
            }, client_id=client_id)
            return True
        actor_id, scope_id = client_id, None
    else:
        # A2-b. Resolved from the sender number, scoped to his own rows.
        barber = await barber_repo.find_active_barber_by_phones(
            client_id, _phone_candidates(sender_phone))
        if barber is None:
            await _refuse("sender_not_staff", sender_phone, {
                "reservation_id": reservation.id,
            }, client_id=client_id)
            return True
        if reservation.barberId != barber.id:
            await _refuse("not_own_reservation", sender_phone, {
                "reservation_id":     reservation.id,
                "reservation_barber": reservation.barberId,
                "sender_barber":      barber.id,
            }, client_id=client_id)
            return True
        actor_id, scope_id = barber.id, barber.id

        # ── A2-d: today only, Beirut local date. BARBER ONLY. ──
        #
        # Not applied to the owner: a booking arriving today for Saturday must be confirmable now.
        # Placed AFTER the ownership checks on purpose -- every refusal is silent either way, so
        # ordering leaks nothing, and this way the audit trail distinguishes "a real barber acted
        # on the wrong day" from "a stranger tapped a button".
        reserved_local = reservation.reservedAt.astimezone(_LOCAL_TZ)
        today_local    = datetime.now(_LOCAL_TZ).date()
        if reserved_local.date() != today_local:
            await _refuse("out_of_time_window", sender_phone, {
                "reservation_id": reservation.id,
                "reserved_local": reserved_local.isoformat(),
                "today_local":    today_local.isoformat(),
                "requested":      new_status,
            }, client_id=client_id)
            return True

    # ── The act. One existing write path; its transition graph is the real gate. ──
    try:
        await reservation_service.update_status(
            client_id       = client_id,
            reservation_id  = reservation.id,
            new_status      = new_status,
            staff_barber_id = scope_id,
        )
    except ReservationAccessDenied:
        # Defence in depth: update_status() re-checks the same ownership independently.
        await _refuse("scope_denied", sender_phone, {
            "reservation_id": reservation.id, "actor_id": actor_id, "actor": actor,
        }, client_id=client_id)
        return True
    except ValueError as exc:
        # The transition graph refused it -- overwhelmingly "still pending, nobody confirmed yet",
        # which is A2-a holding. Not an error: the correct, expected outcome.
        await _refuse("transition_refused", sender_phone, {
            "reservation_id": reservation.id, "requested": new_status,
            "current":        reservation.status, "error": str(exc),
        }, client_id=client_id)
        return True

    logger.info("✅ Merchant action: reservation %s %s -> %s by %s %s",
                reservation.id, reservation.status, new_status, actor, actor_id)
    await log_security_event(
        event_type = f"whatsapp_{actor}_action",
        client_id  = client_id,
        endpoint   = _ENDPOINT,
        detail     = {
            "reservation_id": reservation.id,
            "from_status":    reservation.status,
            "to_status":      new_status,
            "context_wamid":  context_wamid,
            "button_text":    title,
            "sender_phone":   sender_phone,
        },
        # §3c's contract: a resolved id, never a phone number and never blank.
        actor      = actor_id,
    )
    return True
