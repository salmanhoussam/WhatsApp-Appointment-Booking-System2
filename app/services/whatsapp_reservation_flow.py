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
        │
        │   Phase D (Customer Experience, 2026-08-24): if this phone already has a real
        │   Customer row WITH a stored name, res_customer_name was already pre-filled back in
        │   start() -- skips straight past RES_AWAITING_NAME entirely.
        ▼ (new customer, or no name on file)
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
import re
from typing import Optional
from datetime import datetime, timezone

from app.core.customer_name import clean_customer_name, reject_reason
from app.db.client import prisma_client
from app.repositories import barber_repo, barber_service_repo
from app.repositories.customer_repo import CustomerRepository
from app.services import catalog_service_service, reservation_service

logger = logging.getLogger(__name__)

RES_AWAITING_SERVICE = "RES_AWAITING_SERVICE"
RES_AWAITING_BARBER  = "RES_AWAITING_BARBER"
RES_AWAITING_SOONEST = "RES_AWAITING_SOONEST"
RES_AWAITING_DATE    = "RES_AWAITING_DATE"
RES_AWAITING_SLOT    = "RES_AWAITING_SLOT"
RES_AWAITING_NAME    = "RES_AWAITING_NAME"
RES_CONFIRMING       = "RES_CONFIRMING"

# THE DELEGATION REGISTER. `whatsapp_flow._dispatch` routes a message here only when the
# session's state is in this set (`whatsapp_flow.py:563`), so a state missing from it is a state
# whose handler is never called -- the message simply lands nowhere.
#
# That is not hypothetical: RES_AWAITING_SOONEST shipped on 2026-09-12 with its constant declared,
# its `handle()` branch written and its handler implemented, but NOT listed here. A real customer
# tapped a real slot, the log showed `state=RES_AWAITING_SOONEST type=list_reply
# value=2026-09-13T12:00:00+00:00`, and nothing happened. Every piece existed except the one line
# that connects them -- the same shape as the outbound anchor bug found hours earlier, where the
# send side and the read side were each correct and never wired together.
#
# The assertion below is why it cannot happen a third time. It runs at import, so the app refuses
# to start rather than going quiet on one branch, and `from app.main import app` -- already part of
# every pre-flight here -- catches it before a push instead of a customer catching it after one.
STATES = {
    RES_AWAITING_SERVICE, RES_AWAITING_BARBER, RES_AWAITING_SOONEST,
    RES_AWAITING_DATE, RES_AWAITING_SLOT, RES_AWAITING_NAME, RES_CONFIRMING,
}

_DECLARED_STATES = {
    name: value for name, value in list(globals().items())
    if name.startswith("RES_") and isinstance(value, str)
}
_UNREGISTERED = {n for n, v in _DECLARED_STATES.items() if v not in STATES}
if _UNREGISTERED:                                          # pragma: no cover - import-time guard
    raise RuntimeError(
        f"whatsapp_reservation_flow: {sorted(_UNREGISTERED)} declared as state(s) but missing "
        f"from STATES, so whatsapp_flow would never delegate to their handler. Add them to "
        f"STATES and to handle()."
    )

NO_SLOTS_MESSAGE = "لا توجد مواعيد متاحة في هذا اليوم لدى هذا الحلاق. جرّب يوماً آخر 📅"

# The 10th row of the "soonest" list. A literal that can never collide with a real value: every
# other row id in that list is an ISO datetime, and this is not one.
_PICK_ANOTHER_DATE = "__PICK_ANOTHER_DATE__"

# Words customers put around a service name, stripped before matching so "بدي دقن" and "دقن" are
# the same request. Kept as a small explicit list rather than a stemmer: these are the actual
# openers people type, and a stemmer on Lebanese Arabic would be a far bigger claim than this
# needs to make.
_REQUEST_NOISE = (
    "بدي", "بدّي", "ابدي", "أبدي", "بحب", "بحبّ", "حبيت", "لو سمحت", "لو سمحتي", "ممكن",
    "اريد", "أريد", "عايز", "بليز", "please", "i want", "want", "book", "احجز", "حجز",
    "موعد", "عندي", "شكرا", "شكراً", "من فضلك", "علا", "على",
)
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
    """Greet the user into the reservation flow and show the service list.

    Phase D (Customer Experience, 2026-08-24) -- returning-customer greeting: if this phone
    already has a real Customer row (Phase A's find-or-create) WITH a stored name, greet them by
    name and pre-fill session.res_customer_name now, so RES_AWAITING_SLOT's own check below can
    skip the "what's your name" step entirely later in this same conversation. A first-time
    customer, or one whose Customer row has no name yet (e.g. created via the old
    upsert_system_customer path), gets the exact same generic greeting as before -- no regression."""
    customer_repo = CustomerRepository(prisma_client)
    existing_customer = await customer_repo.get_by_phone(customer_phone, client.id)
    stored_name = existing_customer.name if (existing_customer and existing_customer.name) else None

    # A STORED NAME IS NOT AUTOMATICALLY A TRUSTED NAME (2026-09-12). Rows written before the
    # validator existed carry whatever was typed then -- a real profanity on `barberlab-test`, and
    # the "زبون واتساب" placeholder on every web-handoff row. Re-reading one here would do two
    # things at once: greet this person by it, AND pre-fill `res_customer_name`, which makes
    # `_step_awaiting_slot` skip the name question entirely -- so a bad stored name would
    # perpetuate itself on every future booking with no way for the customer to correct it.
    #
    # Judging it on READ closes that loop without touching a single existing row (Salman's
    # standing decision: historical data stays immutable, no backfill). An untrusted stored name
    # is simply not used -- the greeting falls back to the generic one and the customer is asked
    # again, which is also the only way the row ever gets a good value.
    returning_name = clean_customer_name(stored_name)
    if stored_name and not returning_name:
        logger.info(
            "🚫 Stored customer name not trusted (%s) for %s at %s — asking again, row untouched",
            reject_reason(stored_name), customer_phone, client.slug,
        )
    if returning_name:
        session.res_customer_name = returning_name

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

    # Salman's wording, 2026-09-12: the flow should sound like a person, not a form. A returning
    # customer is greeted by name (Phase D) -- that half already read naturally and is unchanged.
    header = f"أهلاً بعودتك {returning_name} 👋" if returning_name else f"أهلاً فيك في {client.name} 💈"
    await wa.send_list_message(
        to=customer_phone,
        header=header,
        body="شو بتحب تعمل اليوم؟ اختر من القائمة، أو اكتبلي شو بدك 👇",
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

    elif session.state == RES_AWAITING_SOONEST:
        await _step_awaiting_soonest(wa, customer_phone, session, client, msg_type, value,
                                     phone_number_id, clear_session_fn)

    elif session.state == RES_AWAITING_DATE:
        await _step_awaiting_date(wa, customer_phone, session, client, msg_type, value)

    elif session.state == RES_AWAITING_SLOT:
        await _step_awaiting_slot(wa, customer_phone, session, client, msg_type, value,
                                  phone_number_id, clear_session_fn)

    elif session.state == RES_AWAITING_NAME:
        await _step_awaiting_name(wa, customer_phone, session, client, msg_type, value,
                                  phone_number_id, clear_session_fn)

    elif session.state == RES_CONFIRMING:
        await _step_confirming(wa, customer_phone, session, client, msg_type, value, phone_number_id, clear_session_fn)


# ── State handlers ────────────────────────────────────────────────────────────────────────────

def _normalise_ar(text: str) -> str:
    """Fold the spelling differences an Arabic keyboard produces, for MATCHING only.

    A customer typing "حنه" and a service stored as "حنة" mean the same thing, and so do "احمد"
    and "أحمد". Folding alef/hamza/ta-marbuta/ya and stripping tatweel and diacritics is what
    makes a substring match usable on real input instead of only on perfectly-typed input. The
    stored service name is never changed -- this value exists for the comparison and is discarded.
    """
    if not text:
        return ""
    out = text.strip().lower()
    for src, dst in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ى", "ي"), ("ة", "ه"),
                     ("ؤ", "و"), ("ئ", "ي"), ("ـ", "")):
        out = out.replace(src, dst)
    out = re.sub(r"[\u064B-\u0652]", "", out)       # harakat
    out = re.sub(r"\s+", " ", out)
    return out


def _match_service_by_text(text: str, services: list[dict]) -> Optional[dict]:
    """The service a typed message asks for, or None when it is not unambiguous.

    Salman's request, 2026-09-12: a customer who writes "بدي دقن" instead of tapping the list
    should be understood. The rule that keeps this safe is that AMBIGUITY IS NOT A MATCH -- if the
    text could be two services, this returns None and the customer is asked to tap, because
    guessing which haircut someone meant is worse than asking.

    Three passes, strictest first, and none of them is fuzzy in the edit-distance sense. A real
    fuzzy match would trade a wrong service for a saved tap, and a wrong service is a wrong
    appointment:

      1. the whole message, noise words stripped, EQUALS a service name
      2. a service name appears INSIDE the message  ("بدي دقن" -> "دقن")
      3. every word of a service name appears somewhere in the message, in any order
         ("شعر ودقن" typed as "دقن وشعر")

    Deliberately NOT matched: a single Arabic letter or a 2-character fragment. "شعر ودقن" and
    "دقن" both contain "قن", and on `rk` those are two different services at two different prices.
    """
    cleaned = _normalise_ar(text)
    if not cleaned:
        return None
    for noise in _REQUEST_NOISE:
        cleaned = cleaned.replace(_normalise_ar(noise), " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) < 3:
        return None

    # EACH SERVICE OFFERS SEVERAL NAMES TO MATCH AGAINST, not one -- and this was a real bug the
    # first version had. `rk` sells "حنة أو صبغة" and "تمشيط أو تسريح": names that are a menu of
    # two options, not one phrase. A customer types ONE of them ("بدي حنة"), which equals no full
    # name, is not contained in the typed text the other way round, and fails a
    # every-word-present test because "صبغة" is nowhere in their message. So the three passes
    # below now run over the full name AND each alternative.
    candidates: list[tuple[dict, str]] = []
    for svc in services:
        full = _normalise_ar(svc.get("name_ar") or "")
        for candidate in {full, *re.split(r"(?:\bاو\b|\bor\b|/|،|\|)", full)}:
            candidate = candidate.strip()
            if len(candidate) >= 3:
                candidates.append((svc, candidate))

    def _unique_hit(predicate) -> tuple[bool, Optional[dict]]:
        """(decided, service). Hits are deduped BY SERVICE, so a service matched through both its
        full name and one of its alternatives is still one answer, not an ambiguity."""
        seen: dict[str, dict] = {}
        for svc, candidate in candidates:
            if predicate(candidate):
                seen[svc["id"]] = svc
        if len(seen) == 1:
            return True, next(iter(seen.values()))
        # More than one distinct service at this strictness -- a looser pass would only be MORE
        # ambiguous, so stop rather than guess which haircut they meant.
        return (len(seen) > 1), None

    for predicate in (
        lambda name: name == cleaned,
        lambda name: name in cleaned,
        lambda name: all(word in cleaned for word in name.split() if len(word) >= 3),
    ):
        decided, svc = _unique_hit(predicate)
        if svc:
            return svc
        if decided:
            return None
    return None


async def _step_awaiting_service(wa, customer_phone, session, client, msg_type, value):
    services = await catalog_service_service.public_list_services(client.id)

    if msg_type == "list_reply":
        service = next((s for s in services if s["id"] == value), None)
        if not service:
            await wa.send_text(customer_phone, "❌ الخدمة غير موجودة. حاول مجدداً.")
            return
    elif msg_type == "text":
        # Typed instead of tapped. Understood when unambiguous; otherwise the customer is asked
        # to tap rather than sent to a service they did not choose.
        service = _match_service_by_text(value, services)
        if not service:
            await wa.send_text(
                customer_phone,
                "ما فهمت تماماً 😅 اختار الخدمة من القائمة أدناه 👆",
            )
            return
        logger.info("🔎 Service matched from text %r -> %r at %s",
                    (value or "")[:40], service.get("name_ar"), client.slug)
        await wa.send_text(customer_phone, f"تمام، *{service['name_ar']}* ✅")
    else:
        await wa.send_text(customer_phone, "الرجاء اختيار خدمة من القائمة أدناه 👆")
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

    # SMART SKIP (Salman, 2026-09-12): one qualified barber is not a choice, it is an answer.
    #
    # Keyed on the EFFECTIVE list, deliberately -- not on the number of BarberService links. The
    # soft filter above means a service with ZERO links shows the whole roster, so a shop with one
    # link and three barbers must still be asked. Measured: this skips a step on 3 of 6 services at
    # `rk` and 2 of 6 at `mr-h`, and on none at `barberlab-test`, where both barbers do everything.
    #
    # The customer is TOLD who, rather than silently assigned -- "الحلاق: سامي" -- because a chair
    # they did not pick appearing in the confirmation would read as a bug.
    if len(barbers) == 1:
        only = barbers[0]
        session.res_barber_id = only.id
        session.res_barber_name = only.name
        await wa.send_text(customer_phone, f"الحلاق: *{only.name}* 💈")
        await _offer_soonest_slots(wa, customer_phone, session, client)
        return

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

    await _offer_soonest_slots(wa, customer_phone, session, client)


async def _offer_soonest_slots(wa, customer_phone, session, client) -> None:
    """THE DEFAULT: 9 real start times across days, plus one row that opens the day picker.

    Salman's decision, 2026-09-12 -- "الأغلبية تبحث عن أقرب كرسي متاح". Replaces the
    day-then-time pair with a single tap for that majority, and costs everyone else exactly one
    extra tap to reach the picker they used to get automatically.

    THE 9 + 1 SHAPE IS META'S ARITHMETIC, NOT A PREFERENCE. An interactive list holds 10 rows
    across every section, full stop. 9 offers plus 1 escape hatch uses the cap exactly; a 10th
    offer would leave no way to reach a different date, and 8 would waste a row.

    Row titles are built to FIT, measured not estimated: `title` is capped at 24 characters by
    Meta and "الأحد 13 · 10:00" is 16, so the label stays readable without truncation mid-word --
    which is why the month goes in the description instead of the title.

    On an empty result the customer gets the existing NO_SLOTS_MESSAGE and the session returns to
    IDLE rather than parking in a state with nothing to answer.
    """
    try:
        slots = await reservation_service.get_next_open_slots(
            client_id    = client.id,
            barber_id    = session.res_barber_id,
            duration_min = session.res_duration_min or 30,
            count        = 9,
        )
    except ValueError as exc:
        await wa.send_text(customer_phone, f"❌ تعذّر جلب المواعيد المتاحة: {exc}")
        session.state = "IDLE"
        return

    if not slots:
        # A genuinely full week is an answer, not an error -- and the day picker would show the
        # same emptiness one tap later, so offering it here would only waste the customer's time.
        await wa.send_text(
            customer_phone,
            f"لا توجد مواعيد متاحة لدى *{session.res_barber_name}* في الأيام القادمة 📅\n"
            f"تواصل مع {client.name} مباشرة أو جرّب خدمة أخرى.",
        )
        session.state = "IDLE"
        return

    rows = [
        {
            # The id is the slot's ISO datetime -- identical to what RES_AWAITING_SLOT already
            # sends, so the parsing below and the fallback path stay one behaviour, not two.
            "id":          slot["datetime"],
            "title":       f"{_short_day(slot['label'])} · {slot['time']}"[:24],
            "description": slot["label"][:72],
        }
        for slot in slots
    ]
    rows.append({
        "id":          _PICK_ANOTHER_DATE,
        "title":       "📅 تاريخ آخر",
        "description": "اختر يوماً بنفسك",
    })

    await wa.send_list_message(
        to=customer_phone,
        header=f"✅ {session.res_service_name} — {session.res_barber_name}",
        body="هذي أقرب المواعيد المتاحة. اختر اللي يناسبك 👇",
        button_text="عرض المواعيد",
        sections=[{"title": "أقرب المواعيد", "rows": rows}],
    )
    session.state = RES_AWAITING_SOONEST


def _short_day(label: str) -> str:
    """"الأحد 13 أيلول" -> "الأحد 13". Drops the month so the title fits Meta's 24 characters
    with the time appended; the full label still goes in the description, so nothing is lost."""
    parts = (label or "").split()
    return " ".join(parts[:2]) if len(parts) >= 2 else (label or "")


async def _step_awaiting_soonest(wa, customer_phone, session, client, msg_type, value,
                                 phone_number_id, clear_session_fn):
    """Either a start time was tapped, or the customer asked for the day picker.

    The escape hatch hands over to `_offer_day_list()` UNCHANGED -- the whole day/slot path stays
    exactly as it was and is simply reached by a tap now. That is what makes this additive: if the
    soonest list is ever wrong for a shop, the old flow is still there, whole.
    """
    if msg_type != "list_reply":
        await wa.send_text(customer_phone, "الرجاء اختيار موعد من القائمة 👆")
        return

    if value == _PICK_ANOTHER_DATE:
        await _offer_day_list(wa, customer_phone, session, client)
        session.state = RES_AWAITING_DATE
        return

    try:
        slot_dt = datetime.fromisoformat(value)
    except ValueError:
        await wa.send_text(customer_phone, "❌ موعد غير صالح. حاول مجدداً.")
        return

    session.res_slot_datetime = slot_dt

    # Same branch RES_AWAITING_SLOT already takes: a returning customer's name was pre-filled in
    # start(), so there is nothing left to ask.
    if session.res_customer_name:
        await _create_and_report(wa, customer_phone, session, client,
                                 phone_number_id, clear_session_fn)
        return

    await wa.send_text(customer_phone, "ما اسمك الكريم؟")
    session.state = RES_AWAITING_NAME


async def _offer_day_list(wa, customer_phone, session, client) -> None:
    """A TAPPABLE DAY LIST, not a typed date (Salman, 2026-09-12).

    This was the only step in the flow that asked the customer to type, and it was where real
    customers stopped: "الناس عم توصل عند محل ما لازم يرسل التاريخ وعم بوقفوا". Closed days are
    SKIPPED rather than shown greyed out — see reservation_service.get_next_open_days.

    Its own function because two places need it: after the barber is chosen, and again when
    create_reservation rejects the slot as taken.
    """
    # duration_min is load-bearing: a day that has room for a 15-minute trim may be full for a
    # 90-minute keratin, so the list is built for the service this customer actually chose.
    days = await reservation_service.get_next_open_days(
        client.id, session.res_barber_id,
        duration_min = session.res_duration_min,
        count        = 7,
    )
    if days:
        await wa.send_list_message(
            to          = customer_phone,
            header      = f"💈 {session.res_barber_name}",
            body        = "اختر اليوم المناسب:",
            button_text = "عرض الأيام",
            sections    = [{
                "title": "الأيام المتاحة",
                "rows":  [{"id": d["date"], "title": d["label"], "description": ""}
                          for d in days],
            }],
        )
        return
    # No working hours configured for this barber: offering days would be a lie, so fall back to
    # the typed prompt rather than sending an empty list Meta would reject.
    await wa.send_text(
        customer_phone,
        f"✅ اخترت: *{session.res_barber_name}*\n\nما هو اليوم الذي تريد الحجز فيه؟\n"
        f"أرسل التاريخ بأحد هذه الأشكال:\n2026-09-12  ·  12-09-2026  ·  12/09/2026",
    )


async def _step_awaiting_date(wa, customer_phone, session, client, msg_type, value):
    # A tap on the day list carries the ISO date as the row id; typing still works, both because
    # a customer mid-conversation from before this change may still type, and because the barber
    # step falls back to the typed prompt when no working hours are configured.
    target_date = _parse_date_text(value)
    if not target_date:
        # The prompt used to name ONE format while _parse_date_text accepted three, which made a
        # perfectly valid "12-9-2026" look like it was about to be rejected. It now says what it
        # really takes.
        await wa.send_text(
            customer_phone,
            "❌ لم أفهم التاريخ. اختر يوماً من القائمة، أو اكتبه بأحد هذه الأشكال:\n"
            "2026-09-12  ·  12-09-2026  ·  12/09/2026",
        )
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


async def _step_awaiting_slot(wa, customer_phone, session, client, msg_type, value,
                              phone_number_id, clear_session_fn):
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

    if session.res_customer_name:
        # Phase D: a returning customer's name was already pre-filled in start() -- skip
        # RES_AWAITING_NAME entirely and book.
        await _create_and_report(wa, customer_phone, session, client,
                                 phone_number_id, clear_session_fn)
        return

    await wa.send_text(customer_phone, "ما اسمك الكريم؟")
    session.state = RES_AWAITING_NAME


# The one sentence a refused name gets. Deliberately identical for every rule: telling a customer
# WHICH rule they tripped is either useless ("too short") or an invitation to probe the blocklist.
_BAD_NAME_REPLY = "عذراً، يرجى إدخال اسم صحيح لنتمكن من تأكيد حجزك."


async def _step_awaiting_name(wa, customer_phone, session, client, msg_type, value,
                              phone_number_id, clear_session_fn):
    """The last inbound step, and the only place a customer types free text that becomes DATA.

    VALIDATION HAPPENS HERE, BEFORE THE WRITE, and that ordering is the whole point.
    `Reservation.customerName` is a permanent snapshot by design (the schema's own comment: never
    rewritten if the Customer's info changes later), so a name accepted here can never be
    corrected by fixing the Customer row afterwards. And `create_reservation()`'s find-or-create
    writes this same string to `Customer.name`, which `start()` above reads back as the greeting
    identity -- so an accepted name is what the bot calls this person for the rest of their life
    with the shop, and what the merchant reads in every alert.

    Proven on production 2026-09-12: Salman booked and typed a profanity as his name. The only
    check was `len(value.strip()) >= 2`, so it was stored on BOTH rows. Refused now by
    `app.core.customer_name`, which owns the rules -- this step only decides what to do about the
    answer, exactly as the phone rule keeps its own logic in `app.core.phone`.

    A refused name is stored NOWHERE and the session stays in this state, so the customer is
    simply asked again. Nothing partial is written, because nothing is written until one passes.
    """
    if msg_type != "text":
        await wa.send_text(customer_phone, "الرجاء إدخال اسمك.")
        return

    cleaned = clean_customer_name(value)
    if not cleaned:
        # Logged with the raw value ON PURPOSE. A blocklist is never complete, so this log is how
        # we learn what real customers actually type -- the list is meant to grow from evidence,
        # not from guessing. `reject_reason` is for us; the customer only ever sees the neutral
        # sentence above.
        logger.warning(
            "🚫 Customer name refused (%s) from %s at %s — raw=%r",
            reject_reason(value), customer_phone, client.slug, (value or "")[:80],
        )
        await wa.send_text(customer_phone, _BAD_NAME_REPLY)
        return

    session.res_customer_name = cleaned
    await _create_and_report(wa, customer_phone, session, client,
                             phone_number_id, clear_session_fn)


async def _step_confirming(wa, customer_phone, session, client, msg_type, value, phone_number_id, clear_session_fn):
    """LEGACY STATE, kept only for sessions already sitting here when this deploy landed.

    The customer no longer confirms (Salman, 2026-09-12): "ما بدي ياها الزبون يأكد". Nothing puts
    a session INTO this state any more -- _step_awaiting_slot and _step_awaiting_name book
    directly -- but a customer who was mid-conversation must not be stranded looking at a pair of
    buttons nothing answers, so this still works. Delete it once no live session can be here,
    which the 30-minute session expiry guarantees within the hour of any deploy.
    """
    if msg_type != "button_reply":
        await wa.send_text(customer_phone, "الرجاء الضغط على أحد الأزرار أعلاه ✅ أو ❌")
        return

    if value == "cancel":
        await wa.send_text(customer_phone, "تم إلغاء الحجز. شكراً لتواصلك معنا 🙏")
        await clear_session_fn(phone_number_id, customer_phone, session)
        return

    if value != "confirm":
        return

    await _create_and_report(wa, customer_phone, session, client,
                             phone_number_id, clear_session_fn)


async def _create_and_report(wa, customer_phone, session, client,
                             phone_number_id, clear_session_fn) -> None:
    """Write the reservation and tell the customer what actually happened.

    ONE creation path for the whole conversation (Salman, 2026-09-12). The customer's own
    confirm step was removed -- they had just picked service, barber, day and time, so asking
    "هل تريد تأكيد الحجز؟" made them answer a question they had already answered four times, and
    the only confirmation that means anything is the SHOP's. Extracted from _step_confirming
    rather than copied, so the returning-customer path, the new-customer path and the legacy
    state all write through the same function.
    """
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
            source         = "whatsapp",
        )

        ref = reservation["id"][:8].upper()
        # "CREATED", not "CONFIRMED" (Salman, 2026-09-12). The row this just wrote is `pending`;
        # saying "تم تأكيد حجزك" told the customer the shop had accepted when nobody had even
        # seen it yet. The real confirmation is sent by reservation_service on the pending ->
        # confirmed transition (_notify_reservation_event -> send_reservation_confirmation), which
        # is exactly what the owner/admin tapping تأكيد now triggers (A2-a). Two messages, two
        # different facts -- and until this change the second one contradicted the first.
        await wa.send_text(
            customer_phone,
            f"✅ *تم إنشاء حجزك بنجاح*\n\n"
            f"رقم الحجز: *{ref}*\n"
            f"الخدمة: {session.res_service_name}\n"
            f"الحلاق: {session.res_barber_name}\n"
            f"الموعد: {session.res_slot_datetime.strftime('%Y-%m-%d %H:%M')}\n\n"
            f"⏳ بانتظار تأكيد {client.name} — سنُعلمك فوراً عند التأكيد.",
        )
        logger.info(
            "✅ Reservation created via WhatsApp: %s (client=%s, barber=%s)",
            reservation["id"], client.slug, session.res_barber_id,
        )
        await clear_session_fn(phone_number_id, customer_phone, session)

    except ValueError as exc:
        # Explicit ask #3 (Phase C): includes the new race-condition rejection from
        # create_reservation()'s own UniqueViolationError translation -- same friendly message
        # either way, since the caller (this conversation) shouldn't need to know WHICH check
        # caught the conflict. Back to RES_AWAITING_DATE, service/barber context kept, so the
        # customer can immediately try a different time instead of restarting the whole flow.
        await wa.send_text(customer_phone, f"❌ تعذّر إتمام الحجز: {exc}")
        # RE-OFFER THE SOONEST LIST, not the day list, and not a bare sentence.
        #
        # Before any list existed this branch left the customer to type a date, which is the dead
        # end that made people abandon the flow. The day list fixed that; the soonest list is
        # strictly better HERE in particular, because it is recomputed from live availability --
        # so the very slot that was just taken is gone from it, and the customer's next tap cannot
        # hit the same conflict twice. A day list would have shown them the same day again with no
        # indication of which time had disappeared.
        #
        # `_offer_soonest_slots` sets the state itself (including IDLE when the week is genuinely
        # full), so it is not set here -- one place decides that, which is why the assignment that
        # used to be on this line is gone.
        await _offer_soonest_slots(wa, customer_phone, session, client)

    except Exception as exc:
        logger.error("🔥 WhatsApp reservation creation failed: %s", exc, exc_info=True)
        await wa.send_text(customer_phone, "❌ حدث خطأ أثناء إتمام الحجز. الرجاء المحاولة لاحقاً.")
        await clear_session_fn(phone_number_id, customer_phone, session)
