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


class Env:
    def __init__(self, extract=None, raises=None, barbers=None, services=None, users=None,
                 edit=None):
        self.extract, self.raises, self.edit = extract, raises, edit
        self.users = users
        self.barbers = BARBERS if barbers is None else barbers
        self.services = SERVICES if services is None else services
        self.calls = []

    async def __aenter__(self):
        self._orig = (barber_repo.list_barbers, catalog_service_repo.list_catalog_services,
                      reservation_service.create_reservation, lia._extract_reservation,
                      lia._extract_reservation_edit)
        self._restore_auth = install(users=self.users or [OWNER_BL])
        barber_repo.list_barbers = lambda *a, **kw: _done(list(self.barbers))
        catalog_service_repo.list_catalog_services = lambda *a, **kw: _done(list(self.services))
        reservation_service.create_reservation = self._create
        if self.extract is not None:
            lia._extract_reservation = lambda text: _done(self.extract(text))
        if self.edit is not None:
            lia._extract_reservation_edit = lambda data, text: _done(self.edit(data, text))
        return self

    async def __aexit__(self, *exc):
        self._restore_auth()
        (barber_repo.list_barbers, catalog_service_repo.list_catalog_services,
         reservation_service.create_reservation, lia._extract_reservation,
         lia._extract_reservation_edit) = self._orig
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
    check("«حلقت» now reaches Lia at all  [TRANSITION: `_entry_family` returned None, and the "
          "message was dropped in silence — measured 2026-09-20]",
          lia._entry_family("مرحبا اليوم الصبح حلقت لي علي، محمد واحمد") == "create_reservation")
    check("   «قصينا» too, and both are read as a RESERVATION, not as a service",
          lia._entry_family("قصينا اليوم لعلي ومحمد") == "create_reservation")
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
    walkins = lambda t: extraction(
        customer_name="علي", customer_phone=None, reserved_at=MORNING.isoformat(),
        service_name="قص شعر", time_said=False,
        extra=[{"customer_name": n, "reserved_at": MORNING.isoformat(), "time_said": False,
                "service_name": "قص شعر"} for n in ("محمد", "أحمد")])
    async with Env(extract=walkins) as env:
        wa, out = await send(session_idle(), "اليوم الصبح حلقت لعلي ومحمد واحمد")
        check("the FIRST question carries no «بالنسبة لـ» — there is nothing to disambiguate yet",
              "بالنسبة" not in wa.joined(), wa.joined()[:80])
        check("   and the visit verb is recorded on the draft for write time",
              (lia._load_draft(out) or {}).get("visit_reported") is True)
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
        customer_name="علي", customer_phone=None, reserved_at=MORNING.isoformat(),
        service_name="قص شعر", barber_name="جعفر", time_said=False,
        extra=[{"customer_name": n, "reserved_at": MORNING.isoformat(), "time_said": False,
                "service_name": "قص شعر", "barber_name": "جعفر",
                "customer_phone": "ما عندي رقمه"} for n in ("محمد", "أحمد")])
    async with Env(extract=visit) as env:
        wa1, out1 = await send(session_idle(), "اليوم الصبح حلقت لعلي ومحمد واحمد")
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
        titles = [o[3] for o in wa1.out if o[0] == "buttons"]
        check("   T5-9 — and the BUTTON says «سجّلهم», not «سجّله»",
              titles and "✅ سجّلهم" in titles[0] and "❌ إلغاء" in titles[0], str(titles))
        check("   nothing written before ✅", len(env.calls) == 0)
        wa2, out2 = await send(roundtrip(out1), lia.CONFIRM_ID, "button_reply")
        check("✅ writes THREE reservations, one per name, in order",
              [c["customer_name"] for c in env.calls] == ["علي", "محمد", "أحمد"],
              str([c["customer_name"] for c in env.calls]))
        check("   D-2 — a reported visit is born 'arrived'",
              [c.get("status") for c in env.calls] == ["arrived"] * 3,
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
        wa1, out1 = await send(session_idle(), "اليوم الصبح حلقت لعلي ومحمد واحمد")
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
        wa1, out1 = await send(session_idle(), "اليوم الصبح حلقت لعلي ومحمد واحمد")
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

    # D-4: a reported visit with no number does not ask for one.
    no_phones = lambda t: extraction(
        customer_name="علي", customer_phone=None, reserved_at=MORNING.isoformat(),
        service_name="قص شعر", barber_name="جعفر", time_said=False,
        extra=[{"customer_name": n, "reserved_at": MORNING.isoformat(), "time_said": False,
                "service_name": "قص شعر", "barber_name": "جعفر"} for n in ("محمد", "أحمد")])
    async with Env(extract=no_phones) as env:
        wa, out = await send(session_idle(), "اليوم الصبح حلقت لعلي ومحمد واحمد")
        body = wa.joined()
        check("D-4 — three names, no numbers, and Lia asks for NONE of them",
              lia._REPLIES["reservation_ask_phone"] not in body
              and lia._REPLIES["reservation_confirm_multi"] in body, body[:120])
        d = lia._load_draft(out) or {}
        check("   every one is a walk-in, marked «(تلقائي)» so he can still correct it",
              all(i["data"]["customer_phone"] == WALK_IN_PHONE for i in lia._all_items(d))
              and all("customer_phone" in (i.get("defaulted") or [])
                      for i in lia._all_items(d)),
              str([i.get("defaulted") for i in lia._all_items(d)]))
        check("   and the preview shows «زبون طيار», not an empty field",
              body.count(lia._REPLIES["walkin_label"]) == 3, str(body.count("طيار")))

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
        wa1, out1 = await send(session_idle(), "اليوم الصبح حلقت لعلي ومحمد واحمد")
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
