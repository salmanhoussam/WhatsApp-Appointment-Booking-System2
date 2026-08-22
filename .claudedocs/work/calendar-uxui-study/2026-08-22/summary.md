# Barber Calendar — Week + Day UX/UI Redesign Study (2026-08-22)

Study only, per Salman's explicit instruction: no code, no commit, no DB changes. Investigates
Week view and Day view together, converging on one shared design language, per his explicit
correction ("ما كنت لأبدأ من الـ screenshot مباشرة... خلّيه يعمل research للـ daily والـ weekly
مع بعض، وبعدها نختار لغة تصميم واحدة للاثنين"). The attached screenshot is treated as one data
point among several, evaluated on the same Reuse/Reject basis as this project's own prior
reference research — not a spec.

Builds directly on:
- `ReservationsWeekCalendar.jsx`, `ReservationsTodayView.jsx`, `reservationInteractions.jsx` (read
  in full for this study)
- `.claudedocs/implementation/CALENDAR_TIMEZONE_FIX/A2.2.md` — the Week-view working-hours gap
  this study is explicitly asked to revisit
- `.claudedocs/reviews/BARBER_PRODUCTION_READINESS_FINAL_GATE_2026-08-21.md`
- `.claudedocs/implementation/ALZABT_MASTER_PRODUCT_PLAN.md` §D (Setmore/Trafft/Calendr.com
  reference research already done for this project — reused here, not redone)
- `app/services/reservation_service.py` (`_check_working_hours`, `create_reservation`,
  `get_available_slots`) — real backend contract
- External research (industry patterns, RTL guidance) — see References

---

## 1. Current State — confirmed from real code

### Week view (`ReservationsWeekCalendar.jsx`)

- **Grid shape**: 7 day columns × hourly rows (tenant-wide `hourRange` for all 7 columns), 15-min
  drag/create resolution. **Columns = days, not staff** — every barber's reservations for a given
  day are pooled into one column (`byDay`, line 307-319).
- Cards: name + service + time, colored left-edge stripe (Setmore pattern, already applied).
- Interactions: click-to-create, drag-to-reschedule (day-to-day + time), click-to-open
  `ReservationPopover` (shared with Day view).
- **No barber filter/selector at all** — a shop with 3+ barbers sees every barber's bookings
  merged into the same day cell with no visual grouping by who's doing what.
- Header: prev/next/today nav, "+ حجز جديد" button, day count per column. No stats, no filters.

### Day view (`ReservationsTodayView.jsx`, i.e. "Today")

- **Grid shape**: ONE barber's column at a time (quarter-hour rows, `QUARTER_PX=22`), switched via
  a pill row (`barbers.map(...)`, line 471-495). **Barber-scoped, single day** — this is the view
  A2.2 fixed to use each barber's own real working hours.
- Same card/popover/create/drag mechanics as Week, just one column instead of seven.
- Current-time red line with auto-scroll-into-view on mount.
- Staff switcher pills are hidden entirely for STAFF role (they only ever see their own schedule).

### The real, load-bearing structural finding

**The two views' actual shapes are the inverse of the real industry standard**, confirmed against
external research below: real barber/salon software's Day view is a **multi-staff resource grid**
(every barber as a column, one day) — the highest-value view for a walk-in-heavy shop ("who's free
right now, across my whole team?"). Their Week view, when it exists at all, is almost always
**scoped to one staff member** (an agenda-style week for that person), because a full
week × N-staff matrix is an unreadable grid nobody actually ships. Alzabt currently has the
opposite: Day = one barber at a time, Week = all barbers pooled per day. This single fact explains
both open findings at once — Week's A2.2 working-hours gap (no single barber to narrow hours to,
because Week pools everyone) and Day's real underuse of its own working-hours fix (a shop owner
opening Day still can't see "who's free" without clicking through each barber pill one at a time).

---

## 2. External research (real, cited)

- **FullCalendar's `resourceTimeGridDay`** — the industry-standard name for exactly the pattern
  above: resources (staff) as vertical columns, time as rows, one day. This is licensed/documented
  infrastructure other real scheduling products build the same visual pattern on top of.
- Salon/barber software UX coverage (Homebase, Zenoti, GetApp 2025/2026 guides) converges on the
  same description independent of vendor: a multi-staff calendar has to show **people AND time
  together, at day grain**, and week-grain multi-staff grids are named as a real pain point
  ("Tetris board of people, rooms, resources").
- **RTL calendar guidance** (Purrweb, Medium/Ananya Dhareshwar, Mobiscroll RTL demo): time in
  Arabic reads right-to-left (matches Alzabt's existing convention — hour gutter is already on the
  visual left because RTL flow starts right, confirmed in both files' `borderInlineStart` stripe
  placement); only *directional/flow* elements (arrows, progress) should mirror — never photos,
  clock-hands, or literal numerals. Alzabt's own nav-arrow (`‹ السابق` / `التالي ›`) already
  follows this correctly.
- Direct Booksy/Squire feature-page comparisons didn't surface a literal side-by-side screenshot
  (paywalled/marketing pages), but confirm both ship "calendar with staff columns" as a named,
  marketed feature — consistent with the FullCalendar pattern above, not contradicting it.

**Sources**:
- [Vertical Resource View — FullCalendar Docs](https://fullcalendar.io/docs/vertical-resource-view)
- [resource-timegrid — npm](https://www.npmjs.com/package/@fullcalendar/resource-timegrid)
- [Salon Scheduling Software: Top Features to Look For (2026) — Zenoti](https://www.zenoti.com/thecheckin/salon-scheduling-software-guide)
- [Salon Management Software: 2025 Guide — Homebase](https://www.joinhomebase.com/blog/salon-management-software-solutions)
- [Calendar & Scheduling — Booksy Biz](https://biz.booksy.com/features/calendar-scheduling)
- [Designing for the Right-to-Left (RTL) World — Medium](https://medium.com/@ananyaad1707/designing-for-the-right-to-left-rtl-world-f755e0bd90ed)
- [How to Make RTL Arabic App — Purrweb](https://www.purrweb.com/blog/halal-design-how-to-make-an-app-in-arabic/)
- [Calendar Date Picker RTL Example — Mobiscroll](https://demo.mobiscroll.com/calendar/rtl-right-to-left)

### The attached screenshot — evaluated the same way as this project's own past reference images

Reuse: the **right-side "Scheduled" agenda strip** for the selected day (colored bars stacked by
time, name + duration + avatars) — a real, small, genuinely useful addition Alzabt doesn't have
today, close in spirit to Trafft's "Daily occupancy" idea (§D, Image 4) which was rejected there
only for being a heatmap, not for the underlying concept of "show today's shape at a glance." The
floating edit card's field shape (Date / Type / Hour-range double-stepper / Note / Members / Save)
is already effectively what `CreatePopover`/`ReservationPopover` do — nothing new to take from it.
Reject: the **month-grid main view** — wrong grain entirely for a barber's day-to-day operational
need (create/reschedule/see-who's-free), and the generic multi-project "Members" avatar-stack
concept doesn't map onto a single-barber-per-appointment model. This screenshot is a task/project
calendar, not an appointment-resource calendar — useful for one idea (the agenda strip), not a
structural template.

---

## 3. Problems — Week view (current)

1. **No barber grouping or filter** — 3+ barbers' bookings pool into one cell per day, visually
   indistinguishable by who's doing what without opening each card.
2. **A2.2's registered gap**: grid still shows tenant-wide hours for every column, since there's no
   single barber to narrow to — can visually offer a slot a specific barber's real hours would
   reject (backend still correctly blocks it, but the UI misleads first).
3. Hourly-only gridlines read coarser than Day's quarter-hour rows for the same underlying 15-min
   resolution — fine for a glance, worse for precise click-to-create.
4. No indication of *how many barbers* are working a given day, or which ones — a shop owner
   planning next week's coverage has no view for that at all today.

## 4. Problems — Day view (current)

1. **Only one barber visible at a time.** For a walk-in-heavy shop, "who's free in the next 30
   minutes, across my whole team" — the single most common real-world question — requires
   clicking through every barber pill one at a time and holding the answer in your head.
2. Pill-switcher scales poorly past a handful of barbers (already named in the file's own comment
   as a known future scaling concern).
3. A2.2's fix (barber-aware working hours) is real and correct, but its full value is capped by
   #1 — it only helps once you've already picked a barber to look at.
4. No "today at a glance" summary (count of bookings, next free slot) — everything requires
   reading the grid directly.

---

## 5. Design Directions

### Day view — 2 directions considered

**D1 — Multi-staff resource columns (the FullCalendar/Booksy/Squire pattern)**
All active barbers as side-by-side columns, one shared time axis, one day. Each column keeps its
own real working-hours boundary (barber A's column stops at 18:00, barber B's at 21:00 — same data
A2.2 already fetches per barber, just rendered N times instead of once). Barber pill row becomes a
**show/hide toggle** (multi-select) instead of a single-select switch, defaulting to "all active
barbers." STAFF role still sees only their own single column (today's existing hide-picker
behavior extends naturally — hide the toggle, force the column set to just their own barberId).

*Pros*: matches the real, external, validated industry pattern; answers "who's free right now"
directly; A2.2's per-barber-hours fix reaches its full intended value for the first time.
*Cons*: real layout work — N columns must fit a screen instead of 1; needs horizontal scroll or a
sensible cap (e.g. 4-5 comfortably, `overflowX:auto` beyond that — same scaling fix already named
in the pill-row's own comment, now applied to the grid itself); more DOM per render.

**D2 — Keep single-barber column, add a compact "team strip" above it**
Leave the grid exactly as-is (one barber, A2.2 intact untouched), add a thin horizontal strip above
it — one chip per barber showing next-free-time or a simple busy/free dot — so switching still
requires a click but at least the "who's free" question is answerable without entering each
barber's full view.

*Pros*: near-zero grid rework, smallest possible change, A2.2 code untouched.
*Cons*: doesn't actually solve the structural problem, just adds a hint on top of it; a shop
owner still can't see two barbers' actual bookings side-by-side at the same time, which is the
real, recurring need this session's own research confirms.

### Week view — 2 directions considered

**W1 — Scope Week to one selected barber (reuse Day's own barber concept), days as columns**
Add the same barber selector Day view already has (single-select, or "all" as a pooled option)
to Week. When one specific barber is selected, the grid narrows to *that barber's own working
hours* for every day column — this is the direct, structural fix to A2.2's registered gap, because
it removes the actual reason Week couldn't do it before (no single barber to resolve hours from).
"All barbers" stays available as a toggle, keeping today's pooled view for a quick glance, with the
explicit, honest caveat that pooled mode keeps the tenant-wide range (nothing to narrow to when
multiple barbers are shown at once — same logical limit Day's D1 doesn't have, since D1 renders one
column per barber instead of pooling into one).

*Pros*: solves A2.2's open finding for real, not just narrower workaround; reuses exactly the same
barber-selection mental model D1 introduces for Day — the "one shared design language" Salman
asked for; smallest real backend/frontend footprint of the three Week options.
*Cons*: switching barbers to compare two people's weeks side-by-side still isn't possible (not
this session's stated problem — Week's day-grain is coarse enough that side-by-side comparison
matters much less than it does for Day's live, minute-by-minute view).

**W2 — Per-day mini-agenda list instead of an hourly grid**
Drop the hourly grid for Week entirely; each day cell becomes a short scrollable list of
time-sorted appointment rows (name, time, service chip), closer to a real "week at a glance"
overview than a full grid. The screenshot's right-side agenda strip is effectively this pattern,
generalized across all 7 days at once instead of just the selected one.

*Pros*: reads cleaner with many bookings in one day; naturally avoids the multi-barber pooling
problem since it's a list, not a spatial grid, so barber name is just another line of text per row.
*Cons*: loses drag-and-drop-to-reschedule entirely (a real, currently-used feature — no natural
"drag a list row to a new day+time" gesture without reintroducing a grid underneath it); a real
UX regression on an already-shipped, real capability, not just a missing nice-to-have.

*(A third direction — a full multi-barber × multi-day grid, i.e. combining D1's columns with
Week's 7 days — was considered and set aside without a full write-up: N barbers × 7 days is
exactly the "Tetris board" pain point the external research names as the reason real products
don't ship this shape. Not a real, evidenced direction, just naming that it was considered and
rejected.)*

---

## 6. Recommendation

**Day → D1 (multi-staff resource columns).** This is the one clear, externally-validated,
highest-leverage change: it turns Day view into the real "who's free right now" tool a barbershop
actually needs, and is the only direction that lets A2.2's per-barber-working-hours fix deliver its
full intended value instead of being capped by a one-barber-at-a-time view.

**Week → W1 (barber selector, days as columns, reuses Day's own selection model).** This is the
direct fix for A2.2's registered gap — not a workaround, an actual removal of the reason it
couldn't be fixed before — and it's the option that shares one interaction language with Day's own
new barber-selection concept, which is exactly what Salman asked for: no "two products from two
different worlds."

**The shared design language, stated once**: *"pick which barber(s) you're looking at, then see
their real time/hours reflected in the grid you're on."* Day expresses this as columns (multiple
barbers, one day); Week expresses it as a filter (one barber at a time by default, all-pooled as an
explicit fallback mode), both grid types keep today's card/popover/drag mechanics completely
unchanged (`ReservationPopover`/`CreatePopover`/`reservationInteractions.jsx` needs no rewrite —
see below), and both keep the working-hours-per-barber logic A2.2 already proved correct, just
applied per-column (Day) or per-selection (Week) instead of once tenant-wide.

---

## 7. Backend / data model — explicit answer

**No backend or data model change is needed for either recommended direction.** Confirmed by
reading `reservation_service.py` directly:

- `GET /admin/reservations/` and `GET /barbers/` already return everything both directions need —
  every reservation already carries `barber_id`, and `useBarbers()` already fetches every barber's
  own real `working_hours` in one call (already used by A2.2). D1 (Day) only needs to render this
  same data N times (once per visible barber) instead of once for the single selected one; no new
  field, no new endpoint.
- `_check_working_hours()`'s real resolution order (Resource → Barber → Client config, confirmed at
  `reservation_service.py:204-220`) is exactly what both directions read from — already proven
  correct by A2.2's live verification on both tenants, reused as-is, not touched.
- `PATCH .../reschedule` and `POST /reservations/` — the same two mutation endpoints both current
  views already call — need no change; a drag between two barber *columns* (D1) is structurally the
  same request shape as today's drag between two *day columns* in Week (`{reserved_at, barber_id}` —
  `onReschedule`'s signature already accepts an optional `barber_id`, per
  `ReservationsWeekCalendar.jsx`'s own prop doc comment, line 255).

If this changes during implementation (e.g. a real perf ceiling at very high barber counts), that
would be a new, evidenced finding at that time — not assumed here.

---

## 8. Scope estimate — phased, small steps (continuing this week's own A-track naming)

| Phase | Scope | Real risk | Depends on |
|---|---|---|---|
| **A3.1** | Day view: barber-picker becomes multi-select (default: all active), render N `StaffColumn`s side by side instead of 1, each keeping its own already-correct working-hours boundary (A2.2 code, untouched). Horizontal scroll beyond ~4-5 columns. | Layout/CSS work, no new data fetch, no backend change | none — pure frontend |
| **A3.2** | Day view: STAFF role behavior re-verified unchanged (single forced column, no picker) — a real regression risk worth its own explicit test pass given D1 touches the same picker component STAFF's `hideBarberPicker` path depends on. | Low — mostly verification | A3.1 |
| **A4.1** | Week view: add the same barber selector (single-select + "الكل" pooled default), narrow `hourRange` to the selected barber's real hours (reuses A2.2's exact `parseHourLoose` logic, no new logic invented) when one specific barber is chosen. | Low-medium — the actual A2.2-gap fix | none — can ship independently of A3, same shared component only conceptually, not code-shared |
| **A4.2** | Week view: visual grouping/labeling when "الكل" (pooled) mode is active — e.g. a small colored dot or initial per barber on each card, since pooled mode still mixes barbers in one cell — a real, small addition, not currently in the file. | Low | A4.1 |
| **A5 (optional, not recommended to start now)** | The screenshot's right-side "today's agenda" strip — small, additive, doesn't block A3/A4, worth doing only after both grids' shared language is settled, so it can show barber context consistently. | Low | A3.1 + A4.1 (needs the shared barber-selection concept to exist first, or it's built twice) |

Each phase keeps this session's own established discipline: smallest safe step, real evidence
before/after, no phase touches backend/data unless a phase's own investigation proves it's
necessary (none currently do).

---

## Unknowns

- Real barber counts at scale for mr-h/rk today are small (2-3 each, per A2.2's evidence) — D1's
  "beyond ~4-5 columns" horizontal-scroll concern is a reasonable design guess, not load-tested
  against a real larger tenant, since none exists yet.
- Whether "الكل" (pooled) mode is actually wanted in Week once a real single-barber selector
  exists, or whether real usage converges on always picking one barber — no usage data exists yet
  to confirm either way; keeping it as a fallback default costs little and can be dropped later if
  evidence says otherwise.

## Status

**Study complete. No implementation started.** Awaiting Salman's review of the two recommendations
(D1 for Day, W1 for Week) and the phased breakdown before any of A3.1–A5 begins.
