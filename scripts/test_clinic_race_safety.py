"""Clinic P4-E — the race, locally. RC-1…RC-11.

Run:  venv/bin/python scripts/test_clinic_race_safety.py

WHAT THIS PROVES, AND WHAT IT DOES NOT
    PROVES   two genuinely concurrent bookings for the same doctor and the same minute end with
             EXACTLY ONE row, the loser gets the RESOURCE sentence (not the barber one), and the
             failure is deterministic — measured by running the real `create_reservation`
             concurrently through asyncio, not by reasoning about it.

    🔴 DOES NOT PROVE Postgres atomicity. The unique index here is SIMULATED in memory. That the
    database itself serialises two concurrent INSERTs is a property of Postgres, and proving it
    for the clinic needs a real clinic tenant and real production writes — P4-U1, which stays
    open by explicit decision (Salman, ق-٤-هـ: locally now, live under its own contract).

    So the honest claim is: THE CODE ROUND THE INDEX IS CORRECT AND DETERMINISTIC. Whether the
    index fires is the database's job, and the barber's equivalent index was proven live on
    2026-08-24 with real concurrent requests.

RC-5 IS THE HEART OF IT.
    The pre-check is a read-then-write and CANNOT stop this race — both racers must pass it. If a
    future change made the pre-check accidentally catch the collision, this suite would still be
    green while proving nothing, so RC-5 measures that both racers really did get past it.

NO NETWORK, NO DATABASE, NO SENDS, NO WRITES, NO PRODUCTION.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from prisma.errors import UniqueViolationError as _UVE                 # noqa: E402

from app.repositories import resource_repo                             # noqa: E402
from app.services import reservation_service as rs                     # noqa: E402
from test_lia_reservation_t1 import install as _t1_install, CLIENT      # noqa: E402

ok = True
RES_A = "res-a"
RES_B = "res-b"
ACTIVE = ("pending", "confirmed", "arrived")
RESOURCE_MSG = "This resource is already booked for that time. Please choose a different time."
BARBER_MSG = "This barber is already booked for that time. Please choose a different time."


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


class RacingRepo:
    """The partial unique index, simulated in memory — and NOT more forgiving than the real one.

    The real index is:
        (client_id, resource_id, reserved_at) WHERE status IN (pending, confirmed, arrived)
                                                AND resource_id IS NOT NULL
    so this keys on exactly those three columns, only for those three statuses, and only when a
    resource is present. A key that included, say, the duration would make collisions rarer here
    than in production — a fake kinder than reality, which tests the fake.

    Every read yields the event loop first. That is what makes this a REAL race rather than a
    sequential pair: both racers finish their pre-check before either reaches create().
    """
    rows: list = []
    prechecks: list = []          # what each racer SAW during its pre-check

    def __init__(self, _client): pass

    @staticmethod
    def _key(data):
        rid, bid = data.get("resourceId"), data.get("barberId")
        if rid:
            return ("resource", data.get("clientId"), rid, data.get("reservedAt"))
        if bid:
            return ("barber", data.get("clientId"), bid, data.get("reservedAt"))
        return None

    async def _overlapping(self, kind, client_id, owner_id, *a, **k):
        # READ FIRST, THEN YIELD — and the order is the whole fidelity of this fake.
        #
        # The first version yielded before reading, and RC-4 caught it: racer two resumed AFTER
        # racer one had already inserted, so its PRE-CHECK refused it and the index was never
        # reached. Every other assertion stayed green, because the pre-check raises the identical
        # sentence by design — the suite would have proved the pre-check while claiming to prove
        # the race.
        #
        # In the real system both queries reach the database before either INSERT commits. So:
        # read the state as it is now, then yield to model the round trip, and let the other
        # racer read the SAME stale state.
        seen = [r for r in RacingRepo.rows
                if r.status in ACTIVE and getattr(r, f"{kind}Id", None) == owner_id]
        RacingRepo.prechecks.append(len(seen))
        await asyncio.sleep(0)
        return seen

    async def find_overlapping_by_resource(self, client_id, resource_id, *a, **k):
        return await self._overlapping("resource", client_id, resource_id)

    async def find_overlapping_by_barber(self, client_id, barber_id, *a, **k):
        return await self._overlapping("barber", client_id, barber_id)

    async def find_overlapping(self, *a, **k):
        await asyncio.sleep(0)
        return []

    async def create(self, data):
        key = self._key(data)
        if key and any(self._key(r.__dict__) == key and r.status in ACTIVE
                       for r in RacingRepo.rows):
            raise _UVE.__new__(_UVE)          # exactly what Postgres would raise on the index
        row = Row(id=f"r{len(RacingRepo.rows)}", createdAt=datetime.now(timezone.utc),
                  status=data.get("status", "pending"), **{
                      k2: v for k2, v in data.items() if k2 != "status"})
        RacingRepo.rows.append(row)
        return row


def _resource(rid, cid):
    return _done(Row(id=rid, clientId=cid, name="د. سارة", isActive=True,
                     workingHours=None, type="doctor"))


async def book(module_key, metadata, when):
    try:
        await rs.create_reservation(
            client_id=CLIENT, module_key=module_key, customer_name="أحمد",
            customer_phone="96170123456", reserved_at=when, duration_min=30,
            notes=None, metadata=metadata, source="website",
            enforce_working_hours=False, notify_merchant=False)
        return "OK"
    except ValueError as exc:
        return str(exc)


async def race(n, module_key, metadatas, when):
    """Fire `n` bookings at the same instant through the REAL service."""
    RacingRepo.rows, RacingRepo.prechecks = [], []
    prisma, sends, restore = _t1_install()
    o_repo, o_find = rs.ReservationRepository, resource_repo.find_resource
    rs.ReservationRepository = RacingRepo
    resource_repo.find_resource = lambda cid, rid: _resource(rid, cid)
    try:
        return await asyncio.gather(*[book(module_key, m, w)
                                      for m, w in zip(metadatas, when)])
    finally:
        rs.ReservationRepository, resource_repo.find_resource = o_repo, o_find
        restore()


async def main() -> int:
    soon = (datetime.now().replace(tzinfo=timezone.utc) + timedelta(days=2)).replace(
        hour=11, minute=0, second=0, microsecond=0)
    clinic = {"resource_id": RES_A, "service_id": "svc-1"}

    print("\n── RC · two bookings, the same doctor, the same minute ──")
    out = await race(2, "clinic", [clinic, clinic], [soon, soon])
    wins = [o for o in out if o == "OK"]
    losses = [o for o in out if o != "OK"]
    check("RC-1  exactly ONE of two concurrent bookings succeeds",
          len(wins) == 1 and len(losses) == 1, str(out))
    check("RC-2  the loser is told the RESOURCE is busy, never the barber (P1-B / F4)",
          losses == [RESOURCE_MSG], str(losses))
    check("RC-3  and exactly ONE row exists afterwards",
          len(RacingRepo.rows) == 1 and RacingRepo.rows[0].resourceId == RES_A,
          f"{len(RacingRepo.rows)} row(s)")
    check("RC-4  🔴 BOTH racers passed the pre-check seeing zero conflicts — the read-then-write "
          "check cannot stop this, and the INDEX is what does",
          RacingRepo.prechecks == [0, 0], str(RacingRepo.prechecks))

    print("\n── RC · it stays deterministic under more pressure ──")
    out = await race(5, "clinic", [clinic] * 5, [soon] * 5)
    check("RC-5  five at once ⇒ one winner, four losers",
          len([o for o in out if o == "OK"]) == 1
          and len([o for o in out if o != "OK"]) == 4, str(out))
    check("RC-6  and every refusal is the SAME sentence — no second wording appears under load",
          set(o for o in out if o != "OK") == {RESOURCE_MSG})
    check("RC-7  still exactly one row", len(RacingRepo.rows) == 1)
    check("RC-8  every racer had passed the pre-check clean",
          RacingRepo.prechecks == [0] * 5, str(RacingRepo.prechecks))

    print("\n── RC · what must NOT collide ──")
    out = await race(2, "clinic",
                     [{"resource_id": RES_A, "service_id": "s"},
                      {"resource_id": RES_B, "service_id": "s"}], [soon, soon])
    check("RC-9  two DIFFERENT doctors at the same minute both succeed — the index is per "
          "resource, not per time",
          out == ["OK", "OK"] and len(RacingRepo.rows) == 2, str(out))
    out = await race(2, "clinic", [clinic, clinic], [soon, soon + timedelta(minutes=30)])
    check("RC-10 the same doctor at two different minutes both succeed",
          out == ["OK", "OK"] and len(RacingRepo.rows) == 2, str(out))

    print("\n── RC · the barber path races on its own terms ──")
    out = await race(2, "barber", [{"barber_id": "b1", "service_id": "s"}] * 2, [soon, soon])
    check("RC-11 a barber collision under concurrency says BARBER — the two paths never "
          "borrow each other's sentence",
          len([o for o in out if o == "OK"]) == 1
          and [o for o in out if o != "OK"] == [BARBER_MSG], str(out))

    print("\n── RC · the simulated index matches the real DDL ──")
    ddl = open("prisma/migrations/add_reservation_resource_slot_unique_index.sql",
               encoding="utf-8").read()
    check("RC-12 the real index keys on (client_id, resource_id, reserved_at), for the three "
          "ACTIVE statuses only — which is exactly what RacingRepo simulates",
          "(client_id, resource_id, reserved_at)" in ddl
          and "status IN ('pending', 'confirmed', 'arrived')" in ddl
          and "resource_id IS NOT NULL" in ddl)
    check("RC-13 a CANCELLED row therefore frees the minute — the index is partial, not total",
          "WHERE status IN" in ddl and "'cancelled'" not in ddl)

    print("\n🔴 LIMIT, stated rather than implied: the index above is simulated in memory here.")
    print("   Postgres' own atomicity under two concurrent INSERTs is NOT proven by this suite —")
    print("   that is P4-U1, and it needs a real clinic tenant and real production writes.")
    print("\n" + ("ALL GREEN" if ok else "FAILURES ABOVE"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
