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
