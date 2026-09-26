"""Clinic P4-C — the shared availability engine. EG-1…EG-14 · CL-1…CL-11 · RG-6 · TZ-1…TZ-3.

Run:  venv/bin/python scripts/test_clinic_availability_engine.py

WHAT THIS PROVES

    One calculation, two calendars. The clinic reader and the barber reader find DIFFERENT
    calendar owners and then run the SAME code -- which is the P4 contract's §١ decision, and the
    reason `get_clinic_slots` is forbidden by name.

    RG-6 has two halves and both must hold, per the P1 contract:

      ①  same input → same Barber output, element by element and in order.
      ②  a STRUCTURAL proof that the clinic reaches the same engine, not a copy of it.

    ① is NOT in this file, and that is deliberate: it cannot be honestly measured from inside the
    new code, because a test written after the change can only prove the new code agrees with
    itself. It was measured by replaying BOTH versions -- a `git worktree` at 8152bbb and this
    tree -- through one probe living outside both, over 16 scenarios, comparing the slot lists AND
    the query counts. Result: byte-identical. The evidence is
    `.claudedocs/work/clinic-p4c/2026-09-26/rg6-replay.md`, and RG-6-a below re-asserts only the
    part a suite can honestly hold: that the barber reader still routes through the engine.

    ② is here, as AST over the real source (RG-6-b/c). Docstrings are stripped before any
    structural search, because this project has been bitten six times by a comment explaining an
    absence and thereby matching the grep looking for it.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION.
    `compute_slots` needs no fakes at all -- it touches nothing. The clinic reader runs for real
    against fakes installed at the repository boundary only, and those fakes apply the SAME status
    filter the real SQL applies, so nothing here is kinder than reality.
"""
import ast
import asyncio
import inspect
import os
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repositories import (                                        # noqa: E402
    catalog_service_repo, resource_repo, resource_service_repo,
)
from app.services import availability_engine as ae                    # noqa: E402
from app.services import reservation_service as rs                    # noqa: E402

ok = True
ACTIVE = ("pending", "confirmed", "arrived")
FULL = {"open_time": "09:00", "close_time": "17:00", "closed_days": ["monday"]}


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def _src(path: str) -> str:
    return open(path, encoding="utf-8").read()


def _code_only(path: str) -> str:
    """The module's source with every docstring removed.

    Not a convenience. A docstring that explains why something is absent matches any text search
    for that thing -- measured six separate times in this project -- so a structural claim about
    code must be made against code.
    """
    tree = ast.parse(_src(path))
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if (node.body and isinstance(node.body[0], ast.Expr)
                    and isinstance(node.body[0].value, ast.Constant)
                    and isinstance(node.body[0].value.value, str)):
                node.body = node.body[1:] or [ast.Pass()]
    return ast.unparse(ast.fix_missing_locations(tree))


def _fn_code(path: str, name: str) -> str:
    """One function's source, docstring removed.

    🔴 THE SEVENTH MEASURED INSTANCE of this project's self-documenting-absence trap, and it
    happened while writing THIS FILE: the clinic reader's own docstring explains that the
    `resource_services` table does not exist yet, so U1 -- searching for exactly that name to
    prove it is absent -- matched the sentence promising its absence and reported a failure. The
    rule is not "strip docstrings at the module level"; it is "a structural claim is made against
    code", and that has to hold for a single function too.
    """
    node = _fn(path, name)
    if (node.body and isinstance(node.body[0], ast.Expr)
            and isinstance(node.body[0].value, ast.Constant)
            and isinstance(node.body[0].value.value, str)):
        node = ast.parse(ast.unparse(node))  # re-parse so the original tree is left intact
        fn = node.body[0]
        fn.body = fn.body[1:] or [ast.Pass()]
        return ast.unparse(ast.fix_missing_locations(node))
    return ast.unparse(node)


def _fn(path: str, name: str):
    for node in ast.walk(ast.parse(_src(path))):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    return None


def _route_calls(path: str) -> dict:
    """How many times each availability entry point is really CALLED in a route file."""
    out = {"get_available_slots": 0, "get_available_slots_for_resource": 0}
    for n in ast.walk(ast.parse(_src(path))):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in out:
            out[n.func.attr] += 1
    return out


def _calls(node) -> list[str]:
    return [ast.unparse(n.func) for n in ast.walk(node) if isinstance(n, ast.Call)]


class Row:
    def __init__(self, **kw): self.__dict__.update(kw)


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


def res(hhmm, duration, status="confirmed", day=date(2026, 9, 30)):
    h, m = map(int, hhmm.split(":"))
    return Row(reservedAt=datetime(day.year, day.month, day.day, h, m, tzinfo=timezone.utc),
               durationMin=duration, status=status)


def times(slots):
    return [s["time"] for s in slots]


# ── the clinic reader's fakes ────────────────────────────────────────────────────────────────────
class FakeRepo:
    rows: list = []
    calls: list = []

    def __init__(self, _db): pass

    async def find_by_resource_on_date(self, client_id, resource_id, day_start, day_end):
        FakeRepo.calls.append({"kind": "resource", "client_id": client_id,
                               "resource_id": resource_id, "from": day_start, "to": day_end})
        # The same filter the real SQL applies. A fake that skipped it would make `cancelled frees
        # the time` look like an engine behaviour when it is the query's.
        return [r for r in FakeRepo.rows
                if r.status in ACTIVE and day_start <= r.reservedAt <= day_end
                and getattr(r, "resourceId", resource_id) == resource_id]

    async def find_by_barber_on_date(self, *a, **k):
        raise AssertionError("the clinic reader must never ask a barber question")


class FakeClientTable:
    config = {"working_hours": {"open_time": "08:00", "close_time": "12:00", "closed_days": []}}
    seen: list = []

    async def find_unique(self, where):
        FakeClientTable.seen.append(where)
        return Row(id=where["id"], config=FakeClientTable.config)


class FakePrisma:
    client = FakeClientTable()


ELIG: list = []          # every (client_id, resource_id, service_id) the fake table holds


def install_clinic(resource_hours=FULL, rows=None, active=True, duration=30,
                   resource=True, service=True, eligible=True):
    orig = (rs.prisma_client, rs.ReservationRepository,
            resource_repo.find_resource, catalog_service_repo.find_catalog_service,
            resource_service_repo.is_eligible)
    FakeRepo.rows = rows or []
    FakeRepo.calls = []
    FakeClientTable.seen = []
    rs.prisma_client = FakePrisma()
    rs.ReservationRepository = FakeRepo
    resource_repo.find_resource = lambda cid, rid: _done(
        Row(id=rid, clientId=cid, name="د. سارة", type="doctor", isActive=active,
            workingHours=resource_hours) if resource else None)
    catalog_service_repo.find_catalog_service = lambda cid, sid: _done(
        Row(id=sid, clientId=cid, nameAr="معاينة", durationMin=duration) if service else None)
    # The fake table records what it was ASKED, and answers from a real set rather than a constant
    # -- so CL-12 can prove the tenant id reaches the lookup instead of assuming it.
    ELIG.clear()
    if eligible:
        ELIG.append(("c1", "r1", "s1"))
    resource_service_repo.is_eligible = lambda cid, rid, sid: _done(
        (cid, rid, sid) in ELIG)

    def restore():
        (rs.prisma_client, rs.ReservationRepository,
         resource_repo.find_resource, catalog_service_repo.find_catalog_service,
         resource_service_repo.is_eligible) = orig
    return restore


async def clinic(target_date=date(2026, 9, 30), step=30, **kw):
    restore = install_clinic(**kw)
    try:
        return await rs.get_available_slots_for_resource(
            client_id="c1", resource_id="r1", service_id="s1",
            target_date=target_date, slot_step_min=step)
    finally:
        restore()


async def main():
    ENGINE = "app/services/availability_engine.py"
    SERVICE = "app/services/reservation_service.py"
    REPO = "app/repositories/reservation_repo.py"

    print("\n── EG · the engine is a calculation, and nothing else ──")
    engine_code = _code_only(ENGINE)
    check("EG-1  zero database access: no prisma, no repository, no service import",
          not any(w in engine_code for w in ("prisma", "repositories", "repo.", "from app.services")),
          "imports only datetime")
    check("EG-2  nothing in it is async — a calculation cannot wait on IO",
          not any(isinstance(n, (ast.AsyncFunctionDef, ast.Await))
                  for n in ast.walk(ast.parse(_src(ENGINE)))))
    check("EG-3  it exports exactly the five names the two readers need",
          sorted(n for n, v in vars(ae).items()
                 if inspect.isfunction(v) and v.__module__ == ae.__name__)
          == ["check_working_hours", "compute_slots", "has_conflict",
              "resolve_day_window", "wall_clock_now"])

    print("\n── EG · the four behaviours ratified in §٣, measured on the engine itself ──")
    day = date(2026, 9, 30)
    past = datetime(2026, 9, 26, 13, 20, tzinfo=timezone.utc)
    w = ae.resolve_day_window(day, {"open_time": "09:00", "close_time": "10:00", "closed_days": []})
    check("EG-4  a slot ENDING exactly at close is offered (AV-7)",
          times(ae.compute_slots(*w, working_hours=None, existing=[], duration_min=60,
                                 now=past)) == ["09:00"])
    check("EG-5  a slot overshooting close by one minute is not",
          ae.compute_slots(*w, working_hours=None, existing=[], duration_min=61,
                           now=past) == [])
    w2 = ae.resolve_day_window(day, FULL)
    check("EG-6  cancelled frees the time — the row is simply absent from the caller's list",
          "10:00" in times(ae.compute_slots(*w2, working_hours=FULL, existing=[],
                                            duration_min=30, now=past)))
    check("EG-7  an active row excludes its own slot",
          "10:00" not in times(ae.compute_slots(*w2, working_hours=FULL,
                                                existing=[res("10:00", 30)],
                                                duration_min=30, now=past)))
    check("EG-8  a STRADDLING row excludes both slots it touches (overlap, not equality)",
          [t for t in ("10:00", "10:30")
           if t in times(ae.compute_slots(*w2, working_hours=FULL,
                                          existing=[res("10:15", 30)],
                                          duration_min=30, now=past))] == [])
    check("EG-9  the past is excluded by comparison against the `now` it was given",
          times(ae.compute_slots(*ae.resolve_day_window(date(2026, 9, 26), FULL),
                                 working_hours=FULL, existing=[], duration_min=30,
                                 now=past))[:2] == ["13:30", "14:00"])
    check("EG-10 duration changes the SET, not just the count (AV-2)",
          times(ae.compute_slots(*w2, working_hours=FULL, existing=[res("16:00", 30)],
                                 duration_min=60, now=past))[-1] == "15:00")
    check("EG-11 a closed day is None, not an empty window — so the caller can skip its query",
          ae.resolve_day_window(date(2026, 9, 28), FULL) is None)
    check("EG-12 missing open/close is treated as closed",
          ae.resolve_day_window(day, {}) is None
          and ae.resolve_day_window(day, {"open_time": "09:00"}) is None)
    check("EG-13 slot_step is a parameter and really steps (ق-٤-ج)",
          times(ae.compute_slots(*w2, working_hours=FULL, existing=[], duration_min=30,
                                 now=past, slot_step_min=15))[:3] == ["09:00", "09:15", "09:30"])
    check("EG-14 `now` has NO default — a caller cannot inherit a definition it never stated",
          inspect.signature(ae.compute_slots).parameters["now"].default is inspect.Parameter.empty)

    print("\n── TZ · F-TZ-1's boundary, guarded structurally ──")
    check("TZ-1  the engine never builds a TRUE UTC instant (044aafe's defect cannot return)",
          "datetime.now(timezone.utc)" not in engine_code and "datetime.now(tz" not in engine_code)
    check("TZ-2  `wall_clock_now` is the naive-local-labelled-UTC form, unchanged",
          "datetime.now().replace(tzinfo=timezone.utc)"
          in ast.unparse(_fn(ENGINE, "wall_clock_now")))
    service_code = _code_only(SERVICE)
    compute_calls = [ast.unparse(n) for n in ast.walk(ast.parse(service_code))
                     if isinstance(n, ast.Call) and "compute_slots" in ast.unparse(n.func)]
    check("TZ-3  EVERY caller of the engine passes wall_clock_now() — no second definition of now",
          len(compute_calls) == 2
          and all("wall_clock_now()" in c for c in compute_calls),
          f"{len(compute_calls)} call sites")

    print("\n── RG-6 · half ②, structural: the clinic reaches the SAME engine ──")
    barber_fn = _fn(SERVICE, "get_available_slots")
    clinic_fn = _fn(SERVICE, "get_available_slots_for_resource")
    check("RG-6-a the barber reader routes through the engine, not its own loop",
          "availability_engine.compute_slots" in _calls(barber_fn)
          and "availability_engine.resolve_day_window" in _calls(barber_fn)
          and not any(isinstance(n, ast.While) for n in ast.walk(barber_fn)))
    check("RG-6-b the clinic reader calls the SAME two functions",
          "availability_engine.compute_slots" in _calls(clinic_fn)
          and "availability_engine.resolve_day_window" in _calls(clinic_fn))
    check("RG-6-c and it has no loop of its own — no second copy of the calculation",
          not any(isinstance(n, ast.While) for n in ast.walk(clinic_fn)))
    check("RG-6-d `get_clinic_slots` does not exist, by name, anywhere in app/",
          "get_clinic_slots" not in service_code and "get_clinic_slots" not in engine_code)
    check("RG-6-e the two predicates are ONE object, shared with the write path",
          rs._has_conflict is ae.has_conflict and rs._check_working_hours is ae.check_working_hours)

    print("\n── CL · the clinic reader ──")
    check("CL-1  NO duration_min parameter — the server owns it (ق-٤-أ) [INVARIANT for clinic]",
          "duration_min" not in inspect.signature(rs.get_available_slots_for_resource).parameters
          and list(inspect.signature(rs.get_available_slots_for_resource).parameters)
          == ["client_id", "resource_id", "service_id", "target_date", "slot_step_min"])
    slots30 = await clinic(duration=30)
    slots60 = await clinic(duration=60)
    check("CL-2  the duration comes from CatalogService.durationMin: 30 vs 60 differ correctly",
          len(slots30) == 16 and len(slots60) == 15 and times(slots60)[-1] == "16:00",
          f"{len(slots30)} vs {len(slots60)}")
    check("CL-3  a Resource's own workingHours are used when set",
          times(slots30)[0] == "09:00" and times(slots30)[-1] == "16:30")
    fb = await clinic(resource_hours=None)
    check("CL-4  and it falls back to Client.config.working_hours when empty (ق-٤-د)",
          times(fb)[0] == "08:00" and times(fb)[-1] == "11:30"
          and FakeClientTable.seen == [{"id": "c1"}],
          "the tenant row is read once, scoped by id")
    check("CL-5  the day query is scoped by resource_id AND client_id (AV-3 + AV-9)",
          FakeRepo.calls and FakeRepo.calls[0]["resource_id"] == "r1"
          and FakeRepo.calls[0]["client_id"] == "c1"
          and all(c["kind"] == "resource" for c in FakeRepo.calls))
    busy = await clinic(rows=[res("10:00", 30)])
    check("CL-6  an existing reservation on that resource removes its slot (AV-5)",
          "10:00" not in times(busy) and "10:30" in times(busy))
    freed = await clinic(rows=[res("10:00", 30, "cancelled")])
    check("CL-7  a cancelled one does not (AV-6)", "10:00" in times(freed))
    check("CL-8  a closed day returns [] and asks the database NOTHING",
          await clinic(target_date=date(2026, 9, 28)) == [] and FakeRepo.calls == [])
    for label, kw, msg in (
        ("CL-9  an unknown resource is refused", {"resource": False}, "Resource not found"),
        ("CL-10 an inactive resource is refused", {"active": False}, "not currently accepting"),
        ("CL-11 an unknown service is refused — the duration has nowhere to come from",
         {"service": False}, "Service not found"),
    ):
        try:
            await clinic(**kw)
            check(label, False, "no error raised")
        except ValueError as exc:
            check(label, msg in str(exc), str(exc))

    print("\n── the repository question: which rows block ──")
    repo_fn = _fn(REPO, "find_by_resource_on_date")
    repo_code = ast.unparse(repo_fn)
    check("RP-1  the resource day query filters the three ACTIVE statuses — so cancelled/no_show "
          "free the time at the SQL boundary, not in the engine",
          "'pending', 'confirmed', 'arrived'" in repo_code and "'clientId': client_id" in repo_code
          and "'resourceId': resource_id" in repo_code)
    check("RP-2  it mirrors the barber query's status list exactly",
          ast.unparse(_fn(REPO, "find_by_barber_on_date")).count("'arrived'")
          == repo_code.count("'arrived'") == 1)

    print("\n── EL · P4-C-U1 CLOSED · eligibility, strictly (ق-٤-ب / ق-٤-ز) ──")
    check("EL-1  the clinic reader asks the eligibility question at all. "
          "[FLIPPED 2026-09-26 — OLD VALUE: no check existed, because `resource_services` did "
          "not exist. Now an INVARIANT, not a transition]",
          "resource_service_repo.is_eligible"
          in _fn_code(SERVICE, "get_available_slots_for_resource"))
    try:
        await clinic(eligible=False)
        check("EL-2  an ineligible pair is REFUSED", False, "no error raised")
    except ValueError as exc:
        check("EL-2  an ineligible pair is REFUSED, not returned as an empty day",
              "does not provide the requested service" in str(exc), str(exc))
    check("EL-3  and the refusal is NOT the barber picker's soft fallback — "
          "strictness is the decision, not an accident",
          "fall back" not in _fn_code(SERVICE, "get_available_slots_for_resource").lower())
    restore = install_clinic(eligible=False)
    try:
        try:
            await rs.get_available_slots_for_resource(
                client_id="c1", resource_id="r1", service_id="s1",
                target_date=date(2026, 9, 30))
        except ValueError:
            pass
        check("EL-4  it refuses BEFORE any day query — a refusal costs no database round trip",
              FakeRepo.calls == [] and FakeClientTable.seen == [])
    finally:
        restore()
    check("EL-5  an eligible pair still computes normally",
          len(await clinic(eligible=True)) == 16)
    restore = install_clinic()
    asked = []
    resource_service_repo.is_eligible = lambda cid, rid, sid: (
        asked.append((cid, rid, sid)) or _done(True))
    try:
        await rs.get_available_slots_for_resource(
            client_id="c1", resource_id="r1", service_id="s1", target_date=date(2026, 9, 30))
        check("EL-6  the question carries the TENANT, the resource and the service (AV-9)",
              asked == [("c1", "r1", "s1")], str(asked))
    finally:
        restore()

    print("\n── SC · the table's SHAPE, read off the schema's FIELD LINES only ──")
    schema = _src("prisma/schema.prisma")
    block = schema.split("model ResourceService {", 1)[1].split("\n}", 1)[0]
    fields = [l.strip() for l in block.splitlines()
              if l.strip() and not l.strip().startswith("//")]
    joined = " | ".join(fields)
    check("SC-1  🔴 a REAL foreign key on clientId — the one `barber_services` lacks",
          any(l.startswith("client ") and "@relation(fields: [clientId]" in l for l in fields),
          "BarberService carries clientId with an index and no FK; not inherited")
    check("SC-2  and foreign keys to Resource and CatalogService, all three cascading",
          joined.count("onDelete: Cascade") == 3
          and any("Resource " in l and "@relation" in l for l in fields)
          and any("CatalogService" in l and "@relation" in l for l in fields))
    check("SC-3  one assignment per pair",
          "@@unique([resourceId, serviceId])" in joined)
    check("SC-4  an index for each real question — by service, and by resource",
          "@@index([clientId, serviceId])" in joined
          and "@@index([clientId, resourceId])" in joined)
    check("SC-5  four columns and a timestamp, and NOTHING else — no is_active, no notes, "
          "no price override; a join table that grows opinions becomes a second service model",
          sorted(l.split()[0] for l in fields
                 if not l.startswith("@@") and "@relation" not in l)
          == ["clientId", "createdAt", "id", "resourceId", "serviceId"])
    check("SC-6  `barber_services` is untouched in the schema — still no FK on clientId, "
          "still its own unique pair (the defect is NOT fixed inside the clinic phase)",
          "  @@unique([barberId, serviceId])" in schema
          and "  @@index([clientId])" in schema.split("model BarberService {", 1)[1]
          and "@relation(fields: [clientId]"
          not in schema.split("model BarberService {", 1)[1].split("\n}", 1)[0])

    print("\n── RG · nothing else moved ──")
    check("RG-1  the barber reader's signature is unchanged",
          list(inspect.signature(rs.get_available_slots).parameters)
          == ["client_id", "barber_id", "target_date", "duration_min", "slot_step_min"])
    check("RG-2  the barber reader still does NOT fall back to Client.config (F-P4-2 stays a debt)",
          "config" not in ast.unparse(barber_fn))
    check("RG-3  the write path still owns its own past guard and its own resource branch",
          "datetime.now().replace(tzinfo=timezone.utc)" in service_code
          and "find_overlapping_by_resource" in service_code)
    check("RG-4  the P1 fence, the P2 patient parameter and the P3 contract are untouched",
          '_LIA_VERTICALS = frozenset({"barber"})' in _src("app/services/lia_owner_entry.py")
          and "patient_id" in service_code and "PATIENT_FACING_SOURCES" in service_code)
    check("RG-5  the schema's ONLY change is the new table — no column added anywhere. "
          "[FLIPPED 2026-09-26 — OLD VALUE: `resource_services` absent from the schema entirely, "
          "while schema was out of scope for P4-C]",
          'model ResourceService {' in _src("prisma/schema.prisma")
          and open("prisma/migrations/add_resource_service_eligibility.sql",
                   encoding="utf-8").read().count("ALTER TABLE") == 3)
    check("RG-5b the migration is additive by SHAPE: every statement CREATEs or ADDs a constraint",
          all(l.split()[0] in ("CREATE", "ALTER", "BEGIN;", "COMMIT;")
              for l in open("prisma/migrations/add_resource_service_eligibility.sql",
                            encoding="utf-8").read().splitlines()
              if l.strip() and not l.startswith("--") and not l.startswith(" ")
              and not l.startswith(")")))
    check("RG-7  the clinic reader is reached by exactly ONE route, and the barber's own route "
          "is untouched. [FLIPPED 2026-09-26 by P4-D — OLD VALUE: no route reached it at all, "
          "which is what made it safe to ship the eligibility query before the table existed]",
          # Counted as CALLS, via ast — not as text. A raw count finds two of each, because one
          # is a `label=` string and one is a docstring sentence: the third time in this session
          # that prose about the code matched a search meant to measure the code.
          _route_calls("app/api/v1/public/reservations.py")
          == {"get_available_slots": 1, "get_available_slots_for_resource": 1})

    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
