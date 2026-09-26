"""
The availability engine — one calculation, two calendars.

Clinic P4-C, 2026-09-26. Implements the contract's §١ decision, which is the whole point of this
file and the one sentence to read before editing it:

    FINDING the calendar's owner stays per table   (Barber / Resource — two tables, never merged)
    CALCULATING the times becomes ONE thing        (hours + the day's rows + duration ⇒ slots)

WHY THIS FILE EXISTS
--------------------
`get_available_slots` was barber-only, and every line of it after the barber lookup was already
generic: a day window, a candidate walk, a working-hours gate, an overlap check. A clinic needed
the same four steps against a `Resource`. The cheap move was a second function — `get_clinic_slots`
— and it is forbidden by name in the contract, because that is how the barber path itself grew two
copies of its own conflict logic. So the four steps moved here, take RESOLVED state, and touch no
database at all; the two callers each do their own lookup and hand the result over.

ZERO DATABASE ACCESS IS A PROPERTY OF THIS MODULE, NOT A COINCIDENCE
-------------------------------------------------------------------
Nothing here imports prisma, a repository, or a service. That is what makes the whole engine
testable without a fake DB, and it is asserted structurally by
`scripts/test_clinic_availability_engine.py` (EG-1) rather than trusted.

🔴 THE TIME CONVENTION — F-TZ-1, AND WHY `wall_clock_now()` LOOKS WRONG
----------------------------------------------------------------------
`reservedAt` is stored throughout this system as a naive LOCAL wall-clock value LABELLED UTC, with
no conversion. The container runs `TZ=Asia/Beirut`, so `datetime.now()` is the shop's wall clock,
and `.replace(tzinfo=timezone.utc)` labels it without moving the instant.

Using `datetime.now(timezone.utc)` here — the true UTC instant, and the thing Python's own
documentation rightly recommends when a value IS an instant — was a REAL, BROWSER-VERIFIED
PRODUCTION DEFECT: commit `044aafe` (2026-08-05) records the availability endpoint returning slots
from 15:00 while the real local time was 17:37, wrong by exactly the tenant's UTC offset. `d77ddce`
carried the same fix to three more guards.

So the convention is deliberate, it is the system's, and this engine INHERITS it rather than
improving on it locally: a reader with a different definition of "now" than the writer at
`reservation_service.py:460` would be three hours apart, which is precisely the reader/writer split
the clinic's working-hours decision (ق-٤-د) exists to close.

Fixing it properly means converting the STORED values too — a tenant timezone column, 66 live
reservations, six call sites, Lia and the barber path. That is recorded as **F-TZ-1**, a standalone
technical debt with its own contract, explicitly OUT of P4 (Salman's decision, 2026-09-26, option
(أ)). Until then: one definition, here, used by every caller of this engine.
"""

from datetime import date, datetime, timedelta, timezone


def wall_clock_now() -> datetime:
    """"Now", in the only representation this engine's inputs are comparable against.

    A separate named function rather than an inline expression at each call site, so F-TZ-1 has a
    single place to change and so a test can assert structurally that no caller invented its own
    definition. See the module docstring for why this is not `datetime.now(timezone.utc)`.
    """
    return datetime.now().replace(tzinfo=timezone.utc)


def check_working_hours(reserved_at: datetime, working_hours: dict | None) -> None:
    """Pipeline stage: Working Hours. Raises ValueError if reserved_at falls outside
    working_hours. Shared regardless of whose working_hours dict is passed in (tenant-wide
    Client.config.working_hours, or a Resource's own working_hours) — same shape either way:
    {"closed_days": [...], "open_time": "HH:MM", "close_time": "HH:MM"}.
    All times treated as UTC directly, matching how reservedAt is stored/compared everywhere
    else in this codebase today (no timezone-conversion utility exists in this path).

    Moved here from `reservation_service` in P4-C, byte for byte. `reservation_service` still
    calls it under its old private name, bound to this exact function object, so every existing
    call site and the write path are textually and behaviourally unchanged.
    """
    if not working_hours:
        return
    day_name = reserved_at.strftime("%A").lower()
    if day_name in (working_hours.get("closed_days") or []):
        raise ValueError(f"This business is closed on {day_name.capitalize()}.")
    open_t, close_t = working_hours.get("open_time"), working_hours.get("close_time")
    if open_t and close_t:
        slot_time = reserved_at.strftime("%H:%M")
        if not (open_t <= slot_time < close_t):
            raise ValueError(f"Outside working hours ({open_t}-{close_t}).")


def has_conflict(existing_list: list, new_start: datetime, new_duration_min: int) -> bool:
    """True when [new_start, new_start+duration) overlaps any row in `existing_list`.

    Moved here from `reservation_service` in P4-C. The BODY is byte for byte — including
    `r.durationMin` with no fallback, which raises on a null duration exactly as it did before;
    a kinder version here would be a fake that is kinder than reality, and the write path relies
    on this one. Only the docstring grew.

    The rows are whatever the caller's repository returned; WHICH rows count as blocking is the
    repository's decision, not this function's — and both day queries filter
    `status IN (pending, confirmed, arrived)`, which is why `cancelled` and `no_show` free the
    time. That behaviour is ratified in the P4 contract §٣ rather than discovered again.
    """
    new_end = new_start + timedelta(minutes=new_duration_min)
    for r in existing_list:
        r_start = r.reservedAt
        r_end   = r_start + timedelta(minutes=r.durationMin)
        # overlap condition: r_start < new_end AND r_end > new_start
        if r_start < new_end and r_end > new_start:
            return True
    return False


def resolve_day_window(
    target_date: date,
    working_hours: dict | None,
) -> tuple[datetime, datetime] | None:
    """The day's open/close window, or None when this calendar is shut on `target_date`.

    Separate from `compute_slots` on purpose, and not for tidiness: the barber path returns an
    empty list on a closed day WITHOUT querying the database, and folding this into the calculation
    would have added one query per closed day. Two calls keep the query count identical to what it
    was before the extraction — which RG-6 measures.

    A missing `open_time` or `close_time` is treated as closed, exactly as before.
    """
    hours = working_hours or {}
    open_time = hours.get("open_time")
    close_time = hours.get("close_time")
    closed_days = hours.get("closed_days") or []

    day_name = target_date.strftime("%A").lower()
    if day_name in closed_days or not open_time or not close_time:
        return None

    # reservedAt is stored/returned timezone-aware (UTC) -- same assumption check_working_hours()
    # already documents ("All times treated as UTC directly"). Every datetime built here must be
    # tz-aware too, or comparisons against real Reservation rows raise TypeError (found and fixed
    # during Phase 1's own verification, real evidence: a live "can't compare offset-naive and
    # offset-aware datetimes" error).
    day_start = datetime.combine(target_date, datetime.strptime(open_time, "%H:%M").time(), tzinfo=timezone.utc)
    day_end = datetime.combine(target_date, datetime.strptime(close_time, "%H:%M").time(), tzinfo=timezone.utc)
    return day_start, day_end


def compute_slots(
    day_start: datetime,
    day_end: datetime,
    working_hours: dict | None,
    existing: list,
    duration_min: int,
    now: datetime,
    slot_step_min: int = 30,
) -> list[dict]:
    """Free start times in [day_start, day_end), as {"time": "HH:MM", "datetime": iso}.

    THE FOUR RATIFIED BEHAVIOURS (P4 contract §٣) LIVE IN THIS LOOP, and each is written as one
    line so none of them can be "tidied" away without the diff showing it:

      * a slot ending EXACTLY at close is offered      `candidate + duration <= day_end`
      * the past is excluded by the wall clock          `candidate < now`  (see module docstring)
      * `cancelled`/`no_show` free the time            — carried in by the caller's query
      * overlap is `r_start < new_end and r_end > new_start`

    `now` is REQUIRED and has no default. A default would let a caller inherit a definition of
    "now" it never stated, which is exactly how F-TZ-1's defect got in the first time. Callers pass
    `wall_clock_now()`, and a test asserts structurally that they all do.

    No buffer time between bookings, per the v1 scope lock this engine inherits unchanged.
    """
    slots: list[dict] = []
    candidate = day_start
    while candidate + timedelta(minutes=duration_min) <= day_end:
        if candidate < now:
            candidate += timedelta(minutes=slot_step_min)
            continue

        try:
            check_working_hours(candidate, working_hours)
        except ValueError:
            candidate += timedelta(minutes=slot_step_min)
            continue

        if not has_conflict(existing, candidate, duration_min):
            slots.append({"time": candidate.strftime("%H:%M"), "datetime": candidate.isoformat()})

        candidate += timedelta(minutes=slot_step_min)

    return slots
