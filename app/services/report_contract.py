"""The Report Data Contract — one shape every renderer consumes and none may bypass.

ADR-0008 (`.claudedocs/adr/ADR-0008-visual-report.md`), decision D-4. Plan:
`.claudedocs/plans/restaurant-visual-report.md`, Phase 1.

WHAT THIS FILE IS
-----------------
The shape of a report, and the period arithmetic that decides which rows belong to it. Nothing
here touches a database, imports Prisma, or knows what a restaurant is. A VERTICAL SUPPLIES A
READER, NOT A SHAPE — which is the whole reason `barber` and `clinic` can be added later by
registering a reader rather than by editing this file (ADR-0008 D-2).

    Report ──┬── Live Dashboard (recharts)
             ├── Visual Report Page          ← the product
             ├── Static Image                 (later)
             └── MP4                          (later, exported from the same page)

One capability, one contract, one service, many interfaces — `rules/backend/architecture.md` §9.
A renderer never queries the database; it renders a `Report` and nothing else.

🔴 THE INVARIANT THAT MATTERS MOST — NO FIGURE COMES FROM A MODEL
-----------------------------------------------------------------
Lia resolves an intent to an OPERATION NAME; a registered reader produces every number from the
database. This is `lia_operations.py`'s own rule ("nothing the model produces except the operation
NAME") and invariant I-7 ("Lia holds no permission of her own"), carried into the visual layer
because a beautiful page carrying an invented number is worse than no page at all.

Nothing in this module may import an LLM client, and `scripts/test_report_contract.py` asserts
that structurally rather than trusting it (RC-6).

🔴 THE TIME CONVENTION IS INHERITED, NOT RE-DERIVED — F-TZ-1
-------------------------------------------------------------
`reservedAt` and `createdAt` are stored throughout this system as naive LOCAL wall-clock values
LABELLED UTC, with no conversion. That convention is deliberate and documented at
`app/services/availability_engine.py:25-45`, and using a true UTC instant instead was a real,
browser-verified production defect (`044aafe`, 2026-08-05 — slots from 15:00 while local time was
17:37; `d77ddce` carried the fix to three more guards).

So this module takes "now" from `availability_engine.wall_clock_now()` and never calls
`datetime.now()` itself (RC-2). ADR-0008 D-3 records why the "obvious fix" is a regression, and
F-TZ-1 — a tenant timezone column and converting the stored values — stays out of scope by
Salman's decision of 2026-09-26.

A consequence worth stating plainly: the shop's day runs midnight to midnight on the CONTAINER's
wall clock (`TZ=Asia/Beirut`), which is the same clock the rows were written against. Reader and
writer agree, which is the only property that matters here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional, Sequence

from app.services.availability_engine import wall_clock_now

# The shop's week starts on Monday. Stated as a named constant rather than a bare 0 so that
# changing it is a decision with a place to live, not an edit to an expression.
WEEK_STARTS_ON = 0  # Monday, matching datetime.weekday()

PeriodKind = Literal["day", "week"]


# ── Period ────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ReportPeriod:
    """The half-open window [starts_at, ends_at) a report covers.

    Half-open on purpose: an order written at exactly midnight belongs to the day that is
    beginning, never to both days and never to neither. Both bounds carry the system's labelled-
    UTC representation (see the module docstring), so they are directly comparable against a
    stored `createdAt` with no conversion at either end.
    """

    kind:      PeriodKind
    starts_at: datetime
    ends_at:   datetime
    label_ar:  str

    def contains(self, moment: datetime) -> bool:
        """Half-open membership. Used by tests and by any reader that filters in memory."""
        return self.starts_at <= moment < self.ends_at


def _floor_to_day(moment: datetime) -> datetime:
    """Midnight of `moment`'s own day, keeping the labelled-UTC representation intact.

    `.replace()` rather than arithmetic: it drops time-of-day without moving the instant or the
    label, which is exactly the operation the convention requires.
    """
    return moment.replace(hour=0, minute=0, second=0, microsecond=0)


def day_period(now: Optional[datetime] = None) -> ReportPeriod:
    """The shop's current day.

    `now` is injectable so a test can pin a moment; it defaults to the one definition of "now"
    this system has. A caller passing its own `datetime.now()` would reintroduce the reader/writer
    split F-TZ-1 exists to describe, so callers are expected to pass nothing.
    """
    start = _floor_to_day(now or wall_clock_now())
    return ReportPeriod(
        kind      = "day",
        starts_at = start,
        ends_at   = start + timedelta(days=1),
        label_ar  = "اليوم",
    )


def week_period(now: Optional[datetime] = None) -> ReportPeriod:
    """The shop's current week, starting Monday.

    Lia has no concept of a week today (`grep -c "الأسبوع" app/prompts/lia.md` → 0, measured
    2026-09-30), so this is the first definition of one in the system. It is defined here rather
    than in a reader so that every vertical's week means the same thing.
    """
    start = _floor_to_day(now or wall_clock_now())
    start = start - timedelta(days=(start.weekday() - WEEK_STARTS_ON) % 7)
    return ReportPeriod(
        kind      = "week",
        starts_at = start,
        ends_at   = start + timedelta(days=7),
        label_ar  = "هالأسبوع",
    )


def previous_period(period: ReportPeriod) -> ReportPeriod:
    """The window immediately before `period`, of the same length.

    Comparison is the point of a report — "better than last week" is the sentence an owner
    actually wants — so the previous window is derived here rather than recomputed by each reader
    with its own idea of what "last week" means.
    """
    span = period.ends_at - period.starts_at
    return ReportPeriod(
        kind      = period.kind,
        starts_at = period.starts_at - span,
        ends_at   = period.starts_at,
        label_ar  = "اليوم اللي قبلو" if period.kind == "day" else "الأسبوع اللي قبلو",
    )


# ── The parts of a report ─────────────────────────────────────────────────────


@dataclass(frozen=True)
class ReportMetric:
    """One headline number, and optionally the same number in the previous period.

    `previous` is Optional and `delta_pct` is None when it cannot be computed. A percentage change
    from zero is undefined, not infinite and not 100 — returning None forces the renderer to say
    something honest ("أول مرة") instead of printing a number nobody can defend.
    """

    key:       str
    label_ar:  str
    value:     float
    unit:      str = ""
    previous:  Optional[float] = None

    @property
    def delta_pct(self) -> Optional[float]:
        if self.previous is None or self.previous == 0:
            return None
        return round(((self.value - self.previous) / self.previous) * 100, 1)


@dataclass(frozen=True)
class ReportSeries:
    """An ordered set of buckets — the time axis a chart needs.

    `points` is (bucket_label, value). Bucket labels are produced by the reader because only the
    reader knows whether a bucket is an hour, a day or a weekday name.
    """

    key:      str
    label_ar: str
    points:   Sequence[tuple[str, float]] = field(default_factory=tuple)


@dataclass(frozen=True)
class ReportTable:
    """A ranked list — "top items" and anything shaped like it.

    `rows` is (label, value, secondary): the name, the number that ranks it, and an optional
    second figure the renderer may show or drop.
    """

    key:      str
    label_ar: str
    rows:     Sequence[tuple[str, float, Optional[float]]] = field(default_factory=tuple)


@dataclass(frozen=True)
class Report:
    """One tenant's numbers for one period. The only thing a renderer is ever given.

    `headline` is the single line the first screen shows. It is SELECTED from the metrics by a
    reader, never written by a model — see the module docstring.

    `is_empty` exists so a renderer never has to infer emptiness from a zero: a shop that sold
    nothing and a shop whose reader found no rows are the same thing to an owner, and both deserve
    a sentence rather than a chart of zeros (RC-4).
    """

    tenant_slug:  str
    vertical:     str
    period:       ReportPeriod
    headline:     str
    metrics:      Sequence[ReportMetric] = field(default_factory=tuple)
    series:       Sequence[ReportSeries] = field(default_factory=tuple)
    tables:       Sequence[ReportTable]  = field(default_factory=tuple)
    generated_at: datetime               = field(default_factory=wall_clock_now)

    @property
    def is_empty(self) -> bool:
        return all(m.value == 0 for m in self.metrics) if self.metrics else True


def empty_report(tenant_slug: str, vertical: str, period: ReportPeriod, headline: str) -> Report:
    """A VALID report for a period with no rows — never None, never a fabricated figure.

    RC-4. A reader that finds nothing returns this rather than raising or returning None, because
    "you had no orders today" is a real answer and the renderer must be able to render it. The
    alternative — inventing a plausible number so a demo looks alive — is forbidden outright
    (`feedback_no_fabrication_design_briefs`).
    """
    return Report(
        tenant_slug = tenant_slug,
        vertical    = vertical,
        period      = period,
        headline    = headline,
        metrics     = (),
        series      = (),
        tables      = (),
    )
