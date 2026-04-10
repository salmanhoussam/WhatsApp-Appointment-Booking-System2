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
Tenant resolution: match metadata.display_phone_number → Client.phone.
"""

import logging
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

    # Resolve tenant from WABA display_phone → Client.phone
    client = await _resolve_client(display_phone)
    if not client:
        logger.warning("⚠️  No client found for display_phone=%s", display_phone)
        return

    session = _get_session(phone_number_id, customer_phone)
    # Always attach client context to fresh sessions
    if not session.client_id:
        session.client_id = client.id
        session.client_slug = client.slug

    msg_type, value, title = _extract_message(msg)
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


# ── State handlers ─────────────────────────────────────────────────────────────

async def _step_idle(wa, customer_phone, session, client):
    """Greet the user and show the property list."""
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

async def _resolve_client(display_phone: str):
    """
    Match the WABA display phone number to a Client record.
    Normalises both sides by stripping non-digit characters.
    """
    if not display_phone:
        return None
    normalised = "".join(filter(str.isdigit, display_phone))
    clients = await prisma_client.client.find_many(where={"isActive": True})
    for c in clients:
        if c.phone and "".join(filter(str.isdigit, c.phone)) == normalised:
            return c
    # Fallback: return the first active client (single-tenant deployments)
    return clients[0] if clients else None


async def _estimate_price(session: ConversationSession) -> str:
    """Return a human-readable price estimate from the Price table."""
    prices = await prisma_client.price.find_many(
        where={
            "unitId": session.unit_id,
            "clientId": session.client_id,
            "date": {"gte": session.check_in, "lt": session.check_out},
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
    prices = await prisma_client.price.find_many(
        where={
            "unitId": session.unit_id,
            "clientId": session.client_id,
            "date": {"gte": session.check_in, "lt": session.check_out},
        }
    )
    if not prices:
        return Decimal("0.00")
    return sum(Decimal(str(p.price)) for p in prices)
