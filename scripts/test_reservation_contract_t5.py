"""T5 — the `status` parameter on `create_reservation`, exercised against the REAL service.

Run:  venv/bin/python scripts/test_reservation_contract_t5.py

WHY THIS PARAMETER EXISTS (Salman, 2026-09-20, his own words — the governing rule, not a
paraphrase of it):

    "Explicit owner-reported completed visit is sufficient evidence for `arrived`; no additional
     business confirmation of completion is required. Preview/confirm only validates the
     extracted fields before writing."

THE DATE ALONE STILL NEVER IMPLIES ATTENDANCE. `test_lia_reservation_t1.py:18` has pinned that
since T1 — "a recorded past appointment is not an attendance claim" — and this file does not
touch it. A historical APPOINTMENT stays `pending`; only an explicit visit verb earns `arrived`,
and that decision lives in Lia, not here. This parameter only makes the distinction expressible.

WHAT THIS FILE IS NOT. It is not the regression guard for the pre-T5 contract — that is
`test_reservation_contract_baseline.py`, whose invariants must keep passing untouched. This one
proves the new parameter does what was decided, and that the four real callers are unaffected.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION. `create_reservation` is the real
function; the repository layer and the send boundary are faked.
"""
import ast
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))

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


# ── the four real callers, named once ─────────────────────────────────────────
CALLERS = (
    "app/api/v1/public/reservations.py",
    "app/api/v1/admin/reservations.py",
    "app/services/whatsapp_reservation_flow.py",
    "app/services/lia_owner_entry.py",
)


def _status_kwargs_in(path):
    """Every `create_reservation(...)` call in one file, and whether it passes `status`.

    PARSED, NOT GREPPED. This project's own rule (memory: "assert on code, not text") exists
    because a grep for `status` matches a comment explaining that status is deliberately not
    passed — which is the exact sentence a careless change would leave behind while breaking the
    thing it describes.
    """
    tree = ast.parse(open(os.path.join(ROOT, path), encoding="utf-8").read())
    out = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        fn = node.func
        name = fn.attr if isinstance(fn, ast.Attribute) else getattr(fn, "id", None)
        if name == "create_reservation":
            out.append(any(k.arg == "status" for k in node.keywords))
    return out


async def main():
    now_local = datetime.now().replace(tzinfo=timezone.utc)
    PAST = _open_day((now_local - timedelta(days=1)).replace(hour=15, minute=0, second=0,
                                                             microsecond=0), forward=False)
    FUTURE = _open_day((now_local + timedelta(days=2)).replace(hour=15, minute=0, second=0,
                                                               microsecond=0), forward=True)
    print(f"     past   = {PAST.isoformat()}  ({PAST:%A})")
    print(f"     future = {FUTURE.isoformat()}  ({FUTURE:%A})")

    # ── 1 · the default IS the old hardcoded line ─────────────────────────────
    print("\n── 1. omitting `status` reproduces the literal it replaced ──")
    # `"status": "pending"` was written into `create_data` until today, so the only honest proof
    # that nothing moved is a call that does not mention the parameter at all.
    for label, when, past in (("a future booking", FUTURE, False), ("a historical one", PAST, True)):
        result, prisma, sends, exc = await book(when, allow_past=past)
        row = prisma.reservation.created[0] if prisma.reservation.created else {}
        check(f"{label} with no `status` argument → 'pending'",
              exc is None and row.get("status") == "pending", f"{row.get('status')} · {exc}")

    # ── 2 · arrived, asked for explicitly ─────────────────────────────────────
    print("\n── 2. a completed visit the owner reported → 'arrived' ──")
    result, prisma, sends, exc = await book(PAST, allow_past=True, status="arrived",
                                            notify_merchant=False)
    row = prisma.reservation.created[0] if prisma.reservation.created else {}
    check("status='arrived' is what reaches the row",
          exc is None and row.get("status") == "arrived", f"{row.get('status')} · {exc}")
    check("   and the returned dict says the same thing",
          (result or {}).get("status") == "arrived", str((result or {}).get("status")))

    # ── 3 · an invented status never reaches the database ─────────────────────
    print("\n── 3. an unknown status is refused BEFORE any row is read ──")
    # The column is a plain String with no database enum, so nothing downstream would reject a
    # typo — a bad value would simply create a row that every listing filters out of existence.
    result, prisma, sends, exc = await book(FUTURE, status="completed")
    check("status='completed' (which this system does not have) raises",
          isinstance(exc, ValueError) and "Invalid status" in str(exc), str(exc))
    check("   nothing was created", len(prisma.reservation.created) == 0)
    check("   and no customer row was touched either — the refusal is first in Validate",
          len(prisma.customer.created) == 0, str(len(prisma.customer.created)))
    check("   the message names the real list, so the caller can act on it",
          all(s in str(exc) for s in rs.VALID_STATUSES), str(exc))

    # ── 4 · writing `arrived` adds no send of any kind ────────────────────────
    print("\n── 4. the status does not create a notification ──")
    # Creation has exactly ONE side effect, `_notify_merchant_new_reservation`, and it does not
    # read `status`. The CUSTOMER-facing `_notify_reservation_event` fires only from
    # `update_status` — which is also why "create then update to arrived" was rejected: the only
    # legal route passes through `confirmed`, and that sends the customer a confirmation.
    result, prisma, sends, exc = await book(PAST, allow_past=True, status="arrived",
                                            notify_merchant=False)
    check("arrived + notify_merchant=False → zero sends", exc is None and len(sends.calls) == 0,
          str(sends.calls))
    result, prisma, sends, exc = await book(PAST, allow_past=True, status="arrived",
                                            notify_merchant=True)
    check("arrived + notify_merchant=True → exactly one merchant alert, same as 'pending'",
          exc is None and len(sends.calls) == 1, str(len(sends.calls)))
    # THE RECORDER CANNOT PROVE THE CUSTOMER WAS NOT MESSAGED, and saying so is the point: it
    # intercepts `send_new_reservation_to_merchant` and nothing else, so a customer-facing send
    # would simply be invisible to it rather than absent. The real claim — that creation has no
    # path to the customer notifier at all — is a property of the source, so it is read from the
    # parsed source instead of inferred from a silent recorder.
    fn = next(n for n in ast.walk(ast.parse(
        open(os.path.join(ROOT, "app/services/reservation_service.py"), encoding="utf-8").read()))
        if isinstance(n, ast.AsyncFunctionDef) and n.name == "create_reservation")
    called = {c.func.attr if isinstance(c.func, ast.Attribute) else getattr(c.func, "id", None)
              for c in ast.walk(fn) if isinstance(c, ast.Call)}
    check("   create_reservation never calls the CUSTOMER notifier — read from the parsed body",
          "_notify_reservation_event" not in called
          and "_notify_merchant_new_reservation" in called,
          str(sorted(x for x in called if x and "notify" in x)))
    check("INVARIANT — `pending -> arrived` is still not a legal transition, so this parameter "
          "is the only route",
          "arrived" not in rs.TRANSITIONS["pending"] and "arrived" in rs.TRANSITIONS["confirmed"],
          str(rs.TRANSITIONS["pending"]))

    # ── 5 · orthogonality, run rather than asserted ───────────────────────────
    print("\n── 5. status does not interact with the two parameters beside it ──")
    for st in ("pending", "arrived"):
        for past, when in ((True, PAST), (False, FUTURE)):
            for notify in (True, False):
                result, prisma, sends, exc = await book(when, allow_past=past, status=st,
                                                        notify_merchant=notify)
                row = prisma.reservation.created[0] if prisma.reservation.created else {}
                good = (exc is None and row.get("status") == st
                        and len(sends.calls) == (1 if notify else 0))
                check(f"status={st} · allow_past={past} · notify={notify}", good,
                      f"{row.get('status')} · sends={len(sends.calls)} · {exc}")

    # ── 6 · the four real callers still say nothing about status ──────────────
    print("\n── 6. the three route callers are untouched; only Lia asks for a status ──")
    # TRANSITION (2026-09-20, same day): when this file was written none of the four passed
    # `status`, because the parameter existed and nothing used it yet. Lia now does — that is the
    # whole point of it — so the claim narrows to what actually matters: the three callers that
    # were here before T5 still say nothing, and their rows are still born `pending`.
    total = 0
    for path in CALLERS:
        passes = _status_kwargs_in(path)
        total += len(passes)
        lia = path.endswith("lia_owner_entry.py")
        check(f"{path} — {len(passes)} call(s), "
              + ("passing `status` deliberately" if lia else "none passing `status`"),
              len(passes) >= 1 and (any(passes) if lia else not any(passes)), str(passes))
    check("all four callers accounted for, none forgotten", total >= 4, str(total))
    # TRANSITION (2026-09-21, D-A). WAS: one Lia call site whose `status` came from `_row_status`,
    # the single function that turned a visit verb into `arrived`, feeding both reservation write
    # paths. D-A moved reported visits OUT of the reservation flow into `log_daily_visits`, and
    # `_row_status` was deleted with the branch. The rule now lives in the operation itself:
    #   the appointment path passes a status that is only ever "pending";
    #   the daily completed log passes "arrived" -- Salman: "Lia daily completed operation may
    #   pass arrived" -- and nothing else in Lia does.
    src = open(os.path.join(ROOT, "app/services/lia_owner_entry.py"), encoding="utf-8").read()
    tree = ast.parse(src)
    owners = {}
    for fn in ast.walk(tree):
        if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for n in ast.walk(fn):
                if (isinstance(n, ast.Call)
                        and getattr(n.func, "attr", None) == "create_reservation"):
                    owners[fn.name] = next((k.value for k in n.keywords if k.arg == "status"),
                                           None)
    check("Lia calls create_reservation from exactly two functions",
          set(owners) == {"_try_write_reservation", "_commit_daily_log"}, str(sorted(owners)))
    res = owners.get("_try_write_reservation")
    check("   the appointment path forwards a variable, not a literal",
          res is not None and not isinstance(res, ast.Constant),
          ast.dump(res)[:60] if res is not None else "missing")
    daily = owners.get("_commit_daily_log")
    check("   the daily log passes the literal 'arrived' — completed, paid work",
          isinstance(daily, ast.Constant) and daily.value == "arrived",
          ast.dump(daily)[:60] if daily is not None else "missing")
    pend = [n for n in ast.walk(tree)
            if isinstance(n, ast.Assign) and any(getattr(t, "id", None) == "status"
                                                 for t in n.targets)]
    check("   and every `status =` assignment in Lia is 'pending' — no path invents 'arrived'",
          pend and all(isinstance(n.value, ast.Constant) and n.value.value == "pending"
                       for n in pend), str([ast.dump(n.value)[:30] for n in pend]))

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
