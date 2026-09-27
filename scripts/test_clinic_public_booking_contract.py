"""Clinic P5-C — the public booking body, the patient it resolves, and one refusal per cause.

Run:  venv/bin/python scripts/test_clinic_public_booking_contract.py

WHAT THIS PROVES

    ق-٥-ج option (أ), Salman 2026-09-27: the booking body carries the PATIENT ITSELF
    (`{name, phone?, relation}`) and `create_reservation` resolves it inside the same
    confirmation. There is no separate POST /patients, therefore no Patient row stranded when a
    session breaks between two calls.

    F-2, Salman 2026-09-27: one refusal is no longer one answer. Every cause carries its own
    `error_code`, and the route puts that code in the envelope so the client branches on a stable
    name instead of on prose. This matters twice: the server's sentences are ENGLISH while the
    approved patient-facing strings are Arabic and live in CLINIC_WEB_UX_CONTRACT §6.

    🔴 PT-5 is the assertion that carries the most weight, and it is the reason option (أ) was
    chosen over a separate endpoint. A booking refused by the conflict pre-check must leave
    ZERO patient behind. It passes because resolution is ordered AFTER every pre-check — not
    because the code says so, but measured by counting real rows in the fake.

    🔴 PT-4 encodes a departure from the words "find-or-create", forced by a ratified contract.
    `patient_service.match_in_contact` returns `{"status": "one"}` for a single name match, and its
    own docstring says that means ASK, NEVER ASSUME — "two people genuinely share a name often
    enough that this project has already shipped a contract for it" (علي ×2, barber daily log,
    2026-09-23, Salman's answer: "leave them separate"). A website confirmation has no turn in
    which to ask. So `relation=other` ALWAYS CREATES: a duplicate row a human can merge is
    recoverable, two different people collapsed into one medical record is not. `relation=self`
    does find-or-create, because "the patient is the person whose phone this is" has no ambiguity.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION, NO TENANT.
    The real `create_reservation`, the real `patient_service` and the real Pydantic models run.
    Only the repository boundary is faked — so `patient_service`'s own validation, role handling
    and list/link logic are exercised rather than replaced.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient                                  # noqa: E402
from pydantic import ValidationError                                       # noqa: E402
from app.main import app                                                   # noqa: E402
from app.core import services as core_services                             # noqa: E402
from app.db.dependencies import get_current_tenant                         # noqa: E402
from app.repositories import (                                             # noqa: E402
    catalog_service_repo, resource_repo, resource_service_repo, patient_repo,
)
from app.services import reservation_service as rs                         # noqa: E402
from app.api.v1.public.reservations import PatientIn, ReservationIn        # noqa: E402
from test_lia_reservation_t1 import (                                      # noqa: E402
    install as _t1_install, Row, CLIENT, _done,
)

ok = True
RES = "res-1"
SVC = "svc-1"
ELIGIBLE = {(CLIENT, RES, SVC)}
CUSTOMER = "cust-new"   # what the T1 fake really returns — measured, not chosen


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _when(hour=11):
    d = datetime.now().replace(tzinfo=timezone.utc) + timedelta(days=2)
    return d.replace(hour=hour, minute=0, second=0, microsecond=0)


class FakePatientStore:
    """The patient tables, as rows. Faked at the REPOSITORY boundary, not the service one.

    Deliberately no kinder than reality: `create_patient` never refuses a duplicate name (the real
    one does not either — that decision belongs to a human), and `list_patients_for_contact`
    returns link rows carrying a `.patient` with `.isActive`, exactly the shape
    `patient_service.list_for_contact` reads. A fake that returned dicts would have tested the fake.
    """

    def __init__(self, seed_links=()):
        self.patients = {}
        self.links = []
        self.created_patients = []
        self.created_links = []
        # `cust-new` is the id test_lia_reservation_t1's FakeCustomerTable really returns, because
        # its find_first always answers None so create_reservation always find-or-CREATES. Seeding
        # any other id would have made PT-2 fail for the wrong reason — and the fake still filters
        # by customer id rather than ignoring it, which is the whole point: a fake that dropped the
        # filter would have passed PT-2 while proving nothing (the AV-9 trap, 2026-09-26).
        for pid, name, role in seed_links:
            self.patients[pid] = Row(id=pid, clientId=CLIENT, name=name, isActive=True)
            self.links.append(Row(id=f"lnk-{pid}", clientId=CLIENT, patientId=pid,
                                  customerId=CUSTOMER, role=role,
                                  patient=self.patients[pid]))

    def install(self):
        self._orig = (patient_repo.find_patient, patient_repo.list_patients_for_contact,
                      patient_repo.find_link, patient_repo.create_patient,
                      patient_repo.create_link)
        patient_repo.find_patient = lambda cid, pid: _done(
            self.patients.get(pid) if cid == CLIENT else None)
        patient_repo.list_patients_for_contact = lambda cid, cust: _done(
            [l for l in self.links if l.clientId == cid and l.customerId == cust])
        patient_repo.find_link = lambda cid, pid, cust: _done(next(
            (l for l in self.links
             if l.clientId == cid and l.patientId == pid and l.customerId == cust), None))
        patient_repo.create_patient = lambda cid, name: self._create_patient(cid, name)
        patient_repo.create_link = lambda cid, pid, cust, role: self._create_link(
            cid, pid, cust, role)
        return self

    def restore(self):
        (patient_repo.find_patient, patient_repo.list_patients_for_contact,
         patient_repo.find_link, patient_repo.create_patient,
         patient_repo.create_link) = self._orig

    def _create_patient(self, cid, name):
        pid = f"pat-{len(self.patients) + 1}"
        row = Row(id=pid, clientId=cid, name=name, isActive=True)
        self.patients[pid] = row
        self.created_patients.append((pid, name))
        return _done(row)

    def _create_link(self, cid, pid, cust, role):
        row = Row(id=f"lnk-{len(self.links) + 1}", clientId=cid, patientId=pid,
                  customerId=cust, role=role, patient=self.patients[pid])
        self.links.append(row)
        self.created_links.append((pid, role))
        return _done(row)


async def book(patient=None, patient_id=None, existing=None, service_duration=60,
               bookable_by="patients", eligible=True, seed_links=(), module_key="clinic",
               metadata=None):
    """The REAL create_reservation. Only repositories are faked."""
    store = FakePatientStore(seed_links).install()
    prisma, sends, restore = _t1_install(existing=existing)
    orig = (resource_repo.find_resource, catalog_service_repo.find_catalog_service,
            resource_service_repo.is_eligible)
    resource_repo.find_resource = lambda cid, rid: _done(
        Row(id=rid, clientId=cid, name="د. سارة", type="doctor", isActive=True, workingHours=None))
    catalog_service_repo.find_catalog_service = lambda cid, sid: _done(
        Row(id=sid, clientId=cid, nameAr="معاينة", durationMin=service_duration,
            bookableBy=bookable_by))
    resource_service_repo.is_eligible = lambda cid, rid, sid: _done(bool(eligible))
    try:
        row = await rs.create_reservation(
            client_id=CLIENT, module_key=module_key, customer_name="أحمد",
            customer_phone="96170123456", reserved_at=_when(), duration_min=None,
            notes=None, metadata=metadata if metadata is not None
            else {"resource_id": RES, "service_id": SVC},
            source="website", patient=patient, patient_id=patient_id,
        )
        return None, row, store, prisma
    except Exception as exc:                                    # noqa: BLE001 — the subject
        return exc, None, store, prisma
    finally:
        (resource_repo.find_resource, catalog_service_repo.find_catalog_service,
         resource_service_repo.is_eligible) = orig
        store.restore()
        restore()


async def main():
    print("\n── 1. The body contract — what the public route accepts ──")

    p = PatientIn(name="ريم", relation="other")
    check("PB-1  the body carries {name, phone?, relation} and phone is optional",
          p.name == "ريم" and p.relation == "other" and p.phone is None, str(p.model_dump()))

    check("PB-2  relation defaults to 'self'", PatientIn(name="أحمد").relation == "self")

    try:
        PatientIn(name="ريم", relation="guardian")
        bad = False
    except ValidationError:
        bad = True
    check("PB-3  🔴 'guardian' is REFUSED by the model — F-1, before the service is reached", bad)

    try:
        PatientIn(name="ر")
        short = False
    except ValidationError:
        short = True
    check("PB-4  a one-character name is refused (min_length=2)", short)

    body = ReservationIn(module_key="clinic", customer_name="أحمد",
                         customer_phone="96170123456", reserved_at=_when())
    check("PB-5  INVARIANT — `patient` is OPTIONAL, so every existing caller is unaffected",
          body.patient is None)

    print("\n── 2. Resolution — relation decides the mechanism, and the contract decides why ──")

    exc, row, store, _ = await book(patient={"name": "أحمد", "relation": "self"})
    check("PT-1  relation=self with no existing patient → one created, linked role=self",
          exc is None and store.created_patients and store.created_links == [
              (store.created_patients[0][0], "self")],
          f"{store.created_patients} {store.created_links}")

    exc, row, store, _ = await book(patient={"name": "أحمد", "relation": "self"},
                                    seed_links=[("pat-9", "أحمد", "self")])
    check("PT-2  relation=self with an existing self patient → REUSED, nothing created",
          exc is None and store.created_patients == [] and store.created_links == [],
          f"created={store.created_patients}")

    exc, row, store, _ = await book(patient={"name": "ريم", "relation": "other"})
    check("PT-3  relation=other → a patient created and linked role=other",
          exc is None and store.created_links == [(store.created_patients[0][0], "other")],
          f"{store.created_links}")

    exc, row, store, _ = await book(patient={"name": "ريم", "relation": "other"},
                                    seed_links=[("pat-9", "ريم", "other")])
    check("PT-4  🔴 relation=other with the SAME NAME already present → creates a SECOND, "
          "never merges (match_in_contact: 'one' means ASK, and a website cannot ask)",
          exc is None and len(store.created_patients) == 1
          and store.created_patients[0][0] != "pat-9",
          f"created={store.created_patients} · pre-existing=pat-9")

    print("\n── 3. 🔴 No write before confirmation — the reason option (أ) was chosen ──")

    exc, row, store, _ = await book(
        patient={"name": "ريم", "relation": "other"},
        existing=[Row(id="r-x", reservedAt=_when(), durationMin=60, status="pending",
                      resourceId=RES, barberId=None)])
    check("PT-5  a booking refused by the conflict pre-check leaves ZERO patient and ZERO link",
          isinstance(exc, rs.SlotTaken) and store.created_patients == []
          and store.created_links == [],
          f"{type(exc).__name__} · patients={len(store.created_patients)}")

    exc, row, store, _ = await book(patient={"name": "ريم", "relation": "other"}, eligible=False)
    check("PT-6  an ineligible resource is refused BEFORE any patient exists",
          isinstance(exc, rs.ResourceDoesNotProvideService) and store.created_patients == [],
          f"{type(exc).__name__} · patients={len(store.created_patients)}")

    print("\n── 4. patient and patient_id are alternatives, not a merge ──")

    exc, row, store, _ = await book(patient={"name": "ريم", "relation": "other"},
                                    patient_id="pat-9", seed_links=[("pat-9", "ريم", "other")])
    check("PT-7  passing BOTH is refused — one names an existing patient, the other describes one",
          isinstance(exc, ValueError) and "never both" in str(exc), str(exc))

    exc, row, store, _ = await book(patient={"name": "ر", "relation": "self"})
    check("PT-8  a too-short name is refused by the SERVICE too, not only by Pydantic",
          isinstance(exc, ValueError) and "needs a name" in str(exc), str(exc))

    exc, row, store, _ = await book(patient={"name": "ريم", "relation": "guardian"})
    check("PT-9  🔴 'guardian' is refused at the SERVICE boundary as well — a caller that skips "
          "the model cannot write a claim this channel cannot support",
          isinstance(exc, ValueError) and "'self' or 'other'" in str(exc), str(exc))

    print("\n── 5. The error taxonomy — one code per cause (F-2, approved 2026-09-27) ──")

    expected = {
        "SlotTaken":                    ("SLOT_TAKEN", 409),
        "ResourceDoesNotProvideService": ("RESOURCE_SERVICE_MISMATCH", 409),
        "ServiceNotBookableOnline":     ("SERVICE_NOT_BOOKABLE_ONLINE", 409),
        "ServiceMisconfigured":         ("SERVICE_MISCONFIGURED", 409),
        "ServiceIdRequired":            ("SERVICE_ID_REQUIRED", 400),
        "SlotInPast":                   ("SLOT_IN_PAST", 400),
        "PatientNotFound":              ("PATIENT_NOT_FOUND", 404),
    }
    for name, (code, status) in expected.items():
        cls = getattr(rs, name)
        check(f"EC-{name:<30} code={code} status={status}",
              cls.error_code == code and cls.status_code == status
              and issubclass(cls, rs.ReservationRefused) and issubclass(cls, ValueError),
              f"{cls.error_code}/{cls.status_code}")

    check("EC-1  🔴 every one of them is STILL a ValueError — the four callers that wrap "
          "create_reservation in `except ValueError` are untouched",
          all(issubclass(getattr(rs, n), ValueError) for n in expected))

    check("EC-2  staff_only stayed 409, not 403 (Salman 2026-09-27 — 403 would have forced an "
          "amendment to T-6 and a STOP-4 crossing)",
          rs.ServiceNotBookableOnline.status_code == 409)

    print("\n── 6. The refusals fire with the right type, from the real function ──")

    exc, *_ = await book(patient={"name": "ريم", "relation": "other"}, bookable_by="staff_only")
    check("RF-1  a staff_only service from source='website' → ServiceNotBookableOnline",
          isinstance(exc, rs.ServiceNotBookableOnline), type(exc).__name__)

    exc, *_ = await book(patient={"name": "ريم", "relation": "other"}, service_duration=0)
    check("RF-2  a service with no usable duration → ServiceMisconfigured",
          isinstance(exc, rs.ServiceMisconfigured), type(exc).__name__)

    exc, *_ = await book(patient={"name": "ريم", "relation": "other"},
                         metadata={"resource_id": RES})
    check("RF-3  a resource-backed booking with no service_id → ServiceIdRequired (400)",
          isinstance(exc, rs.ServiceIdRequired) and exc.status_code == 400, type(exc).__name__)

    exc, *_ = await book(patient={"name": "ريم", "relation": "other"}, patient_id="ghost",
                         metadata={"resource_id": RES, "service_id": SVC})
    check("RF-4  an unknown patient_id → refused before anything is written",
          isinstance(exc, ValueError), f"{type(exc).__name__}: {exc}")

    print("\n── 7. 🔴 THROUGH THE REAL ROUTE — because a type is not an answer ──")
    # T-12's lesson, applied to itself: a claim about what the CLIENT receives is not proven by a
    # class attribute. The request has to arrive at the handler and come back with a real status and
    # a real envelope. Sections 5 and 6 prove the service raises the right thing; this one proves
    # the route TRANSLATES it, and that `error.code` — not prose, not the bare status — is what
    # carries the cause.
    _tenant = {"id": CLIENT, "slug": "cliniclab-test", "currency": "USD"}
    app.dependency_overrides[get_current_tenant] = lambda: _tenant
    # `require_service` cannot be overridden by key — the factory returns a NEW inner function per
    # call, so FastAPI has nothing stable to key on. It is faked where it actually reads instead:
    # `core_services.prisma_client`, the same seam P5-B's suite uses. And the fake answers a REAL
    # active row rather than skipping the check, so the gate still runs.
    class _GateTable:
        async def find_first(self, where=None, **kw):
            return Row(id="cs-1", clientId=CLIENT, serviceKey="reservations", isActive=True)

    class _GatePrisma:
        clientservice = _GateTable()

    _orig_gate = core_services.prisma_client
    core_services.prisma_client = _GatePrisma()
    seen = {}
    http_cases = [
        ("a taken slot",            dict(eligible=True,  bookable_by="patients",
                                         existing=True),  409, "SLOT_TAKEN"),
        ("an ineligible doctor",    dict(eligible=False, bookable_by="patients"),
                                                          409, "RESOURCE_SERVICE_MISMATCH"),
        ("a staff_only service",    dict(eligible=True,  bookable_by="staff_only"),
                                                          409, "SERVICE_NOT_BOOKABLE_ONLINE"),
        ("a service with no duration", dict(eligible=True, bookable_by="patients",
                                            service_duration=0), 409, "SERVICE_MISCONFIGURED"),
        ("a missing service_id",    dict(eligible=True,  bookable_by="patients",
                                         drop_service=True), 400, "SERVICE_ID_REQUIRED"),
    ]
    for label, cfg, want_status, want_code in http_cases:
        store = FakePatientStore().install()
        existing = [Row(id="r-x", reservedAt=_when(), durationMin=60, status="pending",
                        resourceId=RES, barberId=None)] if cfg.get("existing") else None
        prisma, sends, restore = _t1_install(existing=existing)
        orig = (resource_repo.find_resource, catalog_service_repo.find_catalog_service,
                resource_service_repo.is_eligible)
        resource_repo.find_resource = lambda cid, rid: _done(
            Row(id=rid, clientId=cid, name="د. سارة", type="doctor", isActive=True,
                workingHours=None))
        catalog_service_repo.find_catalog_service = lambda cid, sid: _done(
            Row(id=sid, clientId=cid, nameAr="معاينة",
                durationMin=cfg.get("service_duration", 60),
                bookableBy=cfg.get("bookable_by", "patients")))
        resource_service_repo.is_eligible = lambda cid, rid, sid: _done(cfg.get("eligible", True))
        meta = {"resource_id": RES} if cfg.get("drop_service") else {"resource_id": RES,
                                                                    "service_id": SVC}
        try:
            r = TestClient(app).post("/api/v1/public/reservations/", json={
                "module_key": "clinic", "customer_name": "أحمد",
                "customer_phone": "96170123456",
                "reserved_at": _when().isoformat(), "metadata": meta,
                "patient": {"name": "ريم", "relation": "other"},
            })
            body = r.json()
            got_code = (body.get("error") or {}).get("code")
            seen[want_code] = (r.status_code, got_code)
            check(f"HT-{want_code:<28} {label} → {want_status} + error.code",
                  r.status_code == want_status and got_code == want_code,
                  f"got {r.status_code} code={got_code}")
        finally:
            (resource_repo.find_resource, catalog_service_repo.find_catalog_service,
             resource_service_repo.is_eligible) = orig
            store.restore(); restore()

    # NOT a restatement of the loop: this asserts the RELATIONSHIP between two of its answers,
    # which is the property the whole taxonomy exists for. The first version of this line was
    # `check(..., True, ...)` — a tautology that would have stayed green through any regression.
    _a, _b = seen.get("SLOT_TAKEN"), seen.get("RESOURCE_SERVICE_MISMATCH")
    check("HT-1  🔴 the two 409s are DISTINGUISHABLE — same status, different code, read from the "
          "two real responses (this is the property the code exists for)",
          _a is not None and _b is not None and _a[0] == _b[0] == 409 and _a[1] != _b[1],
          f"{_a} vs {_b}")

    r = TestClient(app).post("/api/v1/public/reservations/", json={
        "module_key": "clinic", "customer_name": "أحمد", "customer_phone": "96170123456",
        "reserved_at": _when().isoformat(), "metadata": {"resource_id": RES, "service_id": SVC},
        "patient": {"name": "ريم", "relation": "guardian"},
    })
    check("HT-2  relation='guardian' over HTTP → 422 from the model, never a written row",
          r.status_code == 422, f"{r.status_code}")

    core_services.prisma_client = _orig_gate
    app.dependency_overrides.clear()

    print("\n── 8. INVARIANT — the barber path did not move ──")

    exc, row, store, _ = await book(module_key="barber", patient=None,
                                    metadata={"barber_id": "brb-1"})
    check("RG-1  a barber booking with NO patient still works and creates no patient row",
          store.created_patients == [] and store.created_links == [],
          f"{type(exc).__name__ if exc else 'ok'}")

    src = open("app/services/reservation_service.py", encoding="utf-8").read()
    check("RG-2  the resolution block is gated on `patient is not None` — a caller that omits it "
          "never reaches a line of it",
          src.count("if patient is not None:") == 2, str(src.count("if patient is not None:")))

    check("RG-3  and every refusal message is unchanged — the TYPE was added, the TEXT was not",
          "This slot is already reserved. Please choose a different time." in src
          and "This barber is already booked for that time. Please choose a different time." in src
          and "'{module_key}' reservations require a valid service_id." in src)

    print("\nALL GREEN" if ok else "\nFAILURES ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
