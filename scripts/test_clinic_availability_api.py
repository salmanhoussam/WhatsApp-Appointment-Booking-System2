"""Clinic P4-D — the API. API-1…API-16 · RG.

Run:  venv/bin/python scripts/test_clinic_availability_api.py

WHAT THIS PROVES
    The clinic gets its own endpoints, and the barber's contract does not move. Two halves of
    ق-٤-ب meet here: the PICKER filters by service, and the ENGINE refuses an ineligible pair —
    so the UI can never offer a doctor the availability call would then reject.

    🔴 THE PICKER'S FILTER IS HARD AND THE BARBER'S IS SOFT, by decision (ق-٤-ز). API-10 and
    RG-3 are the two halves of that sentence measured against each other: an unmatched service
    returns NOTHING for the clinic and THE FULL LIST for the barber, in the same run.

    This is the first suite in this project to drive the real routes through FastAPI's TestClient.
    That is the point rather than a convenience: status codes, parameter validation and the
    dependency chain are the contract here, and none of them is visible from the service layer.
    The service gate is NOT bypassed — it runs for real, with only the database answer faked, so
    API-16 can prove a tenant without `reservations` is still refused.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION.
    Everything is faked at the repository boundary. The routes, the gate, the service, the engine
    and the error mapping are all real.
"""
import asyncio
import os
import sys
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient                              # noqa: E402

from app.main import app                                              # noqa: E402
from app.core import services as core_services                        # noqa: E402
from app.db.dependencies import get_current_tenant                    # noqa: E402
from app.repositories import (                                        # noqa: E402
    barber_repo, barber_service_repo, catalog_service_repo,
    resource_repo, resource_service_repo,
)
from app.services import reservation_service as rs                    # noqa: E402

ok = True
CLIENT = "c1"
# REAL UUIDs, because the route types resource_id/service_id as UUID on purpose -- the same
# Phase 1.x fix the barber route carries, so a malformed id becomes a clean 422 instead of
# reaching Prisma and surfacing as a raw 500. The first version of this file used "res-a" and
# got 422 everywhere: the route was right and the fixture was wrong.
DOC_A   = "11111111-1111-1111-1111-111111111111"
DOC_B   = "22222222-2222-2222-2222-222222222222"
DOC_OFF = "33333333-3333-3333-3333-333333333333"
SERVICE = "44444444-4444-4444-4444-444444444444"
UNKNOWN_RES = "99999999-9999-9999-9999-999999999999"
UNKNOWN_SVC = "88888888-8888-8888-8888-888888888888"
BASE = "/api/v1/public/reservations"
HOURS = {"open_time": "09:00", "close_time": "17:00", "closed_days": ["monday"]}
FUTURE = "2026-09-30"          # a Wednesday


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


class Row:
    def __init__(self, **kw): self.__dict__.update(kw)


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


CALLS: list = []               # every tenant id the fakes were handed


# ── fakes, installed once at the repository boundary ────────────────────────────────────────────
class FakeReservationRepo:
    def __init__(self, _db): pass

    async def find_by_resource_on_date(self, client_id, resource_id, day_start, day_end):
        CALLS.append(("day_query", client_id, resource_id))
        return []


class FakeClientTable:
    async def find_unique(self, where):
        return Row(id=where["id"], config={})


class FakeClientServiceTable:
    active = True

    async def find_first(self, where):
        CALLS.append(("gate", where.get("clientId"), where.get("serviceKey")))
        return Row(id="cs-1") if FakeClientServiceTable.active else None


class FakePrisma:
    client = FakeClientTable()
    clientservice = FakeClientServiceTable()


RESOURCES = {
    DOC_A: Row(id=DOC_A, clientId=CLIENT, name="د. سارة", specialty="جلدية", type="doctor",
               isActive=True, workingHours=HOURS),
    DOC_B: Row(id=DOC_B, clientId=CLIENT, name="د. فيصل", specialty="أسنان", type="doctor",
               isActive=True, workingHours=HOURS),
    DOC_OFF: Row(id=DOC_OFF, clientId=CLIENT, name="د. معطَّل", specialty=None, type="doctor",
                 isActive=False, workingHours=HOURS),
}
ELIGIBLE = {(CLIENT, DOC_A, SERVICE)}       # only doctor A performs the service


def install():
    rs.prisma_client = FakePrisma()
    rs.ReservationRepository = FakeReservationRepo
    core_services.prisma_client = FakePrisma()

    resource_repo.find_resource = lambda cid, rid: _done(
        RESOURCES.get(rid) if cid == CLIENT else None)
    resource_repo.list_resources = lambda cid, resource_type=None, active_only=False: _done(
        [r for r in RESOURCES.values() if (r.isActive or not active_only)])
    catalog_service_repo.find_catalog_service = lambda cid, sid: _done(
        Row(id=sid, clientId=cid, nameAr="معاينة", durationMin=30) if sid == SERVICE else None)
    resource_service_repo.is_eligible = lambda cid, rid, sid: _done((cid, rid, sid) in ELIGIBLE)
    resource_service_repo.list_resource_ids_for_service = lambda cid, sid: _done(
        [r for (c, r, s) in ELIGIBLE if c == cid and s == sid])
    # the barber side, so RG-3 can compare the two pickers in the same run
    barber_repo.list_barbers = lambda cid, active_only=False: _done(
        [Row(id="b1", clientId=cid, name="حسين", isActive=True, imageUrl=None, description=None,
             specialty=None, sortOrder=0, workingHours=HOURS)])
    barber_service_repo.list_barber_ids_for_service = lambda cid, sid: _done([])
    # RG-2 drives the REAL barber availability route, which reaches barber_repo.find_barber and
    # would otherwise hit an unconnected Prisma client. Faked to "no such barber", so the route
    # answers on its own terms (404) rather than being skipped.
    barber_repo.find_barber = lambda cid, bid: _done(None)

    app.dependency_overrides[get_current_tenant] = lambda: {
        "id": CLIENT, "slug": "clinic-test", "currency": "USD"}


def main() -> int:
    install()
    client = TestClient(app)
    spec = app.openapi()["paths"]
    NEW = "/api/v1/public/reservations/resources/{resource_id}/availability"

    print("\n── API · the contract, read off the live OpenAPI schema ──")
    check("API-1  the clinic availability route exists, as a SIBLING of the barber one",
          NEW in spec and "/api/v1/public/reservations/availability" in spec)
    params = {p["name"]: p for p in spec[NEW]["get"]["parameters"]}
    check("API-2  🔴 it takes NO duration_min — the server owns it (ق-٤-أ)",
          "duration_min" not in params
          and sorted(params) == ["date", "resource_id", "service_id"],
          str(sorted(params)))
    check("API-3  service_id is REQUIRED here (the duration has nowhere else to come from)",
          params["service_id"]["required"] is True and params["date"]["required"] is True)
    bar = {p["name"]: p["required"]
           for p in spec["/api/v1/public/reservations/availability"]["get"]["parameters"]}
    check("API-4  the BARBER endpoint's parameters are untouched",
          bar == {"barber_id": True, "date": True, "duration_min": True}, str(bar))

    print("\n── API · the engine behind the route ──")
    r = client.get(f"{BASE}/resources/{DOC_A}/availability",
                   params={"service_id": SERVICE, "date": FUTURE})
    body = r.json()
    check("API-5  an eligible pair returns real slots",
          r.status_code == 200 and body["success"] and len(body["data"]) == 16
          and body["data"][0]["time"] == "09:00",
          f"{r.status_code} · {len(body.get('data', []))} slots")
    r = client.get(f"{BASE}/resources/{DOC_B}/availability",
                   params={"service_id": SERVICE, "date": FUTURE})
    check("API-6  🔴 an INELIGIBLE pair is 409, not an empty 200",
          r.status_code == 409
          # the centralized handler wraps every error as {"code", "message", "details"} --
          # read the real envelope rather than assume a bare string
          and r.json()["error"]["message"]
          == "This resource does not provide the requested service."
          and r.json()["error"]["code"] == "CONFLICT",
          f"{r.status_code} · {r.json()}")
    for label, rid, sid, code, frag in (
        ("API-7  an unknown resource -> 404", UNKNOWN_RES, SERVICE, 404, "Resource not found"),
        ("API-8  an INACTIVE resource -> 404", DOC_OFF, SERVICE, 404, "not currently accepting"),
        ("API-9  an unknown service -> 404", DOC_A, UNKNOWN_SVC, 404, "Service not found"),
    ):
        r = client.get(f"{BASE}/resources/{rid}/availability",
                       params={"service_id": sid, "date": FUTURE})
        check(label, r.status_code == code and frag in str(r.json()),
              f"{r.status_code} · {r.json()}")
    r = client.get(f"{BASE}/resources/{DOC_A}/availability",
                   params={"service_id": SERVICE, "date": "30-09-2026"})
    check("API-10 a malformed date -> 400, before anything is looked up", r.status_code == 400)
    r = client.get(f"{BASE}/resources/{DOC_A}/availability", params={"date": FUTURE})
    check("API-11 a missing service_id -> 422 from validation, not a 500", r.status_code == 422)
    r = client.get(f"{BASE}/resources/{DOC_A}/availability",
                   params={"service_id": SERVICE, "date": "2026-09-28"})
    check("API-12 a closed day -> 200 with an empty list (closed is not an error)",
          r.status_code == 200 and r.json()["data"] == [])

    print("\n── API · the picker, and the hard filter ──")
    r = client.get(f"{BASE}/resources", params={"module_key": "clinic"})
    check("API-13 with NO service_id it lists every ACTIVE resource — unchanged behaviour",
          r.status_code == 200 and {d["id"] for d in r.json()["data"]} == {DOC_A, DOC_B},
          str([d["id"] for d in r.json()["data"]]))
    r = client.get(f"{BASE}/resources", params={"module_key": "clinic", "service_id": SERVICE})
    check("API-14 with a service_id it returns ONLY the qualified doctor",
          r.status_code == 200 and [d["id"] for d in r.json()["data"]] == [DOC_A],
          str([d["id"] for d in r.json()["data"]]))
    r = client.get(f"{BASE}/resources", params={"module_key": "clinic", "service_id": UNKNOWN_SVC})
    check("API-15 🔴 a service NOBODY performs returns EMPTY — no soft fallback (ق-٤-ز)",
          r.status_code == 200 and r.json()["data"] == [], str(r.json()["data"]))
    r = client.get(f"{BASE}/resources", params={"module_key": "barber"})
    check("API-16 a non-resource-backed module_key still returns []",
          r.status_code == 200 and r.json()["data"] == [])

    print("\n── RG · what must NOT have moved ──")
    r = client.get(f"{BASE}/barbers", params={"service_id": UNKNOWN_SVC})
    check("RG-1  🔴 the BARBER picker is still SOFT — the same unmatched service returns the FULL "
          "list there and NOTHING for the clinic, in this very run",
          r.status_code == 200 and len(r.json()["data"]) == 1,
          f"barber={len(r.json()['data'])} vs clinic=0")
    r = client.get(f"{BASE}/availability",
                   params={"barber_id": UNKNOWN_RES, "date": FUTURE, "duration_min": 30})
    check("RG-2  the barber availability route still answers on its own terms — its own lookup, "
          "its own 404, unchanged by any of this",
          r.status_code == 404 and "Barber not found" in r.json()["error"]["message"],
          f"{r.status_code} · {r.json()['error']['message']}")
    gates = [c for c in CALLS if c[0] == "gate"]
    check("RG-3  every request really passed the service gate, scoped to the tenant",
          gates and all(c[1] == CLIENT and c[2] == "reservations" for c in gates),
          f"{len(gates)} gate checks")
    days = [c for c in CALLS if c[0] == "day_query"]
    check("RG-4  every day query carried the tenant id (AV-9)",
          days and all(c[1] == CLIENT for c in days), f"{len(days)} day queries")

    FakeClientServiceTable.active = False
    r = client.get(f"{BASE}/resources/{DOC_A}/availability",
                   params={"service_id": SERVICE, "date": FUTURE})
    check("RG-5  a tenant WITHOUT the reservations service is refused 403 — the gate is real, "
          "not bypassed by these fakes",
          r.status_code == 403, str(r.status_code))
    FakeClientServiceTable.active = True

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
