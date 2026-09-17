"""T3-a — the reservation contract as it stands TODAY, pinned before anything changes.

Run:  venv/bin/python scripts/test_reservation_contract_baseline.py

WHY A BASELINE, AND WHY NOW

    T3 adds two parameters to `create_reservation` — `allow_past` and `notify_merchant`. The
    claim attached to them is "defaults preserve current behaviour". A test written AFTER the
    change cannot check that claim: it would only prove the new code agrees with itself.

    So this file is written against the UNMODIFIED service and pins what is true right now:
    the exact signature, the exact keywords each of the three callers passes, each caller's own
    past guard, and the service's real behaviour on a past datetime. After T3-b, every assertion
    here must still pass unchanged. Anything that has to be edited to make it pass again IS the
    regression, named rather than absorbed.

    This file therefore does NOT test the new parameters. It tests the thing they must not break.

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
    print("── 1. the signature, exactly as it is today ──")
    sig = inspect.signature(rs.create_reservation)
    names = list(sig.parameters)
    check("ten parameters, in this order",
          names == ["client_id", "module_key", "customer_name", "customer_phone", "reserved_at",
                    "duration_min", "notes", "metadata", "customer_email", "source"],
          str(names))
    defaulted = {n: p.default for n, p in sig.parameters.items()
                 if p.default is not inspect.Parameter.empty}
    check("only two parameters have defaults, and both are None",
          defaulted == {"customer_email": None, "source": None}, str(defaulted))
    check("🔴 `allow_past` does NOT exist yet", "allow_past" not in names)
    check("🔴 `notify_merchant` does NOT exist yet", "notify_merchant" not in names)

    print("\n── 2. the three callers, and NOTHING else calls it ──")
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
    check("exactly three CALL sites in app/ (definitions are not callers)",
          len(sites) == 3, " · ".join(sites))

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
        check(f"   {label}: passes NEITHER new parameter today",
              "allow_past" not in kw and "notify_merchant" not in kw)

    print("\n── 3. each caller's own past guard — parsed, not read ──")
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
    check("   create_reservation's own body never compares reserved_at to now()",
          "now()" not in body, "found a comparison" if "now()" in body else "")

    print("\n── 4. the service's real behaviour on a past datetime (the thing to preserve) ──")
    from datetime import datetime, timezone
    now_local = datetime.now().replace(tzinfo=timezone.utc)
    past = (now_local - timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0)
    while past.strftime("%A").lower() in WORKING_HOURS["closed_days"]:
        past -= timedelta(days=1)
    res, prisma, sends, exc = await book(past)
    check("TODAY the service ACCEPTS a past reservation", res is not None and exc is None,
          f"{exc}" if exc else "")
    check("   ⇒ so `allow_past=False` as a default is a TIGHTENING, not a preservation",
          res is not None)
    check("TODAY the merchant is notified, unconditionally", len(sends.calls) == 1,
          f"{len(sends.calls)}")
    check("   ⇒ so `notify_merchant=True` as a default IS a preservation", len(sends.calls) == 1)

    future = (now_local + timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0)
    while future.strftime("%A").lower() in WORKING_HOURS["closed_days"]:
        future += timedelta(days=1)
    res2, _p, sends2, exc2 = await book(future)
    check("a FUTURE reservation behaves identically today",
          res2 is not None and exc2 is None and len(sends2.calls) == 1)
    check("   status is pending for both past and future",
          prisma.reservation.created[0]["status"] == "pending")

    print("\n── 5. nothing in app/ was modified to run this ──")
    import subprocess
    dirty = subprocess.run(["git", "status", "--porcelain", "app/"],
                           capture_output=True, text=True).stdout.strip()
    check("`git status app/` is clean — T3-a changed no implementation",
          dirty == "", dirty or "clean")

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
