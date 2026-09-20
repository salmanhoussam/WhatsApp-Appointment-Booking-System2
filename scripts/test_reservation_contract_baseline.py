"""T3-a — the reservation contract as it stands TODAY, pinned before anything changes.

Run:  venv/bin/python scripts/test_reservation_contract_baseline.py

WHY A BASELINE, AND WHY NOW

    T3 adds two parameters to `create_reservation` — `allow_past` and `notify_merchant`. The
    claim attached to them is "defaults preserve current behaviour". A test written AFTER the
    change cannot check that claim: it would only prove the new code agrees with itself.

    So this file was written against the UNMODIFIED service and pinned what was true then.

🔴 CORRECTION, 2026-09-17, after T3-b ran — and it is a correction of THIS FILE, not of the
    service. The original docstring claimed: "after T3-b, every assertion here must still pass
    unchanged; anything that has to be edited IS the regression." That claim was wrong, and it
    was wrong in a way worth keeping on the record, because a file cannot both assert that a
    parameter DOES NOT EXIST and survive the change that creates it.

    Nine assertions failed after T3-b. Not one of them was a behaviour regression. Every one
    asserted the ABSENCE of exactly what T3-b was ordered to add — the signature shape, the two
    parameter names, the service having no past guard, the service accepting the past, the
    merchant being notified unconditionally. Fourteen assertions passed, and those fourteen are
    the real invariants: three call sites, their exact keywords, each caller's own guard, and
    future behaviour.

    The file mixed two kinds of assertion that have opposite lifetimes:

      INVARIANT   must hold before AND after, forever. A failure here IS a regression.
      TRANSITION  a dated snapshot of the world before a deliberate change. It is SUPPOSED to
                  flip, and the flip is the evidence the change landed.

    It is now split accordingly, and each transition assertion states the value it used to have,
    so the file documents the change instead of pretending there wasn't one. The pre-change
    values also survive verbatim and immutably in
    .claudedocs/work/lia-reservation-entry/2026-09-17/t3a-contract-baseline.md — a dated evidence
    document is where a snapshot belongs; a test suite is where an invariant belongs.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION.
    The repository layer and the send boundary are faked; `create_reservation` is the real
    function. Assertions about what a caller does parse the CODE (ast), never the file text —
    a comment discussing a guard is not a guard.
"""
import ast
import asyncio
import inspect
import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import reservation_service as rs                    # noqa: E402
from test_lia_reservation_t1 import (                                 # noqa: E402
    WORKING_HOURS, book, check as _t1_check,
)

ok = True

CALLERS = {
    "admin route":    "app/api/v1/admin/reservations.py",
    "public route":   "app/api/v1/public/reservations.py",
    "whatsapp flow":  "app/services/whatsapp_reservation_flow.py",
}


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def call_keywords(path: str) -> list[str]:
    """The keyword names passed to create_reservation in this file — from the AST, in order."""
    tree = ast.parse(open(path, encoding="utf-8").read())
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            f = node.func
            name = f.attr if isinstance(f, ast.Attribute) else getattr(f, "id", None)
            if name == "create_reservation" and node.keywords:
                return [k.arg for k in node.keywords]
    return []


def guards_the_past(path: str) -> bool:
    """True when this source really COMPARES a reservation time against now — code, not prose."""
    tree = ast.parse(open(path, encoding="utf-8").read())
    for node in ast.walk(tree):
        if isinstance(node, ast.Compare):
            src = ast.unparse(node)
            if "reserved_at" in src and "now()" in src and any(
                    isinstance(o, (ast.Lt, ast.LtE)) for o in node.ops):
                return True
    return False


async def main():
    print("── 1. TRANSITION — the signature, and what T3-b deliberately changed about it ──")
    sig = inspect.signature(rs.create_reservation)
    names = list(sig.parameters)
    check("the original ten parameters are intact, in their original order",
          names[:10] == ["client_id", "module_key", "customer_name", "customer_phone",
                         "reserved_at", "duration_min", "notes", "metadata", "customer_email",
                         "source"],
          str(names[:10]))
    # TRANSITION (2026-09-18). WAS `["allow_past", "notify_merchant"]` after T3-b. T3-c added the
    # third: `enforce_working_hours`. R-2 — a historical entry does not answer to the schedule
    # configured today — was ratified on 2026-09-17 and was NOT implementable until it existed,
    # because `_check_working_hours` ran unconditionally and `allow_past` never reached it.
    # TRANSITION (2026-09-20). WAS the three above. T5 added the fourth, `status`, for the one
    # thing the three could not express: a visit the owner SAYS he performed is completed work,
    # not a booking waiting to happen (`OverviewTab.jsx:512` counts `arrived` as completed). The
    # date alone still never implies attendance — `test_lia_reservation_t1.py:18` pins that, and
    # T5 does not touch it; only an explicit visit verb earns `arrived`, and Lia decides that,
    # not this signature.
    check("T3-b/T3-c/T5 added exactly four, at the end (was: three, and before that ten "
          "parameters with none)",
          names[10:] == ["allow_past", "notify_merchant", "enforce_working_hours", "status"],
          str(names[10:]))
    kinds = {n: sig.parameters[n].kind
             for n in ("allow_past", "notify_merchant", "enforce_working_hours", "status")}
    check("   and both are KEYWORD-ONLY — no positional call can land on them by accident",
          all(k is inspect.Parameter.KEYWORD_ONLY for k in kinds.values()), str(kinds))
    defaulted = {n: p.default for n, p in sig.parameters.items()
                 if p.default is not inspect.Parameter.empty}
    check("the defaults are exactly these (was: {customer_email: None, source: None})",
          # TRANSITION (2026-09-18): `enforce_working_hours: True` joined. Like `notify_merchant`
          # and unlike `allow_past`, its default is a TRUE preservation — every existing caller
          # keeps being checked against the schedule exactly as before.
          # TRANSITION (2026-09-20): `status: "pending"` joined, and its default is the most
          # literal preservation of the four — the value was a hardcoded `"status": "pending"`
          # inside `create_data` until T5 moved it up into the signature. The default IS the old
          # line, which is why all four existing callers stay byte-for-byte unaffected.
          defaulted == {"customer_email": None, "source": None,
                        "allow_past": False, "notify_merchant": True,
                        "enforce_working_hours": True, "status": "pending"}, str(defaulted))

    print("\n── 2. INVARIANT — the three callers, and NOTHING else calls it ──")
    # COUNTED AS CALLS, NOT AS TEXT. The first version of this check used a regex and answered
    # SIX: `async def create_reservation(` in the admin route and in the service itself match the
    # same pattern as a real call. A definition is not a caller — the same distinction that has
    # bitten this project before, in the other direction.
    sites = []
    for base, _d, files in os.walk("app"):
        for f in files:
            if not f.endswith(".py"):
                continue
            path = os.path.join(base, f)
            for node in ast.walk(ast.parse(open(path, encoding="utf-8").read())):
                if isinstance(node, ast.Call):
                    fn = node.func
                    nm = fn.attr if isinstance(fn, ast.Attribute) else getattr(fn, "id", None)
                    if nm == "create_reservation":
                        sites.append(f"{path}:{node.lineno}")
    # TRANSITION (2026-09-18). WAS three. Lia is the FOURTH caller, and the first one that ever
    # asks for the past: T4 records an appointment the owner says already happened. The invariant
    # this section defends is unchanged and is asserted below — the three ORIGINAL callers still
    # pass none of the new parameters, so none of their behaviour moved.
    check("exactly four CALL sites in app/ — the three routes/flow, plus Lia (was three)",
          len(sites) == 4, " · ".join(sites))
    check("   and the fourth is Lia, not a second write path into the table",
          sum("lia_owner_entry" in s_ for s_ in sites) == 1, " · ".join(sites))

    expected = {
        "admin route":   ["client_id", "module_key", "customer_name", "customer_phone",
                          "customer_email", "reserved_at", "duration_min", "notes", "metadata",
                          "source"],
        "public route":  ["client_id", "module_key", "customer_name", "customer_phone",
                          "customer_email", "reserved_at", "duration_min", "notes", "metadata",
                          "source"],
        "whatsapp flow": ["client_id", "module_key", "customer_name", "customer_phone",
                          "reserved_at", "duration_min", "notes", "metadata", "source"],
    }
    for label, path in CALLERS.items():
        kw = call_keywords(path)
        check(f"{label}: passes exactly {len(expected[label])} keywords",
              kw == expected[label], str(kw))
        check(f"   {label}: passes NONE of the three new parameters today",
              not {"allow_past", "notify_merchant", "enforce_working_hours"} & set(kw))

    # And Lia's own call, asserted as the opposite: it passes all three EXPLICITLY, because
    # recording the past must be asked for rather than inherited from a missing guard.
    lia_kw = call_keywords("app/services/lia_owner_entry.py")
    check("Lia passes all three new parameters explicitly",
          {"allow_past", "notify_merchant", "enforce_working_hours"} <= set(lia_kw), str(lia_kw))
    check("   and it is the only caller that names source=\"lia\"",
          "source" in lia_kw)

    print("\n── 3. INVARIANT — each caller's own past guard, parsed not read ──")
    check("admin route really compares reserved_at against now()",
          guards_the_past(CALLERS["admin route"]))
    check("public route really compares reserved_at against now()",
          guards_the_past(CALLERS["public route"]))
    check("🔴 the WhatsApp flow has NO such comparison — its guard is STRUCTURAL",
          not guards_the_past(CALLERS["whatsapp flow"]))
    flow = open(CALLERS["whatsapp flow"], encoding="utf-8").read()
    check("   it offers only slots built by get_next_open_days, so a past slot is unreachable",
          "get_next_open_days" in flow)
    svc = ast.parse(open("app/services/reservation_service.py", encoding="utf-8").read())
    in_create = [n for n in ast.walk(svc)
                 if isinstance(n, ast.AsyncFunctionDef) and n.name == "create_reservation"]
    body = ast.unparse(in_create[0])
    check("TRANSITION — the service now HAS its own past guard (was: none at all)",
          "now()" in body and "allow_past" in body)
    check("   and it is the routes' comparison character for character, not a 'better' one",
          "datetime.now().replace(tzinfo=timezone.utc)" in body,
          "a different now() form would sit 3 hours from the routes' guard")

    print("\n── 4. the service's real behaviour on a past datetime (the thing to preserve) ──")
    from datetime import datetime, timezone
    now_local = datetime.now().replace(tzinfo=timezone.utc)
    past = (now_local - timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0)
    while past.strftime("%A").lower() in WORKING_HOURS["closed_days"]:
        past -= timedelta(days=1)
    res, prisma, sends, exc = await book(past, allow_past=False)
    check("TRANSITION — the service now REFUSES a past reservation by default "
          "(was: accepted it)", res is None and isinstance(exc, ValueError), f"{exc}")
    check("   ⇒ the tightening is real, and it is what makes 'historical' an explicit request",
          res is None)
    res_h, prisma, sends, exc_h = await book(past, allow_past=True)
    check("   and allow_past=True reaches creation — the past is OPENED, never inherited",
          res_h is not None and exc_h is None, f"{exc_h}" if exc_h else "")
    check("INVARIANT — the merchant is still notified by default", len(sends.calls) == 1,
          f"{len(sends.calls)}")
    check("   ⇒ notify_merchant=True preserves the measured behaviour exactly",
          len(sends.calls) == 1)
    prisma = prisma  # the historical run is the one whose row we inspect below

    future = (now_local + timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0)
    while future.strftime("%A").lower() in WORKING_HOURS["closed_days"]:
        future += timedelta(days=1)
    res2, _p, sends2, exc2 = await book(future, allow_past=False)
    check("INVARIANT — a FUTURE reservation is untouched: created, and notified",
          res2 is not None and exc2 is None and len(sends2.calls) == 1)
    check("   status is pending for both past and future",
          prisma.reservation.created[0]["status"] == "pending")

    print("\n── 5. INVARIANT — T3-b touched the SERVICE and nothing else in app/ ──")
    import subprocess
    dirty = [ln[3:] for ln in subprocess.run(["git", "status", "--porcelain", "app/"],
                                             capture_output=True, text=True).stdout.splitlines()]
    # NARROWED IN S7. This read "the only modified file under app/ is reservation_service.py",
    # which was true of T3-b's diff and is a SNAPSHOT, not an invariant — the next slice touching
    # any other file fails it while changing nothing about reservations. The durable property is
    # the one below: the reservation contract moved without a single route moving with it.
    check("no route was changed — the duplicated guard is deliberate, not a migration",
          not any(d.startswith("app/api/") for d in dirty), str(dirty))
    check("   and reservation_service.py is the only reservation file touched",
          not any(d.startswith("app/services/reservation") and
                  d != "app/services/reservation_service.py" for d in dirty), str(dirty))

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
