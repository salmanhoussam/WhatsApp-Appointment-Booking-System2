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

## 2026-08-08 (implementation — Phase 3.7C)

### Context

Same day, later: Salman reviewed the plan built from the entry above and stopped it before Commit 1
— it assumed `Service = CatalogItem where requires_booking = true`, a real domain-model conflation
he'd been describing independently (Category = organization, Service = bookable, Item = sellable,
Staff = provides Services, Reservation = Service+Staff+Time, Order = Items). Investigated fresh
(this planning pass, not re-litigating the morning's investigation): `requires_booking` was read in
exactly 4 frontend files via the same one-line filter, only 2 seed scripts ever set it — a small
blast radius — and `CatalogItem` already had zero `Reservation` relation but three real order-side
ones. Decision: `CatalogService` as its own real Prisma model, not a flag. Full write-up:
`.claudedocs/todo_list.md`'s Phase 3.7C entry (2026-08-08) has the complete implementation account;
this entry records the architectural discovery, not the mechanics.

### Discovery

- The Service/Item conflation was already half-visible in the schema before this phase touched
  anything: `CatalogCategory.moduleKey` already distinguished `"catalog"` from `"store"`/
  `"restaurant"` at the category level, and `hr`'s real live data already split cleanly along that
  line (all 6 "الخدمات" items `requires_booking: true`, all "منتجات العناية" items without it) —
  the conceptual split existed in practice, just not enforced structurally.
- A real, second-order naming collision surfaced immediately on writing the schema: an unrelated
  `Service` model already existed (smar's property-booking add-ons), colliding both as a Prisma
  model name and as the physical table name (`@@map("services")`). Caught by `prisma validate`
  before any migration ran — not by careful reading, by the tool itself. A second collision (a
  wildcard public route intercepting a URL path) was caught only via live Browser Verification,
  after the naming one was already fixed — two independent instances of the same underlying
  lesson (grep for existing names/routes before choosing new ones, in this specific codebase,
  isn't optional).
- The conservative-migration correction (copy the 6 real rows with the same id reused, never
  delete/move) is now this project's own concrete instance of a general principle worth naming: a
  migration that only adds is a fundamentally different risk class than one that also deletes, even
  when the "obviously correct" end state looks identical either way.

### Current Understanding

The Service/Item split is real and now structural, not just a naming convention. `CatalogService`
and `CatalogItem` are permanently separate tables sharing one category taxonomy. `Reservation` is
now resolvable through a real `serviceId` FK exactly the way it already was through `barberId` —
`metadata.service_id` is legacy-only going forward. The Staff↔Service relationship
(`BarberService`) is real, live, and already exercised with real data on `hr` (`حسين` → `شعر`).

### Open Questions

- Enforce vs. soften (carried over from the earlier entry) — still not decided; the soft
  fallback-to-all behavior is what actually shipped.
- Whether/when the original 6 `catalog_items` rows get deleted or archived — explicitly deferred,
  gated on real usage of the new model holding up (this phase's own regression pass already passed,
  but that's a necessary condition, not sufficient justification on its own to delete real rows).
- Phase 3.7D (Services Management UX — a real admin CRUD for `CatalogService`) is named but not
  scoped in detail; `CatalogService` rows are currently editable only via direct API calls.

### Promoted?

Yes, in effect — `CatalogService` and `BarberService` are now real, shipped, Browser-Verified
Capabilities, not a proposal. No formal ADR written for this split specifically (the Abstraction
Rule's evidence bar — multiple independent real cases — isn't really the right test for "correcting
a conflation that already existed," which is what this was); revisit if a second, independent
tenant's real data later stresses this same Service/Item boundary in a way this entry didn't
anticipate.

## 2026-08-09 (Phase 3.7D, resolved in a different shape — Staff/Store IA Separation)

### Context

The Phase 3.7D question left open above ("Services Management UX... named but not scoped in
detail") got resolved this session, but not as a standalone "Phase 3.7D" — it became one half of a
larger Staff/Store Information Architecture Separation
(`.claudedocs/implementation/STAFF_STORE_IA_SEPARATION_CONTRACT.md`), triggered by Salman noticing
the admin Store area showed Services mixed with Store Items with no real separation.

### Discovery

- The real CatalogService CRUD this entry's own Open Questions named ("editable only via direct API
  calls") now exists — built inside `StaffTab.jsx` as an الموظفون/الخدمات internal toggle, exactly
  matching an earlier abandoned Phase 3.7D design pass from 2026-08-08 (never executed, but directly
  reused as prior art once picked back up).
- A real bug found via required Browser Verification: the existing "الخدمات التي يقدمها"
  assignment checklist (this file's own 2026-08-08 entry) didn't refresh after a new service was
  created in the sibling sub-view — a mount-only fetch, `StaffTab.jsx` never unmounting on sub-view
  switch. Fixed, whole verification pass restarted on the corrected code.
- Confirms this entry's own prior claim: `CatalogService`/`BarberService` held up under real UI
  construction with zero backend/schema change needed — the Service/Item boundary this file already
  established was correct as built.

### Current Understanding

Phase 3.7D's original scope (Services Management UX) is now fully shipped, just under a different
name and combined with a second, related IA problem (Store showing Items). The
"editable only via direct API calls" gap named in the 2026-08-08 entry above is closed.

### Open Questions

- Enforce vs. soften (Staff↔Service) — still not decided, unaffected by this session's work.
- Whether/when the original 6 legacy `catalog_items` rows get deleted — still deferred, unaffected.

### Promoted?

Already promoted (see above) — this entry just records that the one real open item from that
promotion (Services Management UX) is now closed too.
