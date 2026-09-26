"""RG-6 half ① — replay `get_available_slots` against identical inputs and print its output.

Run once per tree; the caller diffs the two JSON documents. This file lives OUTSIDE both trees on
purpose: the same probe must reach the old and the new service, so neither tree can carry a version
of it that flatters itself.

The clock is FROZEN by subclassing datetime and overriding `now` only -- every other classmethod
(combine/strptime/min/max) keeps working, and both trees' module-global `datetime` is replaced, so
"now" is identical across the two runs rather than merely close.
"""
import asyncio, json, sys
from datetime import date, datetime, timedelta, timezone

ROOT = sys.argv[1]
sys.path.insert(0, ROOT)

from app.services import reservation_service as rs           # noqa: E402
from app.repositories import barber_repo                     # noqa: E402

FROZEN = datetime(2026, 9, 26, 13, 20, 0)                    # naive local wall clock
ACTIVE = ("pending", "confirmed", "arrived")


class FakeDT(datetime):
    @classmethod
    def now(cls, tz=None):
        return FROZEN if tz is None else FROZEN.replace(tzinfo=timezone.utc).astimezone(tz)


class Row:
    def __init__(self, **kw): self.__dict__.update(kw)


def res(hhmm, duration, status="confirmed", day=date(2026, 9, 30)):
    h, m = map(int, hhmm.split(":"))
    return Row(reservedAt=datetime(day.year, day.month, day.day, h, m, tzinfo=timezone.utc),
               durationMin=duration, status=status)


class FakeRepo:
    """Faked at the repository boundary, and NOT kinder than the real query: the real
    find_by_barber_on_date filters status IN (pending, confirmed, arrived) in SQL, so this applies
    the same filter in memory. A fake that returned cancelled rows would make the engine look
    wrong; one that returned everything as active would hide the freeing behaviour entirely."""
    rows: list = []
    calls: list = []

    def __init__(self, _db): pass

    async def find_by_barber_on_date(self, client_id, barber_id, day_start, day_end):
        FakeRepo.calls.append(("barber", client_id, barber_id))
        return [r for r in FakeRepo.rows
                if r.status in ACTIVE and day_start <= r.reservedAt <= day_end]


def install(working_hours, rows, active=True):
    FakeRepo.rows = rows
    FakeRepo.calls = []
    rs.datetime = FakeDT
    try:
        from app.services import availability_engine as ae
        ae.datetime = FakeDT
    except ImportError:
        pass                      # the base tree has no engine -- expected
    rs.ReservationRepository = FakeRepo
    rs.prisma_client = object()
    barber_repo.find_barber = lambda cid, bid: _done(
        Row(id=bid, clientId=cid, isActive=active, workingHours=working_hours))


def _done(v):
    f = asyncio.get_event_loop().create_future()
    f.set_result(v)
    return f


FULL = {"open_time": "09:00", "close_time": "17:00", "closed_days": ["monday"]}
SHORT = {"open_time": "09:00", "close_time": "10:00", "closed_days": []}

CASES = [
    ("01 open day, empty",        FULL,  [], date(2026, 9, 30), 30, 30),
    ("02 one booking excluded",   FULL,  [res("10:00", 30)], date(2026, 9, 30), 30, 30),
    ("03 cancelled frees",        FULL,  [res("10:00", 30, "cancelled")], date(2026, 9, 30), 30, 30),
    ("04 no_show frees",          FULL,  [res("11:00", 30, "no_show")], date(2026, 9, 30), 30, 30),
    ("05 closed day (monday)",    FULL,  [], date(2026, 9, 28), 30, 30),
    ("06 no hours at all",        {},    [], date(2026, 9, 30), 30, 30),
    ("07 duration 60",            FULL,  [], date(2026, 9, 30), 60, 30),
    ("08 duration 90 step 15",    FULL,  [], date(2026, 9, 30), 90, 15),
    ("09 last slot ends at close", SHORT, [], date(2026, 9, 30), 60, 30),
    ("10 overshoots close",       SHORT, [], date(2026, 9, 30), 61, 30),
    ("11 past date",              FULL,  [], date(2026, 9, 20), 30, 30),
    ("12 today, frozen 13:20",    FULL,  [], date(2026, 9, 26), 30, 30),
    ("13 today + overlap 14:00",  FULL,  [res("14:00", 30, day=date(2026, 9, 26))], date(2026, 9, 26), 30, 30),
    ("14 straddling overlap",     FULL,  [res("10:15", 30)], date(2026, 9, 30), 30, 30),
]

out = {}
for label, wh, rows, day, dur, step in CASES:
    install(wh, rows)
    try:
        slots = asyncio.get_event_loop().run_until_complete(
            rs.get_available_slots(client_id="c1", barber_id="b1", target_date=day,
                                   duration_min=dur, slot_step_min=step))
        out[label] = {"slots": slots, "queries": len(FakeRepo.calls)}
    except Exception as exc:
        out[label] = {"error": f"{type(exc).__name__}: {exc}"}

install(FULL, [], active=False)
try:
    asyncio.get_event_loop().run_until_complete(
        rs.get_available_slots(client_id="c1", barber_id="b1", target_date=date(2026, 9, 30),
                               duration_min=30))
    out["15 inactive barber"] = {"error": None}
except Exception as exc:
    out["15 inactive barber"] = {"error": f"{type(exc).__name__}: {exc}"}

barber_repo.find_barber = lambda cid, bid: _done(None)
try:
    asyncio.get_event_loop().run_until_complete(
        rs.get_available_slots(client_id="c1", barber_id="b1", target_date=date(2026, 9, 30),
                               duration_min=30))
    out["16 barber not found"] = {"error": None}
except Exception as exc:
    out["16 barber not found"] = {"error": f"{type(exc).__name__}: {exc}"}

print(json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True))
