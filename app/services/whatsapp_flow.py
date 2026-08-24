"""
app/services/whatsapp_flow.py
Stateful WhatsApp booking conversation engine.

──────────────────────────────────────────────────────────────
State machine (one session per customer phone number):

  IDLE
    └─► (any message) ──► greet + show property list
                                    │
                              AWAITING_PROPERTY
                                    │ list_reply → property selected
                                    ▼
                              AWAITING_UNIT
                                    │ list_reply → unit selected
                                    ▼
                              AWAITING_CHECKIN
                                    │ text date "YYYY-MM-DD"
                                    ▼
                              AWAITING_CHECKOUT
                                    │ text date "YYYY-MM-DD"
                                    ▼
                              AWAITING_GUESTS
                                    │ text integer
                                    ▼
                              AWAITING_NAME
                                    │ text name
                                    ▼
                              CONFIRMING  ←──── shows booking summary
                                    │
                          ┌─────────┴──────────┐
                     "confirm"              "cancel"
                          │                     │
                       (booking               IDLE
                        created)
                          │
                        DONE → sends confirmation → IDLE

──────────────────────────────────────────────────────────────
Session store: in-memory dict with 30-minute TTL per session.

Tenant resolution (Phase B, Stage 1 — Central Platform WABA, 2026-08-24):
  1. An already-bound session (mid-conversation) reuses its stored client_id — no re-resolution.
  2. metadata.display_phone_number → Client.phone, when exactly one Client owns that number
     (Stage 2 prep — a tenant with their own dedicated WABA number, unambiguous).
  3. Otherwise (the shared central number, or no per-tenant number set up yet): parse a tenant
     slug out of the first inbound message body (populated by that tenant's own wa.me deep link/
     QR — see whatsapp_service.build_central_booking_link() — the customer never types it
     manually) and match it against Client.slug.
See _resolve_client() / _resolve_client_from_text() below.
"""

import logging
import re
import time
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from app.db.client import prisma_client
from app.services.whatsapp_service import WhatsAppService
from app.services.booking_service import BookingService
from app.repositories.booking_repo import BookingRepository
from app.repositories.customer_repo import CustomerRepository
from app.core.tenant import is_status_blocked
from app.services.security_audit_service import log_security_event
from app.services import whatsapp_reservation_flow

logger = logging.getLogger(__name__)

# ── Session store ─────────────────────────────────────────────────────────────
SESSION_TTL = 1800  # 30 minutes

# States
IDLE             = "IDLE"
AWAITING_PROPERTY = "AWAITING_PROPERTY"
AWAITING_UNIT    = "AWAITING_UNIT"
AWAITING_CHECKIN = "AWAITING_CHECKIN"
AWAITING_CHECKOUT = "AWAITING_CHECKOUT"
AWAITING_GUESTS  = "AWAITING_GUESTS"
AWAITING_NAME    = "AWAITING_NAME"
CONFIRMING       = "CONFIRMING"


@dataclass
class ConversationSession:
    state: str = IDLE
    client_id: str = ""
    client_slug: str = ""
    # Accumulated booking data
    property_id: Optional[str] = None
    property_name: Optional[str] = None
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guests: Optional[int] = None
    customer_name: Optional[str] = None
    # Phase C (Reservation Integration, 2026-08-24) -- accumulated data for the parallel
    # "احجز موعد" conversation branch (whatsapp_reservation_flow.py). Kept on this same session
    # dataclass rather than a second session store, since a conversation is only ever in ONE
    # branch at a time (see whatsapp_flow._step_idle()'s routing) -- additive fields only, nothing
    # above this comment was touched.
    res_service_id: Optional[str] = None
    res_service_name: Optional[str] = None
    res_duration_min: Optional[int] = None
    res_barber_id: Optional[str] = None
    res_barber_name: Optional[str] = None
    res_slot_datetime: Optional[datetime] = None
    res_customer_name: Optional[str] = None
    # TTL
    expires_at: float = field(default_factory=lambda: time.monotonic() + SESSION_TTL)

    def touch(self):
        self.expires_at = time.monotonic() + SESSION_TTL

    @property
    def is_expired(self) -> bool:
        return time.monotonic() > self.expires_at


# session_key = (phone_number_id, customer_phone)
_sessions: dict[tuple[str, str], ConversationSession] = {}


def _get_session(phone_number_id: str, customer_phone: str) -> ConversationSession:
    key = (phone_number_id, customer_phone)
    session = _sessions.get(key)
    if session is None or session.is_expired:
        session = ConversationSession()
        _sessions[key] = session
    else:
        session.touch()
    return session


def _peek_session(phone_number_id: str, customer_phone: str) -> Optional[ConversationSession]:
    """
    Non-vivifying lookup (Phase B, Stage 1): returns an existing, non-expired session or None --
    never creates/stores one. Used before tenant resolution so an unresolvable message (no known
    tenant slug in the text, no dedicated-number match) never leaves a phantom empty session
    sitting in the store -- only a message that actually resolves to a real Client gets one.
    """
    session = _sessions.get((phone_number_id, customer_phone))
    if session is None or session.is_expired:
        return None
    session.touch()
    return session


def _clear_session(phone_number_id: str, customer_phone: str):
    _sessions.pop((phone_number_id, customer_phone), None)


# ── Message parsing ───────────────────────────────────────────────────────────

def _extract_message(msg: dict) -> tuple[str, str, str]:
    """
    Returns (msg_type, text_or_id, display_title).
    msg_type: "text" | "button_reply" | "list_reply" | "unknown"
    """
    msg_type = msg.get("type", "unknown")

    if msg_type == "text":
        body = msg.get("text", {}).get("body", "").strip()
        return "text", body, body

    if msg_type == "interactive":
        interactive = msg.get("interactive", {})
        itype = interactive.get("type", "")

        if itype == "button_reply":
            reply = interactive.get("button_reply", {})
            return "button_reply", reply.get("id", ""), reply.get("title", "")

        if itype == "list_reply":
            reply = interactive.get("list_reply", {})
            return "list_reply", reply.get("id", ""), reply.get("title", "")

    return "unknown", "", ""


def _parse_date(text: str) -> Optional[date]:
    """Try to parse a date from user input. Accepts YYYY-MM-DD."""
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text.strip(), fmt).date()
        except ValueError:
            continue
    return None


# ── Main entry point ──────────────────────────────────────────────────────────

async def handle_incoming_message(payload: dict) -> None:
    """
    Parse a raw Meta webhook payload and route each message to the
    correct state handler. Fires-and-forgets; always returns successfully
    so the webhook endpoint can immediately respond 200 to Meta.
    """
    try:
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                metadata = value.get("metadata", {})
                phone_number_id = metadata.get("phone_number_id", "")
                display_phone = metadata.get("display_phone_number", "")

                for msg in value.get("messages", []):
                    customer_phone = msg.get("from", "")
                    await _dispatch(
                        phone_number_id=phone_number_id,
                        display_phone=display_phone,
                        customer_phone=customer_phone,
                        msg=msg,
                    )
    except Exception as exc:
        logger.error("🔥 handle_incoming_message crash: %s", exc, exc_info=True)


async def _dispatch(
    phone_number_id: str,
    display_phone: str,
    customer_phone: str,
    msg: dict,
) -> None:
    """Route a single message to the correct state handler."""
    wa = WhatsAppService()

    # Message parsed up front (Phase B, Stage 1) -- a mid-conversation reply must be routable by
    # the state machine either way, but a NEW session's tenant resolution needs the raw text
    # before we know which Client this even is. Peeked (not vivified) first: an unresolvable
    # message must never leave a phantom empty session in the store -- see _peek_session().
    msg_type, value, title = _extract_message(msg)
    existing_session = _peek_session(phone_number_id, customer_phone)

    client = await _resolve_client(
        display_phone,
        message_text=value if msg_type == "text" else "",
        session=existing_session,
    )
    if not client:
        logger.warning(
            "⚠️  No client resolved for display_phone=%s (session bound=%s)",
            display_phone, bool(existing_session and existing_session.client_id),
        )
        return

    # Only now -- once a tenant is actually known -- fetch-or-create the real session.
    session = existing_session or _get_session(phone_number_id, customer_phone)

    # ADR-0001 §8.4/§8.4b: the message itself was already "accepted" (found,
    # logged) above — this gates the mutating half of the conversation flow
    # (which can create Customer/Booking rows) for suspended/expired
    # tenants. No customer-facing reply is sent for the blocked case,
    # matching the Samsara webhook's silent-skip pattern — deciding whether
    # end customers should see a "business unavailable" message is a UX/
    # business decision outside this ADR's scope, not made here.
    if is_status_blocked(client.status):
        await log_security_event(
            event_type=f"tenant_{client.status}",
            client_id=client.id,
            endpoint="/api/v1/webhook/whatsapp",
            detail={"status": client.status, "customer_phone": customer_phone},
        )
        logger.info(
            "WhatsApp message received for '%s' but tenant status=%s — accepted, dispatch skipped",
            client.slug, client.status,
        )
        return

    # Always attach client context to fresh sessions (session was already fetched above, before
    # tenant resolution, so it could be passed into _resolve_client() for the reuse check)
    if not session.client_id:
        session.client_id = client.id
        session.client_slug = client.slug

    logger.info(
        "📩 [%s/%s] state=%s type=%s value=%s",
        customer_phone, client.slug, session.state, msg_type, value,
    )

    # Route by state
    if session.state == IDLE:
        await _step_idle(wa, customer_phone, session, client)

    elif session.state == AWAITING_PROPERTY:
        await _step_awaiting_property(wa, customer_phone, session, msg_type, value, title)

    elif session.state == AWAITING_UNIT:
        await _step_awaiting_unit(wa, customer_phone, session, msg_type, value, title)

    elif session.state == AWAITING_CHECKIN:
        await _step_awaiting_checkin(wa, customer_phone, session, msg_type, value)

    elif session.state == AWAITING_CHECKOUT:
        await _step_awaiting_checkout(wa, customer_phone, session, msg_type, value)

    elif session.state == AWAITING_GUESTS:
        await _step_awaiting_guests(wa, customer_phone, session, msg_type, value)

    elif session.state == AWAITING_NAME:
        await _step_awaiting_name(wa, customer_phone, session, msg_type, value)

    elif session.state == CONFIRMING:
        await _step_confirming(
            wa, customer_phone, session, msg_type, value,
            phone_number_id,
        )

    elif session.state in whatsapp_reservation_flow.STATES:
        await whatsapp_reservation_flow.handle(
            wa, customer_phone, session, msg_type, value, title,
            client, phone_number_id, _clear_session,
        )


# ── State handlers ─────────────────────────────────────────────────────────────

async def _step_idle(wa, customer_phone, session, client):
    """Greet the user. Routes into the Reservation Engine's own "احجز موعد" branch (Phase C,
    2026-08-24) when this tenant has the "reservations" service active -- otherwise unchanged,
    falls through to the pre-existing Booking/Property flow below. No real tenant today has both
    active simultaneously (confirmed via a real DB check during Phase C's own investigation), so
    this is a hard either/or rather than a menu -- documented as a deliberate v1 scope limit in
    the Phase C evidence, not a decision hidden here."""
    if await whatsapp_reservation_flow.is_reservations_active(client.id):
        await whatsapp_reservation_flow.start(wa, customer_phone, session, client)
        return

    properties = await prisma_client.property.find_many(
        where={"clientId": client.id, "isActive": True},
        order={"name": "asc"},
    )

    if not properties:
        await wa.send_text(
            customer_phone,
            f"مرحباً بك في {client.name} 👋\nعذراً، لا توجد وحدات متاحة حالياً.",
        )
        return

    sections = [{
        "title": "اختر العقار",
        "rows": [
            {"id": p.id, "title": p.name[:24], "description": (p.description or "")[:72]}
            for p in properties[:10]  # WhatsApp list max 10 rows per section
        ],
    }]

    await wa.send_list_message(
        to=customer_phone,
        header=f"أهلاً بك في {client.name} 🏡",
        body="للحجز، اختر العقار أولاً:",
        button_text="عرض العقارات",
        sections=sections,
    )
    session.state = AWAITING_PROPERTY


async def _step_awaiting_property(wa, customer_phone, session, msg_type, value, title):
    """User selected a property — fetch its units and ask to pick one."""
    if msg_type != "list_reply":
        await wa.send_text(customer_phone, "الرجاء اختيار عقار من القائمة أدناه 👆")
        return

    # Verify property belongs to this client
    prop = await prisma_client.property.find_first(
        where={"id": value, "clientId": session.client_id, "isActive": True}
    )
    if not prop:
        await wa.send_text(customer_phone, "❌ العقار غير موجود. حاول مجدداً.")
        return

    session.property_id = prop.id
    session.property_name = prop.name

    units = await prisma_client.unit.find_many(
        where={"propertyId": prop.id, "clientId": session.client_id, "isActive": True},
        order={"sort_order": "asc"},
    )

    if not units:
        await wa.send_text(customer_phone, "❌ لا توجد وحدات متاحة في هذا العقار حالياً.")
        session.state = IDLE
        return

    sections = [{
        "title": f"وحدات {prop.name}",
        "rows": [
            {
                "id": u.id,
                "title": (u.name_ar or u.unitNumber or u.id)[:24],
                "description": f"سعة {u.capacity} أشخاص" + (f" | {u.bedrooms} غرف" if u.bedrooms else ""),
            }
            for u in units[:10]
        ],
    }]

    await wa.send_list_message(
        to=customer_phone,
        header=prop.name,
        body="اختر الوحدة التي تريد حجزها:",
        button_text="عرض الوحدات",
        sections=sections,
    )
    session.state = AWAITING_UNIT


async def _step_awaiting_unit(wa, customer_phone, session, msg_type, value, title):
    if msg_type != "list_reply":
        await wa.send_text(customer_phone, "الرجاء اختيار وحدة من القائمة 👆")
        return

    unit = await prisma_client.unit.find_first(
        where={"id": value, "clientId": session.client_id, "isActive": True}
    )
    if not unit:
        await wa.send_text(customer_phone, "❌ الوحدة غير موجودة. حاول مجدداً.")
        return

    session.unit_id = unit.id
    session.unit_name = unit.name_ar or unit.unitNumber or "الوحدة"

    await wa.send_text(
        customer_phone,
        f"✅ اخترت: *{session.unit_name}*\n\nما هو تاريخ الوصول؟\nأرسل التاريخ بالصيغة: YYYY-MM-DD\nمثال: 2025-07-15",
    )
    session.state = AWAITING_CHECKIN


async def _step_awaiting_checkin(wa, customer_phone, session, msg_type, value):
    if msg_type != "text":
        await wa.send_text(customer_phone, "أرسل تاريخ الوصول بالصيغة: YYYY-MM-DD")
        return

    d = _parse_date(value)
    if not d:
        await wa.send_text(customer_phone, "❌ صيغة التاريخ غير صحيحة. استخدم: YYYY-MM-DD\nمثال: 2025-07-15")
        return

    if d < date.today():
        await wa.send_text(customer_phone, "❌ لا يمكن الحجز في تاريخ مضى. اختر تاريخاً مستقبلياً.")
        return

    session.check_in = d
    await wa.send_text(
        customer_phone,
        f"📅 تاريخ الوصول: *{d}*\n\nما هو تاريخ المغادرة؟\nأرسل التاريخ بالصيغة: YYYY-MM-DD",
    )
    session.state = AWAITING_CHECKOUT


async def _step_awaiting_checkout(wa, customer_phone, session, msg_type, value):
    if msg_type != "text":
        await wa.send_text(customer_phone, "أرسل تاريخ المغادرة بالصيغة: YYYY-MM-DD")
        return

    d = _parse_date(value)
    if not d:
        await wa.send_text(customer_phone, "❌ صيغة التاريخ غير صحيحة. استخدم: YYYY-MM-DD")
        return

    if d <= session.check_in:
        await wa.send_text(customer_phone, "❌ تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول.")
        return

    session.check_out = d
    nights = (d - session.check_in).days
    await wa.send_text(
        customer_phone,
        f"📅 تاريخ المغادرة: *{d}* ({nights} ليلة)\n\nكم عدد الضيوف؟ (أرسل رقماً)",
    )
    session.state = AWAITING_GUESTS


async def _step_awaiting_guests(wa, customer_phone, session, msg_type, value):
    if msg_type != "text" or not value.isdigit():
        await wa.send_text(customer_phone, "أرسل عدد الضيوف كرقم فقط. مثال: 4")
        return

    guests = int(value)
    if guests < 1 or guests > 50:
        await wa.send_text(customer_phone, "❌ عدد الضيوف يجب أن يكون بين 1 و 50.")
        return

    session.guests = guests
    await wa.send_text(customer_phone, "ما اسمك الكريم؟")
    session.state = AWAITING_NAME


async def _step_awaiting_name(wa, customer_phone, session, msg_type, value):
    if msg_type != "text" or len(value.strip()) < 2:
        await wa.send_text(customer_phone, "الرجاء إدخال اسمك.")
        return

    session.customer_name = value.strip()

    # Fetch price estimate
    nights = (session.check_out - session.check_in).days
    price_summary = await _estimate_price(session)

    summary = (
        f"📋 *ملخص الحجز*\n"
        f"───────────────\n"
        f"🏡 العقار: {session.property_name}\n"
        f"🛏  الوحدة: {session.unit_name}\n"
        f"📅 الوصول: {session.check_in}\n"
        f"📅 المغادرة: {session.check_out} ({nights} ليلة)\n"
        f"👥 الضيوف: {session.guests}\n"
        f"💰 السعر التقديري: {price_summary}\n"
        f"───────────────\n"
        f"هل تريد تأكيد الحجز؟"
    )

    await wa.send_interactive_buttons(
        to=customer_phone,
        text=summary,
        buttons=[
            {"type": "reply", "reply": {"id": "confirm", "title": "✅ تأكيد"}},
            {"type": "reply", "reply": {"id": "cancel",  "title": "❌ إلغاء"}},
        ],
    )
    session.state = CONFIRMING


async def _step_confirming(wa, customer_phone, session, msg_type, value, phone_number_id):
    if msg_type != "button_reply":
        await wa.send_text(customer_phone, "الرجاء الضغط على أحد الأزرار أعلاه ✅ أو ❌")
        return

    if value == "cancel":
        await wa.send_text(customer_phone, "تم إلغاء الحجز. شكراً لتواصلك معنا 🙏")
        _clear_session(phone_number_id, customer_phone)
        return

    if value != "confirm":
        return

    # Create the booking
    try:
        booking_repo = BookingRepository(prisma_client)
        customer_repo = CustomerRepository(prisma_client)
        booking_svc = BookingService(booking_repo, customer_repo)

        # Calculate total price from Price table
        total_price = await _calculate_total_price(session)

        booking = await booking_svc.create_booking(
            client_id=session.client_id,
            unit_id=session.unit_id,
            customer_data={
                "name": session.customer_name,
                "phone": customer_phone,
            },
            booking_data={
                "checkIn": session.check_in.isoformat(),
                "checkOut": session.check_out.isoformat(),
                "guests": session.guests,
                "totalPrice": total_price,
                "currency": "SAR",
                "source": "whatsapp",
                "notes": f"Booked via WhatsApp by {session.customer_name}",
            },
        )

        ref = getattr(booking, "bookingRef", None) or booking.id[:8].upper()
        await wa.send_text(
            customer_phone,
            f"🎉 *تم تأكيد حجزك بنجاح!*\n\n"
            f"رقم الحجز: *{ref}*\n"
            f"الوحدة: {session.unit_name}\n"
            f"الوصول: {session.check_in}\n"
            f"المغادرة: {session.check_out}\n\n"
            f"شكراً لاختيارك {session.client_slug} 🏡\n"
            f"للاستفسار أو التعديل تواصل معنا.",
        )
        logger.info("✅ Booking created via WhatsApp: %s (client=%s)", booking.id, session.client_slug)

    except ValueError as exc:
        await wa.send_text(customer_phone, f"❌ تعذّر إتمام الحجز: {exc}\nحاول باختيار تواريخ أخرى.")
    except Exception as exc:
        logger.error("🔥 WhatsApp booking creation failed: %s", exc, exc_info=True)
        await wa.send_text(customer_phone, "❌ حدث خطأ أثناء إتمام الحجز. الرجاء المحاولة لاحقاً.")

    _clear_session(phone_number_id, customer_phone)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _resolve_client(
    display_phone: str,
    message_text: str = "",
    session: Optional["ConversationSession"] = None,
):
    """
    Resolve which Client owns this WhatsApp conversation.

    ADR-0001 §8.4/§8.4b: deliberately NOT filtered by isActive or status —
    this is the "always accept/find" half of the two-tier webhook policy.
    A suspended/expired tenant must still be found here so the incoming
    message is logged and handled (not silently dropped); the mutating
    half of the conversation (_dispatch, below) is what's actually gated.

    Resolution order (Phase B, Stage 1 — Central Platform WABA, 2026-08-24):
    1. Session already bound to a client (mid-conversation) → reuse it directly, no re-parsing.
       Re-fetched by id (not cached on the session) so a status change mid-conversation is seen.
    2. WABA display_phone_number → Client.phone, only when it identifies exactly ONE Client —
       Stage 2 prep: a tenant with their own dedicated WABA number is unambiguous by definition.
    3. Otherwise (zero or multiple matches — the shared central number, or no per-tenant number
       configured yet): parse a tenant slug out of the inbound message body (populated by that
       tenant's own wa.me deep link/QR — see whatsapp_service.build_central_booking_link() — never
       typed manually by the customer) via _resolve_client_from_text().

    The old blind "return clients[0] if clients else None" fallback this replaced was a real
    single-tenant-dev-environment placeholder, not a deliberate multi-tenant design — keeping it
    would have made step 3 unreachable in practice (it always "succeeded" first), silently
    defeating Central WABA tenant routing. Removed as part of this same change, not left in
    parallel with the new path.
    """
    if session and session.client_id:
        return await prisma_client.client.find_unique(where={"id": session.client_id})

    clients = await prisma_client.client.find_many()

    if display_phone:
        normalised = "".join(filter(str.isdigit, display_phone))
        matches = [
            c for c in clients
            if c.phone and "".join(filter(str.isdigit, c.phone)) == normalised
        ]
        if len(matches) == 1:
            return matches[0]

    return _resolve_client_from_text(message_text, clients)


def _resolve_client_from_text(message_text: str, clients: list):
    """
    Stage 1 (Central Platform WABA): match a Client.slug token inside the inbound message body.
    Only ever called for a NEW session's first message (an already-bound session short-circuits
    in _resolve_client() before this runs) — cheap to call, no caching needed at this volume.
    """
    if not message_text:
        return None
    tokens = set(re.findall(r"[a-zA-Z0-9؀-ۿ_-]+", message_text.lower()))
    for c in clients:
        if c.slug and c.slug.lower() in tokens:
            return c
    return None


async def _estimate_price(session: ConversationSession) -> str:
    """Return a human-readable price estimate from the Price table."""
    check_in_dt  = datetime.combine(session.check_in,  datetime.min.time())
    check_out_dt = datetime.combine(session.check_out, datetime.min.time())
    prices = await prisma_client.price.find_many(
        where={
            "unitId":    session.unit_id,
            "clientId":  session.client_id,
            "date":      {"gte": check_in_dt, "lt": check_out_dt},
            "available": True,
        }
    )
    if not prices:
        return "سيتم التأكيد لاحقاً"
    total = sum(Decimal(str(p.price)) for p in prices)
    currency = prices[0].currency if prices else "SAR"
    return f"{total} {currency}"


async def _calculate_total_price(session: ConversationSession) -> Decimal:
    """Sum up Price rows for the booking period."""
    check_in_dt  = datetime.combine(session.check_in,  datetime.min.time())
    check_out_dt = datetime.combine(session.check_out, datetime.min.time())
    prices = await prisma_client.price.find_many(
        where={
            "unitId":   session.unit_id,
            "clientId": session.client_id,
            "date":     {"gte": check_in_dt, "lt": check_out_dt},
        }
    )
    if not prices:
        return Decimal("0.00")
    return sum(Decimal(str(p.price)) for p in prices)
