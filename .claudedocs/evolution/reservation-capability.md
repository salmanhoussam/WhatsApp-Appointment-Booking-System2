# Reservation Capability — Evolution Log

Accumulating real evidence about the `Reservation` model's generalization across booking types
(restaurant tables, service appointments, clinic doctor bookings, and whatever comes after) — see
`.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section for what this file
is and isn't.

## 2026-07-30

### Context

Salman wanted a Clinic-style booking system (a customer picks a doctor, each doctor has their own
calendar) without letting `Reservation.metadata` become an ever-growing untyped JSON blob. Four
rounds of design review (each surfacing a real, concrete objection — Capability vs. Type conflation,
boolean-explosion risk, Resource/entity conflation, a missing Service tier) converged on a design
before any code was written, then Clinic was built and live-verified end to end against the real
server and real DB — not just designed. This entry records what that real build actually proved.

### Discovery

**The Reservation pipeline is now a settled, evidenced fact, not a proposal.** Built and verified
live in `app/services/reservation_service.py`'s `create_reservation()`:

```
Validate → Resolve Resource → Working Hours → Conflict Check → Create Reservation → Post Actions
```

Confirmed live, with real HTTP calls against a running server and real DB rows (not unit tests):
working-hours enforcement per-resource (a doctor's own schedule, editable, taking effect
immediately for new bookings — confirmed by editing a resource's hours mid-session and observing
the very next booking attempt respect the new hours); conflict detection on real overlapping
(not just identical) time ranges; cross-resource independence (two different doctors, same
wall-clock time, no false conflict); a real `Service` row referenced by a Reservation's metadata
with zero schema changes; cancellation and status-transition lifecycle operations (a real,
pre-existing bug in both — `update_many()` returning a plain `int` in this Prisma client version
rather than an object with `.count` — was found and fixed as part of this same verification, not
deferred).

**Resource's responsibility is now settled, not just designed.** `Resource`
(`prisma/schema.prisma`) represents *a bookable thing with its own calendar* — `workingHours`,
`isActive`, a `type` discriminator — not the business entity itself. A doctor's identity fields
(name, specialty, phone) live on the same row for v1 (a single table, not split, per the resolved
design decision — Doctor's real fields were too thin to justify a second table yet), but the
*conceptual* boundary — Resource is the calendar-having slice, not "a Doctor" — held up under real
implementation and is the thing to preserve if/when a resource type's own fields grow enough to
earn a dedicated table.

**A real gap surfaced by building, not by predicting**: rescheduling (changing an existing
reservation's `reservedAt`) does not exist as a capability at all — confirmed by reading the real
code, not assumed. `update_status()` only ever changes `status`; there is no code path anywhere
that changes a reservation's time after creation. This was found *because* Clinic was exercised
with real scenarios (multiple doctors, cancellation, status transitions, edited working hours)
rather than declared complete after the first successful booking.

### Current Understanding

Four architectural decisions ratified from this real build, none of them speculative:

1. **The pipeline above is canonical.** Every current and future Reservation Strategy (restaurant,
   services, clinic, and whatever comes after) goes through these six stages, in this order. A
   Strategy may answer different questions at each stage (does this need a Resource? whose
   calendar?) but never reorders or skips a stage.
2. **Resource is "a bookable thing with a calendar," not a business entity.** `Resource ≠ Doctor`
   conceptually, even where they currently share one table for pragmatic v1 reasons. This is the
   line to preserve so future resource types (a desk, a chair, a vehicle) don't get forced into
   fields that only make sense for a doctor, or vice versa.
3. **Reschedule is a registered, deferred, independent capability — not folded into Update Status,
   Cancel, or Create.** It needs its own re-validation of Working Hours and its own re-run of
   Conflict Check against the new proposed time (and plausibly an audit trail later) — a distinct
   workflow, not a field update. Not built now; named explicitly so it isn't silently assumed to
   already exist or forgotten as "just another status."
4. **No extraction (`ReservationStrategy` registry, `ReservationProfile`, an ADR) until a second
   real case succeeds.** Barber is the next case, chosen deliberately over Coworking because it's
   close enough to Clinic to be a real test of reusability (same pipeline? same Resource shape?
   same Working Hours mechanism? does Service differ?) without being so different that nothing
   would be shared regardless. If Barber needs only small, additive changes (a new
   `RESOURCE_BACKED_MODULE_KEYS` entry, a new `Resource.type` value, a new `MODULE_DEFAULTS`
   duration) — as the current code's structure suggests it might, since `_resolve_resource`/
   `_check_working_hours`/the resource-backed Conflict Check branch are already keyed on set
   membership rather than a hardcoded `"clinic"` string — that reuse is the real evidence an
   extraction would be justified. If Barber instead needs a genuinely different shape, that's
   equally real evidence that extracting now would have produced the wrong abstraction.

### Open Questions

- Does Barber actually reuse the existing resource-backed pipeline path with only additive
  changes, or does it reveal a real difference (e.g., a barber "chair" resource behaving
  differently from a doctor)? Not yet known — this is exactly what building it answers.
- Once Reschedule is eventually built, does it reuse `_check_working_hours`/the Conflict Check
  logic as-is, or does re-validating an *existing* reservation (excluding itself from its own
  conflict check) need a variant? Named here so it isn't rediscovered as a surprise later —
  `find_overlapping_by_resource`'s existing `exclude_id` parameter (already present, unused by any
  caller today) suggests this was anticipated structurally, but not proven.
- Whether this entry gets promoted to an ADR after Barber, or needs a third case first, is not
  decided — depends on how convergent Barber's real requirements turn out to be.

### Promoted?

No — deliberately deferred pending Barber (the second real case). This entry itself is the
evidence trail that a future promotion decision will be based on, per this project's own Abstraction
Rule (`rules/team-roles.md`) and this file's own promotion rule
(`documentation-policy.md`'s "an evolution file gets promoted into a real ADR only once its
understanding has stabilized through multiple independent real implementations").

## 2026-07-31

### Context

Barber — the 2nd real Reservation Strategy case, chosen deliberately over Coworking (close enough
to Clinic to be a real reusability test, not so different that nothing would be shared regardless)
— was built today. Per Salman's explicit instruction, it was built **as if Clinic didn't exist**:
its own `Barber` table (`prisma/schema.prisma`, no `type`/`specialty` columns), its own migration
(`prisma/migrations/add_barbers_table.sql`), its own repository (`app/repositories/barber_repo.py`),
its own `_resolve_barber()` (`app/services/reservation_service.py:120-138`) and
`find_overlapping_by_barber()` (`app/repositories/reservation_repo.py:102-121`), its own admin route
(`app/api/v1/admin/barbers.py`), its own public listing endpoint (`GET
/public/reservations/barbers`) — none of it calling into Clinic's `_resolve_resource()`,
`RESOURCE_BACKED_MODULE_KEYS`, or `find_overlapping_by_resource()`. This entry records the
comparison Salman asked for once Barber was live-verified end to end (per-barber working hours
including a live edit taking effect immediately, overlap conflict detection, cross-barber
independence at the same wall-clock time, role gating, cancel lifecycle — same rigor as Clinic's
own 2026-07-30 verification, against a fresh disposable `barberlab-test` tenant, not `hr`, per
Salman's explicit instruction not to touch the real RK Barber Shop tenant).

### Discovery

**What turned out to be literally identical, built independently:**

- `_resolve_resource()` (`reservation_service.py:99-117`) and `_resolve_barber()`
  (`reservation_service.py:120-138`) are structurally identical: guard on module_key, require an
  id from `metadata`, fetch the row scoped by `clientId`, raise `ValueError` if missing/inactive,
  return the row. Same 5-step shape, arrived at independently for a different entity.
- `find_overlapping_by_resource()` (`reservation_repo.py:79-100`) and
  `find_overlapping_by_barber()` (`reservation_repo.py:102-121`) are identical: same ±4h window,
  same `status: {"in": [...]}` filter, same `exclude_id` parameter never yet called by anything.
- Both independently needed a **real FK column** on `Reservation` (`resourceId`, `barberId`) rather
  than a metadata key for their primary entity reference — the same Metadata Field Test reasoning,
  applied fresh to Barber's own conflict-check needs, landed on the same answer.
- Both reused the existing `Service` model directly for priced offerings (haircut/beard trim,
  cleaning/braces) rather than inventing a new concept — confirmed via the seed data
  (`scripts/seed_barber_arch_test.py`), not assumed.
- Both converged on the identical admin role matrix (`SUPER_ADMIN`/`TENANT_ADMIN` write,
  `+MANAGER_RESERVATIONS` read) via the Ownership Question asked fresh for Barber, not copied from
  `resources.py`'s comment.
- Both real, independent implementations still call the same **pre-existing**
  `_check_working_hours()` utility (`reservation_service.py:80-96`) for the actual date/closed-day
  math — this one is legitimate shared infra, not duplicated, because it predates Clinic itself
  (used for the tenant-wide `Client.config.working_hours` fallback on every module_key, not
  something Clinic invented).
- Barber's fields ended up 5-of-7 identical to Resource's: `name`, `phone`, `isActive`,
  `workingHours`, `sortOrder` all present on both, independently chosen.

**What turned out similar but genuinely not identical:**

- Resource has a `type` discriminator (`"doctor"` today, designed for future resource types) and a
  `specialty` field; Barber has neither (`prisma/schema.prisma`'s `Barber` model). Built without
  speculating about a future 3rd resource kind, Barber's real requirements never asked for a type
  column. This is real evidence Resource's `type` may have been premature generalization — or it
  may turn out justified once a case genuinely needs more than one resource kind per tenant
  (a future Coworking case with both desks and rooms, say). Still open, not resolved by this case
  alone.
- The Working Hours resolution block in `create_reservation()` (`reservation_service.py:174-191`)
  is visibly more awkward for barber than for resource — an artifact of Barber's branch being
  bolted onto an existing function on the 2nd pass, not a genuine domain difference. Worth naming
  as a code-shape scar from build *order*, separate from the real domain findings above.
- The two public listing endpoints differ in shape: `GET /public/reservations/resources?module_key=`
  (needs a `MODULE_KEY_TO_RESOURCE_TYPE` lookup, since Resource is multi-type) vs. `GET
  /public/reservations/barbers` (no module_key param at all, since Barber has no type dimension).
  This isn't an independent difference — it's a direct, downstream consequence of the `type`-column
  divergence just above, not a second separate finding.

**What was genuinely Clinic-only** (would not transfer even if extraction happened): the `type`
discriminator's generality itself, and the `specialty` field — both medical-framing choices with no
Barber equivalent modeled. Notably thin: most of what *looked* Clinic-specific during the original
4-revision design (the pipeline, the resolve/conflict-check shape, the FK-over-metadata call) turned
out to be general Reservation Strategy mechanics, not Clinic-specific after all — confirmed now by
a second real, independent build reaching the same shape, not assumed from the first build alone.

### Current Understanding

Two real, independently-built cases now show:
1. The 6-stage pipeline held for a second case without needing to change shape or add a stage.
2. The `_resolve_X()` / `find_overlapping_by_X()` pair is, concretely, the same shape twice —
   the strongest, most literal duplication found (not merely "looks similar").
3. The one genuine unresolved question a shared abstraction would have to answer correctly is the
   `type`-column question: does a future 3rd case need multiple kinds of resource per tenant (making
   Resource's `type` field the right call), or does every case turn out to be single-kind like Barber
   (making `type` unnecessary generality)? Two cases can't answer this — a 3rd case that genuinely
   needs multiple resource kinds in one tenant would.

### Open Questions

- Does `ReservationStrategy`/`ReservationProfile`/registry extraction happen now, given this
  evidence, or does the `type`-column question above warrant waiting for a 3rd case first? This is
  Salman's decision to make with this comparison in hand, per his own explicit instruction
  ("نجلس ونحدد ما الذي يستحق الاستخراج، وما الذي يجب أن يبقى خاصًا بكل حالة") — not concluded here.
- If extraction does happen, does `Resource` and `Barber` merge into one shared table (dropping
  Barber's leaner shape) or does the shared code operate over two separate tables via a common
  repository interface? Not decided — a real design question the extraction step itself would need
  to resolve, not answered by this comparison alone.
- `barberlab-test` (disposable test tenant, `scripts/seed_barber_arch_test.py`) — kept for now in
  case Salman wants to re-run any check; safe to delete whenever it's no longer needed (no real
  customer data, isolated from `hr`/RK Barber Shop throughout).

### Decision (2026-07-31, Salman, after reviewing the diff + bo-hussein's analysis above)

**No extraction now — not because the duplication isn't real, but because it isn't costly yet.**
bo-hussein's analysis (above) recommended extracting the small `_resolve_X()`/`find_overlapping_by_X()`
pair now, reasoning the duplication was concrete and the extraction reversible. Salman agreed the
duplication is real but drew the line differently: merging two functions with exactly two
consumers trades a small, cheap duplication for a new abstraction that itself hasn't proven its
shape is right yet — particularly since the `type`-column question (Current Understanding #3
above) is still open. Extracting a helper today and having to re-shape it next week if `Resource`
itself changes shape is a worse outcome than leaving two short, readable functions alone for now.

**Sharpened trigger for when extraction becomes justified** — not just "two cases exist" (this
entry's own evidence), but one of:
1. **A 3rd real case appears** (Coworking or otherwise) and the same `_resolve_X()`/
   `find_overlapping_by_X()` shape repeats a *third* time — three independent confirmations of the
   identical shape is much stronger evidence than two, and would also finally exercise the
   `type`-column question for real (does the 3rd case need multiple resource kinds in one tenant?).
2. **Routine maintenance pain appears first** — a bug fix or feature change to the shared
   Reservation pipeline starts requiring edits to both the Clinic branch and the Barber branch
   together, more than once. That's the concrete signal that the duplication has become a
   maintenance cost, not just a line-count observation.

Neither has happened yet. Both `RESOURCE_BACKED_MODULE_KEYS` (clinic) and the barber-specific code
in `reservation_service.py` stay exactly as built today — no `ReservationStrategy`, no
`ReservationProfile`, no shared resolve/conflict-check helper, no `Resource`/`Barber` schema
merge — until one of the two triggers above is real, not anticipated.

### Promoted?

No — deliberately deferred, per the Decision above. Not "not decided yet" — decided not to,
for a stated reason, with two concrete future triggers named instead of a vague "later."

## 2026-08-05

### Context

Salman's framing, verbatim intent: "أنت فعليًا ما عم تبني Dashboard للحلاق. أنت عم تبني Reservation
Engine" (you're not building a barber dashboard, you're building a Reservation Engine) — Calendar →
Reservations → Staff → Availability → Notifications should all be generic, reusable by Barber,
Clinic, Spa, Gym, Coworking, Car Service, and Consultant tenants alike, with only service names,
staff-type labels, service durations, colors, and some rules varying per tenant. Requested before
Staff/Customers/Notifications get built: a short architecture review identifying every
barber-specific assumption still present in the UI or backend, and a migration-plan-shaped write-up
— barber-specific naming, barber-specific assumptions, generic abstractions, what becomes tenant
configuration, what remains universal. **Explicitly a review, not a refactor** — no code changed for
this entry.

### Discovery

**Headline finding — not new, re-surfaced with fresh evidence.** `Resource`
(`prisma/schema.prisma:739-764`, `module_key="clinic"`) and `Barber` (`prisma/schema.prisma:777-798`,
`module_key="barber"`) remain two live, parallel models for the same "who/what gets booked" concept
— `Barber` is `Resource` minus `type`/`specialty`, every other field identical. `Reservation` still
carries both FKs simultaneously; the backend still duplicates the whole pipeline per model
(`_resolve_resource`/`_resolve_barber`, `find_overlapping_by_resource`/`find_overlapping_by_barber`,
separate repo files). This is the exact fork the 2026-07-31 entry above already found and
deliberately deferred, with two named triggers for revisiting it (a 3rd real case, or repeated
dual-file maintenance pain). **Neither trigger has fired yet** — this review does not discover the
fork again, it asks whether "the next tenant type" (Clinic, Spa, Gym, ...) is itself the 3rd case,
and finds: not yet, because Clinic — the one other module_key that could have been that 3rd case —
has a complete backend but has never actually been exercised by a real frontend (see below).

**1. Barber-specific naming** splits into two genuinely different things:
- (a) Generic concepts merely *named* barber — the `Barber` model's actual fields (name, phone,
  isActive, workingHours, sortOrder — all generic), `StaffColumn` (the component name is already
  generic), the nav label `الموظفون` (Staff, already generic Arabic, not "الحلاقون").
- (b) Real barber-only business logic baked into names — the public availability endpoint
  (`app/api/v1/public/reservations.py:130-155`, `get_availability`) hardcodes `barber_id` as its
  only query param with no resource-equivalent path; `ReservePage.jsx` hardcodes "الحلاق" as literal
  UI copy, not a configurable label; `edit_reservation()` only re-runs conflict checks when
  `moduleKey == "barber"` — a real, not cosmetic, conditional.

**2. Barber-specific assumptions** — real behavioral bets baked into the current build:
- One-staff-to-one-customer-per-slot, no capacity concept at all — breaks the moment a tenant type
  needs a shared resource (a gym class with 15 seats, a shared coworking desk).
- No buffer/turnover time between bookings — an explicit v1 scope-lock, not an oversight, but still
  a real assumption that would need addressing for e.g. a car service bay needing cleanup time.
- The single-visible-staff-column UI pattern (`StaffColumn`) is a small pill row today — works for
  RK Barber Shop's 1 barber, explicitly not yet proven at higher staff counts (see the new
  Performance section below).
- `clinic` has a complete, real backend (Resource, resolve, conflict-check, working hours) but
  **zero frontend anywhere** — confirmed: no file in `frontend/src/` references `resource_id` or
  renders a resource-picker booking flow, and the tenant's own marketing page copy still says
  "Coming soon" for Clinics. This is the concrete reason Clinic hasn't yet become the 3rd case that
  would trigger extraction — it exists in the backend but has never been real-world exercised
  end-to-end the way Barber has.

**3. Already-generic abstractions** (the real, working part of the engine — don't undersell these):
`module_key` dispatch end-to-end (routes, services, `MODULE_DEFAULTS`); `ClientService` gating
(`require_service("reservations")`) reused verbatim by every reservation route regardless of
module_key; `CatalogItem.metadata.requires_booking` + `duration_min` as a real, working generic
bridge turning any catalog item into a bookable service with zero schema change; the `Reservation`
model's own header comment already documents itself as cross-vertical by design; the admin
nav/tab registry already keys off generic service strings, not module_key; `ReservationsWeekCalendar.jsx`
already has zero barber references anywhere in it; the drag-and-drop mechanics are reused wholesale
from `KanbanBoard.jsx` (not barber-specific to begin with — a generic board pattern applied here).

**4. What becomes tenant configuration** (not code, not yet built as config, but the natural home
once it is): the staff-type label (barber/doctor/trainer/consultant — currently hardcoded Arabic
strings like "الحلاق"/"الموظفون"); module-level default durations (currently Python literals in
`MODULE_DEFAULTS`, whereas real per-service durations already correctly live on
`CatalogItem.metadata.duration_min` today — the config gap is only at the module-default fallback
level); the still-open `Resource.type`/`specialty` question from the 2026-07-31 entry (deliberately
unresolved, needs a 3rd real case per the existing Decision above — this review does not resolve it
either); the staff-switcher pill-vs-dropdown UI threshold (how many staff before the pill row needs
to become a dropdown/search — unmeasured, see Performance below); registration-time venue-type map
entries for new verticals (additive, same pattern `"barbershop"` already uses today, so this one is
already a solved, generic mechanism, just needs new entries per vertical, not new code).

**5. What stays universal**, confirmed by re-reading the real code, not assumed: the calendar's
quarter-hour pixel math (`QUARTER_PX`, `quarterIndexFromIso`/`isoAtQuarter`); the drag-and-drop
mechanics; conflict-detection arithmetic; working-hours enforcement (`_check_working_hours`,
already predates Clinic itself per the 2026-07-31 entry); the 6-stage reservation pipeline (Validate
→ Resolve Resource → Working Hours → Conflict Check → Create Reservation → Post Actions, ratified
across two independent real builds, Clinic and Barber); and the module_key/ClientService/
requires_booking infrastructure as a whole.

**6. Performance implications** (Salman's addition to this review's scope — documentation only, no
fixes, no benchmarking harness built): real, checkable unknowns rather than a felt sense of
scalability, since this becomes load-bearing the moment Clinics/Gyms bring more staff/resources per
tenant than RK Barber Shop's single barber ever has:
- **Staff-column rendering** (`ReservationsTodayView.jsx`'s `StaffColumn`): renders one column per
  active barber/resource with no virtualization. Untested past 1 real staff member in production —
  genuinely unknown whether 100 columns would stay smooth; this is a documented gap, not a measured
  limit.
- **Reservation list queries** (`reservation_service.list_reservations`,
  `app/api/v1/admin/reservations.py`'s `GET /` and week-range endpoints): scoped by `clientId` +
  date range per the multi-tenancy rule, `limit` capped at 500 — no pagination beyond that cap, and
  no measured behavior at, say, 1,000+ reservations in a single week-view query. Not confirmed as an
  N+1 pattern from this review's reading (the list endpoint issues one bounded query, not one per
  reservation) — but the per-reservation service-name/barber-name lookups the frontend does
  client-side (`serviceNameFor`) were not traced for an N+1 shape at scale and remain an open
  question, not a confirmed finding either way.
- **Week Calendar** (`ReservationsWeekCalendar.jsx`): fetches a 7-day range in one call
  (`date_from`/`date_to`), which avoids a 7x per-day request pattern — a real, already-good design
  choice — but the client-side rendering of that result at high reservation density per day is,
  like the Today view, untested past today's real data volumes.
- **Net honest statement**: no known performance failure has been observed (RK Barber Shop's real
  data volumes today are small), and no virtualization or query-shape change is recommended by this
  review — but "untested at 100 staff / 1,000 reservations / a dense week view" is a real, named gap
  worth carrying forward rather than assuming away, precisely because Clinic/Gym-type tenants are
  the ones most likely to actually hit these numbers first.

### Current Understanding

Nothing found here changes the 2026-07-31 Decision or its two named extraction triggers. The
concrete addition this review makes: Clinic remaining frontend-less is itself evidence about *why*
the 3rd-case trigger hasn't fired — it's not that three cases were tried and only two converged, it's
that the second built case (Clinic) was never actually put in front of a real user end-to-end the
way Barber was. A future Clinic (or Spa/Gym/Coworking) frontend build would be the real test of
whether Barber-shaped assumptions (single-staff-per-slot, no capacity, no buffer time) survive
contact with a genuinely different booking shape — this review flags where those assumptions live
(§2 above) so that future build knows exactly what to check, without predicting the answer now.

### Open Questions

- Does a future Clinic/Gym/Coworking frontend build actually break the one-staff-one-slot/no-capacity
  assumption, or does it turn out additive like Barber's own build did relative to Clinic's backend?
  Not knowable without building it — named here so it's checked deliberately rather than discovered
  as a surprise.
- The staff-column UI's real scaling ceiling (pill row vs. a dropdown/search pattern) — unmeasured,
  no number attached yet; whoever builds the first multi-staff-heavy tenant should measure this
  rather than guess.
- Whether the per-reservation client-side name-lookup pattern (`serviceNameFor` et al.) is a real
  N+1 shape at scale — flagged as unconfirmed in §6, not resolved by this review.

### Promoted?

No — this review does not conclude that a generic Reservation Engine extraction is warranted yet.
The headline finding (Resource/Barber fork) is unchanged from 2026-07-31: still deliberately
deferred, still pending one of its two named triggers. **Per Salman's explicit Stop Condition for
this review: even if a future review's evidence did conclude extraction was warranted, this session
stops at naming that candidate and citing the evidence — no architectural refactor begins in the
same session as the review that recommends it.** The review and the decision to act on it stay two
separate moments, same as every other Recommendation/Decision split this project already applies
(`investigation-protocol.md`). No code changed for this entry.

### Escalation Watch (2026-08-05, Salman's addition)

**The next real tenant implementation (Gym / Clinic / etc.) becomes the mandatory decision point.
No further barber-specific capability should be added before re-evaluating this architecture.**
Named explicitly so that two months from now, a new barber-only feature doesn't get quietly bolted
on and this review doesn't get forgotten — the next real vertical build is the checkpoint, not an
optional one.

## 2026-08-06

### Context

Phase Closure for the Reservation Calendar UI specifically (Today View + Week View), requested by
Salman right after Phase 3.4 (Weekly Calendar Feature Parity) landed — the same discipline already
applied once this week to the broader Dashboard/Calendar arc (`reservation-dashboard-v1`, closed
2026-08-06 earlier the same day). This entry is narrower and later: it closes the one real gap that
closure didn't yet cover — Week View lacked Create/Edit/Cancel/Drag/Time-Awareness entirely, Today
View had all of them.

### Discovery

Phase 3.4 (7 commits, `0e53a08`..`45dd83a`) took Week View from "view + status-change only" to full
parity with Today View, via one deliberate prerequisite (Step 0) rather than duplicating each
capability:

- **Step 0** extracted `frontend/src/pages/generic-admin/components/reservationInteractions.jsx` —
  `ReservationPopover`, `CreatePopover`, `usePopoverPosition`, the date-math helpers, and new
  `useBarbers()`/`useCatalogItems()` hooks — out of `ReservationsTodayView.jsx`, which previously
  defined all of it privately with `ReservationsWeekCalendar.jsx` having zero reuse (a fully
  standalone implementation). Both views now import the same components; a real duplicate-fetch
  (barbers/catalog items independently re-fetched by each view) was eliminated as a direct
  consequence, not a separate optimization pass.
- **Items 2-5** each shipped one capability (Create, the popover-based Edit/Cancel/Status/
  quick-confirm/mini-reschedule, drag-and-drop, current-time awareness), each its own commit,
  each independently Browser-Verified before the next started — same discipline as every other
  multi-item plan this project has run.
- **Three real bugs found and fixed along the way, not predicted in advance:**
  1. Week's cancelled reservations weren't disappearing from the grid (`VISIBLE_STATUSES` filter
     existed in Today, was missing in Week — moved into the shared module so both apply the
     identical rule).
  2. Week's `today = new Date()` read true UTC calendar fields instead of the shared
     local-wall-clock convention every other "now" in this feature uses — silently mis-highlighted
     "today" for 2-4 hours around local midnight, every day, confirmed via exact pixel-math
     evidence during the fix's own verification.
  3. The shared popover's body used conditional `overflowY` based on a fixed per-mode height
     estimate that couldn't account for the new quick-confirm button's variable height (only
     renders for pending reservations) — caused real content-overlap on mobile, fixed by making
     the scroll behavior unconditional rather than tuning the estimate.
- **Drag-and-drop's one genuinely new piece**, not just a mirror of Today: Week's grid is 2D
  (day × time) where Today's is 1D (a single visible staff column, time only) — dropping now
  resolves both a target day (from dnd-kit's `over.id`, the first real exercise of its collision
  resolution in this feature — Today's own `over.id` is never actually read since only one column
  ever renders) and a new time (reusing the identical origin-quarter-index + `delta.y` math Today
  already uses, since day columns are vertically aligned siblings).

### Current Understanding

The Reservation Calendar UI (Today + Week) is now a single coherent surface with one shared
interaction layer, not two independently-evolving screens. Every capability in the original gap
review's table (Create, Edit, Cancel, Status Change, Drag time+day, Current-time line, Auto-scroll,
Empty-slot click) is ✅ on both views, confirmed via real Browser Verification including desktop and
mobile passes and a round-trip ghost-card check on drag. This closes cleanly under the same
Escalation Watch this file already set on 2026-08-05: the Resource/Barber architectural question
remains untouched by this phase (no extraction, no schema change) — Phase 3.4 was UI-layer parity
work, not a Reservation Strategy decision, and doesn't move that question either direction.

### Open Questions

None new. The existing 2026-08-05 Escalation Watch (next real tenant type = mandatory
re-evaluation checkpoint for Resource/Barber) still stands, untouched by this UI-layer closure.

### Promoted?

No extraction, no ADR — not applicable to this entry (UI feature-parity work, not an architecture
decision). Tagged `reservation-calendar-v1` at `45dd83a`.

### Standing Rule (2026-08-06, Salman's explicit addition — binding going forward)

**Any future Calendar capability must ship in both Today View and Week View before it can be
considered complete.** Named explicitly so a future addition doesn't quietly land in one view and
get forgotten in the other, repeating the exact gap this phase just closed. Applies to the Calendar
screen specifically (Today/Week), distinct from — and additive to — the 2026-08-05 Escalation Watch
above, which governs the separate Resource/Barber backend question.

### Phase Closure note

Per Salman's explicit instruction: the Reservation Calendar (Today + Week) is now considered a
**stable platform other features get built on, not an area under continuous development.** No
further Calendar work is planned unless a real bug surfaces. Next priority order: Staff Management
→ Customers → Notifications.

## 2026-08-07

### Context

A Salman-requested checkup on the Calendar's filter buttons (اليوم/الكل) found and fixed a real bug
the same day — those List-only date controls stayed visible and interactive during Today/Week view
despite doing nothing there (`5321764`). That fix, plus the fact that "Reservations" and "Calendar"
already render the exact same `ReservationsTab.jsx` component, prompted Phase 3.5 — Reservations
List v1 Completion: bringing the List view to the same capability level as Today/Week, reusing the
one Reservation Engine, not building a second one.

### Discovery

Item 0's Capability Matrix (investigated directly, not assumed) found List had real gaps: no way to
View/Edit/Reschedule a reservation at all, Cancel only reachable via `StatusCell`'s dropdown with no
confirm-safety-step (Calendar's cancel path has one), Quick Confirm not reachable except via a
2-click status dropdown. Root cause matched Week's own pre-Phase-3.4 shape exactly: List's render
path never imported `ReservationPopover`/`CreatePopover` from `reservationInteractions.jsx`. All
mutation handlers List needed already existed in `ReservationsTab.jsx`, already passed to Week/Today
— the gap was pure UI wiring, zero new backend calls.

One real, previously-latent bug surfaced during Item 2 (the new "+ حجز جديد" Create button):
`getUsableViewportBottom()` (the shared popover-positioning probe) mistook
`GenericAdminDashboard.jsx`'s full-height desktop sidebar for a bottom-docked overlay, collapsing the
computed usable viewport height to ~0 on every desktop call. Every earlier popover trigger (empty-
slot clicks, table rows) opened far enough down the page that this stayed masked; a button near the
top of the screen was the first trigger point to expose it, squeezing `CreatePopover` into a ~160px
sliver pinned to the top-left corner. Fixed by requiring a fixed element be bar-shaped (height under
half the viewport) before treating it as a bottom bar, not merely touching the bottom edge.

Search, which Salman's own review correctly reclassified as a List-specific capability rather than a
Calendar-parity gap, turned out to have a zero-cost implementation already proven in this codebase —
`OrdersTab.jsx`'s own search bar filters its already-fetched array client-side, no backend param.
Applied unchanged to Reservations.

### Current Understanding

List, Today, and Week are now three Views over one Reservation Engine, not three independently
maintained UIs — every capability in Item 0's Shared table (View, Edit, Cancel, Quick Confirm,
Status, Reschedule, Create) reads ✅ on all three, confirmed via real Browser Verification at every
step (4 separate passes: Item 1, Item 2, the bundled positioning-fix re-verification, and the final
Search + full-regression pass). `ReservationPopover`/`CreatePopover` needed zero layout-specific
branching to support List (the Stop Condition Salman required was never triggered) — List is the
third proven case of the same extraction Phase 3.4 already validated twice.

### Open Questions

None new. The 2026-08-05 Escalation Watch (Resource/Barber, next real tenant type) and the
2026-08-06 Standing Rule (superseded below) both stand; this phase didn't touch either question.

### Promoted?

No extraction, no ADR — UI feature-completion work, not an architecture decision, same classification
as Phase 3.4.

### Standing Rule (2026-08-07 — supersedes the 2026-08-06 rule above)

**Any Reservation capability is considered complete only when it works across Today View, Week
View, and List View — unless explicitly declared view-specific** (e.g. Search, Pagination, Date
filter, each genuinely List-only by design, not gaps). The 2026-08-06 rule ("ships in Today + Week")
is now subsumed by this one — List was the one view it didn't yet cover, and this phase closes that
permanently, not just for this feature set.

### Phase Closure note

Per Salman's own framing: this phase is named "Completion," not "Feature Parity" — List isn't
copying Calendar, it's reaching its own v1 state on the same engine, exactly as Today and Week each
did. With this closed, the Reservation Engine has three feature-complete, non-duplicated interfaces
sharing one backend, one set of mutation handlers, and one shared interaction layer
(`reservationInteractions.jsx`). Next priority order unchanged: Staff Management → Customers →
Notifications.

## Related

- Reservation Strategy Architecture design doc (harness plan file, this session — four revisions,
  each resolving a real objection before any code was written): Capability→Reservation Type
  conflation, Boolean Explosion risk, Resource≠Doctor, missing Service tier.
- `.claudedocs/work/restaurant-capability-investigation/2026-07-29/investigation.md` — the prior
  investigation that first confirmed `Reservation` (not `Booking`) is the right generalized model
  for slot-based bookings, and that `Booking`/`Reservation` are non-interchangeable.
- `.claudedocs/adr/ADR-0004.md` — Information Ownership Model; the ownership test ("does the
  business search/relate/transact this?") applied throughout this design to distinguish Business
  Data (Resource, Service, Reservation) from a Platform Contract (the eventual Strategy registry,
  not tenant-owned data).
- `.claude/rules/backend/architecture.md` §9 — "One Capability, One Service" — `reservation_service.py`
  remained the sole write path throughout, confirmed, not just assumed.
