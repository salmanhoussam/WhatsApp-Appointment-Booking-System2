"""Lia — the daily completed log and «تقرير اليوم». 2026-09-21.

Run:  venv/bin/python scripts/test_lia_daily_log.py

WHY THIS EXISTS. Hussein, the owner of `rk`, tested Lia from his own number on 2026-09-21 and the
round failed for a reason that was not understanding: Lia read him correctly every time and then
forced his need through the reservation flow -- a phone for every name, an exact service, and a
refusal because `rk` is closed on Mondays. What he wants is a CASH LOG: «علي 10، محمد 7، أحمد 5»,
then a report at the end of the day. Plan (every decision approved by Salman):
.claudedocs/plans/lia-daily-cash-log-and-mobile-landing.md.

THE SERVER ENFORCES THE INVARIANTS, NOT THE MODEL. Every one of them is asserted here with a model
answer that tries to break it: more than fifteen names, an amount the owner never wrote, a service
that is not on the shop's list, a Monday the shop is closed.

NO NETWORK, NO DATABASE, NO MODEL CALL, NO SEND, NO WRITE. `try_handle`, `_advance`, `_commit`
and the real schemas run. The extraction, the repository reads and `create_reservation` are
recorded. Where a claim is about what the SERVICE does with Lia's arguments (working hours, the
merchant alert, the overlap check), Lia's own recorded keyword arguments are REPLAYED through the
real `create_reservation` -- a recorder alone can only prove what was asked, not what it causes.
"""
import ast
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from app.services import lia_owner_entry as lia                      # noqa: E402
from app.services import lia_operations as ops                       # noqa: E402
from app.services import reservation_service                         # noqa: E402
from app.repositories import barber_repo, catalog_service_repo       # noqa: E402
from app.repositories.reservation_repo import ReservationRepository  # noqa: E402
from app.schemas.lia_drafts import LiaDailyLogExtraction, WALK_IN_PHONE   # noqa: E402
from test_lia_foundation import BL, FakeUser, install                # noqa: E402
from test_lia_reservation_t4 import Wa, roundtrip, session_idle      # noqa: E402
import test_lia_reservation_t1 as t1                                 # noqa: E402

ok = True
PHONE = "96178727986"
REAL_CREATE = reservation_service.create_reservation


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


def owner(barber_id="brb-1"):
    u = FakeUser("u-bl", BL)
    u.barberId, u.fullName = barber_id, "حسين رقا"
    return u


def staff(barber_id):
    """A legacy STAFF account: scope 'self', exactly like a barber's own login."""
    u = FakeUser("u-staff", BL, role="STAFF")
    u.barberId, u.fullName = barber_id, "جعفر"
    return u


BARBERS = [Row(id="brb-1", name="حسين", isActive=True),
           Row(id="brb-2", name="جعفر", isActive=True)]
SERVICES = [Row(id="svc-hair", nameAr="شعر", durationMin=20, price=5),
            Row(id="svc-beard", nameAr="دقن", durationMin=15, price=4),
            Row(id="svc-both", nameAr="شعر ودقن", durationMin=30, price=7)]


def log(*items, confidence="high", period=None):
    """A REAL extraction built from real values: (name, amount, service_said) per line."""
    return LiaDailyLogExtraction.model_validate({
        "intent": "log_daily_visits", "confidence": confidence, "period": period,
        "items": [{"customer_name": n, "amount": a, "service_said": s} for n, a, s in items]})


class Env:
    def __init__(self, extract=None, users=None, busy=None, report_rows=None, fail_on=None):
        self.extract = extract
        self.users = users if users is not None else [owner()]
        self.busy = busy or []
        self.report_rows = report_rows or []
        self.fail_on = fail_on or set()
        self.calls, self.list_calls, self.report_calls = [], [], []

    async def __aenter__(self):
        self._orig = (barber_repo.list_barbers, catalog_service_repo.list_catalog_services,
                      reservation_service.create_reservation, reservation_service.list_reservations,
                      lia._extract_daily_log, lia._tenant_currency,
                      ReservationRepository.list_by_client)
        self._restore = install(users=self.users)
        barber_repo.list_barbers = lambda *a, **kw: _done(list(BARBERS))
        catalog_service_repo.list_catalog_services = lambda *a, **kw: _done(list(SERVICES))
        reservation_service.create_reservation = self._create
        reservation_service.list_reservations = self._list
        if self.extract is not None:
            lia._extract_daily_log = lambda text: _done(self.extract(text))
        lia._tenant_currency = lambda cid: _done("USD")
        env = self

        async def _report(self_repo, *a, **kw):
            env.report_calls.append(a)
            return list(env.report_rows)
        ReservationRepository.list_by_client = _report
        return self

    async def __aexit__(self, *exc):
        self._restore()
        (barber_repo.list_barbers, catalog_service_repo.list_catalog_services,
         reservation_service.create_reservation, reservation_service.list_reservations,
         lia._extract_daily_log, lia._tenant_currency,
         ReservationRepository.list_by_client) = self._orig
        return False

    async def _create(self, **kw):
        self.calls.append(kw)
        if kw.get("customer_name") in self.fail_on:
            raise ValueError("This barber is already booked for that time.")
        return {"id": f"res-{len(self.calls)}", "status": kw.get("status")}

    async def _list(self, **kw):
        self.list_calls.append(kw)
        return list(self.busy)


async def send(session, text, msg_type="text"):
    wa = Wa()
    out = await lia.try_handle(wa, PHONE, session, msg_type, text, text,
                               lambda: _done(session or session_idle()))
    return wa, out


def titles(wa):
    return [o[3] for o in wa.out if o[0] == "buttons"]


def _weekday(target: int, forward: bool):
    d = datetime.now().replace(hour=11, minute=0, second=0, microsecond=0)
    while d.weekday() != target:
        d += timedelta(days=1 if forward else -1)
    return d


async def replay(kw, reserved_at=None, existing=None):
    """Lia's OWN recorded arguments, through the REAL `create_reservation` (faked Prisma/sends)."""
    args = dict(kw)
    if reserved_at is not None:
        args["reserved_at"] = reserved_at
    args["client_id"] = t1.CLIENT
    args["metadata"] = {**(args.get("metadata") or {}), "barber_id": t1.BARBER}
    args["metadata"].pop("service_id", None)
    prisma, sends, restore = t1.install(t1.WORKING_HOURS, existing)
    try:
        row = await REAL_CREATE(**args)
        await t1._drain()
        return row, prisma, sends, None
    except Exception as exc:                  # noqa: BLE001 — the refusal IS the measurement
        await t1._drain()
        return None, prisma, sends, exc
    finally:
        restore()


async def main():
    OP = ops.get("log_daily_visits")
    REP = ops.get("daily_report")
    RES = ops.get("create_reservation")

    # ── 0 · the two operations ───────────────────────────────────────────────
    print("── 0. two operations, and neither is a new write path ──")
    check("log_daily_visits is registered with the reservation's own gate and permission",
          OP is not None and OP.permission == RES.permission == "reservations.write"
          and OP.legacy_roles == RES.legacy_roles and OP.service_key == "reservations")
    check("   and writes through the SAME service function as a reservation",
          OP.write_fn() is REAL_CREATE and RES.write_fn() is REAL_CREATE)
    check("daily_report is a READ: reservations.read, the GET route's own tuple",
          REP is not None and REP.permission == "reservations.read"
          and REP.legacy_roles == RES.legacy_roles and REP.write_fn() is ReservationRepository)
    check("the cap is one named constant, and it is 15",
          lia.MAX_DAILY_LOG_ITEMS == 15)

    # ── 1 · the gate ─────────────────────────────────────────────────────────
    print("\n── 1. the gate: a cash line and a report carry no verb ──")
    for msg, want in (
        ("علي 10، محمد 7، أحمد 5", lia.DAILY_LOG_OP),
        ("علي ١٠، محمد ٧", lia.DAILY_LOG_OP),
        ("علي شعر 10، محمد دقن 7", lia.DAILY_LOG_OP),
        ("علي حلاقة 10", lia.DAILY_LOG_OP),
        ("علي 10 دولار، محمد 7 دولار", lia.DAILY_LOG_OP),
        ("اليوم حلقت لعلي بـ10", lia.DAILY_LOG_OP),
        ("علي 10، محمد", lia.DAILY_LOG_OP),
        ("تقرير اليوم", lia.DAILY_REPORT_OP),
        ("سجل موعد لأحمد مبارح الساعة 4", "create_reservation"),
        ("ضيف خدمة قص شعر 10 دولار ونص ساعة", "create_service"),
        ("dif mantoj shampoo b 12 dollar", "create_product"),
    ):
        check(f"{msg!r:40} -> {want}", lia._entry_family(msg) == want, repr(lia._entry_family(msg)))
    for msg in ("70123456", "علي 70123456", "2", "بدي احجز موعد بكرا", "عندك محل الساعة 4:30",
                "مرحبا", "bade 7le2a bokra", "bade e7jaz da8n"):
        check(f"{msg!r:40} -> None  (a phone, a menu digit, a customer)",
              lia._entry_family(msg) is None, repr(lia._entry_family(msg)))
    check("«عملتله» is NOT a visit verb — D-A kept exactly four",
          lia._VISIT_VERBS == ("حلقت", "حلقنا", "قصيت", "قصينا"))

    async with Env(extract=lambda t: log(("علي", 10, None)), users=[]) as env:
        wa, out = await send(session_idle(), "علي 10")
        check("test 12 — a sender who is NOT an owner falls through to the customer flow",
              out is None and not wa.out and not env.calls, f"out={out!r} sent={len(wa.out)}")

    # ── 2 · test 1 — the list ────────────────────────────────────────────────
    print("\n── 2. «علي 10، محمد 7، أحمد 5» — one preview, one ✅, three lines ──")
    three = lambda t: log(("علي", 10, None), ("محمد", 7, None), ("أحمد", 5, None))
    async with Env(extract=three) as env:
        wa, out = await send(session_idle(), "علي 10، محمد 7، أحمد 5")
        body = wa.joined()
        check("nothing written before ✅", not env.calls)
        check("NO phone question — not for any of the three",
              lia._REPLIES["reservation_ask_phone"] not in body, body[:80])
        check("DL-1, then the three lines in his order", lia._REPLIES["daily_log_preview"] in body
              and all(f"*{n}.* {who} · {amt} USD" in body
                      for n, who, amt in ((1, "علي", 10), (2, "محمد", 7), (3, "أحمد", 5))),
              body[:200])
        # TRANSITION 2026-09-23. This asserted «DL-4 the total, DL-5 the approximate hours» and
        # required `_REPLIES["daily_log_time_approx"]` ("الساعات بالتقويم تقريبيّة.") to be in the
        # body. Salman deleted that line after seeing it live, so the key no longer exists at all
        # and the preview now ENDS at the total.
        check("   DL-4 the total, and NO line about the calendar's hours",
              "المجموع: 22 USD" in body and "daily_log_time_approx" not in lia._REPLIES
              and "تقريبيّة" not in body, body[-120:])
        check("   DL-6 with «✅ سجّلهم» / «❌ إلغاء»",
              lia._REPLIES["reservation_confirm_multi"] in body
              and titles(wa) and titles(wa)[0] == ("✅ سجّلهم", "❌ إلغاء"), str(titles(wa)))
        check("   parked on the confirmation", out.state == lia.LIA_AWAITING_CONFIRM)
        wa2, out2 = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("✅ writes three lines, in order",
              [c["customer_name"] for c in env.calls] == ["علي", "محمد", "أحمد"],
              str([c["customer_name"] for c in env.calls]))
        kw = env.calls[0] if env.calls else {}
        check("🔴 status='arrived' — owner-reported completed work, no further confirmation",
              all(c["status"] == "arrived" for c in env.calls))
        check("🔴 allow_past=True · notify_merchant=False · enforce_working_hours=False",
              all(c["allow_past"] is True and c["notify_merchant"] is False
                  and c["enforce_working_hours"] is False for c in env.calls))
        check("   source='lia', module='barber', the phone is the shared walk-in (D-D)",
              all(c["source"] == "lia" and c["module_key"] == "barber"
                  and c["customer_phone"] == WALK_IN_PHONE for c in env.calls))
        check("   the barber is the talking account's own, on every line",
              all(c["metadata"]["barber_id"] == "brb-1" for c in env.calls))
        check("D-B — metadata.daily_log is exactly {v, amount, currency, service_said}",
              kw.get("metadata", {}).get("daily_log") == {"v": 1, "amount": "10",
                                                         "currency": "USD", "service_said": None},
              str(kw.get("metadata")))
        check("   amounts are strings, never floats", [c["metadata"]["daily_log"]["amount"]
                                                       for c in env.calls] == ["10", "7", "5"])
        # TRANSITION 2026-09-23. This compared the reply to the raw key, whose value was the
        # fixed sentence «تم تسجيل زباين اليوم.». Salman asked for the day and the date instead,
        # so the key is now a TEMPLATE and the value is «تسجّلت {weekday} {date}.» -- and the day
        # named is the day the ROWS carry, read back from the write call itself.
        import datetime as _dt
        _when = env.calls[0]["reserved_at"] if env.calls else _dt.datetime.now()
        _expected = lia._REPLIES["daily_log_created"].format(
            weekday=lia._WEEKDAYS[_when.weekday()],
            date=f"{_when.day:02d}/{_when.month:02d}/{_when.year}")
        check("DL-7, once, naming the day and the date of the rows",
              wa2.joined() == _expected, f"{wa2.joined()!r} != {_expected!r}")
        check("   and that date is TODAY, in the shop's own clock",
              _when.date() == _dt.datetime.now().date(), str(_when))
        check("   and the draft is consumed", lia._load_draft(out2) is None and out2.state == "IDLE")

    # ── 3 · test 2 — services per line ───────────────────────────────────────
    print("\n── 3. «علي شعر 10، محمد دقن 7» — the service is captured per line ──")
    async with Env(extract=lambda t: log(("علي", 10, "شعر"), ("محمد", 7, "دقن"))) as env:
        wa, out = await send(session_idle(), "علي شعر 10، محمد دقن 7")
        check("the preview shows the SHOP's service names",
              "*1.* علي · شعر · 10 USD" in wa.joined() and "*2.* محمد · دقن · 7 USD" in wa.joined(),
              wa.joined()[:160])
        await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("each line carries its own service_id",
              [c["metadata"].get("service_id") for c in env.calls] == ["svc-hair", "svc-beard"])
        check("   and service_said is null when the service matched",
              all(c["metadata"]["daily_log"]["service_said"] is None for c in env.calls))
        check("   the duration is the service's own (20, 15)",
              [c["duration_min"] for c in env.calls] == [20, 15])

    # ── 4 · test 3 — an unmatched service ────────────────────────────────────
    print("\n── 4. «علي حلاقة 10» — a word that is not on the list does not block the line ──")
    async with Env(extract=lambda t: log(("علي", 10, "حلاقة"))) as env:
        wa, out = await send(session_idle(), "علي حلاقة 10")
        check("DL-3 in the preview, and no question asked",
              "*1.* علي · حلاقة (مش من خدماتك) · 10 USD" in wa.joined()
              and out.state == lia.LIA_AWAITING_CONFIRM, wa.joined()[:120])
        check("   one line → the singular button, «✅ سجّله»",
              titles(wa) and titles(wa)[0] == ("✅ سجّله", "❌ إلغاء"), str(titles(wa)))
        await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        c = env.calls[0] if env.calls else {}
        check("written anyway — no service_id, his word kept as service_said",
              "service_id" not in c.get("metadata", {})
              and c.get("metadata", {}).get("daily_log", {}).get("service_said") == "حلاقة",
              str(c.get("metadata")))
        check("   no service invented, and the platform default duration (30)",
              c.get("duration_min") == 30)

    # ── 5 · test 4 — a Monday the shop is closed ─────────────────────────────
    print("\n── 5. a Monday, closed_days=['monday'] — the SERVICE does not refuse ──")
    async with Env(extract=lambda t: log(("علي", 10, None))) as env:
        wa, out = await send(session_idle(), "علي 10")
        await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        lia_kw = env.calls[0]
    monday_past = _weekday(0, forward=False).replace(tzinfo=timezone.utc)
    monday_future = _weekday(0, forward=True).replace(tzinfo=timezone.utc)
    for label, when in (("a past Monday", monday_past), ("a future Monday", monday_future)):
        row, prisma, sends, exc = await replay(lia_kw, reserved_at=when)
        made = prisma.reservation.created[0] if prisma.reservation.created else {}
        check(f"{label}: Lia's own arguments are accepted by the REAL service",
              exc is None and made.get("status") == "arrived", f"{exc!r}")
        check("   and no «حجز جديد» reaches the merchant", not sends.calls, str(sends.calls))
    row, prisma, sends, exc = await replay({**lia_kw, "enforce_working_hours": True},
                                           reserved_at=monday_future)
    check("CONTROL — the same line WITH working hours enforced is refused on that Monday",
          exc is not None and "closed" in str(exc), repr(exc))

    # ── 6 · test 5 — the cap ─────────────────────────────────────────────────
    print("\n── 6. sixteen names: refused before any write — never «the first fifteen» ──")
    # Real names, no digits inside them: «زبون1» would put a number INSIDE a name, and the shape
    # check rightly refuses that (my first fixture did exactly this).
    names = ["علي", "محمد", "أحمد", "خالد", "عمر", "حسن", "سامي", "زياد", "كريم", "فادي",
             "رامي", "وليد", "طارق", "مازن", "جاد", "نبيل"]
    text16 = "، ".join(f"{n} {i}" for i, n in enumerate(names, 1))
    async with Env(extract=lambda t: log(*[(n, i, None) for i, n in enumerate(names, 1)])) as env:
        wa, out = await send(session_idle(), text16)
        check("16 → ZERO writes, and no draft", not env.calls and lia._load_draft(out) is None)
        check("   DL-10, with the real count and the named cap",
              wa.joined() == lia._REPLIES["daily_log_too_many"].format(count=16, max=15),
              wa.joined())
    fifteen = names[:15]
    text15 = "، ".join(f"{n} {i}" for i, n in enumerate(fifteen, 1))
    async with Env(extract=lambda t: log(*[(n, i, None) for i, n in enumerate(fifteen, 1)])) as env:
        wa, out = await send(session_idle(), text15)
        await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("exactly 15 → accepted, fifteen lines written", len(env.calls) == 15,
              str(len(env.calls)))

    # ── 7 · test 6 — a missing amount ────────────────────────────────────────
    print("\n── 7. «علي 10، محمد» — the missing amount is ASKED, never invented ──")
    async with Env(extract=lambda t: log(("علي", 10, None), ("محمد", None, "شعر"))) as env:
        wa, out = await send(session_idle(), "علي 10، محمد شعر")
        check("DL-9 names him, nothing is written",
              lia._REPLIES["daily_log_ask_amount"].format(names="محمد") in wa.joined()
              and not env.calls and out.state == lia.LIA_AWAITING_FIELD, wa.joined())
        check("   and the service PRICE (5) is not used as his amount",
              [i["amount"] for i in lia._load_draft(out)["items"]] == ["10", None])
        wa2, out2 = await send(roundtrip(out), "7")
        check("his answer fills it, and the preview follows",
              "*2.* محمد · شعر · 7 USD" in wa2.joined()
              and out2.state == lia.LIA_AWAITING_CONFIRM, wa2.joined()[:160])
        wa3, _ = await send(roundtrip(out2), "ما بعرف")
        check("   (a typed answer at the preview re-shows DL-6 and its buttons — nothing guessed)",
              lia._REPLIES["reservation_confirm_multi"] in wa3.joined() and not env.calls)

    async with Env(extract=lambda t: log(("علي", 12, None), ("محمد", 7, None))) as env:
        wa, out = await send(session_idle(), "علي 10، محمد 7")
        check("test 6b — the model says 12, he wrote 10: treated as MISSING, then asked",
              lia._REPLIES["daily_log_ask_amount"].format(names="علي") in wa.joined(),
              wa.joined())
        check("   nothing written", not env.calls)

    async with Env(extract=lambda t: log(("علي", None, None), ("محمد", None, None),
                                         ("أحمد", 5, None))) as env:
        wa, out = await send(session_idle(), "حلقت لعلي ومحمد وأحمد بـ5")
        check("two missing → one question naming both", lia._REPLIES["daily_log_ask_amount"]
              .format(names="علي، محمد") in wa.joined(), wa.joined())
        wa2, out2 = await send(roundtrip(out), "محمد 7 وعلي 10")
        amounts = [i["amount"] for i in (lia._load_draft(out2) or {}).get("items", [])]
        check("   «محمد 7 وعلي 10» lands each number on the name he put it next to",
              amounts == ["10", "7", "5"], str(amounts))
        wa3, out3 = await send(roundtrip(out), "ما بعرف")
        check("   an answer with no number re-asks, and writes nothing",
              lia._REPLIES["daily_log_ask_amount"].format(names="علي، محمد") in wa3.joined()
              and not env.calls)

    # ── 8 · test 7 — an appointment stays an appointment ─────────────────────
    print("\n── 8. «سجل موعد لأحمد مبارح الساعة 4» stays a reservation ──")
    check("the gate still names create_reservation",
          lia._entry_family("سجل موعد لأحمد مبارح الساعة 4") == "create_reservation")
    src = open(lia.__file__, encoding="utf-8").read()
    check("and the reservation flow no longer carries a visit branch (no `visit_reported`)",
          "visit_reported" not in [n.value for n in ast.walk(ast.parse(src))
                                   if isinstance(n, ast.Constant) and isinstance(n.value, str)])

    # ── 9 · test 8 — the visit verb ──────────────────────────────────────────
    print("\n── 9. «اليوم حلقت لعلي بـ10» — arrived, with no extra confirmation ──")
    async with Env(extract=lambda t: log(("علي", 10, None), period="morning")) as env:
        wa, out = await send(session_idle(), "اليوم الصبح حلقت لعلي بـ10")
        check("the preview is the only step before ✅",
              out.state == lia.LIA_AWAITING_CONFIRM and not env.calls)
        await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("✅ writes it 'arrived', straight away",
              len(env.calls) == 1 and env.calls[0]["status"] == "arrived")
        check("   placed from the morning's start (09:00)",
              env.calls and env.calls[0]["reserved_at"].strftime("%H:%M") == "09:00",
              str(env.calls and env.calls[0]["reserved_at"]))

    # ── 10 · test 9 — the report ─────────────────────────────────────────────
    print("\n── 10. «تقرير اليوم» — the daily-log lines, and only those ──")
    dl = lambda amount, said=None, v=1: {"barber_id": "brb-1",
                                         "daily_log": {"v": v, "amount": amount,
                                                       "currency": "USD", "service_said": said}}
    rows = [
        Row(source="lia", status="arrived", customerName="علي", serviceId="svc-hair",
            metadata=dl("10")),
        Row(source="lia", status="arrived", customerName="محمد", serviceId=None,
            metadata=dl("7", "حلاقة")),
        # 🔴 forged: the website route accepts any metadata dict — its source is the server's
        Row(source="website", status="arrived", customerName="مزوّر", serviceId=None,
            metadata=dl("999")),
        Row(source="admin", status="arrived", customerName="مزوّر٢", serviceId=None,
            metadata=dl("999")),
        Row(source="lia", status="pending", customerName="موعد", serviceId=None, metadata=dl("5")),
        Row(source="lia", status="arrived", customerName="بلا مبلغ", serviceId=None,
            metadata={"barber_id": "brb-1"}),
        Row(source="lia", status="arrived", customerName="نسخة ٢", serviceId=None,
            metadata=dl("5", v=2)),
    ]
    async with Env(report_rows=rows) as env:
        wa, out = await send(session_idle(), "تقرير اليوم")
        body = wa.joined()
        check("DL-13, then only the two real lines, DL-3 on the unmatched one",
              body.startswith(lia._REPLIES["daily_report_header"].split("{")[0])
              and "*1.* علي · شعر · 10 USD" in body
              and "*2.* محمد · حلاقة (مش من خدماتك) · 7 USD" in body, body)
        check("   DL-14 — the total and the count", "المجموع: 17 USD · 2 زبون" in body, body[-40:])
        check("🔴 website / dashboard rows carrying a forged daily_log are EXCLUDED",
              "مزوّر" not in body and "999" not in body)
        check("   a pending row, a row with no daily_log, and a v2 row are excluded",
              "موعد" not in body and "بلا مبلغ" not in body and "نسخة" not in body)
        check("   the report writes nothing and opens no draft",
              not env.calls and lia._load_draft(out) is None)
        check("   an owner's report is not barber-scoped",
              env.report_calls and env.report_calls[0][6] is None, str(env.report_calls))
    async with Env(report_rows=[]) as env:
        wa, _ = await send(session_idle(), "تقرير اليوم")
        check("nothing today → DL-15", wa.joined() == lia._REPLIES["daily_report_empty"])
    async with Env(report_rows=rows, users=[staff("brb-2")]) as env:
        wa, _ = await send(session_idle(), "تقرير")
        check("test 9c — a self-scoped barber's report is filtered to HIS barber at the query",
              env.report_calls and env.report_calls[0][6] == "brb-2", str(env.report_calls))
    async with Env(report_rows=rows, users=[staff(None)]) as env:
        wa, _ = await send(session_idle(), "تقرير")
        check("   and one with no linked barber gets nothing — fail closed, like the route",
              not wa.out and not env.report_calls)

    # ── 11 · collision respected ─────────────────────────────────────────────
    print("\n── 11. the barber's real bookings are placed around, never overwritten ──")
    today = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
    busy = [{"reserved_at": today.replace(tzinfo=timezone.utc).isoformat(), "duration_min": 30,
             "status": "confirmed"},
            {"reserved_at": today.replace(hour=10, minute=0, tzinfo=timezone.utc).isoformat(),
             "duration_min": 30, "status": "cancelled"}]
    async with Env(extract=lambda t: log(("علي", 10, None), ("محمد", 7, None)), busy=busy) as env:
        wa, out = await send(session_idle(), "علي 10، محمد 7")
        await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        starts = [c["reserved_at"].strftime("%H:%M") for c in env.calls]
        check("a 09:00 booking pushes the two lines to 09:30 and 10:00", starts == ["09:30", "10:00"],
              str(starts))
        check("   a CANCELLED row at 10:00 does not block its slot — the second line takes it",
              len(starts) == 2 and starts[1] == "10:00", str(starts))
        check("   the barber's day was read for exactly this barber, today",
              env.list_calls and env.list_calls[0]["barber_id"] == "brb-1", str(env.list_calls))
        placed = env.calls[0]
    existing = [t1.Row(reservedAt=today.replace(tzinfo=timezone.utc), durationMin=30,
                       status="confirmed")]
    row, prisma, sends, exc = await replay(placed, existing=existing)
    check("the REAL service accepts the placed line next to that booking", exc is None, repr(exc))
    row, prisma, sends, exc = await replay(placed, reserved_at=today.replace(tzinfo=timezone.utc),
                                           existing=existing)
    check("CONTROL — the same line ON the booking is refused: the overlap check still runs",
          exc is not None and "already booked" in str(exc), repr(exc))

    # ── 12 · the barber ──────────────────────────────────────────────────────
    print("\n── 12. no linked barber: asked, with buttons — never guessed ──")
    async with Env(extract=lambda t: log(("علي", 10, None)), users=[owner(None)]) as env:
        wa, out = await send(session_idle(), "علي 10")
        check("an unlinked owner is asked for the barber, with the shop's barbers as buttons",
              out.state == lia.LIA_AWAITING_FIELD and titles(wa)
              and titles(wa)[0] == ("حسين", "جعفر"), str(titles(wa)))
        wa2, out2 = await send(roundtrip(out), f"{lia.BARBER_PICK_PREFIX}brb-2", "button_reply")
        check("   a tap resolves the barber and the preview follows",
              out2.state == lia.LIA_AWAITING_CONFIRM, str(out2.state))
        await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        check("   and the line is written for the tapped barber",
              env.calls and env.calls[0]["metadata"]["barber_id"] == "brb-2")
    async with Env(extract=lambda t: log(("علي", 10, None)), users=[staff(None)]) as env:
        wa, out = await send(session_idle(), "علي 10")
        check("a self-scoped barber with no link is refused — never offered someone else",
              not titles(wa) and not env.calls and lia._load_draft(out) is None,
              wa.joined()[:60])
    async with Env(extract=lambda t: log(("علي", 10, None)), users=[staff("brb-2")]) as env:
        wa, out = await send(session_idle(), "علي 10")
        await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("   and a linked one writes for HIS barber", env.calls
              and env.calls[0]["metadata"]["barber_id"] == "brb-2")

    # ── 13 · cancel, expiry, partial ─────────────────────────────────────────
    print("\n── 13. cancel · expiry · a line that fails ──")
    async with Env(extract=three) as env:
        wa, out = await send(session_idle(), "علي 10، محمد 7، أحمد 5")
        wa2, out2 = await send(roundtrip(out), lia.CANCEL_ID, "button_reply")
        check("❌ → DL-11, nothing written",
              wa2.joined() == lia._REPLIES["daily_log_cancelled"] and not env.calls)
    async with Env(extract=three) as env:
        wa, out = await send(session_idle(), "علي 10، محمد 7، أحمد 5")
        stale = roundtrip(out)
        stale.lia[lia.DRAFT_KEY]["started_at"] = (
            datetime.now(timezone.utc) - timedelta(minutes=lia.DRAFT_WINDOW_MIN + 1)).isoformat()
        wa2, out2 = await send(stale, lia.CONFIRM_ID, "button_reply")
        check("an aged-out draft → DL-12, NOT «انتهت صلاحية تسجيل المواعيد»",
              wa2.joined() == lia._REPLIES["daily_log_expired"] and not env.calls, wa2.joined())
    async with Env(extract=three, fail_on={"محمد"}) as env:
        wa, out = await send(session_idle(), "علي 10، محمد 7، أحمد 5")
        wa2, _ = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        said = wa2.joined()
        check("one line fails → DL-8 names who was recorded and who was not",
              said.startswith("سجّلت: علي، أحمد.") and "ما زبط: محمد." in said, said)
        check("   no rollback — three attempts", len(env.calls) == 3)
        check("   and no raw error reaches him", "already booked" not in said)

    # ── 14 · no model, and a plain list still works ──────────────────────────
    print("\n── 14. the model unavailable ──")
    async with Env(extract=lambda t: lia._UNAVAILABLE) as env:
        wa, out = await send(session_idle(), "علي 10، محمد 7")
        check("the plain «name amount» shape is read without the model",
              out.state == lia.LIA_AWAITING_CONFIRM and "*2.* محمد · 7 USD" in wa.joined(),
              wa.joined()[:120])
    async with Env(extract=lambda t: lia._UNAVAILABLE) as env:
        wa, out = await send(session_idle(), "اليوم حلقت لعلي ومحمد")
        check("a visit SENTENCE has no shape to fall back on → not handled here (open item G1)",
              out is None and not wa.out, f"out={out!r}")

    # ── 15 · D-C and persistence ─────────────────────────────────────────────
    print("\n── 15. one duration default, and a draft that survives JSON ──")
    check("the default duration IS the platform's MODULE_DEFAULTS['barber']",
          lia._default_duration_min() == reservation_service.MODULE_DEFAULTS["barber"]["duration_min"]
          == 30)
    tree = ast.parse(src)
    literal_30 = [n.lineno for n in ast.walk(tree)
                  if isinstance(n, ast.BoolOp) and isinstance(n.op, ast.Or)
                  and any(isinstance(v, ast.Constant) and v.value == 30 for v in n.values)]
    check("no `… or 30` literal left anywhere in Lia (the two T5 copies now read the constant)",
          not literal_30, str(literal_30))
    async with Env(extract=three) as env:
        wa, out = await send(session_idle(), "علي 10، محمد 7، أحمد 5")
        blob = json.dumps(lia._load_draft(out), ensure_ascii=False)
        check("the draft is plain JSON — amounts as strings, no Decimal, no datetime",
              '"amount": "10"' in blob, blob[:80])

    # ── 16 · the correction contract — Salman's own live round, 2026-09-23 ──
    print("\n── 16. a typed message at the preview is a CORRECTION, compared to the list ──")
    # His real message and Lia's real reading of it: «احمد حيدر ١٠ الصبح ووأم وهاب الظهر ١٥»
    # became «أحمد حيدر» and «أم وهاب», and his next message was «ويأم وهاب».
    pair = lambda t: log(("أحمد حيدر", 10, None), ("أم وهاب", 15, None))
    async with Env(extract=pair) as env:
        wa, out = await send(session_idle(), "احمد حيدر 10 الصبح ووأم وهاب الظهر 15")
        wa2, out2 = await send(roundtrip(out), "ويأم وهاب")
        body = wa2.joined()
        check("«ويأم وهاب» fixes the line it shares a word with — and ONLY that line",
              "*2.* ويأم وهاب · 15 USD" in body and "*1.* أحمد حيدر · 10 USD" in body, body[:200])
        check("   the WHOLE list comes back, not just the question",
              lia._REPLIES["daily_log_preview"] in body and "المجموع: 25 USD" in body, body[:120])
        check("   with the two buttons, still parked on the confirmation",
              titles(wa2) and titles(wa2)[-1] == ("✅ سجّلهم", "❌ إلغاء")
              and out2.state == lia.LIA_AWAITING_CONFIRM, str(titles(wa2)))
        check("   and a correction WRITES NOTHING by itself", not env.calls)
        wa3, _ = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        check("   ✅ then writes the CORRECTED name, and the amount is untouched",
              [c["customer_name"] for c in env.calls] == ["أحمد حيدر", "ويأم وهاب"]
              and [c["metadata"]["daily_log"]["amount"] for c in env.calls] == ["10", "15"],
              str([c["customer_name"] for c in env.calls]))
        # VERBATIM, asserted against the raw typed string rather than a re-spelling of it: the
        # leading waw is part of the name, and no normalisation may touch what he wrote.
        check("   the stored name IS the typed text, character for character",
              env.calls[1]["customer_name"] == "ويأم وهاب", repr(env.calls[1]["customer_name"]))

    # The same draft, not a new one — and ❌ after a correction still cancels everything.
    async with Env(extract=pair) as env:
        wa, out = await send(session_idle(), "احمد حيدر 10 وأم وهاب 15")
        before = dict(lia._load_draft(out))
        wa2, out2 = await send(roundtrip(out), "ويأم وهاب")
        after = lia._load_draft(out2)
        check("a correction edits the SAME draft — no new draft, no second operation",
              after["started_at"] == before["started_at"]
              and after["client_id"] == before["client_id"]
              and after["operation"] == lia.DAILY_LOG_OP
              and len(after["items"]) == len(before["items"]) == 2,
              f'{after["started_at"]} vs {before["started_at"]}')
        wa3, out3 = await send(roundtrip(out2), lia.CANCEL_ID, "button_reply")
        check("❌ after a correction → DL-11, nothing written, draft consumed",
              wa3.joined() == lia._REPLIES["daily_log_cancelled"] and not env.calls
              and lia._load_draft(out3) is None and out3.state == "IDLE", wa3.joined())

    async with Env(extract=pair) as env:
        wa, out = await send(session_idle(), "احمد حيدر 10 وأم وهاب 15")
        wa2, out2 = await send(roundtrip(out), "بكرا منكمّل")
        check("a message that matches no line → the approved question and its buttons, unchanged",
              wa2.joined() == lia._REPLIES["reservation_confirm_multi"]
              and titles(wa2) == [("✅ سجّلهم", "❌ إلغاء")], wa2.joined())
        check("   and the list is untouched",
              [i["customer_name"] for i in lia._load_draft(out2)["items"]]
              == ["أحمد حيدر", "أم وهاب"], str(lia._load_draft(out2)["items"]))
    # TRANSITION 2026-09-23. Until today q3 said a message carrying a NUMBER was out of scope, and
    # this asserted «كريم 8» produced `reservation_confirm_multi` + the buttons with the list
    # unchanged at ["أحمد حيدر", "أم وهاب"]. Salman reversed it the same day, from his own round:
    # a list ADDS to the list. The correction contract itself is untouched — a message with no
    # number is still a name fix, which is what keeps «حسين» and «حسين 17» different things.
    async with Env(extract=lambda t: (log(("كريم", 8, None)) if "كريم" in t
                                      else log(("أحمد حيدر", 10, None), ("أم وهاب", 15, None)))) as env:
        wa, out = await send(session_idle(), "احمد حيدر 10 وأم وهاب 15")
        wa3, out3 = await send(roundtrip(out), "كريم 8")
        check("q3 REVERSED — «كريم 8» at the preview now ADDS a third line",
              [i["customer_name"] for i in lia._load_draft(out3)["items"]]
              == ["أحمد حيدر", "أم وهاب", "كريم"]
              and "*3.* كريم · 8 USD" in wa3.joined(), wa3.joined()[:200])
        check("   the total grows with it, and still nothing is written",
              "المجموع: 33 USD" in wa3.joined() and not env.calls, wa3.joined()[-60:])

    two_wahab = {"items": [{"customer_name": "أم وهاب", "amount": "15"},
                           {"customer_name": "علي وهاب", "amount": "10"}]}
    check("two lines share the word → None, never the first one",
          lia._daily_correction_target(two_wahab, "وئام وهاب") is None)
    check("   a one-character miss still finds its line («احمر» → «احمد»)",
          lia._daily_correction_target({"items": [{"customer_name": "احمد"}]}, "احمر") == 0)
    check("   and a message longer than the name column is refused",
          lia._daily_correction_target(two_wahab, "وهاب " * 30) is None)

    # ── 17 · the list grows, and what is already written is never written twice ──
    print("\n── 17. the list accumulates — «(مسجّل)» above, the new line below, one total ──")
    pair2 = lambda t: (log(("حسين", 17, None)) if "حسين" in t
                       else log(("علي", 10, None), ("محمد", 7, None)))

    # (أ) before ✅ — the same draft grows
    async with Env(extract=pair2) as env:
        wa, out = await send(session_idle(), "علي 10، محمد 7")
        wa2, out2 = await send(roundtrip(out), "حسين 17")
        body = wa2.joined()
        check("«حسين 17» at the preview lands at the END of the same list",
              "*1.* علي · 10 USD" in body and "*2.* محمد · 7 USD" in body
              and "*3.* حسين · 17 USD" in body, body[:200])
        check("   and the total grows to 34 — still nothing written",
              "المجموع: 34 USD" in body and not env.calls, body[-60:])
        check("   same draft, same operation — not a second one",
              lia._load_draft(out2)["started_at"] == lia._load_draft(out)["started_at"]
              and out2.state == lia.LIA_AWAITING_CONFIRM)
        wa3, _ = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        check("   ✅ writes the three, in his order",
              [c["customer_name"] for c in env.calls] == ["علي", "محمد", "حسين"],
              str([c["customer_name"] for c in env.calls]))

    # (ب) after ✅ — today's rows come back marked, and are NOT rewritten
    dl2 = lambda amount: {"barber_id": "brb-1",
                          "daily_log": {"v": 1, "amount": amount, "currency": "USD",
                                        "service_said": None}}
    written = [Row(source="lia", status="arrived", customerName="علي", serviceId=None,
                   metadata=dl2("10")),
               Row(source="lia", status="arrived", customerName="محمد", serviceId=None,
                   metadata=dl2("7"))]
    async with Env(extract=pair2, report_rows=written) as env:
        wa, out = await send(session_idle(), "حسين 17")
        body = wa.joined()
        mark = lia._REPLIES["daily_log_recorded"]
        check("today's written rows come back MARKED, above the new line",
              f"*1.* علي · 10 USD {mark}" in body and f"*2.* محمد · 7 USD {mark}" in body
              and "*3.* حسين · 17 USD" in body and mark not in body.split("*3.*")[1], body[:240])
        check("   one total for the day: 10 + 7 + 17", "المجموع: 34 USD" in body, body[-60:])
        check("🔴 a marked line NEVER enters the draft — the double-write guard is structural",
              [i["customer_name"] for i in lia._load_draft(out)["items"]] == ["حسين"],
              str(lia._load_draft(out)["items"]))
        wa2, _ = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("🔴 ✅ writes ONE row — علي and محمد are not written a second time",
              len(env.calls) == 1 and env.calls[0]["customer_name"] == "حسين",
              str([c["customer_name"] for c in env.calls]))
        # TRANSITION 2026-09-23 (same day, after his live round): this asserted that typing a
        # RECORDED name with one unwritten line returns None — it encoded the similarity rule,
        # which he then hit as a defect («عماد» against «زياد» did nothing). With one candidate
        # the typed name IS that line, so it now returns 0. What the check was really protecting
        # still holds and is proven in §18: a marked line is not in the draft, so it cannot change.
        check("   with one unwritten line, any name targets THAT line (marked ones are untouchable)",
              lia._daily_correction_target({"items": [{"customer_name": "حسين"}]}, "علي") == 0)

    # the cap counts the whole unwritten batch, not one message
    async with Env(extract=lambda t: (log(("زياد", 1, None)) if "زياد" in t
                                      else log(*[(f"زبون {i}", 1, None) for i in range(1, 16)]))) as env:
        # The entry text must itself READ as a list — the stub decides what comes back, the shape
        # decides whether we are in the daily log at all.
        wa, out = await send(session_idle(), "علي 1، محمد 1")
        check("fifteen open the draft", len(lia._load_draft(out)["items"]) == 15)
        wa2, out2 = await send(roundtrip(out), "زياد 1")
        check("the sixteenth is refused by DL-10 — the batch is the unit, not the message",
              lia._REPLIES["daily_log_too_many"].format(count=16, max=15) in wa2.joined()
              and len(lia._load_draft(out2)["items"]) == 15 and not env.calls, wa2.joined())

    # ── 18 · his live round, 2026-09-23 11:06 — one line on the screen ──────
    print("\n── 18. one unwritten line: the name he types IS that line ──")
    async with Env(extract=lambda t: log(("زياد", 10, None))) as env:
        wa, out = await send(session_idle(), "زياد 10")
        wa2, out2 = await send(roundtrip(out), "عماد")
        body = wa2.joined()
        # MEASURED LIVE: «عماد» against «زياد» is neither a shared word nor a one-character miss,
        # so the similarity rule refused it and he got the buttons back. With one candidate there
        # is nothing to disambiguate — requiring similarity guarded an ambiguity that did not exist.
        check("«عماد» replaces the one name, and the list comes back with it",
              "*1.* عماد · 10 USD" in body and lia._REPLIES["daily_log_preview"] in body
              and "زياد" not in body, body[:160])
        # TRANSITION 2026-09-23 (duplicate contract): the item now also carries `arrived_at`, so
        # this compares the fields the rename must not touch instead of the whole dict.
        only = lia._load_draft(out2)["items"]
        check("   the amount survives the rename, nothing is written",
              len(only) == 1 and (only[0]["customer_name"], only[0]["amount"],
                                  only[0]["service_said"]) == ("عماد", "10", None)
              and only[0].get("arrived_at") and not env.calls, str(only))
        wa3, _ = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        check("   ✅ writes the corrected name",
              [c["customer_name"] for c in env.calls] == ["عماد"],
              str([c["customer_name"] for c in env.calls]))

    async with Env(extract=lambda t: log(("زياد", 10, None)), report_rows=written) as env:
        wa, out = await send(session_idle(), "زياد 10")
        wa2, out2 = await send(roundtrip(out), "عماد")
        check("marked lines are not candidates — four of them, and the new one still wins",
              [i["customer_name"] for i in lia._load_draft(out2)["items"]] == ["عماد"]
              and "علي · 10 USD " + lia._REPLIES["daily_log_recorded"] in wa2.joined(),
              wa2.joined()[:200])

    # An instruction is not a name, even with one line on the screen.
    for word in ("تقرير اليوم", "إلغاء", "لا"):
        check(f"   {word!r} is an instruction, never the customer's name",
              lia._daily_correction_target({"items": [{"customer_name": "زياد"}]}, word) is None)
    check("   and with TWO lines the similarity rule still decides",
          lia._daily_correction_target(
              {"items": [{"customer_name": "أحمد"}, {"customer_name": "محمد"}]}, "عماد") is None)

    # ── 19 · the duplicate branch — the contract, end states first ──────────
    print("\n── 19. اسم مكرّر: N0…N4، وكلّ تغيير يرجع للكاشف ──")
    dup2 = lambda t: log(("علي", 8, None), ("علي", 10, None), ("أحمد", 7, None))
    START = "علي 8، علي 10، أحمد 7"

    async def opened(env_extract=dup2, **kw):
        env = Env(extract=env_extract, **kw)
        await env.__aenter__()
        wa, out = await send(session_idle(), START)
        return env, wa, out

    # the question itself: one message, the duplicates only, with their times
    env, wa, out = await opened()
    body = wa.joined()
    check("سؤال التكرار: رسالة وحدة فيها المكرّر وحده — لا الليستة كلّها",
          lia._REPLIES["daily_log_dup_header"].format(name="علي") in body
          and "أحمد" not in body and "*1.*" in body and "*2.*" in body, body)
    check("   فيها وقت وصول كل سطر",
          body.count(":") >= 2 and lia._load_draft(out)["items"][0].get("arrived_at"), body[:120])
    check("   بثلاثة أزرار، والمسودّة موقوفة على السؤال",
          titles(wa)[-1] == ("اجمعهم", "عدّل الاسم", "اتركهم هيك")
          and lia._load_draft(out)["asking"] == "duplicate"
          and out.state == lia.LIA_AWAITING_FIELD, str(titles(wa)))
    check("   ولا معاينة ولا كتابة قبل ما يقرّر",
          lia._REPLIES["daily_log_preview"] not in body and not env.calls)
    await env.__aexit__()

    # N1 — keep
    env, wa, out = await opened()
    wa2, out2 = await send(roundtrip(out), lia.DUP_KEEP_ID, "button_reply")
    check("N1 «اتركهم هيك» ⇒ الثلاثة كما هي، والمعاينة رجعت",
          [i["customer_name"] for i in lia._load_draft(out2)["items"]] == ["علي", "علي", "أحمد"]
          and lia._REPLIES["daily_log_preview"] in wa2.joined()
          and out2.state == lia.LIA_AWAITING_CONFIRM, wa2.joined()[:140])
    wa3, _ = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
    check("   ✅ بتكتب ٣ صفوف", len(env.calls) == 3, str(len(env.calls)))
    await env.__aexit__()

    # N2 — merge
    env, wa, out = await opened()
    wa2, out2 = await send(roundtrip(out), lia.DUP_MERGE_ID, "button_reply")
    items = lia._load_draft(out2)["items"]
    check("N2 «اجمعهم» ⇒ سطر واحد بالمجموع، بمكان الأوّل، ووقت الأوّل",
          [(i["customer_name"], i["amount"]) for i in items] == [("علي", "18"), ("أحمد", "7")]
          and items[0]["arrived_at"] == lia._load_draft(out)["items"][0]["arrived_at"], str(items))
    wa3, _ = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
    check("   ✅ بتكتب صفّين لا ثلاثة، والمبلغ 18",
          [(c["customer_name"], c["metadata"]["daily_log"]["amount"]) for c in env.calls]
          == [("علي", "18"), ("أحمد", "7")], str(len(env.calls)))
    await env.__aexit__()

    # N3/N4 — rename, and the detector runs again
    env, wa, out = await opened()
    wa2, out2 = await send(roundtrip(out), "الأوّل علي حيدر", "text")
    check("N3 تعديل واحد ⇒ التكرار زال، والمعاينة رجعت",
          [i["customer_name"] for i in lia._load_draft(out2)["items"]]
          == ["علي حيدر", "علي", "أحمد"]
          and lia._REPLIES["daily_log_preview"] in wa2.joined(), wa2.joined()[:140])
    await env.__aexit__()

    env, wa, out = await opened()
    wa2, out2 = await send(roundtrip(out), "الأوّل علي حيدر والتاني علي سلمان", "text")
    check("N4 تعديل الاثنين برسالة وحدة",
          [i["customer_name"] for i in lia._load_draft(out2)["items"]]
          == ["علي حيدر", "علي سلمان", "أحمد"], str(lia._load_draft(out2)["items"]))
    await env.__aexit__()

    # 🔴 the invariant: a rename that creates a NEW duplicate is caught again
    env, wa, out = await opened()
    wa2, out2 = await send(roundtrip(out), "الأوّل أحمد", "text")
    check("🔴 الثابتة: تعديلٌ يصنع تكراراً جديداً ⇒ الكاشف يمسكه فوراً",
          lia._load_draft(out2)["asking"] == "duplicate"
          and lia._REPLIES["daily_log_dup_header"].format(name="أحمد") in wa2.joined(),
          wa2.joined()[:120])
    await env.__aexit__()

    # a bare name with two candidates: ASK, never guess
    env, wa, out = await opened()
    wa2, out2 = await send(roundtrip(out), "علي حيدر", "text")
    check("اسمٌ بلا ترتيب ⇒ «أيّ واحد بدّك تعدّل؟» — لا تخمين",
          wa2.joined() == lia._REPLIES["daily_log_dup_pick"]
          and [t for t in titles(wa2)] == [("الأوّل", "التاني")], wa2.joined())
    wa3, out3 = await send(roundtrip(out2), f"{lia.DUP_PICK_PREFIX}2", "button_reply")
    check("   وبعد اختياره، الاسم اللي كتبه ينطبق على الثاني — بلا ما يعيد كتابته",
          [i["customer_name"] for i in lia._load_draft(out3)["items"]]
          == ["علي", "علي حيدر", "أحمد"], str(lia._load_draft(out3)["items"]))
    await env.__aexit__()

    # UNKNOWN / an old ✅ / ❌
    env, wa, out = await opened()
    wa2, out2 = await send(roundtrip(out), "شو هالحكي", "text")
    check("رسالة غير مفهومة ⇒ يُعاد السؤال بأزراره، صفر كتابة، والمسودّة كما هي",
          titles(wa2) and titles(wa2)[-1] == ("اجمعهم", "عدّل الاسم", "اتركهم هيك")
          and lia._load_draft(out2)["items"] == lia._load_draft(out)["items"] and not env.calls)
    wa3, out3 = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
    check("🔴 ✅ من فقاعة أقدم ⇒ لا كتابة، ويُعاد سؤال التكرار",
          not env.calls and lia._load_draft(out3)["asking"] == "duplicate"
          and lia._REPLIES["daily_log_dup_header"].format(name="علي") in wa3.joined(),
          wa3.joined()[:100])
    wa4, out4 = await send(roundtrip(out3), lia.CANCEL_ID, "button_reply")
    check("N0 ❌ أثناء السؤال ⇒ إلغاء فوريّ، صفر كتابة",
          wa4.joined() == lia._REPLIES["daily_log_cancelled"] and not env.calls
          and lia._load_draft(out4) is None)
    await env.__aexit__()

    # ⛔ merge refused when the services differ
    diff = lambda t: log(("علي", 8, "شعر"), ("علي", 10, "دقن"))
    env, wa, out = await opened(env_extract=diff)
    body = wa.joined()
    check("⛔ خدمتان مختلفتان ⇒ زرّ «اجمعهم» ما بينعرض أصلاً (الخيار أ)",
          titles(wa)[-1] == ("عدّل الاسم", "اتركهم هيك"), str(titles(wa)))
    check("   ونصّ الرفض المُقَرّ هو السؤال نفسه",
          lia._REPLIES["daily_log_dup_merge_refused"].format(
              name="علي", first="شعر", second="دقن") in body, body)
    wa2, out2 = await send(roundtrip(out), "اجمعهم", "text")
    check("   وكتابة «اجمعهم» بالإيد ⇒ نفس الرفض · صفر حذف · صفر تغيير مبلغ",
          [(i["customer_name"], i["amount"]) for i in lia._load_draft(out2)["items"]]
          == [("علي", "8"), ("علي", "10")]
          and lia._REPLIES["daily_log_dup_merge_refused"].split("{")[0] in wa2.joined()
          and not env.calls, str(lia._load_draft(out2)["items"]))
    wa3, out3 = await send(roundtrip(out2), lia.DUP_MERGE_ID, "button_reply")
    check("   وزرّ «اجمعهم» من فقاعة أقدم ⇒ نفس الجدار",
          len(lia._load_draft(out3)["items"]) == 2 and not env.calls)
    await env.__aexit__()

    # same service on both sides ⇒ merge allowed
    same = lambda t: log(("علي", 8, "شعر"), ("علي", 10, "شعر"))
    env, wa, out = await opened(env_extract=same)
    check("خدمتان متطابقتان ⇒ الدمج متاح", titles(wa)[-1][0] == "اجمعهم", str(titles(wa)))
    wa2, out2 = await send(roundtrip(out), lia.DUP_MERGE_ID, "button_reply")
    check("   والدمج بيحفظ الخدمة والمجموع",
          [(i["customer_name"], i["amount"], i.get("service_name")) for i in
           lia._load_draft(out2)["items"]] == [("علي", "18", "شعر")],
          str(lia._load_draft(out2)["items"]))
    await env.__aexit__()

    # one side without a service is NOT a difference
    half = lambda t: log(("علي", 8, None), ("علي", 10, "شعر"))
    env, wa, out = await opened(env_extract=half)
    wa2, out2 = await send(roundtrip(out), lia.DUP_MERGE_ID, "button_reply")
    check("سطر بلا خدمة + سطر بخدمة ⇒ دمجٌ مسموح، والخدمة الموجودة بتعيش",
          [(i["amount"], i.get("service_name")) for i in lia._load_draft(out2)["items"]]
          == [("18", "شعر")], str(lia._load_draft(out2)["items"]))
    await env.__aexit__()

    # ── 20 · «مكتوب ↔ مسودّة» — عقد §9 ────────────────────────────────────
    print("\n── 20. اسم مسجَّل اليوم + سطر جديد بنفس الاسم ──")
    rec = lambda name, amount, svc=None: Row(
        source="lia", status="arrived", customerName=name, serviceId=svc,
        metadata={"barber_id": "brb-1",
                  "daily_log": {"v": 1, "amount": amount, "currency": "USD",
                                "service_said": None}})
    WRITTEN = [rec("بلال", "8")]
    one = lambda t: log(("بلال", 2, None))

    async with Env(extract=one, report_rows=WRITTEN) as env:
        wa, out = await send(session_idle(), "بلال 2")
        body, d = wa.joined(), lia._load_draft(out)
        # TRANSITION 2026-09-23 (same day): the question had TWO buttons, «سطر جديد» and
        # «عدّل الاسم». «سطر جديد» was answering two different questions with one word — بلال's
        # three invoices are one person, علي's two rows are two people — and the report cannot
        # tell them apart unless the owner's answer is kept. It is now «نفس الشخص» / «شخص تاني».
        check("§9-ج: ثلاثة أزرار — «نفس الشخص» · «شخص تاني» · «عدّل الاسم»، وبلا «اجمعهم»",
              titles(wa) and titles(wa)[-1] == ("نفس الشخص", "شخص تاني", "عدّل الاسم"),
              str(titles(wa)))
        check("   بنصّ سلمان: المسجَّل بمبلغه، والسطر الجديد بمبلغه",
              lia._REPLIES["daily_log_dup_recorded"].format(
                  name="بلال", amount="8 USD", new="2 USD") in body, body)
        check("   ولا معاينة ولا كتابة قبل القرار",
              lia._REPLIES["daily_log_preview"] not in body and not env.calls
              and d["asking"] == "recorded_dup" and out.state == lia.LIA_AWAITING_FIELD)
        wa2, out2 = await send(roundtrip(out), lia.DUP_OTHER_ID, "button_reply")
        check("«شخص تاني» ⇒ المعاينة بترجع، والاثنان بمكانهما",
              lia._REPLIES["daily_log_preview"] in wa2.joined()
              and f"*1.* بلال · 8 USD {lia._REPLIES['daily_log_recorded']}" in wa2.joined()
              and "*2.* بلال · 2 USD" in wa2.joined(), wa2.joined()[:160])
        check("   وما بيرجع يسأل عن نفس الاسم — الإقرار مسجَّل",
              lia._load_draft(out2).get("recorded_ack") == ["بلال"]
              and lia._load_draft(out2)["asking"] is None)
        wa3, _ = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        check("   ✅ بتكتب السطر الجديد وحده — المسجَّل ما انكتب مرّة تانية",
              len(env.calls) == 1 and env.calls[0]["customer_name"] == "بلال"
              and env.calls[0]["metadata"]["daily_log"]["amount"] == "2",
              str([c["customer_name"] for c in env.calls]))
        check("   🔴 و«شخص تاني» ما بتترك علامة — الصفّ بيضلّ مستقلّاً بالتقرير",
              "same_person" not in env.calls[0]["metadata"]["daily_log"],
              str(env.calls[0]["metadata"]["daily_log"]))

    # «نفس الشخص» — نفس المسار، والفرق الوحيد علامةٌ على الصفّ الجديد
    async with Env(extract=one, report_rows=WRITTEN) as env:
        wa, out = await send(session_idle(), "بلال 2")
        wa2, out2 = await send(roundtrip(out), lia.DUP_SAME_ID, "button_reply")
        check("«نفس الشخص» ⇒ المعاينة كمان، وصفر كتابة قبل ✅",
              lia._REPLIES["daily_log_preview"] in wa2.joined() and not env.calls
              and lia._load_draft(out2)["same_person"] == ["بلال"])
        wa3, _ = await send(roundtrip(out2), lia.CONFIRM_ID, "button_reply")
        check("   ✅ بتكتب صفّاً واحداً يحمل `same_person: True` — ولا صفّ قديم انلمس",
              len(env.calls) == 1
              and env.calls[0]["metadata"]["daily_log"] == {
                  "v": 1, "amount": "2", "currency": "USD", "same_person": True,
                  "service_said": None},
              str(env.calls[0]["metadata"]["daily_log"]))

    async with Env(extract=one, report_rows=WRITTEN) as env:
        wa, out = await send(session_idle(), "بلال 2")
        wa2, out2 = await send(roundtrip(out), lia.DUP_RENAME_ID, "button_reply")
        check("«عدّل الاسم» وسطرٌ واحد يحمل الاسم ⇒ بيسأل عن الاسم مباشرةً",
              wa2.joined() == lia._REPLIES["daily_log_dup_ask_name"]
              and lia._load_draft(out2)["asking"] == "duplicate_name", wa2.joined())
        wa3, out3 = await send(roundtrip(out2), "بلال حيدر", "text")
        check("   اسم المسودّة وحده تغيّر، والمعاينة رجعت",
              [i["customer_name"] for i in lia._load_draft(out3)["items"]] == ["بلال حيدر"]
              and "*2.* بلال حيدر · 2 USD" in wa3.joined(), wa3.joined()[:160])
        check("   🔴 والصفّ المسجَّل كما هو حرفيّاً — ولا نداء تعديل",
              WRITTEN[0].customerName == "بلال" and WRITTEN[0].metadata["daily_log"]["amount"] == "8")
        wa4, _ = await send(roundtrip(out3), lia.CONFIRM_ID, "button_reply")
        check("   ✅ كتبت الاسم المصحَّح، صفّاً واحداً",
              [c["customer_name"] for c in env.calls] == ["بلال حيدر"], str(env.calls and 1))

    # الترتيب: مسودّة ↔ مسودّة أوّلاً، وسجلّا الإقرار منفصلان
    two_same = lambda t: log(("بلال", 2, None), ("بلال", 3, None))
    async with Env(extract=two_same, report_rows=WRITTEN) as env:
        wa, out = await send(session_idle(), "بلال 2، بلال 3")
        check("§9-د: التعارض داخل المسودّة يُسأل عنه أوّلاً (بثلاثة أزرار)",
              titles(wa)[-1] == ("اجمعهم", "عدّل الاسم", "اتركهم هيك")
              and lia._load_draft(out).get("dup_kind") != "recorded", str(titles(wa)))
        wa2, out2 = await send(roundtrip(out), lia.DUP_KEEP_ID, "button_reply")
        check("   وبعد «اتركهم هيك» يُسأل سؤال المكتوب — الإقرار لا يُسكِته",
              titles(wa2) and titles(wa2)[-1] == ("نفس الشخص", "شخص تاني", "عدّل الاسم")
              and lia._load_draft(out2)["duplicates_ack"] == ["بلال"]
              and lia._load_draft(out2).get("recorded_ack") in (None, []), str(titles(wa2)))
        wa3, out3 = await send(roundtrip(out2), lia.DUP_OTHER_ID, "button_reply")
        check("   وبعد «شخص تاني» تُعرَض المعاينة: ثلاثة أسطر باسم واحد بقرارٍ منه",
              lia._REPLIES["daily_log_preview"] in wa3.joined()
              and lia._load_draft(out3)["recorded_ack"] == ["بلال"]
              and len(lia._load_draft(out3)["items"]) == 2, wa3.joined()[:160])
        wa4, _ = await send(roundtrip(out3), lia.CONFIRM_ID, "button_reply")
        check("   ✅ صفّان جديدان لا ثلاثة", len(env.calls) == 2, str(len(env.calls)))

    # اسم مختلف عن المسجَّل ⇒ ولا سؤال
    async with Env(extract=lambda t: log(("سامر", 5, None)), report_rows=WRITTEN) as env:
        wa, out = await send(session_idle(), "سامر 5")
        check("اسمٌ لا يطابق أيّ مسجَّل ⇒ معاينة مباشرة، بلا سؤال",
              lia._REPLIES["daily_log_preview"] in wa.joined()
              and out.state == lia.LIA_AWAITING_CONFIRM, wa.joined()[:100])

    # ❌ وزرّ قديم أثناء سؤال المكتوب
    async with Env(extract=one, report_rows=WRITTEN) as env:
        wa, out = await send(session_idle(), "بلال 2")
        wa2, out2 = await send(roundtrip(out), lia.CONFIRM_ID, "button_reply")
        check("✅ من فقاعة أقدم أثناء سؤال المكتوب ⇒ لا كتابة، ويُعاد السؤال",
              not env.calls and titles(wa2)[-1] == ("نفس الشخص", "شخص تاني", "عدّل الاسم"),
              str(titles(wa2)))
        wa3, out3 = await send(roundtrip(out2), lia.CANCEL_ID, "button_reply")
        check("   ❌ ⇒ إلغاء فوريّ، صفر كتابة",
              wa3.joined() == lia._REPLIES["daily_log_cancelled"] and not env.calls
              and lia._load_draft(out3) is None)

    # 🔴 فحصٌ على الكود: لا UPDATE ولا DELETE في هذه الوحدة إطلاقاً
    tree20 = ast.parse(src)
    writes = []
    for node in ast.walk(tree20):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            continue
        chain, cur = [], node.func
        while isinstance(cur, ast.Attribute):
            chain.append(cur.attr); cur = cur.value
        if isinstance(cur, ast.Name) and cur.id in ("prisma_client", "repo", "_repo"):
            if chain and chain[0] not in ("find_many", "find_first", "find_unique", "count",
                                          "group_by", "query_raw"):
                writes.append((node.lineno, ".".join(reversed(chain))))
    check("🔴 صفر نداء كتابة على قاعدة البيانات في وحدة ليا (AST لا نصّ)",
          not writes, str(writes))
    dbcalls = [n.func.attr for n in ast.walk(tree20)
               if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
               and n.func.attr in ("update", "delete", "update_many", "delete_many", "upsert")
               and not (isinstance(n.func.value, ast.Subscript)
                        or (isinstance(n.func.value, ast.Name) and n.func.value.id in ("merged", "one", "draft", "data", "row")))]
    check("   ولا update/delete على أيّ كائن غير قواميس بايثون", not dbcalls, str(dbcalls))

    # ── 21 · التقرير: سطر لكلّ شخص، بقرار المالك لا بالاسم ───────────────────
    print("\n── 21. «تقرير اليوم» يجمع فواتير الشخص الواحد — واللي قال عنهن «شخص تاني» لأ ──")
    # يومه الحقيقيّ، ٢٠٢٦-٠٩-٢٣: «علي» مرّتين وهنّ شخصان · «بلال» ثلاث مرّات وهو شخص واحد.
    dlp = lambda amount, same=False, said=None: {
        "barber_id": "brb-1",
        "daily_log": {"v": 1, "amount": amount, "currency": "USD", "service_said": said,
                      **({"same_person": True} if same else {})}}
    day = [Row(source="lia", status="arrived", customerName="علي", serviceId=None, metadata=dlp("10")),
           Row(source="lia", status="arrived", customerName="محمد", serviceId=None, metadata=dlp("7")),
           Row(source="lia", status="arrived", customerName="علي", serviceId=None, metadata=dlp("7")),
           Row(source="lia", status="arrived", customerName="بلال", serviceId=None, metadata=dlp("8")),
           Row(source="lia", status="arrived", customerName="بلال", serviceId=None, metadata=dlp("12")),
           Row(source="lia", status="arrived", customerName="بلال", serviceId=None,
               metadata=dlp("5", same=True))]
    async with Env(report_rows=day) as env:
        wa, _ = await send(session_idle(), "تقرير اليوم")
        body = wa.joined()
        check("بلال: فاتورة وحدة بالمجموع، مع عدد الفواتير",
              f"*4.* بلال · 25 USD {lia._REPLIES['daily_report_invoices_many'].format(count=3)}"
              in body, body)
        check("🔴 علي: بيضلّ سطرين — ما في ولا علامة «نفس الشخص»، فما منخمّن",
              "*1.* علي · 10 USD" in body and "*3.* علي · 7 USD" in body
              and "17 USD" not in body, body)
        check("   وترتيب النهار محفوظ: محمد بمكانه بين العليَّين، والمجمَّع نزل بمكان أوّل فاتورة",
              body.index("*2.* محمد") < body.index("*3.* علي") < body.index("*4.* بلال"), body)
        check("   والمجموع للنهار كلّه، والعدد صار أشخاصاً لا فواتير",
              "المجموع: 49 USD · 4 زبون" in body, body[-40:])
        check("   وصفر كتابة — التقرير قراءة", not env.calls)

    two_same = [Row(source="lia", status="arrived", customerName="سامر", serviceId=None,
                    metadata=dlp("5")),
                Row(source="lia", status="arrived", customerName="سامر", serviceId=None,
                    metadata=dlp("6", same=True))]
    async with Env(report_rows=two_same) as env:
        wa, _ = await send(session_idle(), "تقرير اليوم")
        check("فاتورتان لشخص واحد ⇒ صيغة المثنّى",
              f"*1.* سامر · 11 USD {lia._REPLIES['daily_report_invoices_two']}" in wa.joined()
              and "1 زبون" in wa.joined(), wa.joined())

    mixed = [Row(source="lia", status="arrived", customerName="سامر", serviceId="svc-hair",
                 metadata=dlp("5")),
             Row(source="lia", status="arrived", customerName="سامر", serviceId="svc-beard",
                 metadata=dlp("6", same=True))]
    async with Env(report_rows=mixed) as env:
        wa, _ = await send(session_idle(), "تقرير اليوم")
        check("خدمتان مختلفتان على السطر المجمَّع ⇒ تُشال الخدمة، ولا تُنتقى وحدة",
              "*1.* سامر · 11 USD" in wa.joined() and "شعر" not in wa.joined()
              and "دقن" not in wa.joined(), wa.joined())

    same_svc = [Row(source="lia", status="arrived", customerName="سامر", serviceId="svc-hair",
                    metadata=dlp("5")),
                Row(source="lia", status="arrived", customerName="سامر", serviceId="svc-hair",
                    metadata=dlp("6", same=True))]
    async with Env(report_rows=same_svc) as env:
        wa, _ = await send(session_idle(), "تقرير اليوم")
        check("   وإذا كانتا نفس الخدمة ⇒ بتظهر",
              "*1.* سامر · شعر · 11 USD" in wa.joined(), wa.joined())

    print("\n── nothing left this process ──")
    check("the real functions are restored",
          reservation_service.create_reservation is REAL_CREATE
          and barber_repo.list_barbers.__module__ == "app.repositories.barber_repo")

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
