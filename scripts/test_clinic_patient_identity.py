"""Clinic P2 — Patient Identity Foundation. The regression gate Salman named IG-1…IG-11.

Run:  venv/bin/python scripts/test_clinic_patient_identity.py

WHAT THIS PROVES, in his own framing: **Clinic must not inherit the Barber identity model.**

The defect is not predicted, it is MEASURED on production 2026-09-25: three of ten `Customer`
rows carry reservations under more than one name; one `WALK_IN` row holds SEVEN people; two REAL
phone numbers hold five names between them. Every case below is a shape that data already has.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES.
    The Prisma tables the layer touches are replaced by in-memory fakes whose `where` handling is
    taken from the real repository calls -- including the `include={"patient": True}` join and
    the (patient_id, customer_id) uniqueness, because a fake poorer than reality gives false
    negatives. That exact failure cost a suite in P1 and is not repeated here.
"""
import ast
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repositories import patient_repo                             # noqa: E402
from app.services import patient_service as ps                        # noqa: E402
from app.services import reservation_service as rs                    # noqa: E402

ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


class _Row:
    def __init__(self, **kw): self.__dict__.update(kw)


class _Patients:
    def __init__(self, store): self.s = store

    async def find_first(self, where):
        for p in self.s["patients"]:
            if p.id == where.get("id") and p.clientId == where.get("clientId"):
                return p
        return None

    async def find_many(self, where, order=None):
        return [p for p in self.s["patients"]
                if p.clientId == where.get("clientId")
                and (where.get("isActive") is None or p.isActive == where["isActive"])]

    async def create(self, data):
        p = _Row(id=f"pat-{len(self.s['patients']) + 1}", clientId=data["clientId"],
                 name=data["name"], isActive=True)
        self.s["patients"].append(p)
        return p


class _Links:
    def __init__(self, store): self.s = store

    async def find_first(self, where):
        for l in self.s["links"]:
            if (l.clientId == where.get("clientId") and l.patientId == where.get("patientId")
                    and l.customerId == where.get("customerId")):
                return l
        return None

    async def find_many(self, where, include=None, order=None):
        out = []
        for l in self.s["links"]:
            if l.clientId != where.get("clientId") or l.customerId != where.get("customerId"):
                continue
            if include and include.get("patient"):
                l.patient = next((p for p in self.s["patients"] if p.id == l.patientId), None)
            out.append(l)
        return out

    async def create(self, data):
        # The real (patient_id, customer_id) unique constraint, honoured -- a fake that allows a
        # duplicate link would hide the very thing IG-4 relies on.
        for l in self.s["links"]:
            if l.patientId == data["patientId"] and l.customerId == data["customerId"]:
                raise RuntimeError("unique violation: (patient_id, customer_id)")
        l = _Row(id=f"lnk-{len(self.s['links']) + 1}", clientId=data["clientId"],
                 patientId=data["patientId"], customerId=data["customerId"], role=data["role"])
        self.s["links"].append(l)
        return l


class FakePrisma:
    def __init__(self, store):
        self.patient = _Patients(store)
        self.patientcontact = _Links(store)


def install():
    store = {"patients": [], "links": []}
    orig = patient_repo.prisma_client
    patient_repo.prisma_client = FakePrisma(store)

    def restore():
        patient_repo.prisma_client = orig
    return store, restore


C = "clinic-1"
MOTHER, FATHER, OTHER = "cust-mother", "cust-father", "cust-other"


async def main():
    print("── IG · the identity gate — «Clinic must not inherit the Barber identity model» ──")
    store, restore = install()
    try:
        # IG-1
        me = await ps.create_patient(C, "سلمى", MOTHER, role="self")
        check("IG-1  a contact booking for herself -> she IS the patient, role=self",
              me["role"] == "self" and me["linked_contact"] == MOTHER)

        # IG-2
        kid = await ps.create_patient(C, "أحمد", MOTHER, role="guardian")
        check("IG-2  the mother books for her son -> patient is the SON, contact is the MOTHER",
              kid["name"] == "أحمد" and kid["patient_id"] != me["patient_id"]
              and kid["linked_contact"] == MOTHER and kid["role"] == "guardian")

        # IG-3
        kid2 = await ps.create_patient(C, "زياد", MOTHER, role="guardian")
        mine = await ps.list_for_contact(C, MOTHER)
        check("IG-3  two children on one contact -> two DISTINCT patients, same contact",
              kid["patient_id"] != kid2["patient_id"] and len(mine) == 3,
              f"{len(mine)} patients on this contact")

        # IG-4
        linked = await ps.link_contact(C, kid["patient_id"], FATHER, role="guardian")
        after = await ps.list_for_contact(C, FATHER)
        check("IG-4  the SAME patient reachable from a second number -> no new patient row",
              linked["created"] is True and len(store["patients"]) == 3
              and [p["patient_id"] for p in after] == [kid["patient_id"]])
        again = await ps.link_contact(C, kid["patient_id"], FATHER, role="guardian")
        check("IG-4b re-linking is a fact, not an exception, and creates nothing",
              again["created"] is False and len(store["links"]) == 4)

        # IG-5
        other_list = await ps.list_for_contact(C, OTHER)
        check("IG-5  one contact with several patients never merges them",
              len({p["patient_id"] for p in mine}) == 3 and other_list == [])

        # IG-9 / IG-10
        dup = await ps.create_patient(C, "أحمد", MOTHER, role="guardian")
        m1 = await ps.match_in_contact(C, MOTHER, "احمد")      # unfolded spelling, on purpose
        check("IG-9  a repeated folded name is reported, NOT merged",
              m1["status"] == "many" and len(m1["candidates"]) == 2, str(m1["status"]))
        check("IG-9b and the second row really was created — the detector never blocks a write",
              dup["patient_id"] != kid["patient_id"] and len(store["patients"]) == 4)
        m2 = await ps.match_in_contact(C, MOTHER, "زياد")
        check("IG-10 exactly one candidate is still a QUESTION, never an assumption",
              m2["status"] == "one" and m2["candidate"]["name"] == "زياد")
        m3 = await ps.match_in_contact(C, MOTHER, "خالد")
        check("IG-10b an unknown name is 'none' -> create",  m3["status"] == "none")

        # IG-11
        walkin = await ps.create_patient(C, "رجل بلا رقم")
        check("IG-11 a patient with NO contact is valid, not an error",
              walkin["linked_contact"] is None and walkin["role"] is None)

        # IG-5 again, from the other side: cross-contact isolation
        m4 = await ps.match_in_contact(C, OTHER, "أحمد")
        check("IG-hɛ a name known to ANOTHER contact is invisible here — no cross-contact match",
              m4["status"] == "none")

        print("\n── SEC · tenant and ownership ──")
        other_tenant = await ps.match_in_contact("clinic-2", MOTHER, "أحمد")
        check("SEC-1 another tenant sees nothing, by the where clause",
              other_tenant["status"] == "none")
        raised = ""
        try:
            await ps.assert_contact_may_act(C, kid["patient_id"], OTHER)
        except ps.PatientAccessDenied as exc:
            raised = str(exc)
        check("SEC-3 a REAL patient reached for by the wrong contact is refused, by name",
              raised == "patient_not_linked_to_contact", raised)
        raised = ""
        try:
            await ps.assert_contact_may_act("clinic-2", kid["patient_id"], MOTHER)
        except ps.PatientAccessDenied as exc:
            raised = str(exc)
        check("SEC-1b the same id under another tenant is 'not found', not 'not linked'",
              raised == "patient_not_found_in_tenant", raised)
        await ps.assert_contact_may_act(C, walkin["patient_id"], None)
        check("SEC-3b staff case (no contact) passes on tenant ownership alone", True)
    finally:
        restore()

    print("\n── the five rules, as CODE rather than intention ──")
    #
    # 🔴 THESE CHECKS PARSE THE CODE, NOT THE FILE TEXT, and the distinction is load-bearing
    # here rather than stylistic. `patient_service` DOCUMENTS why `_within_one_edit` and the
    # WALK_IN sentinel are deliberately absent -- so a text search for either finds the very
    # sentence that promises they are not used, and passes for the wrong reason. This project
    # has that exact failure on record three times in one session; the rule it produced is
    # "assert on code, not text". `_code()` below strips docstrings for that reason.
    src = open("app/services/patient_service.py", encoding="utf-8").read()
    tree = ast.parse(src)

    def _code(node) -> str:
        """Executable source only — docstrings removed, comments already gone via ast."""
        clone = ast.parse(ast.unparse(node)).body[0]
        body = getattr(clone, "body", [])
        if (body and isinstance(body[0], ast.Expr)
                and isinstance(getattr(body[0], "value", None), ast.Constant)
                and isinstance(body[0].value.value, str)):
            clone.body = body[1:] or [ast.Pass()]
        return ast.unparse(clone)

    fns = {n.name: _code(n) for n in ast.walk(tree)
           if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
    module_code = "\n".join(fns.values()) + "\n" + "\n".join(
        ast.unparse(n) for n in tree.body
        if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Expr)))
    check("R4  there is NO one-character tolerance in the CODE (the docstring explains its absence)",
          "_within_one_edit" not in module_code and "levenshtein" not in module_code.lower())
    check("R2  matching reads ONE contact's list and never the tenant-wide one",
          "list_for_contact" in fns["match_in_contact"]
          and "list_patients_for_client" not in fns["match_in_contact"])
    check("R3  the matcher writes nothing",
          not any(k in fns["match_in_contact"] for k in ("create_patient", "create_link")))
    check("R5  nothing in this module reads or converts a Customer row",
          "customer_repo" not in module_code and "get_by_phone" not in module_code)
    check("R5b and the WALK_IN sentinel is never read in the CODE",
          "WALK_IN" not in module_code)
    repo_src = open("app/repositories/patient_repo.py", encoding="utf-8").read()
    repo_fns = [n for n in ast.walk(ast.parse(repo_src))
                if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
    check("every repository function takes client_id and puts it in the where clause",
          all("client_id" in [a.arg for a in f.args.args] for f in repo_fns)
          # ast.unparse normalises quotes, so the key is matched WITHOUT them.
          and all("clientId" in ast.unparse(f) for f in repo_fns),
          str([f.name for f in repo_fns]))

    print("\n── MD-1 · the Medical Data Boundary, as a check ──")
    schema = open("prisma/schema.prisma", encoding="utf-8").read()
    block = schema[schema.index("model Patient {"):schema.index('@@map("patient_contacts")')]
    # FIELD LINES ONLY. The model carries a long comment stating what may never be stored here,
    # and that comment necessarily contains every forbidden word -- scanning it would fail the
    # check for saying the right thing. Same trap as R4/R5b above.
    fields = [ln.split("//")[0].strip() for ln in block.splitlines()
              if ln.strip() and not ln.strip().startswith(("//", "///", "@@", "model", "}"))]
    fields = [f for f in fields if f]
    clinical = ("diagnos", "symptom", "treatment", "prescription", "lab_", "labresult",
                "clinical", "medical", "allerg", "medication", "history")
    hits = [w for w in clinical if any(w in f.lower() for f in fields)]
    check("MD-1  no clinical FIELD in patients / patient_contacts", not hits,
          f"{len(fields)} field lines scanned · hits={hits}")
    # The banner sits ABOVE `model Patient {`, so it is read from there, not from the field block.
    banner = schema[schema.index("Clinic P2 · Patient Identity Foundation"):
                    schema.index("model Patient {")]
    check("MD-1b the boundary is STATED above the model, not merely absent",
          "Medical Data Boundary" in banner and "diagnosis" in banner)
    repo_code = "\n".join(ast.unparse(f) for f in repo_fns)
    check("MD-1c and no clinical name in the service or repository CODE",
          not [w for w in clinical if w in (module_code + repo_code).lower()])

    print("\n── the reservation contract: patient_id is optional and inert by default ──")
    import inspect
    sig = inspect.signature(rs.create_reservation)
    check("create_reservation takes patient_id, KEYWORD-ONLY",
          "patient_id" in sig.parameters
          and sig.parameters["patient_id"].kind is inspect.Parameter.KEYWORD_ONLY)
    check("   and it defaults to None — every existing caller is byte-identical",
          sig.parameters["patient_id"].default is None)
    body = ast.unparse(next(n for n in ast.walk(ast.parse(
        open("app/services/reservation_service.py", encoding="utf-8").read()))
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
        and n.name == "create_reservation"))
    check("RG-c the column is OMITTED when absent, never written as a value",
          "if patient_id:" in body and "create_data['patientId'] = patient_id" in body)
    check("   tenant ownership is checked BEFORE the customer find-or-create",
          body.index("patient_repo.find_patient") < body.index("customer_repo.get_by_phone"))
    check("   and the contact link is checked AFTER it, because it needs the customer",
          body.index("customer_repo.get_by_phone")
          < body.index("patient_service.assert_contact_may_act"))
    check("   no caller in app/ passes patient_id yet — P2 builds the layer, P5 uses it",
          sum(1 for _ in __import__("subprocess").run(
              ["grep", "-rn", "patient_id=", "app/"], capture_output=True, text=True
          ).stdout.splitlines() if "reservation_service" not in _) == 0)

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
