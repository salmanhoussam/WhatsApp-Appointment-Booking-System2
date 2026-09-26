"""Clinic P5-A — the WRITE path owns the same rules the reader does. WR-1…WR-10.

Run:  venv/bin/python scripts/test_clinic_write_contract.py

WHAT THIS PROVES
    P4 put ق-٤-أ and ق-٤-ب in `get_available_slots_for_resource` ONLY. `create_reservation`
    checked neither, so a direct POST to the PUBLIC route bypassed both the picker and the
    availability endpoint. These are the two holes, closed and measured:

      G-1  booking a doctor who does not perform the requested service
      G-2  booking a 60-minute service as 15 — which the partial unique index does NOT catch,
           because its key is (client, resource, START TIME), not the span

    🔴 WR-3 is the one that matters most. If the eligibility check were conditional on service_id
    being PRESENT, omitting the field would be the bypass — a rule you can skip by leaving out a
    field is not a rule. So service_id is REQUIRED for a resource-backed reservation, and WR-3
    proves the omission is refused rather than waved through.

    WR-7…WR-9 are the other half: the BARBER path must be byte-identical. It still performs no
    eligibility check and still honours a caller's duration — F-P4-1 stays a recorded debt, and
    repairing the barber inside the clinic phase is what this vertical's contract forbids.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION.
    The real `create_reservation` runs against test_lia_reservation_t1's proven fakes.
"""
import ast
import asyncio
import io
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repositories import catalog_service_repo, resource_repo, resource_service_repo  # noqa: E402
from app.services import reservation_service as rs                   # noqa: E402
from test_lia_reservation_t1 import (                                # noqa: E402
    install as _t1_install, Row, CLIENT, _done,
)

ok = True
RES = "res-1"
SVC = "svc-1"
ELIGIBLE = {(CLIENT, RES, SVC)}
MSG = "This resource does not provide the requested service."


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _when(hour=11):
    d = (datetime.now().replace(tzinfo=timezone.utc) + timedelta(days=2))
    return d.replace(hour=hour, minute=0, second=0, microsecond=0)


async def book(metadata, duration_min=None, existing=None, service_duration=60,
               service_exists=True, module_key="clinic"):
    """The REAL create_reservation, with only the repository boundary faked."""
    prisma, sends, restore = _t1_install(existing=existing)
    orig = (resource_repo.find_resource, catalog_service_repo.find_catalog_service,
            resource_service_repo.is_eligible)
    resource_repo.find_resource = lambda cid, rid: _done(
        Row(id=rid, clientId=cid, name="د. سارة", type="doctor", isActive=True, workingHours=None))
    catalog_service_repo.find_catalog_service = lambda cid, sid: _done(
        Row(id=sid, clientId=cid, nameAr="معاينة", durationMin=service_duration,
            bookableBy="patients") if service_exists else None)
    resource_service_repo.is_eligible = lambda cid, rid, sid: _done((cid, rid, sid) in ELIGIBLE)
    try:
        await rs.create_reservation(
            client_id=CLIENT, module_key=module_key, customer_name="أحمد",
            customer_phone="96170123456", reserved_at=_when(), duration_min=duration_min,
            notes=None, metadata=metadata, source="website",
            enforce_working_hours=False, notify_merchant=False)
        return None, prisma.reservation.created
    except ValueError as exc:
        return exc, prisma.reservation.created
    finally:
        (resource_repo.find_resource, catalog_service_repo.find_catalog_service,
         resource_service_repo.is_eligible) = orig
        restore()


def _fn_code(name: str) -> str:
    src = io.open("app/services/reservation_service.py", encoding="utf-8").read()
    for n in ast.walk(ast.parse(src)):
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == name:
            node = ast.parse(ast.unparse(n)).body[0]
            if (node.body and isinstance(node.body[0], ast.Expr)
                    and isinstance(node.body[0].value, ast.Constant)):
                node.body = node.body[1:]
            return ast.unparse(node)
    return ""


async def main() -> int:
    print("\n── WR · G-1 · the write path asks about eligibility ──")
    exc, created = await book({"resource_id": RES, "service_id": "svc-OTHER"})
    check("WR-1  an INELIGIBLE pair is refused — and nothing is written",
          isinstance(exc, rs.ResourceDoesNotProvideService) and created == [], str(exc))
    check("WR-2  with the SAME sentence the reader gives — one behaviour, two doors",
          str(exc) == MSG, str(exc))
    exc, created = await book({"resource_id": RES})
    check("WR-3  🔴 omitting service_id is REFUSED, not waved through — the bypass is closed",
          isinstance(exc, ValueError) and "require a valid service_id" in str(exc)
          and created == [], str(exc))
    exc, created = await book({"resource_id": RES, "service_id": SVC}, service_exists=False)
    check("WR-4  an unknown service_id is refused the same way (the tolerant resolver returns "
          "None, and None is not a free pass here)",
          isinstance(exc, ValueError) and "require a valid service_id" in str(exc))

    print("\n── WR · G-2 · the duration is the SERVICE's ──")
    exc, created = await book({"resource_id": RES, "service_id": SVC},
                              duration_min=15, service_duration=60)
    check("WR-5  the caller says 15, the service says 60 ⇒ the ROW says 60",
          exc is None and created and created[0]["durationMin"] == 60,
          f"wrote {created[0]['durationMin'] if created else '—'}")
    check("WR-6  and the row is a real clinic row: resourceId + serviceId + source",
          created and created[0].get("resourceId") == RES
          and created[0].get("serviceId") == SVC and created[0].get("source") == "website")

    print("\n── WR · and the derived duration really guards the calendar ──")
    busy = [Row(reservedAt=_when(), durationMin=60, status="confirmed")]
    exc, created = await book({"resource_id": RES, "service_id": SVC},
                              duration_min=15, service_duration=60,
                              existing=busy)
    check("WR-7  a 60-minute service cannot be squeezed in as 15 over an existing booking — "
          "the conflict check now runs on the DERIVED duration",
          isinstance(exc, ValueError) and "already booked" in str(exc) and created == [],
          str(exc))

    print("\n── RG · the BARBER path is byte-identical ──")
    exc, created = await book({"barber_id": "b1", "service_id": "svc-OTHER"},
                              duration_min=15, service_duration=60, module_key="barber")
    check("RG-1  a barber booking is NOT eligibility-checked — F-P4-4 stays a debt, and the "
          "clinic phase does not repair the barber",
          exc is None and created, str(exc))
    check("RG-2  and the barber still honours the CALLER's duration (15, not 60) — F-P4-1 stays "
          "a debt too",
          created and created[0]["durationMin"] == 15,
          f"wrote {created[0]['durationMin'] if created else '—'}")

    print("\n── RG · structural: the new rules are scoped to `resource` ──")
    code = _fn_code("create_reservation")
    guarded = False
    for n in ast.walk(ast.parse(code)):
        if (isinstance(n, ast.If) and isinstance(n.test, ast.Name) and n.test.id == "resource"
                and "resource_service_repo.is_eligible" in ast.unparse(n)
                and "catalog_service.durationMin" in ast.unparse(n)):
            guarded = True
    check("RG-3  both rules live inside ONE `if resource:` block — not sprinkled, not global",
          guarded)
    check("RG-4  the past guard and the P3 booking contract are untouched",
          "datetime.now().replace(tzinfo=timezone.utc)" in code
          and "PATIENT_FACING_SOURCES" in code)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
