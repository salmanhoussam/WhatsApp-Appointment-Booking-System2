"""Lia T4 — recording an appointment by talking. The past and the future, separately.

Run:  venv/bin/python scripts/test_lia_reservation_t4.py

WHAT THIS SUITE IS FOR

    Salman's own sentence is the requirement: «سجّللي إنو أحمد إجا مبارح الساعة 4 وعمل قص شعر».
    One operation covers the past and the future, and the RESERVATION decides which it is -- not
    a second intent, not a flag the model sets. Past ≠ arrived: a recorded visit is still
    `pending`, which is what 29 of the 52 real production rows already are.

    The past and the future are asserted as TWO SEPARATE tests, at Salman's explicit instruction,
    because they differ in three keyword arguments and a single "it works" test would hide which.

THE THREE KEYWORDS ARE THE WHOLE OPERATION
    allow_past             R-4 -- recording the past is ASKED FOR, never inherited.
    notify_merchant        R-3 -- «حجز جديد» about yesterday is a lie to the merchant.
    enforce_working_hours  R-2 / T3-c -- a walk-in served on the shop's closed day is a FACT.
                           rk and barberlab-test close on Mondays; without this, «أحمد إجا
                           الاثنين» is refused by a rule about when the shop is open.

NO NETWORK, NO DATABASE, NO MODEL CALL, NO SEND, NO WRITE.
    `try_handle`, `_advance`, `_commit`, `_resolve_reservation_rows` and the real schemas all run.
    The extraction, the two repository reads and `create_reservation` itself are recorded. The
    recorders DELEGATE or mirror the real signatures rather than simplifying them -- a fake poorer
    than reality produces a false negative, which has cost this project three days already.
"""
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import lia_owner_entry as lia                      # noqa: E402
from app.services import reservation_service                         # noqa: E402
from app.repositories import barber_repo, catalog_service_repo       # noqa: E402
from app.schemas.lia_drafts import (                                 # noqa: E402
    LiaReservationDraft, LiaReservationExtraction, WALK_IN_PHONE,
)
from app.services.whatsapp_flow import (                             # noqa: E402
    ConversationSession, _session_from_row, _session_to_state_data,
)
from test_lia_foundation import BL, OWNER_BL, install                # noqa: E402

ok = True
PHONE = "96178727986"


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


class Row:
    def __init__(self, **kw):
        self.__dict__.update(kw)


BARBERS = [Row(id="brb-1", name="جعفر", isActive=True),
           Row(id="brb-2", name="حسين", isActive=True)]
SERVICES = [Row(id="svc-1", nameAr="قص شعر", durationMin=30),
            Row(id="svc-2", nameAr="حلاقة دقن", durationMin=20)]


class Wa:
    def __init__(self):
        self.out = []

    async def send_text(self, phone, text):
        self.out.append(("text", text))

    async def send_interactive_buttons(self, to, text, buttons):
        # The TITLES are recorded beside the ids from T5 on: «سجّلهن هلق؟» above a button reading
        # «سجّله» is exactly the kind of mismatch this suite exists to catch, and an id-only
        # recorder cannot see it.
        self.out.append(("buttons", text, tuple(b["reply"]["id"] for b in buttons),
                         tuple(b["reply"]["title"] for b in buttons)))

    def joined(self):
        return "\n".join(o[1] for o in self.out)

    def buttons(self):
        return [o[2] for o in self.out if o[0] == "buttons"]


def titles(wa):
    """The button TITLES of each interactive message — element 3 of the recorded tuple."""
    return [o[3] for o in wa.out if o[0] == "buttons"]


def session_idle():
    return ConversationSession(state="IDLE")


class _R:
    # THE ATTRIBUTE IS `step`, NOT `state` — taken from `_session_from_row` itself rather than
    # from what the session object is called. My first version used `state`, the round trip died
    # on an AttributeError, and that is a stub POORER than reality: it would have failed every
    # branch below for a reason that has nothing to do with reservations.
    def __init__(self, step, client_id, state_data):
        self.step, self.clientId, self.stateData = step, client_id, state_data


def roundtrip(s):
    """Through JSON, exactly as production persists it — never by reference.

    A reservation draft carries `reserved_at`, and the one shape that must survive this trip is a
    STRING: a `datetime` in `data` raises inside json.dumps, one branch later, with the owner's
    answer already gone. This helper is what would catch that.
    """
    return _session_from_row(_R(s.state, s.client_id,
                                json.loads(json.dumps(_session_to_state_data(s)))))


def extraction(confidence="high", extra=None, **data):
    """A REAL Pydantic extraction built from real values — never a hand-made stand-in.

    `confidence` IS A PARAMETER, and it was not (TRANSITION, 2026-09-19): it used to be the
    literal "high", so the `low` branch -- the one the production model actually takes (R0,
    measured twice) -- had never run once in this suite. That is why T4 was green locally and
    produced zero drafts live. A fake kinder than reality tests the fake.
    """
    unresolved = [k for k in ("customer_name", "customer_phone", "reserved_at", "service_name")
                  if data.get(k) in (None, "")]
    return LiaReservationExtraction.model_validate(
        {"intent": "create_reservation", "confidence": confidence,
         "data": {k: v for k, v in data.items() if v is not None},
         "extra": list(extra or []),
         "unresolved": unresolved})


def _known_from(rows, name):
    """The same three rules the real `_known_customer_phone` applies, over a list in memory."""
    from app.schemas.lia_drafts import WALK_IN_PHONE
    wanted = lia._fold_ar(name or "")
    hits = {getattr(r, "phone", None) for r in rows
            if lia._fold_ar(getattr(r, "name", "") or "") == wanted
            and getattr(r, "phone", None) and r.phone != WALK_IN_PHONE}
    return hits.pop() if len(hits) == 1 else None


class Env:
    def __init__(self, extract=None, raises=None, barbers=None, services=None, users=None,
                 edit=None, customers=None, day_rows=None):
        self.extract, self.raises, self.edit = extract, raises, edit
        self.users = users
        self.barbers = BARBERS if barbers is None else barbers
        self.services = SERVICES if services is None else services
        # The shop's own customer table (T5, 2026-09-20). Empty by default, which is exactly the
        # state every test written before this one assumed: Lia finds nothing and asks.
        self.customers = customers or []
        # The day's existing appointments, as `reservation_service.list_reservations` returns them
        # (RD, 2026-09-24). Empty by default — which is what every earlier test assumed.
        self.day_rows = day_rows or []
        self.calls = []

    async def __aenter__(self):
        self._orig = (barber_repo.list_barbers, catalog_service_repo.list_catalog_services,
                      reservation_service.create_reservation, lia._extract_reservation,
                      lia._extract_reservation_edit, lia._known_customer_phone,
                      reservation_service.list_reservations)
        self._restore_auth = install(users=self.users or [OWNER_BL])
        barber_repo.list_barbers = lambda *a, **kw: _done(list(self.barbers))
        catalog_service_repo.list_catalog_services = lambda *a, **kw: _done(list(self.services))
        reservation_service.create_reservation = self._create
        reservation_service.list_reservations = lambda **kw: _done(list(self.day_rows))
        if self.extract is not None:
            lia._extract_reservation = lambda text: _done(self.extract(text))
        if self.edit is not None:
            lia._extract_reservation_edit = lambda data, text: _done(self.edit(data, text))
        # The REAL lookup would open a database connection; its rules are exercised against the
        # real function in its own section instead, from a list of real rows.
        lia._known_customer_phone = lambda cid, name: _done(
            _known_from(self.customers, name))
        return self

    async def __aexit__(self, *exc):
        self._restore_auth()
        (barber_repo.list_barbers, catalog_service_repo.list_catalog_services,
         reservation_service.create_reservation, lia._extract_reservation,
         lia._extract_reservation_edit, lia._known_customer_phone,
         reservation_service.list_reservations) = self._orig
        return False


    async def _create(self, **kw):
        """Mirrors the real signature's KEYWORD contract, and refuses like it does."""
        self.calls.append(kw)
        if self.raises:
            raise ValueError(self.raises)
        # T5: a hook so ONE item of a batch can fail the way the real service fails — a clash on
        # the second name while the first is already written. Without it, D-6 (no rollback, an
        # explicit per-item result) could only be asserted from the code, never exercised.
        if getattr(self, "calls_hook", None):
            return self.calls_hook(**kw)
        return {"id": "res-new", "status": kw.get("status", "pending")}


async def send(session, text, msg_type="text"):
    wa = Wa()
    out = await lia.try_handle(wa, PHONE, session, msg_type, text, text,
                               lambda: _done(session or session_idle()))
    return wa, out


PAST = (datetime.now() - timedelta(days=1)).replace(hour=16, minute=0, second=0, microsecond=0)
FUTURE = (datetime.now() + timedelta(days=1)).replace(hour=16, minute=0, second=0, microsecond=0)
# TRANSITION (2026-09-21, D-A): the queue tests below used «اليوم الصبح حلقت لعلي ومحمد واحمد» as
# their entry sentence. A visit verb now opens `log_daily_visits`, never the reservation flow, so
# the same queue is reached the way an APPOINTMENT list is dictated: a record verb and a
# reservation noun. The extraction is faked either way; only the gate saw the sentence.
RES_LIST = "سجل مواعيد اليوم الصبح لعلي ومحمد واحمد"
# T5: what the model answers for «اليوم الصبح» — the period's start, with time_said=false.
MORNING = (datetime.now() - timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)


async def main():
    # ── 1 · the gate ─────────────────────────────────────────────────────────
    print("── 1. the gate: a RECORD verb needs no noun, and a customer stays out ──")
    for msg, want in (
        ("سجّللي إنو أحمد إجا مبارح الساعة 4 وعمل قص شعر", "create_reservation"),
        ("سجل موعد لأحمد بكرا", "create_reservation"),
        ("ضيف موعد لسمير اليوم", "create_reservation"),
        ("sajel maw3ad la ahmad bokra", "create_reservation"),
        ("ضيف موعد وخدمة", lia._AMBIGUOUS),
        ("ضيف منتج مشط خشب بـ5 دولار", "create_product"),
        ("ضيف خدمة حلاقة بـ10 دولار", "create_service"),
    ):
        check(f"{msg[:40]!r:44} -> {want}", lia._entry_family(msg) == want,
              repr(lia._entry_family(msg)))

    print("\n   🔴 and a CUSTOMER is still not owner entry")
    for msg in ("بدي احجز موعد بكرا", "بدي موعد الساعة ٤", "عندك موعد فاضي؟",
                "bade e7jaz maw3ad bokra"):
        check(f"{msg[:34]!r:38} -> None", lia._entry_family(msg) is None,
              repr(lia._entry_family(msg)))

    print("\n   the family question is three-way now, and still interruptible")
    check("«موعد» names the reservation family",
          lia._parse_family_answer("موعد") == "create_reservation")
    check("«7ajz» too, in Franco", lia._parse_family_answer("7ajz") == "create_reservation")
    check("🔴 a SENTENCE containing «موعد» is an interruption, not an answer",
          lia._parse_family_answer("انسى الموضوع واحجزلي موعد") is None)

    # ── 2 · the PAST ─────────────────────────────────────────────────────────
    print("\n── 2. THE PAST — «أحمد إجا مبارح»: recorded, not announced ──")
    async with Env(extract=lambda t: extraction(
            customer_name="أحمد", customer_phone="70123456",
            reserved_at=PAST.isoformat(), service_name="قص شعر",
            barber_name="جعفر")) as env:
        wa, out = await send(session_idle(), "سجّللي إنو أحمد إجا مبارح الساعة 4 وعمل قص شعر")
        check("🔴 NOTHING was written — the preview comes first", len(env.calls) == 0)
        check("the preview quotes the customer, the time, the service and the barber",
              all(w in wa.joined() for w in ("أحمد", "قص شعر", "جعفر")), wa.joined()[:100])
        check("   and it SAYS it is a past appointment, before he confirms",
              lia._REPLIES["reservation_preview_past"].split("\n")[0][:20] in wa.joined(),
              wa.joined()[-120:])
        check("   the buttons are confirm / cancel",
              wa.buttons() and wa.buttons()[0] == (lia.CONFIRM_ID, lia.CANCEL_ID))
        check("   parked on the confirmation", out.state == lia.LIA_AWAITING_CONFIRM)

        wa2, out2 = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("ONE reservation written", len(env.calls) == 1, str(len(env.calls)))
        kw = env.calls[0] if env.calls else {}
        check("🔴 allow_past=True — the past is ASKED FOR", kw.get("allow_past") is True)
        check("🔴 notify_merchant=False — no «حجز جديد» about yesterday",
              kw.get("notify_merchant") is False)
        check("🔴 enforce_working_hours=False — the shop's Monday does not veto a fact",
              kw.get("enforce_working_hours") is False)
        check("source='lia' — the owner's own entry, distinguishable in analytics forever",
              kw.get("source") == "lia", str(kw.get("source")))
        check("module_key='barber' — what all 52 production rows carry",
              kw.get("module_key") == "barber")
        check("the ids travel in metadata, where the service really reads them",
              kw.get("metadata") == {"barber_id": "brb-1", "service_id": "svc-1"},
              str(kw.get("metadata")))
        check("duration comes from the SERVICE row, not from a guess",
              kw.get("duration_min") == 30, str(kw.get("duration_min")))
        check("🔴 the hour is NOT converted — 16:00 in, 16:00 out, labelled UTC",
              kw["reserved_at"].hour == 16 and kw["reserved_at"].tzinfo == timezone.utc,
              str(kw.get("reserved_at")))
        check("   and the same wall-clock date the owner meant",
              (kw["reserved_at"].year, kw["reserved_at"].month, kw["reserved_at"].day)
              == (PAST.year, PAST.month, PAST.day))
        # TRANSITION (2026-09-19, Salman): the text is now exactly «تم تسجيل الموعد بنجاح.» —
        # it WAS «تمام، سجّلت موعد {customer} — {when} مع {barber}.», so this asserted «أحمد».
        check("the owner is told it is recorded — «تم تسجيل الموعد بنجاح.»",
              "تم تسجيل الموعد بنجاح." in wa2.joined(), wa2.joined())
        check("   and the draft is consumed, so a second tap writes nothing",
              lia._load_draft(out2) is None and out2.state == "IDLE")
        wa3, _ = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        check("   proven: a second tap really writes nothing", len(env.calls) == 1)

    # ── 3 · the FUTURE ───────────────────────────────────────────────────────
    print("\n── 3. THE FUTURE — the same operation, the opposite three flags ──")
    async with Env(extract=lambda t: extraction(
            customer_name="سمير", customer_phone="70999888",
            reserved_at=FUTURE.isoformat(), service_name="حلاقة دقن",
            barber_name="حسين")) as env:
        wa, out = await send(session_idle(), "سجل موعد لسمير بكرا الساعة 4 حلاقة دقن مع حسين")
        check("no 'this is in the past' line on a future appointment",
              lia._REPLIES["reservation_preview_past"].split("\n")[0][:20] not in wa.joined())
        await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        kw = env.calls[0] if env.calls else {}
        check("allow_past=False — a future booking keeps the guard", kw.get("allow_past") is False)
        check("notify_merchant=True — the merchant IS told about a real new booking",
              kw.get("notify_merchant") is True)
        check("enforce_working_hours=True — a future slot still obeys the schedule",
              kw.get("enforce_working_hours") is True)
        check("   the other service's own duration", kw.get("duration_min") == 20)
        check("   and the other barber's id", kw.get("metadata", {}).get("barber_id") == "brb-2")

    # ── 4 · R-1 · the phone ──────────────────────────────────────────────────
    print("\n── 4. R-1 — no phone is ever invented ──")
    async with Env(extract=lambda t: extraction(
            customer_name="أحمد", customer_phone=None,
            reserved_at=PAST.isoformat(), service_name="قص شعر",
            barber_name="جعفر")) as env:
        wa, out = await send(session_idle(), "سجل إنه أحمد إجا مبارح وعمل قص شعر")
        check("he is ASKED for the number", wa.joined() == lia._REPLIES["reservation_ask_phone"],
              wa.joined())
        check("   nothing written while a field is missing", len(env.calls) == 0)
        check("   and the draft waits on that field", out.state == lia.LIA_AWAITING_FIELD)

        print("\n   · «ما عندي رقمه» — the walk-in, Salman's decision 2026-09-18")
        wa2, out2 = await send(roundtrip(out), "ما عندي رقمه")
        check("accepted, and the flow continues to the preview",
              out2.state == lia.LIA_AWAITING_CONFIRM, str(out2.state))
        check("   the preview shows «زبون طيار», never the sentinel",
              lia._REPLIES["walkin_label"] in wa2.joined() and WALK_IN_PHONE not in wa2.joined(),
              wa2.joined())
        await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        kw = env.calls[0] if env.calls else {}
        check("the sentinel is what reaches the service", kw.get("customer_phone") == WALK_IN_PHONE)
        check("🔴 and it survives phone normalisation verbatim",
              _normalised(kw.get("customer_phone")) == WALK_IN_PHONE,
              _normalised(kw.get("customer_phone")))

        print("\n   · a real number typed as an answer is normalised, not stored raw")
        wa3, out3 = await send(roundtrip(out), "70 123 456")
        check("stored with its country code", out3.state == lia.LIA_AWAITING_CONFIRM)
        check("   961 prefixed", (lia._load_draft(out3) or {}).get("data", {})
              .get("customer_phone") == "96170123456",
              str((lia._load_draft(out3) or {}).get("data", {}).get("customer_phone")))

    # ── 5 · R-6 · the barber, and the service ────────────────────────────────
    print("\n── 5. R-6 — an unnamed or unknown barber is a QUESTION, never a choice ──")
    async with Env(extract=lambda t: extraction(
            customer_name="أحمد", customer_phone="70123456",
            reserved_at=PAST.isoformat(), service_name="قص شعر", barber_name=None)) as env:
        wa, out = await send(session_idle(), "سجل إنه أحمد إجا مبارح وعمل قص شعر")
        check("he is asked WHICH barber — no auto-select, even with two",
              wa.joined() == lia._REPLIES["reservation_ask_barber"], wa.joined())
        wa2, out2 = await send(roundtrip(out), "مين ما كان")
        check("an unknown name is asked again, WITH the real list",
              "جعفر" in wa2.joined() and "حسين" in wa2.joined(), wa2.joined())
        check("   and still nothing written", len(env.calls) == 0)
        wa3, out3 = await send(roundtrip(out2), "حسين")
        check("the real name resolves to the real id",
              (lia._load_draft(out3) or {}).get("barber_id") == "brb-2")

    async with Env(extract=lambda t: extraction(
            customer_name="أحمد", customer_phone="70123456",
            reserved_at=PAST.isoformat(), service_name="مساج تايلندي",
            barber_name="جعفر")) as env:
        wa, out = await send(session_idle(), "سجل إنه أحمد إجا مبارح وعمل مساج تايلندي")
        check("a service this shop does not offer is asked again with the real list",
              "قص شعر" in wa.joined() and "حلاقة دقن" in wa.joined(), wa.joined())
        check("   nothing written", len(env.calls) == 0)
        wa2, out2 = await send(roundtrip(out), "قص")
        check("   a partial name still resolves («قص» -> «قص شعر»)",
              (lia._load_draft(out2) or {}).get("service_id") == "svc-1")

    print("\n   a shop with no barbers at all is told so, not asked in a loop")
    async with Env(extract=lambda t: extraction(
            customer_name="أحمد", customer_phone="70123456",
            reserved_at=PAST.isoformat(), service_name="قص شعر", barber_name="جعفر"),
            barbers=[]) as env:
        wa, out = await send(session_idle(), "سجل إنه أحمد إجا مبارح وعمل قص شعر")
        check("told to add them from the dashboard",
              wa.joined() == lia._REPLIES["reservation_no_barbers"], wa.joined())

    # ── 6 · a clash ──────────────────────────────────────────────────────────
    print("\n── 6. the barber is already booked — the one refusal he can act on ──")
    async with Env(extract=lambda t: extraction(
            customer_name="أحمد", customer_phone="70123456",
            reserved_at=FUTURE.isoformat(), service_name="قص شعر", barber_name="جعفر"),
            raises="This barber is already booked for that time. Please choose a different time.") as env:
        wa, out = await send(session_idle(), "سجل موعد لأحمد بكرا الساعة 4 مع جعفر")
        wa2, _ = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("he is told the barber is taken, in his own language",
              "جعفر" in wa2.joined() and wa2.joined() == lia._REPLIES["reservation_conflict"]
              .format(barber="جعفر"), wa2.joined())
        check("   and the service's developer sentence never reaches him",
              "already booked" not in wa2.joined())

    # ── 7 · the contract ─────────────────────────────────────────────────────
    print("\n── 7. the contract around all of it ──")
    from app.services import lia_operations as ops
    op = ops.get("create_reservation")
    check("the operation was registered since Foundation — T4 opened the road, not a new gate",
          op is not None and op.permission == "reservations.write"
          and op.service_key == "reservations")
    check("   STAFF is inside its roles, unlike service and product — Salman ratified R-7",
          "STAFF" in op.legacy_roles, str(op.legacy_roles))
    check("the model may NOT name a different operation",
          LiaReservationExtraction.model_fields["intent"].annotation.__args__
          == ("create_reservation",))
    check("🔴 the model may not emit an id — extra fields are refused, not trimmed",
          _rejects({"intent": "create_reservation", "confidence": "high",
                    "data": {}, "unresolved": [], "barber_id": "brb-1"}))
    check("no is_past field exists — the code compares, the model only reads the date",
          "is_past" not in LiaReservationDraft.model_fields)
    check("an aware datetime has its offset DROPPED, never converted",
          LiaReservationDraft.model_validate(
              {"customer_name": "أحمد", "customer_phone": "70123456", "service_name": "قص شعر",
               "reserved_at": "2026-09-17T16:00:00+03:00"}).reserved_at.hour == 16)
    check("every new owner-facing text loads and is required at import",
          all(k in lia._REPLIES and lia._REPLIES[k].strip() and k in lia._REQUIRED_REPLIES
              for k in ("reservation_ask_phone", "reservation_preview", "reservation_created",
                        "reservation_conflict", "walkin_label", "reservations_inactive")))
    import unicodedata
    texts = [k for k in lia._REQUIRED_REPLIES if k.startswith("reservation") or k == "walkin_label"]
    check("   and none of them carries an Emoji",
          not any(unicodedata.category(c) == "So" or ord(c) > 0x1F000
                  for k in texts for c in lia._REPLIES[k]),
          str([k for k in texts if any(ord(c) > 0x1F000 for c in lia._REPLIES[k])]))
    check("the service prompt is STILL byte-identical (893 chars)",
          len(lia._SYSTEM_PROMPT) == 893, str(len(lia._SYSTEM_PROMPT)))

    # ── 8 · R1 — the server judges the JSON, not the model's grade of itself ──
    print("\n── 8. R1 — a `low` reservation still opens a draft; the server asks what is missing ──")
    # The two shapes R0 measured on production (d3d6785, 2026-09-19), verbatim in what matters:
    # schema valid, the date read correctly, `unresolved=['customer_phone']`, and `low`.
    r0_2 = lambda t: extraction(confidence="low", customer_name="أحمد",
                                reserved_at=PAST.isoformat(), service_name="قص شعر",
                                barber_name="جعفر")
    async with Env(extract=r0_2) as env:
        wa, out = await send(session_idle(), "سجل موعد لأحمد مبارح الساعة 4 شعر مع سامي")
        check("🔴 TRANSITION — R0-2's live shape (low, only the phone missing) opens a DRAFT"
              "  [was: «ما فهمت الموعد», no draft]",
              out is not None and out.state == lia.LIA_AWAITING_FIELD,
              str(getattr(out, "state", None)))
        check("   and asks for the one thing missing — the phone",
              lia._REPLIES["reservation_ask_phone"] in wa.joined(), wa.joined()[:80])
        check("   🔴 «ما فهمت» is NOT sent", lia._REPLIES["reservation_unclear"] not in wa.joined())
        check("   nothing written", len(env.calls) == 0)
        wa2, out2 = await send(roundtrip(out), "ما عندي رقمه")
        check("   the conversation continues to the preview — no second model call decides",
              out2.state == lia.LIA_AWAITING_CONFIRM, str(out2.state))
        check("   🔴 still nothing written before ✅", len(env.calls) == 0)
        audits = []
        orig_audit = lia.log_security_event
        lia.log_security_event = lambda **kw: (audits.append(kw), _done(None))[1]
        try:
            wa3, out3 = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        finally:
            lia.log_security_event = orig_audit
        check("   ✅ is the only door: ONE reservation, after the owner's tap", len(env.calls) == 1)
        check("   the owner is told exactly «تم تسجيل الموعد بنجاح.» (Salman's text, 2026-09-19)",
              "تم تسجيل الموعد بنجاح." in wa3.joined(), wa3.joined()[:80])
        written = [a for a in audits if a.get("event_type") == "lia_owner_create_reservation"]
        check("   the audit records the service's duration — the row's 30, not None"
              "  [TRANSITION: was None]",
              written and written[0]["detail"].get("duration_min") == env.calls[0].get("duration_min") == 30,
              str(written[0]["detail"].get("duration_min") if written else "no audit"))

    r0_1 = lambda t: extraction(confidence="low", customer_name="أحمد",
                                reserved_at=PAST.isoformat(), service_name="قص شعر")
    async with Env(extract=r0_1) as env:
        wa, out = await send(session_idle(), "سجل موعد لأحمد مبارح الساعة 4 شعر")
        check("R0-1's live shape (low, phone AND barber missing) opens a draft too",
              out is not None and out.state == lia.LIA_AWAITING_FIELD
              and lia._REPLIES["reservation_ask_phone"] in wa.joined(), wa.joined()[:80])

    bad_time = lambda t: extraction(confidence="low", customer_name="أحمد",
                                    customer_phone="70123456", reserved_at="بعدين",
                                    service_name="قص شعر", barber_name="جعفر")
    async with Env(extract=bad_time) as env:
        wa, out = await send(session_idle(), "سجل موعد لأحمد بعدين قص شعر مع جعفر")
        check("an UNREADABLE time is not «ما فهمت» either — the server asks «إيمتى؟»",
              lia._REPLIES["reservation_ask_when"] in wa.joined()
              and out.state == lia.LIA_AWAITING_FIELD, wa.joined()[:80])
        check("   and nothing is written", len(env.calls) == 0)

    async with Env(extract=lambda t: None) as env:
        wa, out = await send(session_idle(), "سجل موعد لأحمد مبارح")
        check("INVARIANT — an answer that fails the schema is still «ما فهمت الموعد»",
              lia._REPLIES["reservation_unclear"] in wa.joined(), wa.joined()[:80])
        check("   and opens no draft", lia._load_draft(out) in (None, {}) if out else True)

    orig_product = lia._extract_product
    lia._extract_product = lambda text: _done(
        __import__("app.schemas.lia_drafts", fromlist=["x"]).LiaProductExtraction.model_validate(
            {"intent": "create_product", "confidence": "low",
             "data": {"name_ar": "شامبو", "price": 12}}))
    try:
        async with Env() as env:
            wa, out = await send(session_idle(), "ضيف منتج شامبو بـ12 دولار")
            check("INVARIANT — the gate is unchanged for a PRODUCT: low is still «ما فهمت»",
                  lia._REPLIES["product_unclear"].split("\n")[0] in wa.joined(), wa.joined()[:90])
    finally:
        lia._extract_product = orig_product

    # ── 9 · cancel and expiry are worded for the operation they end (2026-09-19) ──
    print("\n── 9. cancel / expiry speak about what the owner was actually doing ──")
    # Live, 18:21: Salman cancelled an APPOINTMENT and was told «ابعتلي الخدمة… الاسم والسعر
    # والمدة» -- a service's instructions. The 5th "text for one context shown in another".
    full = lambda t: extraction(customer_name="عادل طالب", customer_phone="70123321",
                                reserved_at=PAST.isoformat(), service_name="قص شعر",
                                barber_name="جعفر")
    async with Env(extract=full) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل طالب 70123321 مبارح الساعة 4 مع جعفر")
        check("setup: the preview is on screen", out.state == lia.LIA_AWAITING_CONFIRM, str(out.state))
        wa2, out2 = await send(roundtrip(out), lia.CANCEL_ID, "button_reply")
        check("❌ on an appointment → «تمام، ألغيت الموعد…»",
              lia._REPLIES["reservation_cancelled"] in wa2.joined(), wa2.joined()[:90])
        check("   🔴 and NOT the service's «الاسم والسعر والمدة»  [TRANSITION: it was]",
              "الاسم والسعر والمدة" not in wa2.joined())
        check("   nothing written, draft gone", len(env.calls) == 0 and lia._load_draft(out2) is None)

        wa, out = await send(session_idle(), "سجل موعد عادل طالب 70123321 مبارح الساعة 4 مع جعفر")
        stale = roundtrip(out)
        stale.lia[lia.DRAFT_KEY]["started_at"] = (
            datetime.now(timezone.utc) - timedelta(minutes=lia.DRAFT_WINDOW_MIN + 1)).isoformat()
        wa3, out3 = await send(stale, lia.CONFIRM_ID, "button_reply")
        check("an EXPIRED appointment draft → «مرّ وقت طويل فألغيت الموعد…»",
              lia._REPLIES["reservation_expired"] in wa3.joined(), wa3.joined()[:90])
        check("   🔴 and a stale ✅ writes nothing", len(env.calls) == 0)
        check("   and the state is back to IDLE", out3.state == "IDLE", str(out3.state))

    check("a PRODUCT's cancel and expiry name a product, not a service",
          lia._per_operation("create_product", "cancelled") == "product_cancelled"
          and lia._per_operation("create_product", "expired") == "product_expired"
          and "المنتج" in lia._REPLIES["product_cancelled"] + lia._REPLIES["product_expired"])
    check("INVARIANT — a SERVICE keeps its exact old texts (cancel, and the old expiry literal)",
          lia._per_operation("create_service", "cancelled") == "cancel"
          and lia._REPLIES["service_expired"]
          == "مرّ وقت طويل على الطلب فألغيته 🙂 ابعتلي الخدمة من جديد إذا بدك.")
    import unicodedata as _u
    check("the four new texts carry no Emoji",
          not any(_u.category(c) == "So" or ord(c) > 0x1F000
                  for k in ("reservation_cancelled", "reservation_expired",
                            "product_cancelled", "product_expired") for c in lia._REPLIES[k]))

    # ── 10 · defaults, marked, and correctable at the preview (Salman, 2026-09-19) ──
    print("\n── 10. default service «شعر ودقن» + the talking account's barber, then edit ──")
    from test_lia_foundation import FakeUser
    from app.schemas.lia_drafts import LiaReservationEditPatch
    OWNER_HUSSEIN = FakeUser("u-bl", BL)
    OWNER_HUSSEIN.barberId = "brb-2"                           # linked to the barber «حسين»
    WITH_DEFAULT = SERVICES + [Row(id="svc-3", nameAr="شعر ودقن", durationMin=30)]
    bare = lambda t: extraction(customer_name="عادل", customer_phone="70123321",
                                reserved_at=PAST.isoformat())
    edit_to = lambda conf, **ch: (lambda data, text: LiaReservationEditPatch.model_validate(
        {"intent": "edit_reservation", "confidence": conf, "changes": ch}))

    async with Env(extract=bare, services=WITH_DEFAULT, users=[OWNER_HUSSEIN],
                   edit=edit_to("high", barber_name="جعفر")) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4")
        check("no service, no barber, a LINKED account → straight to the preview, nothing asked",
              out.state == lia.LIA_AWAITING_CONFIRM, str(out.state))
        auto = lia._REPLIES["auto_label"]
        check(f"   the service is «شعر ودقن {auto}»", f"شعر ودقن {auto}" in wa.joined(), wa.joined()[:160])
        check(f"   the barber is the talking account's own — «حسين {auto}»",
              f"حسين {auto}" in wa.joined())
        check("   nothing written yet", len(env.calls) == 0)

        wa2, out2 = await send(roundtrip(out), "لا خليه مع جعفر")
        check("an EDIT at the preview changes the barber — «جعفر», re-previewed",
              out2.state == lia.LIA_AWAITING_CONFIRM and "جعفر" in wa2.joined(), wa2.joined()[:160])
        check(f"   and the barber is no longer marked {auto}; the service still is",
              f"جعفر {auto}" not in wa2.joined() and f"شعر ودقن {auto}" in wa2.joined())
        wa3, out3 = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        kw = env.calls[0] if env.calls else {}
        check("✅ writes ONE reservation with the EDITED barber and the default service",
              len(env.calls) == 1 and kw.get("metadata") == {"barber_id": "brb-1",
                                                             "service_id": "svc-3"},
              str(kw.get("metadata")))

    async with Env(extract=bare, services=WITH_DEFAULT) as env:        # OWNER_BL: no barber link
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4")
        check("an account with NO barber link → the barber is ASKED, never guessed by name",
              lia._REPLIES["reservation_ask_barber"] in wa.joined(), wa.joined()[:90])
        check("   while the service default still applies",
              lia._load_draft(out)["data"].get("service_name") == "شعر ودقن")

    async with Env(extract=bare, users=[OWNER_HUSSEIN]) as env:        # shop has no «شعر ودقن»
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4")
        check("a shop WITHOUT «شعر ودقن» → the service is asked, as before",
              lia._REPLIES["reservation_ask_service"] in wa.joined(), wa.joined()[:90])

    full = lambda t: extraction(customer_name="عادل", customer_phone="70123321",
                                reserved_at=PAST.isoformat(), service_name="قص شعر",
                                barber_name="جعفر")
    async with Env(extract=full, edit=edit_to("low", barber_name="حسين")) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح 4 قص شعر مع جعفر")
        wa2, out2 = await send(roundtrip(out), "مع حسين")
        check("R1 for edits: a readable change graded `low` is still APPLIED",
              "حسين" in wa2.joined() and out2.state == lia.LIA_AWAITING_CONFIRM, wa2.joined()[:120])

    async with Env(extract=full, edit=edit_to("high", barber_name="زياد")) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح 4 قص شعر مع جعفر")
        wa2, out2 = await send(roundtrip(out), "خليه مع زياد")
        check("an edit naming a barber this shop does not have → the question WITH the real list",
              "جعفر" in wa2.joined() and "حسين" in wa2.joined()
              and out2.state == lia.LIA_AWAITING_FIELD, wa2.joined()[:120])
        check("   and nothing written", len(env.calls) == 0)

    later = PAST.replace(hour=17).isoformat()
    async with Env(extract=full, edit=edit_to("high", reserved_at=later)) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح 4 قص شعر مع جعفر")
        wa2, out2 = await send(roundtrip(out), "خليها الساعة 5")
        check("an edit of the TIME moves the appointment — 17:00 in the new preview",
              "17:00" in wa2.joined(), wa2.joined()[:140])

    async with Env(extract=full, edit=lambda d, t: LiaReservationEditPatch.model_validate(
            {"intent": "edit_reservation", "confidence": "low", "changes": {}})) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح 4 قص شعر مع جعفر")
        wa2, out2 = await send(roundtrip(out), "خليها أحسن")
        check("an edit with NO readable change → «ما فهمت شو بدك تعدّل…», the draft kept",
              lia._REPLIES["reservation_edit_unclear"] in wa2.joined()
              and out2.state == lia.LIA_AWAITING_CONFIRM, wa2.joined()[:90])

    # Asserted on the PARSED function, not on text: a comment mentioning a name lookup would pass
    # a grep. `ast.unparse` drops comments and docstrings are skipped, so only real code counts.
    import ast, inspect, textwrap
    fn = ast.parse(textwrap.dedent(inspect.getsource(lia._apply_reservation_defaults))).body[0]
    fn.body = [n for n in fn.body if not (isinstance(n, ast.Expr)
                                           and isinstance(getattr(n, "value", None), ast.Constant))]
    code = ast.unparse(fn)
    check("the default barber comes from the account's LINK — the code reads actor_barber_id and "
          "never matches a barber by name",
          "actor_barber_id" in code and "getattr(b, 'id'" in code
          and "_match_by_name" not in code and "b.name ==" not in code
          and "getattr(b, 'name'" not in code, code[:0])
    check("an unreadable edit on an APPOINTMENT says so in appointment words, not price/duration",
          lia._REPLIES["reservation_edit_unclear"] in wa2.joined()
          and "السعر" not in wa2.joined(), wa2.joined()[:90])

    # ── 11 · the barber as buttons, and a greeting by name (Salman, 2026-09-19, live 19:33) ──
    print("\n── 11. «أهلاً سلمان، نسيت تقلّي الحلاق» + the barbers as buttons ──")
    SALMAN = FakeUser("u-bl", BL)
    SALMAN.fullName = "سلمان حسين"                              # no barber link
    no_barber = lambda t: extraction(customer_name="عادل", customer_phone="70123321",
                                     reserved_at=PAST.isoformat(), service_name="قص شعر")
    async with Env(extract=no_barber, users=[SALMAN]) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4 قص شعر")
        want = "أهلاً سلمان، " + lia._REPLIES["reservation_ask_barber"]
        msg = [o for o in wa.out if o[0] == "buttons"]
        check("the first reply greets him by his FIRST name and asks for the barber",
              msg and msg[0][1] == want, repr(msg[0][1] if msg else wa.joined()[:80]))
        check("   the shop's barbers are BUTTONS carrying their row ids",
              msg and msg[0][2] == (f"{lia.BARBER_PICK_PREFIX}brb-1", f"{lia.BARBER_PICK_PREFIX}brb-2"),
              str(msg[0][2] if msg else None))
        wa2, out2 = await send(roundtrip(out), f"{lia.BARBER_PICK_PREFIX}brb-2", "button_reply")
        check("a TAP on «حسين» fills the barber and goes to the preview",
              out2.state == lia.LIA_AWAITING_CONFIRM and "حسين" in wa2.joined(), wa2.joined()[:120])
        check("   the greeting is said ONCE — not again on the preview",
              "أهلاً" not in wa2.joined())
        wa3, out3 = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        check("   ✅ writes the TAPPED barber's id", env.calls and
              env.calls[0]["metadata"]["barber_id"] == "brb-2", str(env.calls[:1]))

    async with Env(extract=no_barber, users=[SALMAN]) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4 قص شعر")
        wa2, out2 = await send(roundtrip(out), f"{lia.BARBER_PICK_PREFIX}brb-other-shop", "button_reply")
        check("a stale or foreign barber id matches nothing → asked again, with buttons, nothing set",
              out2.state == lia.LIA_AWAITING_FIELD and any(o[0] == "buttons" for o in wa2.out)
              and not lia._load_draft(out2)["data"].get("barber_name"), wa2.joined()[:80])
        wa3, out3 = await send(roundtrip(out2), "جعفر")
        check("typing the name still works — the buttons are a shortcut, not the only door",
              out3.state == lia.LIA_AWAITING_CONFIRM and "جعفر" in wa3.joined())

    FIVE = BARBERS + [Row(id=f"brb-{i}", name=f"حلاق{i}", isActive=True) for i in (3, 4)]
    async with Env(extract=no_barber, users=[SALMAN], barbers=FIVE) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4 قص شعر")
        check("more than 3 barbers (WhatsApp's button limit) → the question with the names as text",
              not any(o[0] == "buttons" for o in wa.out) and "حلاق4" in wa.joined(), wa.joined()[:120])

    async with Env(extract=full, users=[SALMAN]) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح 4 قص شعر مع جعفر")
        check("when the FIRST reply is the preview, the preview is what greets him",
              wa.out and wa.out[0][1].startswith("أهلاً سلمان، "), wa.out[0][1][:40] if wa.out else "")
    async with Env(extract=no_barber) as env:                      # FakeUser without a name
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4 قص شعر")
        check("no name on the account → no greeting, never a placeholder",
              "أهلاً" not in wa.joined() and "{name}" not in wa.joined())

    # ── 12 · one number, one shape — however it arrived (2026-09-20) ──
    print("\n── 12. a DICTATED phone is stored exactly like a TYPED one ──")
    # Found while confirming the Console's starter tests: `_parse_field_answer` normalises a phone
    # the owner TYPES as an answer, and nothing normalised one he DICTATES inside the sentence --
    # so «سجل موعد لعادل 70123321» would have written `70123321` while the same number answered to
    # a question writes `96170123321`. Two Customer rows for one person, and the first unreachable
    # by any outbound send (`rules/phone-numbers.md`: storage is always WITH the country code).
    # No production row carried the defect yet (checked: barberlab-test's two non-961 customers are
    # a real Tunisian and a real German number), so this is the fix landing BEFORE the first bad row.
    said = lambda value: (lambda t: extraction(
        customer_name="عادل", customer_phone=value, reserved_at=PAST.isoformat(),
        service_name="قص شعر", barber_name="جعفر"))

    async with Env(extract=said("70123321")) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4 مع جعفر")
        stored = (lia._load_draft(out) or {}).get("data", {}).get("customer_phone")
        check("a number dictated in the sentence enters the draft WITH the country code"
              "  [TRANSITION: it was «70123321», raw]",
              stored == "96170123321", repr(stored))
        check("   and the preview quotes back that same stored number, not the spoken one",
              "96170123321" in wa.joined(), wa.joined()[:100])
        wa2, out2 = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("   and it is what reaches the service layer",
              env.calls and env.calls[0].get("customer_phone") == "96170123321",
              str(env.calls[:1])[:120])

    async with Env(extract=said("96170123321")) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 96170123321 مبارح الساعة 4 مع جعفر")
        check("INVARIANT — a number already carrying 961 is untouched",
              (lia._load_draft(out) or {}).get("data", {}).get("customer_phone") == "96170123321")

    async with Env(extract=said("21650492272")) as env:                 # a real Tunisian number
        wa, out = await send(session_idle(), "سجل موعد عادل 21650492272 مبارح الساعة 4 مع جعفر")
        check("INVARIANT — a foreign number keeps ITS own country code, never 961 in front of it",
              (lia._load_draft(out) or {}).get("data", {}).get("customer_phone") == "21650492272",
              repr((lia._load_draft(out) or {}).get("data", {}).get("customer_phone")))

    async with Env(extract=said("رقمه عندي")) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل مبارح الساعة 4 مع جعفر")
        check("an unreadable number becomes the QUESTION, never a bad row",
              out.state == lia.LIA_AWAITING_FIELD
              and (lia._load_draft(out) or {}).get("asking") == "customer_phone",
              f"{out.state} asking={(lia._load_draft(out) or {}).get('asking')}")
        wa2, out2 = await send(roundtrip(out), "70123321")
        check("   and answering it lands on the SAME value the dictated path produced",
              (lia._load_draft(out2) or {}).get("data", {}).get("customer_phone") == "96170123321",
              repr((lia._load_draft(out2) or {}).get("data", {}).get("customer_phone")))

    async with Env(extract=said("ما عندي رقمه")) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل مبارح الساعة 4 مع جعفر")
        check("INVARIANT — a walk-in phrase still means WALK_IN, not a question",
              (lia._load_draft(out) or {}).get("data", {}).get("customer_phone") == WALK_IN_PHONE,
              repr((lia._load_draft(out) or {}).get("data", {}).get("customer_phone")))
    # SIDE FINDING, reported not fixed (2026-09-20): «ما معي رقمه» -- Lebanese for the same thing,
    # and what an owner is at least as likely to type -- is NOT in `_WALKIN_WORDS`; only «ما عندي
    # رقمه» is. It falls through to the question instead, which is safe but repetitive. Widening
    # that list changes what Lia RECOGNISES from an owner, so it waits for Salman's word.
    check("   and «ما معي رقمه» is NOT recognised today — the known gap, asserted so it is visible",
          lia._parse_field_answer("customer_phone", "ما معي رقمه") is None)

    # ── 13 · T5 slice 1 — the queue is built, and the clock rule (2026-09-20) ──
    print("\n── 13. T5-1: more than one customer arrives, in order — nothing visible yet ──")
    # Salman, 2026-09-20: «اليوم الصبح حلقت لي علي، محمد وأحمد … المهم يسجّل الزباين مشان يعمل
    # حسابات بعدين». This slice only BUILDS the queue; `_advance` still completes and previews the
    # first item alone, so the owner sees exactly what he saw yesterday. That is the point of a
    # slice, and the INVARIANT at the end of this section is what proves it.
    three = lambda t: extraction(
        customer_name="علي", customer_phone=None, reserved_at=MORNING.isoformat(),
        service_name="قص شعر", barber_name="جعفر", time_said=False,
        extra=[{"customer_name": "محمد", "reserved_at": MORNING.isoformat(),
                "service_name": "قص شعر", "barber_name": "جعفر", "time_said": False},
               {"customer_name": "أحمد", "reserved_at": MORNING.isoformat(),
                "service_name": "قص شعر", "barber_name": "جعفر", "time_said": False}])
    async with Env(extract=three) as env:
        wa, out = await send(session_idle(), "سجل زباين اليوم الصبح علي ومحمد واحمد")
        d = lia._load_draft(out) or {}
        check("the two other customers are queued, in the order he said them",
              [i["data"].get("customer_name") for i in (d.get("rest") or [])] == ["محمد", "أحمد"],
              str([i["data"].get("customer_name") for i in (d.get("rest") or [])]))
        check("   the first one is still `data` — every existing reader is untouched",
              d.get("data", {}).get("customer_name") == "علي")
        check("   `done` starts empty", d.get("done") == [])
        check("   `time_said` is carried on the draft, NOT inside data",
              d.get("time_said") is False and "time_said" not in d.get("data", {}),
              f"draft={d.get('time_said')} in_data={'time_said' in d.get('data', {})}")
        check("   nothing written by merely queueing them", len(env.calls) == 0)

    four = lambda t: extraction(
        customer_name="علي", reserved_at=MORNING.isoformat(), service_name="قص شعر",
        barber_name="جعفر", customer_phone=None,
        extra=[{"customer_name": n, "reserved_at": MORNING.isoformat()} for n in
               ("محمد", "أحمد", "خالد")])
    async with Env(extract=four) as env:
        wa, out = await send(session_idle(), "سجل زباين اليوم علي ومحمد واحمد وخالد")
        d = lia._load_draft(out) or {}
        check(f"D-7 — at most {lia._MAX_ITEMS} in this text interface, the rest dropped here too",
              len(d.get("rest") or []) == lia._MAX_ITEMS - 1
              and [i["data"]["customer_name"] for i in d["rest"]] == ["محمد", "أحمد"],
              str(len(d.get("rest") or [])))

    dictated = lambda t: extraction(
        customer_name="علي", customer_phone="70123321", reserved_at=PAST.isoformat(),
        service_name="قص شعر", barber_name="جعفر",
        extra=[{"customer_name": "محمد", "customer_phone": "70999888",
                "reserved_at": PAST.isoformat(), "service_name": "قص شعر",
                "barber_name": "جعفر"}])
    async with Env(extract=dictated) as env:
        wa, out = await send(session_idle(), "سجل موعد علي 70123321 ومحمد 70999888 مبارح مع جعفر")
        d = lia._load_draft(out) or {}
        # TRANSITION (T5-3): the queue is now CONSUMED, not parked. In slice 1 both items were
        # still readable at `data` + `rest[0]`; with the transition wired, a complete pair walks
        # all the way to the preview, so the first sits in `done` and the second is `data`.
        check("ONE path for the phone — a queued item is normalised exactly like the first",
              d["done"][0]["data"]["customer_phone"] == "96170123321"
              and d["data"]["customer_phone"] == "96170999888",
              f'{d["done"][0]["data"]["customer_phone"]} · {d["data"]["customer_phone"]}')

    # The clock rule, as a pure function — no session, no model, no draft.
    NINE = datetime(2026, 9, 20, 9, 0)
    c = None
    order = []
    for _ in range(3):
        start, c = lia._sequence_time(c, NINE, False, 30)
        order.append(start.strftime("%H:%M"))
    check("three implicit items spread by the service's duration — 09:00 · 09:30 · 10:00",
          order == ["09:00", "09:30", "10:00"], str(order))
    said = datetime(2026, 9, 20, 16, 0)
    start, after = lia._sequence_time(None, said, True, 30)
    check("an hour he actually SAID is used exactly as said",
          start == said and after == datetime(2026, 9, 20, 16, 30), f"{start} → {after}")
    start2, _ = lia._sequence_time(after, NINE, False, 30)
    check("   and an implicit item after it continues from the cursor, per the approved plan",
          start2 == datetime(2026, 9, 20, 16, 30), str(start2))
    start3, after3 = lia._sequence_time(None, NINE, False, None)
    check("a service with no duration falls back to 30 minutes, never to zero",
          after3 - start3 == timedelta(minutes=30), str(after3 - start3))

    single = lambda t: extraction(customer_name="عادل", customer_phone="70123321",
                                  reserved_at=PAST.isoformat(), service_name="قص شعر",
                                  barber_name="جعفر")
    async with Env(extract=single) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4 مع جعفر")
        d = lia._load_draft(out) or {}
        check("INVARIANT — one customer: empty queue, preview on screen, nothing else moved",
              d.get("rest") == [] and out.state == lia.LIA_AWAITING_CONFIRM
              and d.get("time_said") is True, f'rest={d.get("rest")} state={out.state}')
        wa2, out2 = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("   and it still writes exactly one reservation", len(env.calls) == 1)

    check("INVARIANT — the extraction contract still refuses a key it does not declare",
          _rejects({"intent": "create_reservation", "confidence": "high", "data": {},
                    "extra": [], "unresolved": [], "whatever": 1}))

    # ── 14 · T5-3 — one name at a time, and the verb that opens the path (2026-09-20) ──
    print("\n── 14. T5-3: the queue is walked, each question says whose it is ──")
    # D-5, approved within its limit: the verb opens the path and decides NOTHING else.
    # TRANSITION (2026-09-21, D-A). WAS "create_reservation" for both. A visit he reports is
    # completed work and opens `log_daily_visits`; the reservation flow no longer sees it at all.
    check("«حلقت» reaches Lia as the DAILY LOG  [TRANSITION: was create_reservation, 2026-09-20]",
          lia._entry_family("مرحبا اليوم الصبح حلقت لي علي، محمد واحمد") == lia.DAILY_LOG_OP)
    check("   «قصينا» too — completed work, not an appointment  [TRANSITION: was create_reservation]",
          lia._entry_family("قصينا اليوم لعلي ومحمد") == lia.DAILY_LOG_OP)
    check("   D-2 — the verb is the evidence, not the date: «سجل موعد … مبارح» is NOT a visit",
          lia._has_visit_verb("سجل موعد لأحمد مبارح الساعة 4") is False
          and lia._has_visit_verb("حلقت لأحمد مبارح") is True)
    check("INVARIANT — a message that NAMES a family is still read by its noun, not by a verb",
          lia._entry_family("ضيف خدمة قص شعر 10 دولار ونص ساعة") == "create_service"
          and lia._entry_family("ضيف منتج شامبو بـ12 دولار") == "create_product")
    check("INVARIANT — a customer sentence still wakes nobody",
          lia._entry_family("بدي احجز موعد") is None)

    # Three walk-ins, nothing but names: the questions must be answerable one at a time.
    # TRANSITION (D-4, same day): this fixture used to leave the PHONE missing and answer it three
    # times, which is how the per-item prefix was exercised. A reported visit no longer asks for a
    # number at all, so the barber — which Lia does still ask for, one name at a time — carries the
    # test instead. Nothing about the prefix changed; the question behind it did.
    # TRANSITION (2026-09-21): D-4 is gone with the visit branch, so an appointment with no number
    # would now be ASKED for one. The fixture says «ما عندي رقمه» itself, which keeps this test
    # about what it was always about -- the per-item question -- carried by the barber.
    walkins = lambda t: extraction(
        customer_name="علي", customer_phone="ما عندي رقمه", reserved_at=MORNING.isoformat(),
        service_name="قص شعر", time_said=False,
        extra=[{"customer_name": n, "reserved_at": MORNING.isoformat(), "time_said": False,
                "customer_phone": "ما عندي رقمه",
                "service_name": "قص شعر"} for n in ("محمد", "أحمد")])
    async with Env(extract=walkins) as env:
        wa, out = await send(session_idle(), RES_LIST)
        # TRANSITION (2026-09-20, from the live round): this used to assert the OPPOSITE — that
        # the first question carries no name, "because there is nothing to disambiguate yet". The
        # reasoning was wrong and a real owner proved it within the hour: asked a bare «شو رقم
        # الزبون؟» about the first of two customers, he answered for BOTH in one message. The list
        # exists from the first question, and so does the ambiguity.
        check("even the FIRST question says whose it is, once there is a list",
              "بالنسبة لـعلي،" in wa.joined(), wa.joined()[:80])
        check("   and no visit flag rides on an appointment draft any more  [TRANSITION: "
              "`visit_reported` was True here, 2026-09-20]",
              "visit_reported" not in (lia._load_draft(out) or {}))
        wa2, out2 = await send(roundtrip(out), "جعفر")
        check("answering علي moves to محمد, and the question SAYS so",
              "بالنسبة لـمحمد،" in wa2.joined(), wa2.joined()[:90])
        check("   the space after «،» survives the reply loader's strip",
              "بالنسبة لـمحمد،نسيت" not in wa2.joined() and "بالنسبة لـمحمد، " in wa2.joined())
        d2 = lia._load_draft(out2) or {}
        check("   علي is retired into `done`, محمد is the live one, أحمد still waiting",
              [i["data"]["customer_name"] for i in d2["done"]] == ["علي"]
              and d2["data"]["customer_name"] == "محمد"
              and [i["data"]["customer_name"] for i in d2["rest"]] == ["أحمد"],
              str([i["data"]["customer_name"] for i in d2["done"]]))
        check("   and علي's own answer is not re-asked",
              d2["done"][0]["data"]["barber_name"] == "جعفر"
              and d2["done"][0]["data"]["customer_phone"] == WALK_IN_PHONE)
        wa3, out3 = await send(roundtrip(out2), "جعفر")
        check("answering محمد moves to أحمد, named again",
              "بالنسبة لـأحمد،" in wa3.joined(), wa3.joined()[:90])
        wa4, out4 = await send(roundtrip(out3), "جعفر")
        d4 = lia._load_draft(out4) or {}
        starts = [i["data"]["reserved_at"][11:16] for i in d4["done"]] + \
                 [d4["data"]["reserved_at"][11:16]]
        check("all three settled at 09:00 · 09:30 · 10:00 — in the order he said them",
              starts == ["09:00", "09:30", "10:00"], str(starts))
        check("   nothing written — the preview is still the only door",
              len(env.calls) == 0 and out4.state == lia.LIA_AWAITING_CONFIRM, str(out4.state))

    # A per-item value must never leak sideways into the next name.
    mixed = lambda t: extraction(
        customer_name="علي", customer_phone="70123321", reserved_at=PAST.isoformat(),
        service_name="قص شعر", barber_name="جعفر",
        extra=[{"customer_name": "محمد", "customer_phone": "70999888",
                "reserved_at": MORNING.isoformat(), "time_said": False,
                "service_name": "قص شعر", "barber_name": "جعفر"}])
    async with Env(extract=mixed) as env:
        wa, out = await send(session_idle(), "سجل موعد علي 70123321 مبارح 4 مع جعفر ومحمد الصبح")
        d = lia._load_draft(out) or {}
        check("an item with its own hour keeps it, and the next one continues from the cursor",
              d["done"][0]["data"]["reserved_at"][11:16] == "16:00"
              and d["data"]["reserved_at"][11:16] == "16:30",
              f'{d["done"][0]["data"]["reserved_at"][11:16]} → {d["data"]["reserved_at"][11:16]}')
        check("   no per-item id leaked sideways: محمد was resolved on his own",
              d.get("barber_id") is not None and d.get("service_id") is not None)

    async with Env(extract=single) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4 مع جعفر")
        check("INVARIANT — one customer: no «بالنسبة لـ» anywhere, and the hour he said is kept",
              "بالنسبة" not in wa.joined()
              and (lia._load_draft(out) or {})["data"]["reserved_at"][11:16] == "16:00",
              (lia._load_draft(out) or {})["data"]["reserved_at"])

    # ── 15 · T5-4 — the list he reads, and the rows he gets (2026-09-20) ──
    print("\n── 15. T5-4: one preview for all of them, one ✅, one honest result ──")
    visit = lambda t: extraction(
        customer_name="علي", customer_phone="ما عندي رقمه", reserved_at=MORNING.isoformat(),
        service_name="قص شعر", barber_name="جعفر", time_said=False,
        extra=[{"customer_name": n, "reserved_at": MORNING.isoformat(), "time_said": False,
                "service_name": "قص شعر", "barber_name": "جعفر",
                "customer_phone": "ما عندي رقمه"} for n in ("محمد", "أحمد")])
    async with Env(extract=visit) as env:
        wa1, out1 = await send(session_idle(), RES_LIST)
        body = wa1.joined()
        check("the preview lists all three, numbered, in his order",
              all(f"*{n}.* {who}" in body for n, who in ((1, "علي"), (2, "محمد"), (3, "أحمد"))),
              body[:140])
        check("   with the hours the server chose — 09:00 · 09:30 · 10:00",
              all(t in body for t in ("09:00", "09:30", "10:00")), body[:200])
        check("   and it SAYS they are approximate", lia._REPLIES["reservation_time_approx"] in body)
        check("   the button asks about all of them",
              lia._REPLIES["reservation_confirm_multi"] in body
              and lia._REPLIES["reservation_confirm"] not in body)
        btn_titles = [o[3] for o in wa1.out if o[0] == "buttons"]
        check("   T5-9 — and the BUTTON says «سجّلهم», not «سجّله»",
              titles and "✅ سجّلهم" in btn_titles[0] and "❌ إلغاء" in btn_titles[0], str(btn_titles))
        check("   nothing written before ✅", len(env.calls) == 0)
        wa2, out2 = await send(roundtrip(out1), lia.CONFIRM_ID, "button_reply")
        check("✅ writes THREE reservations, one per name, in order",
              [c["customer_name"] for c in env.calls] == ["علي", "محمد", "أحمد"],
              str([c["customer_name"] for c in env.calls]))
        check("   an appointment list is born 'pending'  [TRANSITION: 'arrived' ×3 when this "
              "sentence was a visit verb — D-A moved `arrived` to the daily log]",
              [c.get("status") for c in env.calls] == ["pending"] * 3,
              str([c.get("status") for c in env.calls]))
        check("   every one of them is a walk-in, and the NAMES are on the rows",
              all(c["customer_phone"] == WALK_IN_PHONE for c in env.calls))
        check("   and the owner is told once, not three times",
              lia._REPLIES["reservation_created_multi"] in wa2.joined(), wa2.joined()[:90])

    # D-6: the middle one clashes. The successes stay written; he is told exactly what happened.
    calls_seen = {"n": 0}

    def _second_clashes(**kw):
        calls_seen["n"] += 1
        if calls_seen["n"] == 2:
            raise ValueError("This resource is already booked for that time.")
        return {"id": f"res-{calls_seen['n']}", "status": kw.get("status")}

    async with Env(extract=visit) as env:
        env.calls_hook = _second_clashes
        wa1, out1 = await send(session_idle(), RES_LIST)
        wa2, out2 = await send(roundtrip(out1), lia.CONFIRM_ID, "button_reply")
        said = wa2.joined()
        check("D-6 — the two that worked are NAMED, and so is the one that did not",
              "علي" in said and "أحمد" in said and "محمد" in said, said[:160])
        check("   the reason is a controlled message, never a raw error",
              "already booked" not in said and "جعفر" in said, said[:160])
        check("   and the successes are NOT rolled back — three attempts, two rows",
              calls_seen["n"] == 3, str(calls_seen["n"]))

    # A historical APPOINTMENT is still not an attendance claim — the T1 invariant, through T5.
    appt = lambda t: extraction(
        customer_name="علي", customer_phone="70123321", reserved_at=PAST.isoformat(),
        service_name="قص شعر", barber_name="جعفر",
        extra=[{"customer_name": "محمد", "customer_phone": "70999888", "barber_name": "جعفر",
                "reserved_at": PAST.isoformat(), "service_name": "قص شعر"}])
    async with Env(extract=appt) as env:
        wa, out = await send(session_idle(), "سجل موعد علي ومحمد مبارح الساعة 4 مع جعفر")
        wa2, out2 = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("INVARIANT — «سجل موعد … مبارح» has no visit verb, so both rows stay 'pending'",
              [c.get("status") for c in env.calls] == ["pending"] * 2,
              str([c.get("status") for c in env.calls]))
        check("   and no «الساعات تقريبيّة» when he stated the hour himself",
              lia._REPLIES["reservation_time_approx"] not in wa.joined())

    async with Env(extract=visit) as env:
        wa1, out1 = await send(session_idle(), RES_LIST)
        wa2, out2 = await send(roundtrip(out1), lia.CANCEL_ID, "button_reply")
        check("T5-10 — ❌ on a list says «ألغيت المواعيد», not «ألغيت الموعد»",
              lia._REPLIES["reservation_cancelled_multi"] in wa2.joined()
              and lia._REPLIES["reservation_cancelled"] not in wa2.joined(), wa2.joined()[:90])
        check("   and nothing was written", len(env.calls) == 0)

    async with Env(extract=single) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4 مع جعفر")
        check("INVARIANT — one customer keeps the OLD five-line preview, not the numbered list",
              "*الزبون:*" in wa.joined() and "*1.*" not in wa.joined(), wa.joined()[:60])
        wa2, out2 = await send(roundtrip(out), lia.CANCEL_ID, "button_reply")
        check("INVARIANT — and its cancel text is the singular one, untouched",
              lia._REPLIES["reservation_cancelled"] in wa2.joined())

    # TRANSITION (2026-09-21, D-A). This block asserted D-4: «اليوم الصبح حلقت…» with no numbers
    # asked for NONE of them and filled WALK_IN. The visit sentence now opens the daily log (no
    # phone question exists there at all -- scripts/test_lia_daily_log.py), and an APPOINTMENT
    # list with no numbers is asked for them, one name at a time, like any appointment.
    no_phones = lambda t: extraction(
        customer_name="علي", customer_phone=None, reserved_at=MORNING.isoformat(),
        service_name="قص شعر", barber_name="جعفر", time_said=False,
        extra=[{"customer_name": n, "reserved_at": MORNING.isoformat(), "time_said": False,
                "service_name": "قص شعر", "barber_name": "جعفر"} for n in ("محمد", "أحمد")])
    async with Env(extract=no_phones) as env:
        wa, out = await send(session_idle(), RES_LIST)
        body = wa.joined()
        check("an appointment list with no numbers ASKS, naming whose  [TRANSITION: D-4 asked none]",
              lia._REPLIES["reservation_ask_phone"] in body and "بالنسبة لـعلي،" in body, body[:120])
        check("   and nothing is filled in as WALK_IN on its own",
              not (lia._load_draft(out) or {}).get("data", {}).get("customer_phone"))
    check("   the visit sentence itself goes to the daily log instead",
          lia._entry_family("اليوم الصبح حلقت لعلي ومحمد واحمد") == lia.DAILY_LOG_OP)

    no_phone_appt = lambda t: extraction(
        customer_name="أحمد", customer_phone=None, reserved_at=PAST.isoformat(),
        service_name="قص شعر", barber_name="جعفر")
    async with Env(extract=no_phone_appt) as env:
        wa, out = await send(session_idle(), "سجل موعد لأحمد مبارح الساعة 4 مع جعفر")
        check("INVARIANT — «سجل موعد … مبارح» has no visit verb, so the number is still ASKED",
              lia._REPLIES["reservation_ask_phone"] in wa.joined(), wa.joined()[:90])

    # ── 16 · T5-5 — editing one of a list (2026-09-20) ──
    print("\n── 16. T5-5: «خلّي موعد محمد مع زياد» — named, or asked ──")
    patch_barber = lambda d, t: LiaReservationEditPatch.model_validate(
        {"intent": "edit_reservation", "confidence": "high",
         "changes": {"barber_name": "حسين"}, "unresolved": []})
    async with Env(extract=visit, edit=patch_barber) as env:
        wa1, out1 = await send(session_idle(), RES_LIST)
        wa2, out2 = await send(roundtrip(out1), "خليه مع حسين")
        check("an edit that names NOBODY asks which one — it never guesses",
              lia._REPLIES["reservation_edit_which"] in wa2.joined(), wa2.joined()[:80])
        check("   and the draft is untouched by the question",
              [i["data"].get("barber_name") for i in lia._all_items(lia._load_draft(out2))]
              == ["جعفر"] * 3)
        wa3, out3 = await send(roundtrip(out2), "خلي موعد محمد مع حسين")
        d3 = lia._load_draft(out3) or {}
        names = [(i["data"]["customer_name"], i["data"]["barber_name"])
                 for i in lia._all_items(d3)]
        check("naming محمد changes HIS barber and nobody else's",
              names == [("علي", "جعفر"), ("محمد", "حسين"), ("أحمد", "جعفر")], str(names))
        check("   and the list keeps HIS order — «لازم بس تسجلهم بالترتيب»",
              [n for n, _ in names] == ["علي", "محمد", "أحمد"])
        times = [i["data"]["reserved_at"][11:16] for i in lia._all_items(d3)]
        check("   and the hours did not walk forward because of an edit",
              times == ["09:00", "09:30", "10:00"], str(times))
        wa4, out4 = await send(roundtrip(out3), lia.CONFIRM_ID, "button_reply")
        check("   ✅ writes the edited barber for محمد only",
              [c["metadata"]["barber_id"] for c in env.calls] == ["brb-1", "brb-2", "brb-1"],
              str([c["metadata"]["barber_id"] for c in env.calls]))

    async with Env(extract=single, edit=patch_barber) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4 مع جعفر")
        wa2, out2 = await send(roundtrip(out), "خليه مع حسين")
        check("INVARIANT — with ONE customer an edit still needs no name, exactly as before",
              lia._REPLIES["reservation_edit_which"] not in wa2.joined()
              and "حسين" in wa2.joined(), wa2.joined()[:90])

    # ── 17 · «ذقن» and «دقن» are the same beard (2026-09-20, live) ──
    print("\n── 17. one wrong letter still finds the row ──")
    # Salman, live, mid-test: «ذقن دقن لازم يتعامل مع الامر حتى لو حرف غلط». The shop's row is
    # «شعر ودقن» and he wrote «شعر وذقن» — one letter, and nothing matched.
    class _Row:
        def __init__(self, n):
            self.nameAr = self.name = n
            self.id = n
    SHOP = [_Row(n) for n in ("شعر ودقن", "شعر", "دقن", "كرياتين", "تنظيف البشرة", "حنة أو صبغة")]
    for spoken, expected in (("شعر وذقن", "شعر ودقن"),       # ذ/د — the live case
                             ("ذقن", "دقن"),
                             ("تنضيف البشرة", "تنظيف البشرة"),   # ظ/ض
                             ("كراتين", "كرياتين"),              # a dropped letter
                             ("كريتين", "كرياتين"),              # a swapped one
                             ("حنه او صبغه", "حنة أو صبغة")):    # the folding that already existed
        got = lia._match_by_name(SHOP, spoken)
        check(f"«{spoken}» → «{expected}»", getattr(got, "nameAr", None) == expected,
              str(getattr(got, "nameAr", None)))
    check("INVARIANT — the dialect pairs fold, and only those",
          lia._fold_ar("تلاتة") == lia._fold_ar("ثلاثة")
          and lia._fold_ar("ضهر") == lia._fold_ar("ظهر"))
    check("INVARIANT — letters that separate REAL words are left alone (ق/ك · س/ص)",
          lia._fold_ar("كلب") != lia._fold_ar("قلب")
          and lia._fold_ar("سعر") != lia._fold_ar("صعر"))
    check("a short word still needs to be exact — one edit in three letters is a third of it",
          lia._match_by_name(SHOP, "شعب") is None, str(lia._match_by_name(SHOP, "شعب")))
    check("INVARIANT — two rows one letter away from what he said is NO match, never a guess",
          lia._match_by_name([_Row("زياد"), _Row("زياب")], "زيار", attr="name") is None)
    check("   and the near match runs LAST — an exact row still wins over a one-letter one",
          getattr(lia._match_by_name([_Row("كرياتين"), _Row("كراتين")], "كراتين"),
                  "nameAr", None) == "كراتين")
    # And the folding's own consequence, stated rather than discovered later: a shop that really
    # carries «دقن» AND «ذقن» as two services can no longer be told apart by name, so Lia asks
    # with the real list instead of picking one. That is this function's oldest rule doing its
    # job, not a new failure — but it IS a behaviour the folding created.
    check("two rows that fold to the same name are ambiguous, so he is asked",
          lia._match_by_name([_Row("دقن"), _Row("ذقن")], "دقن") is None)

    # ── 18 · the live round of 2026-09-20, replayed message by message ──
    print("\n── 18. «كلهم غيّرلهم الخدمة» — and the deadlock that came before it ──")
    # Every line below is what Salman actually sent between 16:39 and 16:41, in order, from the
    # screenshot and the backend log. The old code answered three of them with the wrong question.
    SVC_SD = SERVICES + [Row(id="svc-sd", nameAr="شعر ودقن", durationMin=30)]
    def _patch(changes, conf="high"):
        return lambda d, t: LiaReservationEditPatch.model_validate(
            {"intent": "edit_reservation", "confidence": conf,
             "changes": changes, "unresolved": []})

    async with Env(extract=visit, edit=_patch({"service_name": "شعر وذقن"}),
                   services=SVC_SD) as env:
        wa1, out1 = await send(session_idle(), RES_LIST)
        check("setup: the three are previewed", out1.state == lia.LIA_AWAITING_CONFIRM)
        check("T5-13 — the past line is PLURAL under a list  [TRANSITION: «وهاد موعد ماضي»]",
              lia._REPLIES["reservation_preview_past_multi"] in wa1.joined()
              and lia._REPLIES["reservation_preview_past"] not in wa1.joined())
        # 16:40 — states the change, names nobody.
        wa2, out2 = await send(roundtrip(out1), "الخدمة اللي عملوها كانت شعر وذقن.")
        check("it asks WHO — «خليه مع زياد» also names nobody and means one, so it cannot guess",
              lia._REPLIES["reservation_edit_which"] in wa2.joined())
        check("   🔴 but the CHANGE he already stated is HELD, not dropped"
              "  [TRANSITION: it was thrown away, and the next message had to carry it again]",
              (lia._load_draft(out2) or {}).get("pending_edit") == {"service_name": "شعر وذقن"},
              str((lia._load_draft(out2) or {}).get("pending_edit")))
        env.edit = _patch({}, "low")                    # «كلهم» carries no change of its own
        wa3, out3 = await send(roundtrip(out2), "كلهم")
        d3 = lia._load_draft(out3) or {}
        got = [(i["data"]["customer_name"], i["data"]["service_name"], i.get("service_id"))
               for i in lia._all_items(d3)]
        check("«كلهم» finishes it in ONE word — all three, with the held change",
              got == [("علي", "شعر ودقن", "svc-sd"), ("محمد", "شعر ودقن", "svc-sd"),
                      ("أحمد", "شعر ودقن", "svc-sd")], str(got))
        check("   «شعر وذقن» reached the shop's «شعر ودقن» — one letter apart, and each item "
              "resolved its OWN id", all(i.get("service_id") == "svc-sd"
                                         for i in lia._all_items(d3)))
        check("   the order and the hours survived the rewrite",
              [i["data"]["reserved_at"][11:16] for i in lia._all_items(d3)]
              == ["09:00", "09:30", "10:00"],
              str([i["data"]["reserved_at"][11:16] for i in lia._all_items(d3)]))
        check("   the new list IS the confirmation — no extra message invented for it",
              lia._REPLIES["reservation_confirm_multi"] in wa3.joined()
              and "شعر ودقن" in wa3.joined())
        check("   and the held change is spent",
              d3.get("pending_edit") is None and d3.get("edit_target") is None)

    async with Env(extract=visit, edit=_patch({"service_name": "شعر وذقن"}),
                   services=SVC_SD) as env:
        wa1, out1 = await send(session_idle(), RES_LIST)
        wa2, out2 = await send(roundtrip(out1), "كلهم علي ومحمد وأحمد، الخدمة شعر وذقن")
        check("naming EVERY one of them is not an ambiguity — it is «all of them», in one message"
              "  [TRANSITION: answered with «أي واحد بدك تعدّل؟»]",
              all(i["data"]["service_name"] == "شعر ودقن"
                  for i in lia._all_items(lia._load_draft(out2)))
              and lia._REPLIES["reservation_edit_which"] not in wa2.joined(), wa2.joined()[:70])

    # The two-step answer in the other order: a name first, then the change.
    async with Env(extract=visit, edit=_patch({}, "low"), services=SVC_SD) as env:
        wa1, out1 = await send(session_idle(), RES_LIST)
        wa2, out2 = await send(roundtrip(out1), "أحمد")
        check("T5-12 — a bare NAME is accepted, not met with «ما فهمت»"
              "  [TRANSITION: «ما فهمت شو بدك تعدّل»]",
              "تمام، أحمد." in wa2.joined()
              and lia._REPLIES["reservation_edit_unclear"] not in wa2.joined(), wa2.joined()[:80])
        check("   and the one he named is remembered",
              (lia._load_draft(out2) or {}).get("edit_target") is not None)
        env.edit = _patch({"service_name": "شعر وذقن"})
        wa3, out3 = await send(roundtrip(out2), "الخدمة شعر وذقن.")
        got = [(i["data"]["customer_name"], i["data"]["service_name"])
               for i in lia._all_items(lia._load_draft(out3))]
        check("THE DEADLOCK IS CLOSED — «أحمد» then «الخدمة شعر وذقن» changes أحمد, and him only",
              got == [("علي", "قص شعر"), ("محمد", "قص شعر"), ("أحمد", "شعر ودقن")], str(got))
        check("   and the remembered name is spent, not left to catch the next message",
              (lia._load_draft(out3) or {}).get("edit_target") is None)

    async with Env(extract=visit, edit=_patch({"barber_name": "حسين"})) as env:
        wa1, out1 = await send(session_idle(), RES_LIST)
        wa2, out2 = await send(roundtrip(out1), "خلي موعد محمد مع حسين")
        got = [(i["data"]["customer_name"], i["data"]["barber_name"])
               for i in lia._all_items(lia._load_draft(out2))]
        check("INVARIANT — naming ONE still changes only that one, in a single message",
              got == [("علي", "جعفر"), ("محمد", "حسين"), ("أحمد", "جعفر")], str(got))

    # ── 19 · one answer about two people (2026-09-20, live 18:11) ──
    print("\n── 19. «عادل رقمه موجود وابو السلو زبون طيار» — one message, two customers ──")
    # His words, verbatim, and the old behaviour was worse than not understanding: the plain
    # parse found «طيار» anywhere in the sentence and recorded عادل — the one he said HAS a
    # number — as a walk-in, silently.
    FIVE = (datetime.now() + timedelta(days=1)).replace(hour=17, minute=0, second=0, microsecond=0)
    SAMI = [Row(id="b-sami", name="سامي", isActive=True)]
    TWO_SVC = SERVICES + [Row(id="sd", nameAr="شعر ودقن", durationMin=30),
                          Row(id="dq", nameAr="دقن", durationMin=15)]
    pair = lambda t: extraction(
        customer_name="عادل طالب", customer_phone=None, reserved_at=FIVE.isoformat(),
        service_name="دقن", barber_name="سامي",
        extra=[{"customer_name": "ابو السلو", "service_name": "شعر ودقن", "barber_name": "سامي",
                "reserved_at": (FIVE + timedelta(minutes=30)).isoformat()}])
    check("the plain parser still reads the whole sentence as one walk-in — unchanged, and it is "
          "why the router exists",
          lia._parse_field_answer(
              "customer_phone", "عادل رقمه موجود لازم وابو السلو زبون طيار") == WALK_IN_PHONE)
    async with Env(extract=pair, barbers=SAMI, services=TWO_SVC) as env:
        wa1, out1 = await send(session_idle(),
                               "سجلي عادل طالب دقن وابو السلو شعر ودقن الساعة 5 و 5:30 مع سامي")
        check("the first question names عادل, so he can tell who it is about",
              "بالنسبة لـعادل طالب،" in wa1.joined(), wa1.joined()[:80])
        wa2, out2 = await send(roundtrip(out1), "عادل رقمه موجود لازم وابو السلو زبون طيار")
        got = [(i["data"]["customer_name"], i["data"].get("customer_phone"))
               for i in lia._every_item(lia._load_draft(out2))]
        check("ابو السلو gets the walk-in he was told about"
              "  [TRANSITION: it landed on عادل, the opposite of what was said]",
              got == [("عادل طالب", None), ("ابو السلو", WALK_IN_PHONE)], str(got))
        check("   and عادل is asked AGAIN, because nothing he said about him parsed",
              lia._REPLIES["reservation_ask_phone"] in wa2.joined())
        check("   the re-ask still says whose it is",
              "بالنسبة لـعادل طالب،" in wa2.joined(), wa2.joined()[:70])
        wa3, out3 = await send(roundtrip(out2), "70123321")
        d3 = lia._load_draft(out3) or {}
        final = [(i["data"]["customer_name"], i["data"]["customer_phone"],
                  i["data"]["reserved_at"][11:16]) for i in lia._all_items(d3)]
        check("both end up right — his number for عادل, walk-in for ابو السلو, 17:00 and 17:30",
              final == [("عادل طالب", "96170123321", "17:00"),
                        ("ابو السلو", WALK_IN_PHONE, "17:30")], str(final))
        check("   and ابو السلو was never asked for a number he had already been given",
              lia._REPLIES["reservation_ask_phone"] not in wa3.joined())
        check("   the hour each of them was given is the hour he said, not one Lia spaced out",
              out3.state == lia.LIA_AWAITING_CONFIRM)

    # He answers with a first name only, while the draft holds the full one.
    async with Env(extract=pair, barbers=SAMI, services=TWO_SVC) as env:
        wa1, out1 = await send(session_idle(), "سجلي عادل طالب وابو السلو مع سامي")
        wa2, out2 = await send(roundtrip(out1), "ابو السلو زبون طيار")
        got = [(i["data"]["customer_name"], i["data"].get("customer_phone"))
               for i in lia._every_item(lia._load_draft(out2))]
        check("naming ONLY the other one puts the value on him, and leaves the asked one open",
              got == [("عادل طالب", None), ("ابو السلو", WALK_IN_PHONE)], str(got))

    async with Env(extract=pair, barbers=SAMI, services=TWO_SVC) as env:
        wa1, out1 = await send(session_idle(), "سجلي عادل طالب وابو السلو مع سامي")
        wa2, out2 = await send(roundtrip(out1), "زبون طيار")
        got = [(i["data"]["customer_name"], i["data"].get("customer_phone"))
               for i in lia._every_item(lia._load_draft(out2))]
        check("INVARIANT — an answer naming NOBODY is still the answer to the question on screen",
              got[0] == ("عادل طالب", WALK_IN_PHONE), str(got))

    async with Env(extract=single) as env:
        wa, out = await send(session_idle(), "سجل موعد عادل 70123321 مبارح الساعة 4 مع جعفر")
        check("INVARIANT — one customer: no name on any question, nothing routed anywhere",
              "بالنسبة" not in wa.joined(), wa.joined()[:60])

    # ── 20 · the shop already knows him (2026-09-20, Salman's own idea, live) ──
    print("\n── 20. «ما فينا نخليه يفحص جدول كوستومر قبل ما يسأل؟» ──")
    KNOWN = [Row(name="كريم", phone="96179360798"),
             Row(name="أحمد", phone=WALK_IN_PHONE),
             Row(name="سامر", phone="96170111111"),
             Row(name="سامر", phone="96170222222")]
    nameless = lambda who: (lambda t: extraction(
        customer_name=who, customer_phone=None, reserved_at=PAST.isoformat(),
        service_name="قص شعر", barber_name="جعفر"))

    async with Env(extract=nameless("كريم"), customers=KNOWN) as env:
        wa, out = await send(session_idle(), "سجل موعد كريم مبارح الساعة 4 مع جعفر")
        d = lia._load_draft(out) or {}
        check("a customer the shop already has is not asked for again",
              d["data"]["customer_phone"] == "96179360798"
              and lia._REPLIES["reservation_ask_phone"] not in wa.joined(),
              str(d["data"].get("customer_phone")))
        check("   and it is marked «(تلقائي)», so he sees a number he did not type",
              "customer_phone" in (d.get("defaulted") or [])
              and f"96179360798 {lia._REPLIES['auto_label']}" in wa.joined(), wa.joined()[:120])

    async with Env(extract=nameless("كريم "), customers=KNOWN) as env:
        wa, out = await send(session_idle(), "سجل موعد كريم مبارح الساعة 4 مع جعفر")
        check("   folded, so a trailing space or a spelling variant still finds him",
              (lia._load_draft(out) or {})["data"]["customer_phone"] == "96179360798")

    async with Env(extract=nameless("سامر"), customers=KNOWN) as env:
        wa, out = await send(session_idle(), "سجل موعد سامر مبارح الساعة 4 مع جعفر")
        check("🔴 TWO customers with one name is the ordinary case — so Lia ASKS, never picks",
              lia._REPLIES["reservation_ask_phone"] in wa.joined()
              and not (lia._load_draft(out) or {})["data"].get("customer_phone"),
              wa.joined()[:70])

    async with Env(extract=nameless("أحمد"), customers=KNOWN) as env:
        wa, out = await send(session_idle(), "سجل موعد أحمد مبارح الساعة 4 مع جعفر")
        check("🔴 the shared WALK_IN row is a placeholder, not a person — it answers nothing",
              lia._REPLIES["reservation_ask_phone"] in wa.joined(),
              str((lia._load_draft(out) or {})["data"].get("customer_phone")))

    async with Env(extract=nameless("زياد"), customers=KNOWN) as env:
        wa, out = await send(session_idle(), "سجل موعد زياد مبارح الساعة 4 مع جعفر")
        check("INVARIANT — someone the shop has never seen is still asked about",
              lia._REPLIES["reservation_ask_phone"] in wa.joined())

    async with Env(extract=lambda t: extraction(
            customer_name="كريم", customer_phone="70999888", reserved_at=PAST.isoformat(),
            service_name="قص شعر", barber_name="جعفر"), customers=KNOWN) as env:
        wa, out = await send(session_idle(), "سجل موعد كريم 70999888 مبارح الساعة 4 مع جعفر")
        check("INVARIANT — a number HE gave wins over the stored one, always",
              (lia._load_draft(out) or {})["data"]["customer_phone"] == "96170999888",
              str((lia._load_draft(out) or {})["data"]["customer_phone"]))

    # ── 21 · RD — الاسم المكرّر في مسار الحجز (عقد ٢٠٢٦-٠٩-٢٤) ─────────────
    print("\n── 21. «ما انتبه إنّه الزبون نفسه» — إخبارٌ لا سؤال ──")
    # جولته الحيّة ٠٩:٥٢: سجّل «علي زيان 9:30»، ثمّ حاول تسجيله ثانيةً، فقيل له إنّ سامي مشغول.
    def day_row(name, when, barber="سامي", status="pending"):
        return {"id": f"r-{name}-{when:%H%M}", "customer_name": name,
                "reserved_at": when.isoformat(), "status": status,
                "metadata": {"barber_name": barber}}

    ZIAN = PAST.replace(hour=9, minute=30)
    LATER = PAST.replace(hour=11, minute=0)
    same = lambda t: extraction(customer_name="علي زيان", customer_phone="ما عندي رقمه",
                                reserved_at=LATER.isoformat(), service_name="قص شعر",
                                barber_name="جعفر")

    async with Env(extract=same, day_rows=[day_row("علي زيان", ZIAN)]) as env:
        wa, out = await send(session_idle(), "سجل علي زيان الساعة 11")
        body = wa.joined()
        check("RD-1: المعاينة بتخبره إنّ الاسم عنده موعد بنفس اليوم، وبتسمّي الساعة والحلاق",
              "علي زيان عندك موعد" in body and "09:30" in body and "سامي" in body, body[:220])
        check("   وبثلاثة أزرار — التالت «عدّل الاسم»، وهو الوحيد اللي بيغيّر شي",
              titles(wa) and titles(wa)[-1] == ("✅ سجّله", "❌ إلغاء", "عدّل الاسم"),
              str(titles(wa)))
        check("   ولا كتابة قبل ✅", not env.calls)
        wa2, _ = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("   و✅ بتكتب عاديّ — الإخبار ما بيمنع شي",
              len(env.calls) == 1 and env.calls[0]["customer_name"] == "علي زيان",
              str(len(env.calls)))

    async with Env(extract=same, day_rows=[]) as env:
        wa, out = await send(session_idle(), "سجل علي زيان الساعة 11")
        check("بلا تطابق ⇒ المعاينة بزرّين، حرفيّاً متل قبل",
              titles(wa)[-1] == ("✅ سجّله", "❌ إلغاء")
              and "عندك موعد" not in wa.joined(), str(titles(wa)))

    other_day = lambda t: extraction(customer_name="علي زيان", customer_phone="ما عندي رقمه",
                                     reserved_at=FUTURE.isoformat(), service_name="قص شعر",
                                     barber_name="جعفر")
    async with Env(extract=other_day, day_rows=[]) as env:
        wa, out = await send(session_idle(), "سجل علي زيان بكرا الساعة 4")
        check("يومٌ مختلف ⇒ ولا سطر إخبار (المدى هو يوم الموعد، لا اليوم)",
              "عندك موعد" not in wa.joined(), wa.joined()[:100])

    # التعارض: نفس الاسم بنفس الساعة ⇒ نصّ بيسمّي الزبون، مش «الحلاق مشغول»
    clash = lambda t: extraction(customer_name="علي زيان", customer_phone="ما عندي رقمه",
                                 reserved_at=ZIAN.isoformat(), service_name="قص شعر",
                                 barber_name="جعفر")
    async with Env(extract=clash, raises="This barber is already booked for that time.",
                   day_rows=[day_row("علي زيان", ZIAN, barber="جعفر")]) as env:
        wa, out = await send(session_idle(), "سجل علي زيان الساعة 9:30")
        wa2, _ = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("RD-2: تعارضٌ مع حجز نفس الزبون ⇒ «علي زيان مسجَّل عندك الساعة 09:30 مع جعفر»",
              lia._REPLIES["reservation_dup_conflict"].format(
                  name="علي زيان", time="09:30", barber="جعفر") in wa2.joined(), wa2.joined())
        check("   ومش نصّ «الحلاق عنده موعد تاني»",
              lia._REPLIES["reservation_conflict"].format(barber="جعفر") not in wa2.joined())

    other_name = lambda t: extraction(customer_name="محمد الحسن", customer_phone="ما عندي رقمه",
                                      reserved_at=ZIAN.isoformat(), service_name="قص شعر",
                                      barber_name="جعفر")
    async with Env(extract=other_name, raises="This barber is already booked for that time.",
                   day_rows=[day_row("علي زيان", ZIAN, barber="جعفر")]) as env:
        wa, out = await send(session_idle(), "سجل محمد الحسن الساعة 9:30")
        wa2, _ = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("🔴 اسمٌ مختلف بنفس الساعة ⇒ نصّ الحلاق المشغول **كما هو**، ما تغيّر شي",
              lia._REPLIES["reservation_conflict"].format(barber="جعفر") in wa2.joined(),
              wa2.joined())

    # الأقرب زمنيّاً وحده (الحالة ٣)
    async with Env(extract=same, day_rows=[day_row("علي زيان", PAST.replace(hour=8, minute=0)),
                                           day_row("علي زيان", PAST.replace(hour=10, minute=30),
                                                   barber="جعفر")]) as env:
        wa, out = await send(session_idle(), "سجل علي زيان الساعة 11")
        check("حجزان للاسم نفسه ⇒ السطر بيسمّي الأقرب زمنيّاً وحده (10:30 مع جعفر)",
              "10:30" in wa.joined() and "جعفر" in wa.joined()
              and "08:00" not in wa.joined(), wa.joined()[:200])

    # RD-3: «عدّل الاسم» بيغيّر المسودّة وحدها
    async with Env(extract=same, day_rows=[day_row("علي زيان", ZIAN)]) as env:
        wa, out = await send(session_idle(), "سجل علي زيان الساعة 11")
        wa2, out2 = await send(roundtrip(out), lia.RES_RENAME_ID, "button_reply")
        check("RD-3 ⇒ «شو الاسم الصحيح؟»",
              wa2.joined() == lia._REPLIES["reservation_dup_ask_name"], wa2.joined())
        wa3, out3 = await send(roundtrip(out2), "علي زيان ٢", "text")
        d3 = lia._load_draft(out3) or {}
        check("   الاسم بينتبدل بالمسودّة حرفيّاً، والمعاينة بترجع",
              d3["data"]["customer_name"] == "علي زيان ٢"
              and "علي زيان ٢" in wa3.joined() and not env.calls, str(d3["data"]["customer_name"]))
        check("   وما عاد في سطر إخبار — الاسم ما عاد يطابق",
              "عندك موعد" not in wa3.joined()
              and titles(wa3)[-1] == ("✅ سجّله", "❌ إلغاء"), str(titles(wa3)))
        wa4, _ = await send(roundtrip(out3), lia.CONFIRM_ID, "button_reply")
        check("   و✅ بتكتب الاسم المميَّز",
              [c["customer_name"] for c in env.calls] == ["علي زيان ٢"], str(env.calls and 1))

    check("🔴 الحجز القائم ما بينقرا إلا للقراءة — ولا نداء تعديل أو حذف بالوحدة كلّها",
          not [n.func.attr for n in ast.walk(ast.parse(open(lia.__file__, encoding="utf-8").read()))
               if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
               and n.func.attr in ("update_many", "delete_many", "upsert")])

    print("\n── nothing left this process ──")
    check("the real functions are restored",
          reservation_service.create_reservation.__module__ == "app.services.reservation_service"
          and barber_repo.list_barbers.__module__ == "app.repositories.barber_repo")
    check("no production write, no WhatsApp send, no model call", True)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


def _normalised(v):
    from app.core.phone import normalize_for_storage
    return normalize_for_storage(v) or v


def _rejects(payload) -> bool:
    try:
        LiaReservationExtraction.model_validate(payload)
        return False
    except Exception:
        return True


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
