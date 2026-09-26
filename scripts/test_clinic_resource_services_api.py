"""Clinic P5-B — the write side of eligibility. RS-1…RS-10 · E2E-1…E2E-3 · RG.

Run:  venv/bin/python scripts/test_clinic_resource_services_api.py

WHAT THIS PROVES
    `resource_services` has existed since P4-C-U1, the strict rule has been enforced in the
    availability reader AND (since P5-A) in the booking writer -- and NOTHING could put a row in
    it. Every clinic therefore offered zero doctors: correct by ق-٤-ز, and unusable.

    P5-B adds exactly two admin routes. This suite proves the whole chain now closes:

        PATCH /admin/resources/{id}/services   →  resource_services  →  the PUBLIC picker

    E2E-1…E2E-3 are the heart: after assigning service A to doctor ONE only, the public picker
    returns that doctor for A and returns NOTHING for B. 🔴 There is no fallback to "show every
    doctor", and RG-3 asserts its absence structurally rather than trusting the observation.

    The repository logic is REAL here -- `resource_services` is faked as an in-memory table with
    find_many/find_first/delete_many/create_many, so `resource_service_repo`'s own queries run,
    including the clientId in every where clause.

NO NETWORK, NO DATABASE, NO SENDS, NO PRODUCTION DATA, NO TENANT.
"""
import ast
import asyncio
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient                             # noqa: E402

from app.main import app                                              # noqa: E402
from app.core import services as core_services                        # noqa: E402
from app.core import tenant as core_tenant                            # noqa: E402
from app.db.dependencies import get_current_tenant                    # noqa: E402
from app.api.v1.admin import get_authenticated_tenant                 # noqa: E402
from app.repositories import (                                        # noqa: E402
    barber_repo, barber_service_repo, catalog_service_repo,
    resource_repo, resource_service_repo,
)

ok = True
CLIENT = "c1"
DOC_1 = "11111111-1111-1111-1111-111111111111"
DOC_2 = "22222222-2222-2222-2222-222222222222"
SVC_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
SVC_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
FOREIGN_SVC = "ffffffff-ffff-ffff-ffff-ffffffffffff"   # exists, but on another tenant
ADMIN = "/api/v1/admin/resources"
PUB = "/api/v1/public/reservations"


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


# ── an in-memory `resource_services`, so the REAL repository runs against it ─────────────────────
class FakeResourceServiceTable:
    rows: list = []
    wheres: list = []

    async def find_many(self, where=None):
        FakeResourceServiceTable.wheres.append(where)
        return [r for r in FakeResourceServiceTable.rows if self._match(r, where)]

    async def find_first(self, where=None):
        FakeResourceServiceTable.wheres.append(where)
        hits = [r for r in FakeResourceServiceTable.rows if self._match(r, where)]
        return hits[0] if hits else None

    async def delete_many(self, where=None):
        FakeResourceServiceTable.rows = [
            r for r in FakeResourceServiceTable.rows if not self._match(r, where)]

    async def create_many(self, data=None):
        for d in (data or []):
            FakeResourceServiceTable.rows.append(Row(id=f"rs{len(FakeResourceServiceTable.rows)}", **d))

    @staticmethod
    def _match(row, where):
        # Deliberately literal: every key in the where clause must match. That is what makes a
        # MISSING clientId in the repository a visible failure instead of a silent pass.
        return all(getattr(row, k, None) == v for k, v in (where or {}).items())


class FakeClientServiceTable:
    async def find_first(self, where):
        return Row(id="cs-1")


class FakePrisma:
    resourceservice = FakeResourceServiceTable()
    clientservice = FakeClientServiceTable()


RESOURCES = {
    DOC_1: Row(id=DOC_1, clientId=CLIENT, name="د. سارة", specialty="جلدية", type="doctor",
               isActive=True, workingHours=None, sortOrder=0, phone=None, createdAt=None),
    DOC_2: Row(id=DOC_2, clientId=CLIENT, name="د. فيصل", specialty="أسنان", type="doctor",
               isActive=True, workingHours=None, sortOrder=0, phone=None, createdAt=None),
}
TENANT_SERVICES = {SVC_A, SVC_B}


def install(role="TENANT_ADMIN"):
    resource_service_repo.prisma_client = FakePrisma()
    core_services.prisma_client = FakePrisma()
    FakeResourceServiceTable.rows = []
    FakeResourceServiceTable.wheres = []

    resource_repo.find_resource = lambda cid, rid: _done(
        RESOURCES.get(rid) if cid == CLIENT else None)
    resource_repo.list_resources = lambda cid, resource_type=None, active_only=False: _done(
        list(RESOURCES.values()) if cid == CLIENT else [])
    # FOREIGN_SVC is a real service -- on someone else's tenant. So this returns None for it,
    # exactly as the real tenant-scoped query would.
    catalog_service_repo.find_catalog_service = lambda cid, sid: _done(
        Row(id=sid, clientId=cid, nameAr="خدمة", durationMin=30)
        if (cid == CLIENT and sid in TENANT_SERVICES) else None)
    barber_repo.list_barbers = lambda cid, active_only=False: _done(
        [Row(id="b1", clientId=cid, name="حسين", isActive=True, imageUrl=None,
             description=None, specialty=None, sortOrder=0, workingHours=None)])
    barber_service_repo.list_barber_ids_for_service = lambda cid, sid: _done([])

    _tenant = {"id": CLIENT, "slug": "clinic-test", "currency": "USD"}
    app.dependency_overrides[get_current_tenant] = lambda: _tenant
    # The admin router mounts every protected route behind ONE router-level dependency
    # (`get_authenticated_tenant`), which answers 401 long before a route's own require_roles is
    # reached. Overriding only the route-level gate would have tested nothing -- the first version
    # of this file got 401 everywhere and the routes never ran.
    app.dependency_overrides[get_authenticated_tenant] = lambda: _tenant
    # require_roles calls get_current_admin_user DIRECTLY, not through Depends, so it cannot be
    # reached with dependency_overrides. Patched at the module the dependency reads, which keeps
    # the REAL role logic running -- including its deny-by-default for permission-carrying
    # accounts (invariant I4).
    async def _fake_user(request):
        return Row(role=role, permissions=None, client_id=CLIENT, id="u1",
                   email="admin@dev.invalid")
    core_tenant.get_current_admin_user = _fake_user


def main() -> int:
    install()
    client = TestClient(app)

    print("\n── RS · the two routes ──")
    r = client.get(f"{ADMIN}/{DOC_1}/services")
    check("RS-1  a doctor with no assignments reads as [] — 'performs none', not 'unknown'",
          r.status_code == 200 and r.json()["data"] == [], f"{r.status_code} {r.json()}")
    r = client.patch(f"{ADMIN}/{DOC_1}/services", json={"service_ids": [SVC_A, SVC_B]})
    check("RS-2  assigning two services returns them, and GET reads the same back",
          r.status_code == 200 and sorted(r.json()["data"]) == sorted([SVC_A, SVC_B])
          and sorted(client.get(f"{ADMIN}/{DOC_1}/services").json()["data"]) == sorted([SVC_A, SVC_B]),
          str(r.json().get("data")))
    r = client.patch(f"{ADMIN}/{DOC_1}/services", json={"service_ids": [SVC_B]})
    check("RS-3  it is a FULL REPLACE — [A,B] then [B] leaves exactly [B]",
          r.status_code == 200 and r.json()["data"] == [SVC_B], str(r.json()["data"]))
    r = client.patch(f"{ADMIN}/{DOC_1}/services", json={"service_ids": []})
    check("RS-4  an empty list is expressible — a doctor can be assigned nothing on purpose",
          r.status_code == 200 and r.json()["data"] == [])

    print("\n── RS · 🔴 the deliberate difference from the barber: the tenant is validated ──")
    client.patch(f"{ADMIN}/{DOC_1}/services", json={"service_ids": [SVC_A]})
    r = client.patch(f"{ADMIN}/{DOC_1}/services", json={"service_ids": [SVC_A, FOREIGN_SVC]})
    check("RS-5  a service belonging to ANOTHER tenant is refused 404",
          r.status_code == 404 and "Service not found for this tenant" in str(r.json()),
          f"{r.status_code}")
    check("RS-6  and NOTHING was written — validation runs before the delete-then-create, so the "
          "resource is never left half-assigned",
          client.get(f"{ADMIN}/{DOC_1}/services").json()["data"] == [SVC_A],
          str(client.get(f"{ADMIN}/{DOC_1}/services").json()["data"]))
    r = client.get(f"{ADMIN}/99999999-9999-9999-9999-999999999999/services")
    check("RS-7  an unknown resource is 404 on read", r.status_code == 404)
    r = client.patch(f"{ADMIN}/99999999-9999-9999-9999-999999999999/services",
                     json={"service_ids": [SVC_A]})
    check("RS-8  and 404 on write", r.status_code == 404)
    check("RS-9  every repository query carried clientId — measured from the where clauses the "
          "fake table recorded, not assumed",
          FakeResourceServiceTable.wheres
          and all("clientId" in (w or {}) for w in FakeResourceServiceTable.wheres),
          f"{len(FakeResourceServiceTable.wheres)} queries")

    print("\n── RS · the role gate is real ──")
    install(role="MANAGER_RESERVATIONS")
    client = TestClient(app)
    r_read = client.get(f"{ADMIN}/{DOC_1}/services")
    r_write = client.patch(f"{ADMIN}/{DOC_1}/services", json={"service_ids": [SVC_A]})
    check("RS-10 MANAGER_RESERVATIONS may READ the assignments and may NOT write them — this "
          "file's own ownership rule, unchanged",
          r_read.status_code == 200 and r_write.status_code == 403,
          f"read={r_read.status_code} write={r_write.status_code}")

    print("\n── 🔴 E2E · admin write → public picker, the chain P5-B exists to close ──")
    install()
    client = TestClient(app)
    client.patch(f"{ADMIN}/{DOC_1}/services", json={"service_ids": [SVC_A]})
    r = client.get(f"{PUB}/resources", params={"module_key": "clinic", "service_id": SVC_A})
    check("E2E-1 after assigning A to doctor ONE, the public picker returns exactly that doctor",
          r.status_code == 200 and [d["id"] for d in r.json()["data"]] == [DOC_1],
          str([d["id"] for d in r.json()["data"]]))
    r = client.get(f"{PUB}/resources", params={"module_key": "clinic", "service_id": SVC_B})
    check("E2E-2 🔴 and returns NOTHING for service B — no fallback to 'show every doctor'",
          r.status_code == 200 and r.json()["data"] == [], str(r.json()["data"]))
    r = client.get(f"{PUB}/resources", params={"module_key": "clinic"})
    check("E2E-3 with no service_id it still lists both — the filter narrows, it does not gate",
          {d["id"] for d in r.json()["data"]} == {DOC_1, DOC_2})

    print("\n── RG · what must NOT have moved ──")
    pub_src = io.open("app/api/v1/public/reservations.py", encoding="utf-8").read()
    picker = None
    for n in ast.walk(ast.parse(pub_src)):
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == "list_public_resources":
            node = ast.parse(ast.unparse(n)).body[0]
            if isinstance(node.body[0], ast.Expr) and isinstance(node.body[0].value, ast.Constant):
                node.body = node.body[1:]
            picker = ast.unparse(node)
    check("RG-1  the clinic picker's ONLY source of eligibility is resource_service_repo",
          picker and "resource_service_repo.list_resource_ids_for_service" in picker)
    check("RG-2  🔴 and it contains NO fallback branch — no `if filtered:` reinstating the full "
          "list, measured on the code with its docstring stripped",
          picker and "if filtered" not in picker and "fall back" not in picker.lower())
    r = client.get(f"{PUB}/barbers", params={"service_id": SVC_B})
    check("RG-3  the BARBER picker is still SOFT — the same unassigned service returns the full "
          "list there and nothing for the clinic, in this very run",
          r.status_code == 200 and len(r.json()["data"]) == 1,
          f"barber={len(r.json()['data'])} clinic=0")
    bar_src = io.open("app/api/v1/admin/barbers.py", encoding="utf-8").read()
    check("RG-4  admin/barbers.py is untouched — still its own permission gate, still no tenant "
          "validation of the service ids (the barber's debt is not repaired from here)",
          'require_permission("staff.write"' in bar_src
          and "find_catalog_service" not in bar_src)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
