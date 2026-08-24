"""
app/services/whatsapp_reservation_flow.py
"احجز موعد" -- the Reservation Engine's own WhatsApp conversation branch.

Phase C (Reservation Integration, Customer Identity + WhatsApp Booking Study, 2026-08-24). A
sibling module to whatsapp_flow.py rather than folded into it -- the same "own file per real
Reservation Strategy case, built as if the other one didn't exist" precedent this codebase already
follows for the Barber vs Clinic conflict-check paths in reservation_service.py, applied here to
keep the (pre-existing, unrelated) Booking/Property engine's conversation code completely
undisturbed while this new branch gets its own home.

Dispatched from whatsapp_flow._dispatch() whenever session.state is one of STATES below --
whatsapp_flow.py owns the ConversationSession dataclass (this module only reads/writes its
res_* fields, added additively) and the session store/TTL/tenant-resolution machinery; this module
owns nothing but the conversation steps themselves.

Strict reuse, no new business logic (per Phase C's explicit constraint):
  Service list      -> catalog_service_service.public_list_services()
  Barber list        -> barber_repo.list_barbers() + barber_service_repo.list_barber_ids_for_service()
  Slot list           -> reservation_service.get_available_slots()
  Booking confirm     -> reservation_service.create_reservation()  (Customer find-or-create + the
                          new race-condition-protected unique index both already live inside it --
                          this module never duplicates either)

──────────────────────────────────────────────────────────────
State machine (parallel to whatsapp_flow.py's own IDLE->...->CONFIRMING chain):

  (from IDLE, only when this tenant's client_services includes "reservations")
    RES_AWAITING_SERVICE
        │ list_reply -> service selected
        ▼
    RES_AWAITING_BARBER
        │ list_reply -> barber selected (soft-filtered by service qualification)
        ▼
    RES_AWAITING_DATE
        │ text date "YYYY-MM-DD" -> fetches real slots
        │   no slots -> polite fallback, STAYS on this state (ask another date)
        ▼
    RES_AWAITING_SLOT
        │ list_reply -> slot selected (its own conflict-check deferred to confirm time,
        │               same "React never decides whether a slot is free" principle this
        │               codebase already documents for the website's own edit_reservation())
        ▼
    RES_AWAITING_NAME
        │ text name
        ▼
    RES_CONFIRMING  <──── shows booking summary
        │
    ┌───┴────┐
 "confirm"  "cancel"
    │           │
 create_reservation()   IDLE (session cleared)
    │
    ├─ success -> confirmation message, session cleared
    └─ ValueError (incl. the new race-condition rejection) -> friendly message,
       back to RES_AWAITING_DATE (service/barber context kept, date/slot re-asked)
──────────────────────────────────────────────────────────────
"""

import logging
from datetime import datetime, timezone

from app.db.client import prisma_client
from app.repositories import barber_repo, barber_service_repo
from app.services import catalog_service_service, reservation_service

logger = logging.getLogger(__name__)

RES_AWAITING_SERVICE = "RES_AWAITING_SERVICE"
RES_AWAITING_BARBER  = "RES_AWAITING_BARBER"
RES_AWAITING_DATE    = "RES_AWAITING_DATE"
RES_AWAITING_SLOT    = "RES_AWAITING_SLOT"
RES_AWAITING_NAME    = "RES_AWAITING_NAME"
RES_CONFIRMING       = "RES_CONFIRMING"

STATES = {
    RES_AWAITING_SERVICE, RES_AWAITING_BARBER, RES_AWAITING_DATE,
    RES_AWAITING_SLOT, RES_AWAITING_NAME, RES_CONFIRMING,
}

NO_SLOTS_MESSAGE = "لا توجد مواعيد متاحة في هذا اليوم لدى هذا الحلاق. جرّب يوماً آخر 📅"
# ^ mirrors the public booking page's own copy, cited verbatim in the Phase C plan (Study 2).


async def is_reservations_active(client_id: str) -> bool:
    """Same raw check app/core/services.py's require_service() dependency performs -- called
    directly here (not via the FastAPI Depends() wrapper, which needs a real Request) since this
    runs from a background webhook task, not a route."""
    svc = await prisma_client.clientservice.find_first(
        where={"clientId": client_id, "serviceKey": "reservations", "isActive": True}
    )
    return svc is not None


def _parse_date_text(text: str):
    """Same YYYY-MM-DD/DD-MM-YYYY/DD/MM/YYYY acceptance as whatsapp_flow._parse_date() -- kept as
    its own small copy rather than importing a private helper across modules for one 4-line
    function; both independently implement the identical, tiny, stable date-parsing rule."""
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text.strip(), fmt).date()
        except ValueError:
            continue
    return None


# ── Entry point (called from whatsapp_flow._step_idle) ─────────────────────────────────────────

async def start(wa, customer_phone: str, session, client) -> None:
    """Greet the user into the reservation flow and show the service list."""
    services = await catalog_service_service.public_list_services(client.id)
    if not services:
        await wa.send_text(
            customer_phone,
            f"مرحباً بك في {client.name} 👋\nعذراً، لا توجد خدمات متاحة للحجز حالياً.",
        )
        session.state = "IDLE"
        return

    sections = [{
        "title": "اختر الخدمة",
        "rows": [
            {
                "id": s["id"],
                "title": (s["name_ar"] or "خدمة")[:24],
                "description": f"{s['duration_min']} دقيقة" + (f" | {s['price']} {s['currency']}" if s.get("price") else ""),
            }
            for s in services[:10]  # WhatsApp list max 10 rows per section
        ],
    }]

    await wa.send_list_message(
        to=customer_phone,
        header=f"احجز موعدك في {client.name} 💈",
        body="للحجز، اختر الخدمة أولاً:",
        button_text="عرض الخدمات",
        sections=sections,
    )
    session.state = RES_AWAITING_SERVICE


# ── Dispatch (called from whatsapp_flow._dispatch) ──────────────────────────────────────────────

async def handle(wa, customer_phone: str, session, msg_type: str, value: str, title: str,
                  client, phone_number_id: str, clear_session_fn) -> None:
    """Route one message to the correct RES_* step. clear_session_fn is
    whatsapp_flow._clear_session, passed in rather than imported, so this module never needs to
    reach back into whatsapp_flow's private session store directly."""
    if session.state == RES_AWAITING_SERVICE:
        await _step_awaiting_service(wa, customer_phone, session, client, msg_type, value)

    elif session.state == RES_AWAITING_BARBER:
        await _step_awaiting_barber(wa, customer_phone, session, client, msg_type, value)

    elif session.state == RES_AWAITING_DATE:
        await _step_awaiting_date(wa, customer_phone, session, client, msg_type, value)

    elif session.state == RES_AWAITING_SLOT:
        await _step_awaiting_slot(wa, customer_phone, session, msg_type, value)

    elif session.state == RES_AWAITING_NAME:
        await _step_awaiting_name(wa, customer_phone, session, msg_type, value)

    elif session.state == RES_CONFIRMING:
        await _step_confirming(wa, customer_phone, session, client, msg_type, value, phone_number_id, clear_session_fn)


# ── State handlers ────────────────────────────────────────────────────────────────────────────

async def _step_awaiting_service(wa, customer_phone, session, client, msg_type, value):
    if msg_type != "list_reply":
        await wa.send_text(customer_phone, "الرجاء اختيار خدمة من القائمة أدناه 👆")
        return

    services = await catalog_service_service.public_list_services(client.id)
    service = next((s for s in services if s["id"] == value), None)
    if not service:
        await wa.send_text(customer_phone, "❌ الخدمة غير موجودة. حاول مجدداً.")
        return

    session.res_service_id = service["id"]
    session.res_service_name = service["name_ar"] or "الخدمة"
    session.res_duration_min = service["duration_min"] or 30

    # Soft filter (matches GET /public/reservations/barbers' own rule, Phase 3.7C): a service
    # with no BarberService assignments yet falls back to the FULL barber list rather than
    # showing an empty, dead-end result -- same "not hard-enforced" behavior, reused verbatim,
    # not re-implemented differently here.
    barbers = await barber_repo.list_barbers(client.id, active_only=True)
    if not barbers:
        await wa.send_text(customer_phone, "❌ لا يوجد حلاقين متاحين حالياً.")
        session.state = "IDLE"
        return

    qualified_ids = set(await barber_service_repo.list_barber_ids_for_service(client.id, service["id"]))
    filtered = [b for b in barbers if b.id in qualified_ids]
    if filtered:
        barbers = filtered

    sections = [{
        "title": "اختر الحلاق",
        "rows": [
            {"id": b.id, "title": b.name[:24], "description": (b.description or "")[:72]}
            for b in barbers[:10]
        ],
    }]

    await wa.send_list_message(
        to=customer_phone,
        header=f"✅ اخترت: {session.res_service_name}",
        body="اختر الحلاق الذي تفضله:",
        button_text="عرض الحلاقين",
        sections=sections,
    )
    session.state = RES_AWAITING_BARBER


async def _step_awaiting_barber(wa, customer_phone, session, client, msg_type, value):
    if msg_type != "list_reply":
        await wa.send_text(customer_phone, "الرجاء اختيار حلاق من القائمة 👆")
        return

    barber = await barber_repo.find_barber(client.id, value)
    if not barber or not barber.isActive:
        await wa.send_text(customer_phone, "❌ الحلاق غير موجود. حاول مجدداً.")
        return

    session.res_barber_id = barber.id
    session.res_barber_name = barber.name

    await wa.send_text(
        customer_phone,
        f"✅ اخترت: *{barber.name}*\n\nما هو اليوم الذي تريد الحجز فيه؟\n"
        f"أرسل التاريخ بالصيغة: YYYY-MM-DD\nمثال: 2026-09-01",
    )
    session.state = RES_AWAITING_DATE


async def _step_awaiting_date(wa, customer_phone, session, client, msg_type, value):
    if msg_type != "text":
        await wa.send_text(customer_phone, "أرسل التاريخ بالصيغة: YYYY-MM-DD")
        return

    target_date = _parse_date_text(value)
    if not target_date:
        await wa.send_text(customer_phone, "❌ صيغة التاريخ غير صحيحة. استخدم: YYYY-MM-DD\nمثال: 2026-09-01")
        return

    if target_date < datetime.now(timezone.utc).date():
        await wa.send_text(customer_phone, "❌ لا يمكن الحجز في تاريخ مضى. اختر تاريخاً مستقبلياً.")
        return

    try:
        slots = await reservation_service.get_available_slots(
            client_id=client.id,
            barber_id=session.res_barber_id,
            target_date=target_date,
            duration_min=session.res_duration_min,
        )
    except ValueError as exc:
        # Real barber-not-found/inactive edge case (e.g. deactivated mid-conversation) --
        # graceful, matches the "no available slots" ask rather than a raw crash.
        await wa.send_text(customer_phone, f"❌ تعذّر جلب المواعيد المتاحة: {exc}")
        session.state = "IDLE"
        return

    if not slots:
        # Explicit ask #3 (Phase C): polite fallback, mirroring the website's own copy -- and
        # STAYS on RES_AWAITING_DATE so the customer can just try another date immediately,
        # instead of dead-ending the conversation.
        await wa.send_text(customer_phone, NO_SLOTS_MESSAGE)
        return

    sections = [{
        "title": target_date.isoformat(),
        "rows": [
            {"id": s["datetime"], "title": s["time"], "description": ""}
            for s in slots[:10]  # WhatsApp list max 10 rows per section
        ],
    }]

    await wa.send_list_message(
        to=customer_phone,
        header=f"📅 {target_date.isoformat()}",
        body=f"اختر الوقت المناسب مع {session.res_barber_name}:",
        button_text="عرض الأوقات",
        sections=sections,
    )
    session.state = RES_AWAITING_SLOT


async def _step_awaiting_slot(wa, customer_phone, session, msg_type, value):
    if msg_type != "list_reply":
        await wa.send_text(customer_phone, "الرجاء اختيار وقت من القائمة 👆")
        return

    try:
        slot_dt = datetime.fromisoformat(value)
    except ValueError:
        await wa.send_text(customer_phone, "❌ وقت غير صالح. حاول مجدداً.")
        return

    # Deliberately NOT re-validated against a fresh get_available_slots() call here -- the same
    # "React never decides whether a slot is free; it only calls [create] and reacts to
    # success/409" principle reservation_service.edit_reservation()'s own docstring already
    # states for the website. create_reservation() (RES_CONFIRMING, below) is the single real
    # authority on whether this slot is still bookable, including the new race-condition-closing
    # unique index -- re-checking here would just be a second, redundant, staler copy of the
    # same check.
    session.res_slot_datetime = slot_dt

    await wa.send_text(customer_phone, "ما اسمك الكريم؟")
    session.state = RES_AWAITING_NAME


async def _step_awaiting_name(wa, customer_phone, session, msg_type, value):
    if msg_type != "text" or len(value.strip()) < 2:
        await wa.send_text(customer_phone, "الرجاء إدخال اسمك.")
        return

    session.res_customer_name = value.strip()

    summary = (
        f"📋 *ملخص الحجز*\n"
        f"───────────────\n"
        f"💈 الخدمة: {session.res_service_name}\n"
        f"👤 الحلاق: {session.res_barber_name}\n"
        f"📅 الموعد: {session.res_slot_datetime.strftime('%Y-%m-%d %H:%M')}\n"
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
    session.state = RES_CONFIRMING


async def _step_confirming(wa, customer_phone, session, client, msg_type, value, phone_number_id, clear_session_fn):
    if msg_type != "button_reply":
        await wa.send_text(customer_phone, "الرجاء الضغط على أحد الأزرار أعلاه ✅ أو ❌")
        return

    if value == "cancel":
        await wa.send_text(customer_phone, "تم إلغاء الحجز. شكراً لتواصلك معنا 🙏")
        clear_session_fn(phone_number_id, customer_phone)
        return

    if value != "confirm":
        return

    try:
        # Strict reuse (Phase C constraint): the SAME create_reservation() the website's own
        # POST /public/reservations/ calls -- already Customer-aware (Phase A find-or-create) and
        # already race-condition-protected (Phase C's own DB-level unique index) with zero
        # WhatsApp-specific booking logic duplicated here.
        reservation = await reservation_service.create_reservation(
            client_id      = client.id,
            module_key     = "barber",
            customer_name  = session.res_customer_name,
            customer_phone = customer_phone,
            reserved_at    = session.res_slot_datetime,
            duration_min   = session.res_duration_min,
            notes          = f"Booked via WhatsApp by {session.res_customer_name}",
            metadata       = {"barber_id": session.res_barber_id, "service_id": session.res_service_id},
        )

        ref = reservation["id"][:8].upper()
        await wa.send_text(
            customer_phone,
            f"🎉 *تم تأكيد حجزك بنجاح!*\n\n"
            f"رقم الحجز: *{ref}*\n"
            f"الخدمة: {session.res_service_name}\n"
            f"الحلاق: {session.res_barber_name}\n"
            f"الموعد: {session.res_slot_datetime.strftime('%Y-%m-%d %H:%M')}\n\n"
            f"شكراً لاختيارك {client.name} 💈\n"
            f"للاستفسار أو التعديل تواصل معنا.",
        )
        logger.info(
            "✅ Reservation created via WhatsApp: %s (client=%s, barber=%s)",
            reservation["id"], client.slug, session.res_barber_id,
        )
        clear_session_fn(phone_number_id, customer_phone)

    except ValueError as exc:
        # Explicit ask #3 (Phase C): includes the new race-condition rejection from
        # create_reservation()'s own UniqueViolationError translation -- same friendly message
        # either way, since the caller (this conversation) shouldn't need to know WHICH check
        # caught the conflict. Back to RES_AWAITING_DATE, service/barber context kept, so the
        # customer can immediately try a different time instead of restarting the whole flow.
        await wa.send_text(
            customer_phone,
            f"❌ تعذّر إتمام الحجز: {exc}\nحاول باختيار يوم أو وقت آخر.",
        )
        session.state = RES_AWAITING_DATE

    except Exception as exc:
        logger.error("🔥 WhatsApp reservation creation failed: %s", exc, exc_info=True)
        await wa.send_text(customer_phone, "❌ حدث خطأ أثناء إتمام الحجز. الرجاء المحاولة لاحقاً.")
        clear_session_fn(phone_number_id, customer_phone)
