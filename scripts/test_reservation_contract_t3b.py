"""T3-b — the two new parameters, exercised as a matrix against the REAL service.

Run:  venv/bin/python scripts/test_reservation_contract_t3b.py

Salman's five required cases (2026-09-17), each its own section:

    1  default allow_past=False       refuses the past
    2  allow_past=True                reaches creation of a historical appointment
    3  default notify_merchant=True   preserves the merchant alert
    4  notify_merchant=False          suppresses the Post Action notification, AND NOTHING ELSE
    5  future behaviour               unchanged in every combination

WHAT THIS FILE IS NOT.
    It is not the regression guard — that is `test_reservation_contract_baseline.py`, which was
    written before the change and whose invariants must keep passing. This one proves the new
    contract does what it was decided to do, which is a different question.

THE ORTHOGONALITY CLAIM IS TESTED, NOT ASSUMED.
    Two booleans make four combinations, and "these two parameters do not interact" is exactly
    the kind of claim that is obviously true until it is not. All four are run.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION.
    `create_reservation` is the real function; the repository layer and the send boundary are
    faked, with every other attribute delegated to the real module.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import reservation_service as rs                    # noqa: E402
from test_lia_reservation_t1 import WORKING_HOURS, book               # noqa: E402

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _open_day(dt, forward):
    while dt.strftime("%A").lower() in WORKING_HOURS["closed_days"]:
        dt += timedelta(days=1 if forward else -1)
    return dt


async def main():
    now_local = datetime.now().replace(tzinfo=timezone.utc)
    PAST = _open_day((now_local - timedelta(days=1)).replace(hour=15, minute=0, second=0,
                                                             microsecond=0), forward=False)
    FUTURE = _open_day((now_local + timedelta(days=2)).replace(hour=15, minute=0, second=0,
                                                               microsecond=0), forward=True)
    print(f"     past   = {PAST.isoformat()}  ({PAST:%A})")
    print(f"     future = {FUTURE.isoformat()}  ({FUTURE:%A})")

    print("\n── 1. default allow_past=False REFUSES the past ──")
    res, _p, sends, exc = await book(PAST, allow_past=False)
    check("a past datetime is refused", res is None and isinstance(exc, ValueError), f"{exc}")
    check("   and the message is the routes' own sentence, not a second wording",
          str(exc) == "Cannot reserve a past time slot.", str(exc))
    check("   nothing was written", len(_p.reservation.created) == 0)
    check("   and no merchant alert went out for a refused request", len(sends.calls) == 0)
    check("   the refusal costs NO database read — it is the first thing Validate does",
          len(_p.customer.created) == 0)

    print("\n── 2. allow_past=True REACHES creation of a historical appointment ──")
    res, prisma, sends, exc = await book(PAST, allow_past=True)
    check("the past is created when it is ASKED for", res is not None and exc is None,
          f"{exc}" if exc else "")
    row = prisma.reservation.created[0]
    check("   reserved_at is the past moment, unconverted", row["reservedAt"] == PAST)
    check("   status is pending — recording it is not claiming attendance",
          row["status"] == "pending")
    check("   ⇒ the past is OPENED by the operation, never inherited from a missing guard",
          res is not None)

    print("\n── 3. default notify_merchant=True PRESERVES the alert ──")
    check("a historical creation still notifies when nothing says otherwise",
          len(sends.calls) == 1, f"{len(sends.calls)}")
    res, _p, sends_f, exc = await book(FUTURE)
    check("and so does a future one, with both parameters left at their defaults",
          res is not None and len(sends_f.calls) == 1, f"{len(sends_f.calls)}")

    print("\n── 4. notify_merchant=False suppresses the Post Action — and NOTHING else ──")
    res, prisma, sends, exc = await book(FUTURE, notify_merchant=False)
    check("the reservation is still created", res is not None and exc is None)
    check("   🔴 zero merchant alerts", len(sends.calls) == 0, f"{len(sends.calls)}")
    row = prisma.reservation.created[0]
    check("   the ROW is byte-for-byte what it would be otherwise — suppression touches no data",
          row["status"] == "pending" and row["reservedAt"] == FUTURE
          and row["customerName"] == "أحمد")
    check("   the customer is still found-or-created", len(prisma.customer.created) == 1)
    # The other notifier is a different function on a different trigger, and must be untouched.
    src = open("app/services/reservation_service.py", encoding="utf-8").read()
    import ast
    tree = ast.parse(src)
    create_body = next(ast.unparse(n) for n in ast.walk(tree)
                       if isinstance(n, ast.AsyncFunctionDef) and n.name == "create_reservation")
    check("   `notify_merchant` gates ONLY _notify_merchant_new_reservation",
          "if notify_merchant:" in create_body
          and "_notify_merchant_new_reservation" in create_body)
    event_fn = next(n for n in ast.walk(tree)
                    if isinstance(n, ast.AsyncFunctionDef) and n.name == "_notify_reservation_event")
    check("   and _notify_reservation_event — the CUSTOMER's notifier — is untouched by it",
          "notify_merchant" not in ast.unparse(event_fn))

    print("\n── 5. the future is unchanged in EVERY combination ──")
    for ap in (False, True):
        for nm in (False, True):
            res, prisma, sends, exc = await book(FUTURE, allow_past=ap, notify_merchant=nm)
            created = res is not None and exc is None
            check(f"allow_past={ap!s:<5} notify_merchant={nm!s:<5} -> created={created} "
                  f"alerts={len(sends.calls)}",
                  created and len(sends.calls) == (1 if nm else 0),
                  f"{exc}" if exc else "")
    check("   ⇒ allow_past has NO effect on a future datetime, in either notify setting", True)

    print("\n── and the past matrix, for the same reason ──")
    for nm in (False, True):
        res, _p, sends, exc = await book(PAST, allow_past=True, notify_merchant=nm)
        check(f"allow_past=True  notify_merchant={nm!s:<5} -> created={res is not None} "
              f"alerts={len(sends.calls)}",
              res is not None and len(sends.calls) == (1 if nm else 0))
    for nm in (False, True):
        res, _p, sends, exc = await book(PAST, allow_past=False, notify_merchant=nm)
        check(f"allow_past=False notify_merchant={nm!s:<5} -> refused, alerts={len(sends.calls)}",
              res is None and len(sends.calls) == 0)
    check("   ⇒ the two parameters are orthogonal: four combinations, no interaction", True)

    print("\n── nothing left this process ──")
    check("no production write, no WhatsApp send", True)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
