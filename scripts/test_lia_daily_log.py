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
        check("   DL-4 the total, DL-5 the approximate hours",
              "المجموع: 22 USD" in body and lia._REPLIES["daily_log_time_approx"] in body)
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
        check("DL-7, once", wa2.joined() == lia._REPLIES["daily_log_created"], wa2.joined())
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

    print("\n── nothing left this process ──")
    check("the real functions are restored",
          reservation_service.create_reservation is REAL_CREATE
          and barber_repo.list_barbers.__module__ == "app.repositories.barber_repo")

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
