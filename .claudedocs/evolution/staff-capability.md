## 2026-08-07

### Context

Reservation Platform API Boundary Cleanup (Phase 3.6.1) surfaced one real open finding rather than
fixing it: Barber/Resource roster CRUD currently lives entirely inside files classified as
"Reservation." Salman named this the actual entry point for Staff Management — not a bug, the
question Staff Management's first real decision has to answer — and asked for a Capability
Investigation before any code, same discipline as the Reservation work. Full investigation:
`.claudedocs/work/staff-capability-investigation/2026-08-07/summary.md`.

### Discovery

- "Staff" is two unrelated concepts sharing one word today: `Barber`/`Resource` (operational,
  scheduling — what Multi-Staff Scheduling actually means, per the existing Dashboard Calibration
  decision) vs. `User`/Team accounts (login/role, already has working CRUD in `admin/team.py`,
  unrelated by schema). Same naming-collision class as the earlier "four meanings of service"
  finding.
- `reservation_service.py` genuinely *reads* Barber/Resource data (working-hours/conflict
  validation) — a legitimate cross-Capability read regardless of who ends up owning the write path.
- `Barber`/`Resource` pass this project's own already-established test for Capability independence
  (`category.md`'s "can exist/be renamed/be hidden independently of any specific product" test,
  applied here for the first time to a non-Catalog case) — real evidence *for* eventual Capability
  status, not a decision to build it.
- The actual concrete gap: no Barber↔CatalogItem relationship exists anywhere, structural or
  informal — "which services can this barber perform" isn't a queryable fact today. This is the
  real design question Staff Management will hit immediately, not the ownership question alone.
- Catalog/Category/Items, examined alongside Staff per Salman's own instruction, are confirmed
  clean — zero schema-level entanglement with Barber/Resource/Reservation beyond the already-known
  informal `metadata.service_id` convention.

### Current Understanding

Staff (`Barber`/`Resource`) is a real Capability-shaped candidate, not yet built as one. The
ownership *question* has a clear, evidenced answer (own the roster CRUD; Reservation keeps reading
it, same as it reads Catalog); the ownership *ceremony* (a new `admin/staff.py`, whether `Resource`
unifies with `Barber` or stays parallel) is not decided. The Barber↔Service relationship gap is the
one piece that belongs to neither existing Capability and will need a real design decision, not a
migration, when Staff Management actually builds it.

### Open Questions

- Does per-barber service restriction reflect a real product need, or does "everyone can do
  everything" stay correct for this platform's actual tenant types? Not answerable from code —
  needs real product judgment.
- Does `Resource` (clinic) fold into whatever Staff Capability gets built, or stay separate, given
  no real clinic tenant exists yet to test either assumption?

### Promoted?

No — investigation only, no ADR, no Capability file created yet (per the same Mechanical Gate
`architecture-review-loop.md` already applies elsewhere: a `capabilities/*.md` file requires a real
built Implementation first; Staff has none yet). Revisit once Staff Management's first real
Implementation Contract exists.

## 2026-08-08

### Context

Phase 3.7B (Catalog UX) closed; Salman's explicit next step was not to jump into 3.7C's code, but
to run a Staff↔Service Capability Investigation first — the exact gap the 2026-08-07 entry above
named but didn't trace. Full investigation:
`.claudedocs/work/staff-service-relationship-investigation/2026-08-08/summary.md`.

### Discovery

- `Reservation.barberId` is a real FK today (`onDelete: SetNull`) — but `Reservation` has no
  equivalent FK to `CatalogItem`/service at all, only an informal `metadata.service_id`.
- Confirmed at the public API surface, not just the schema: `GET /availability` takes `barber_id` +
  raw `duration_min`, no service identifier at all; `GET /barbers` returns every active barber
  unconditionally, no service filter. A real customer booking a specialized service sees the exact
  same barber picker as booking anything else — live behavior on `hr` today, not hypothetical.
- A directly-reusable bridge-table shape already exists in this codebase: `ClientService`
  (`client_id` + `service_key`, unique pair) — the same shape a future `BarberService` join table
  would take. Not a new architectural idea.
- `resourceId`/`barberId`'s existing `onDelete: SetNull` is the already-established precedent for
  "historical reservations survive a roster change" — directly answers what removing a service from
  a staff member does to existing reservations (nothing, since no FK path connects them either way
  today).

### Current Understanding

The relationship is a plain many-to-many join table, owned by whichever Capability's write path
touches it (most naturally Staff's own admin surface), read by Catalog/Staff/Reservation alike —
same "ownership ≠ exclusive read access" pattern already used for Reservation's read of
`Barber.workingHours`. Fully additive to both existing public routes (`availability`/`barbers` gain
an optional filter param, no behavior change when omitted). The one real product call this doesn't
resolve: whether availability should *enforce* the relationship (hard reject) or only *soften* the
picker (pre-filter, allow override) — a decision, not a technical fact.

### Open Questions

- Enforce vs. soften (above) — Salman's call, not yet made.
- Same two Unknowns from 2026-08-07 remain open (per-barber restriction as a real product need;
  whether `Resource`/clinic gets the equivalent join table now or later) — not re-resolved here.

### Promoted?

No — investigation only, same Mechanical Gate as the 2026-08-07 entry. This closes the "what would
the relationship look like" question the last entry left open; whether it gets built is a separate,
later decision.
