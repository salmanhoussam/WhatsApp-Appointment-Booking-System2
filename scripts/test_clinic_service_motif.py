"""Clinic P3 — the Service Booking Contract. SM-1…SM-10.

Run:  venv/bin/python scripts/test_clinic_service_motif.py

WHAT THIS PROVES
    A service may now say WHO is allowed to book it, and the rule is applied against the CHANNEL
    the booking came from -- not against a role, which this Service layer does not have.

    The direction is the decision (Salman, 2026-09-25): `PATIENT_FACING_SOURCES` is an ALLOW-LIST
    FOR BEING RESTRICTED. A channel added tomorrow is not silently restricted until it is named,
    so the safe failure is "a staff member could book it", never "a patient was refused by a rule
    nobody wrote". SM-6 is what makes that a measured claim rather than a stated intention.

    And SM-1 is the one that matters most: a service that has never heard of either column must
    behave EXACTLY as it did yesterday. All 38 real services on production are in that state.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES.
    The real `create_reservation` runs against test_lia_reservation_t1's proven fakes, with the
    catalog lookup replaced so the contract column can be varied. Nothing else is stubbed -- the
    working-hours gate, the conflict check and the customer resolve are all the real ones.
"""
import ast
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repositories import catalog_service_repo                     # noqa: E402
from app.services import reservation_service as rs                    # noqa: E402
from test_lia_reservation_t1 import (                                 # noqa: E402
    WORKING_HOURS, install, Row, CLIENT, BARBER, SERVICE, _done, _drain,
)

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _future() -> datetime:
    """A real open slot: tomorrow at 11:00, skipping the shop's closed days."""
    d = (datetime.now().replace(tzinfo=timezone.utc) + timedelta(days=1)).replace(
        hour=11, minute=0, second=0, microsecond=0)
    while d.strftime("%A").lower() in WORKING_HOURS["closed_days"]:
        d += timedelta(days=1)
    return d


async def book(source, service_kwargs=None, phone="96170123456"):
    """The REAL create_reservation, with only the catalog lookup varied."""
    prisma, sends, restore = install()
    orig = catalog_service_repo.find_catalog_service
    fields = {"id": SERVICE, "clientId": CLIENT, "nameAr": "استشارة", "durationMin": 30}
    fields.update(service_kwargs or {})
    catalog_service_repo.find_catalog_service = lambda cid, sid: _done(Row(**fields))
    try:
        res = await rs.create_reservation(
            client_id=CLIENT, module_key="barber", customer_name="أحمد",
            customer_phone=phone, reserved_at=_future(), duration_min=30, notes=None,
            metadata={"barber_id": BARBER, "service_id": SERVICE}, source=source,
            notify_merchant=False)
        await _drain()
        return res, None
    except ValueError as exc:
        await _drain()
        return None, str(exc)
    finally:
        catalog_service_repo.find_catalog_service = orig
        restore()


REFUSAL = "This service can only be booked by the clinic. Please contact us directly."


async def main():
    print("── SM · the Booking Contract, enforced against the CHANNEL ──")

    # SM-1 — the regression that matters: a service with neither column is untouched.
    res, err = await book("website")
    check("SM-1  a service that has never heard of these columns books exactly as before",
          res is not None and err is None, str(err))

    # SM-2 / SM-3 — patient-facing channels are subject to it.
    _, err = await book("website", {"bookableBy": "staff_only"})
    check("SM-2  staff_only + website -> refused", err == REFUSAL, str(err))
    _, err = await book("whatsapp", {"bookableBy": "staff_only"})
    check("SM-3  staff_only + whatsapp -> refused", err == REFUSAL, str(err))

    # SM-4 / SM-5 — staff channels are not.
    res, err = await book("admin", {"bookableBy": "staff_only"})
    check("SM-4  staff_only + admin -> BOOKED (the whole point of the column)",
          res is not None and err is None, str(err))
    res, err = await book("lia", {"bookableBy": "staff_only"})
    check("SM-5  staff_only + lia -> BOOKED — the owner is not a patient",
          res is not None and err is None, str(err))

    # SM-6 — the allow-list direction, measured rather than asserted in prose.
    res, err = await book(None, {"bookableBy": "staff_only"})
    check("SM-6  staff_only + source=None -> BOOKED (allow-list, not deny-list)",
          res is not None and err is None, str(err))
    res, err = await book("some_future_channel", {"bookableBy": "staff_only"})
    check("SM-6b a channel that does not exist yet is NOT silently restricted",
          res is not None and err is None, str(err))

    # SM-7 — the open value, from every channel.
    for src in ("website", "whatsapp", "admin", "lia"):
        res, err = await book(src, {"bookableBy": "patients"})
        check(f"SM-7  bookable_by='patients' + {src} -> booked",
              res is not None and err is None, str(err))

    # SM-10 — fail-open on a value nobody recognises.
    res, err = await book("website", {"bookableBy": "patiints"})
    check("SM-10 an unrecognised value books rather than silently closing the clinic",
          res is not None and err is None, str(err))

    print("\n── the shape of the rule, as code ──")
    src = open("app/services/reservation_service.py", encoding="utf-8").read()
    tree = ast.parse(src)
    body = ast.unparse(next(n for n in ast.walk(tree)
                            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
                            and n.name == "create_reservation"))
    check("SM-9  enforced in exactly ONE place — create_reservation, never a route",
          src.count("PATIENT_FACING_SOURCES") == 2      # the definition + the one use
          and body.count("PATIENT_FACING_SOURCES") == 1, str(src.count("PATIENT_FACING_SOURCES")))
    routes = [open(f"app/api/v1/{p}", encoding="utf-8").read()
              for p in ("public/reservations.py", "admin/reservations.py")]
    check("SM-9b no route carries a second copy of the rule",
          not any("bookable_by" in r or "bookableBy" in r for r in routes))
    check("SM-9c the allow-list is a frozenset literal in code, not a config value or a DB read",
          'PATIENT_FACING_SOURCES = frozenset({"website", "whatsapp"})' in src)
    check("SM-9d the refusal reads the column defensively, so a pre-P3 row cannot crash it",
          'getattr(catalog_service, "bookableBy", "patients")' in src)

    print("\n── SM-8 · instructions reaches the public projection ──")
    from app.services import catalog_service_service as css
    fmt = css._fmt(Row(id="s1", categoryId="c", nameAr="x", nameEn=None, descriptionAr=None,
                       descriptionEn=None, imageUrl=None, price=None, currency="USD",
                       durationMin=30, isActive=True, isFeatured=False, sortOrder=0,
                       metadata=None, instructions="جيب تقاريرك القديمة",
                       bookableBy="staff_only"))
    check("SM-8  both fields appear on the projection both admin and public read",
          fmt["instructions"] == "جيب تقاريرك القديمة" and fmt["bookable_by"] == "staff_only")
    fmt_old = css._fmt(Row(id="s1", categoryId="c", nameAr="x", nameEn=None, descriptionAr=None,
                           descriptionEn=None, imageUrl=None, price=None, currency="USD",
                           durationMin=30, isActive=True, isFeatured=False, sortOrder=0,
                           metadata=None))
    check("SM-8b a row lacking them reads as NULL / 'patients', never as a crash",
          fmt_old["instructions"] is None and fmt_old["bookable_by"] == "patients")

    print("\n── RG · nothing else moved ──")
    check("RG  patient_category is NOT in the schema — deferred means absent, not hidden",
          "patient_category" not in open("prisma/schema.prisma", encoding="utf-8").read()
          and "patientCategory" not in open("prisma/schema.prisma", encoding="utf-8").read())
    check("RG  the P1 vertical fence is untouched",
          "_LIA_VERTICALS = frozenset({\"barber\"})"
          in open("app/services/lia_owner_entry.py", encoding="utf-8").read())
    check("RG  the P2 patient parameter is untouched",
          "patient_id" in body and "patient_service.assert_contact_may_act" in body)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
