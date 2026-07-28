# TOS-004 — Plural Capability Resolution (retiring the single tenant-wide `moduleKey`)

**Status:** Decided. Ratifies the finding of `.claudedocs/reviews/module-resolution-review-2026-07-28.md`
(read that document first — this ADR records the decision it recommended, not a re-derivation of the
evidence). **Scope note:** Tenant-OS-scoped (`TOS-XXX`), lives in `.claudedocs/adr/` alongside
`ADR-000X`, per `ADR-0003.md` §4 — this is squarely about how a tenant's Capabilities resolve for
consumption across Interfaces, `TOS-001`'s own domain, not a platform-wide infrastructure decision.

## 1. Context / Problem Statement

The frontend derives a single, tenant-wide `moduleKey` (`restaurant > store > catalog`, hardcoded
priority) and threads it through roughly a dozen components as if it were "the tenant's one type."
`hr` (RK Barber Shop) is the first live tenant with more than one simultaneously-active
catalog-bearing Capability (`catalog` for services, `store` for retail products, plus `booking`/
`reservations`), and this collapsed model broke visibly: its real haircut services vanished from
its own public homepage, replaced under the same heading by newly-added store products, because
every consumer of `moduleKey` can only ever see the one value that won the priority contest.

The Module Resolution Review traced this to its root: the backend was **never** built around a
single value. `client_services` (`service-system.md` §1) is already an unbounded, unordered set —
one row per independently-active capability, no cap of one. `CatalogCategory.moduleKey` is already
per-category, not per-tenant — `hr` already owns categories of two different `moduleKey`s
simultaneously in the real database, right now. The frontend's single-value `moduleKey` is a
simplification bolted on top of an already-correct plural backend model, and it has been outgrown.

## 2. Decision Drivers

- **Two independent real exceptions now confirm this is a pattern, not a fluke** — this project's
  own Abstraction Rule (`rules/team-roles.md`) treats two independently-arising real cases as the
  evidentiary bar for "this is a stable pattern worth acting on," not a one-off to special-case
  around. `hr`'s real production bug is the first case; the dormant `health-gym` template already
  needing a hand-written override of the exact same derivation logic (`template-registry.js:329`,
  written before `hr` ever existed) is the second, fully independent case. The bar this project
  already holds itself to for extracting a real pattern is met here in reverse — for retiring a
  wrong one.
- **The backend requires zero changes.** `client_services`/`active_services` and
  `CatalogCategory.moduleKey` already carry the plural, correctly-scoped information. This is a
  frontend-consumption fix aligning with an already-correct model, not a new capability to build.
- **The wrong assumption is already load-bearing, not latent** — `CartPage.jsx` renders nothing at
  all for a `catalog`-derived tenant even if real `store` items exist in the same catalog;
  `KanbanBoard.jsx` hardcodes "a catalog-type tenant has no orders." Every additional
  multi-capability tenant onboarded before this is fixed inherits the same silent breakage.

## 3. Options Considered

**Option A — Reorder or contextualize the single-value priority (e.g., make it page-aware, or flip
which capability wins).** Rejected. This treats the symptom, not the concept: any single-value
`moduleKey`, however cleverly prioritized, still cannot represent a tenant that genuinely needs two
capabilities visible on the same page (RK Barber's real homepage needs to show haircut services
*and* retail products, not pick a winner between them). This is explicitly the option Salman ruled
out: *"Plan the migration around plural capability resolution, not around replacing one [value with
another]."*

**Option B — Plural capability resolution: resolve capability at the granularity each real decision
already has it, against the tenant's actual capability set, and retire the single tenant-wide
`moduleKey` entirely.** Chosen. Concretely:
- **"Is capability X active for this tenant at all?"** → a plural membership check against
  `active_services` (already a real array from `GET /{slug}/config`) — e.g. "does Store exist here"
  is `activeServices.includes('store')`, independent of whether Catalog or Booking also exist.
- **"What capability does this specific category/item belong to?"** → `CatalogCategory.moduleKey`,
  already real, already per-category, never collapsed.
- **"What capability does this specific reservation/order belong to?"** → already correctly
  per-row today (`Reservation.moduleKey`, an individual order's own store/restaurant origin) — **not
  every existing `moduleKey`-shaped field is wrong**; only the *tenant-wide derived* one is being
  retired. Per-row/per-category fields that already describe one concrete thing are correctly
  singular and are explicitly out of scope for this decision.

**Option C — Introduce a new backend concept (e.g. a tenant "primary capability" column) to give the
frontend a single value to key off, formalized rather than ad hoc.** Rejected. This would codify
exactly the wrong assumption Option B retires, just moving it into the schema — the backend
correctly has no such concept today and should not gain one to serve a frontend simplification that
is itself being removed.

## 4. Decision

Adopt Option B. The tenant-wide, derived, single `moduleKey` — currently implemented three times
independently and disagreeing with itself (`useGenericStore.js`'s `deriveModuleKey()`,
`DynamicPage.jsx`'s inline duplicate, `GenericAdminDashboard.jsx`'s third, differently-behaving
copy) — is retired. Every real consumer resolves capability at the granularity the decision actually
requires, against the tenant's plural capability set or the specific record's own field, per the
mapping in Option B above. The full list of real consumer call sites requiring migration, and the
phased order to migrate them safely, is specified in the companion document,
`.claudedocs/architecture/CAPABILITY_RESOLUTION_PLAN.md` (design only — no code is written by this
ADR or that plan; Implementation Contracts follow per phase, per this project's standard workflow).

## 5. Single Source of Truth

This ADR is the ratified decision that plural resolution replaces the single-`moduleKey` model. The
actual per-file migration design lives in `CAPABILITY_RESOLUTION_PLAN.md` (a living plan, revised as
phases complete) — never duplicated here.

## 6. Scope / Non-Goals

- Does **not** touch the backend — `client_services`, `active_services`, and
  `CatalogCategory.moduleKey` are already correct and unaffected.
- Does **not** retire per-row/per-category `moduleKey`-shaped fields (`Reservation.moduleKey`,
  `CatalogCategory.moduleKey` itself) — only the frontend's *tenant-wide derived* value.
- Does **not** specify implementation-level code changes — that is the Architecture Plan's and each
  phase's own Implementation Contract's job, not this ADR's.
- Does **not** address `.claudedocs/evolution/catalog-module-taxonomy.md`'s separate watch-point
  (whether `CatalogCategory.moduleKey`'s own value set should become a typed registry) — related,
  independently tracked, not merged into this decision.

## 7. Consequences

- Every real consumer listed in the Module Resolution Review (`useCatalog.js`, `catalogApi.js`,
  `FeaturedItemsSection.jsx`, `CategoriesGridSection.jsx`, `CatalogPage.jsx`, `CartPage.jsx`,
  `ReservePage.jsx`, `OverviewTab.jsx`, `OrdersTab.jsx`, `KanbanBoard.jsx`, plus the three
  derivation sites themselves) requires a real, individually-verified migration step — not a single
  global find-replace.
- A tenant with any combination of simultaneously-active catalog-bearing capabilities (today: `hr`
  with Catalog+Store+Booking; tomorrow: `health-gym`-style templates, or any future combination) is
  correctly representable without a priority-order special case.
- The three duplicate derivation functions are deleted once migration completes — closing that
  Duplicate Architecture finding as a side effect, not a separate fix.

## Related

- `.claudedocs/reviews/module-resolution-review-2026-07-28.md` — the investigation this ADR ratifies.
- `.claudedocs/reviews/rk-barber-acceptance-review-2026-07-28.md` — Finding #5, the original bug.
- `.claudedocs/architecture/CAPABILITY_RESOLUTION_PLAN.md` — the migration design this decision authorizes.
- `.claude/rules/team-roles.md` — the Abstraction Rule this decision's evidentiary bar mirrors.
