# Catalog — Architecture (Maturity) Review Ledger

Recurring maturity review for the Catalog Capability. Governed by
`.claude/rules/architecture-review-loop.md`. Never rewritten or deleted — only appended to. See
`.claudedocs/architecture/capabilities/catalog.md`'s `## Maturity` section for the current-state
summary this ledger produces.

## Review 1 — 2026-07-29

### Original Goal

Started narrow: expose `CatalogCategory.moduleKey` in the Admin UI so a `services`-type tenant's
haircut services and retail products wouldn't render flattened into one undifferentiated list
(RK Barber Shop, `hr`). Grew, over the same session, into a platform-wide question: should any
frontend consumer collapse a tenant's real plural capability set into a single derived value at
all?

### Current State

Per `architecture/capabilities/catalog.md`'s Maturity section: the original moduleKey-selector fix
is resolved and verified end-to-end (real store category + 4 real products + a real Cart + Cash
Checkout order for `hr`). Beyond that Capability file's own scope: every frontend consumer that
used to derive a single tenant-wide `moduleKey` (Public Catalog rendering, Cart/Reserve gating,
Admin Dashboard Overview/Orders, the Admin topbar) now resolves against the tenant's real plural
`active_services` array via `hasCapability`/`hasOrderCapability`
(`frontend/src/utils/capabilities.js`). Confirmed via a Search Verification grep: zero
`deriveModuleKey()` callers remain anywhere in the frontend.

### What Worked

- **Compare old (already-correct) consumer vs. new (broken) consumer, fix at the shared layer, not
  per-component** — applied consistently across Phases 2-5 of the migration. E.g. Phase 2's public
  Catalog rendering bug was fixed once in `useCatalog.js`/`catalogApi.js`, not patched separately in
  every section component that consumed it.
- **The mandatory pre-deletion Search Verification gate** — required before Phase 5 could delete
  the three duplicate `deriveModuleKey()` functions. It caught two real, previously-unreviewed
  exceptions the original dependency map had missed: `useGenericStore.js`'s Store cart
  session-ID creation gated on the collapsed value, and `CartPage.jsx`'s own remaining dependency
  on the field Phase 5 was about to delete. Both were fixed before the deletion, not after.
- **Independent corroboration before ratifying an ADR** — the dormant `health-gym` template's own
  manual override (`template-registry.js:329`, hand-overriding `module_key: 'catalog'` to escape
  the same wrong priority order) served as a second, pre-existing, independent case that the
  tenant-wide-`moduleKey` concept was already wrong before RK Barber ever hit it — satisfying this
  project's Abstraction Rule bar (2+ independent real cases) before generalizing into `TOS-004`.

### What Didn't

The Phase 5 dependency map, written during Plan Mode before any deletion, was **incomplete** — it
did not anticipate `CartPage.jsx`'s real dependency on `useGenericStore.js`'s `moduleKey` field.
This was only caught live, during Phase 5's own final re-verification walkthrough (Add-to-Cart →
Cart), not during planning. Fixed immediately within the same phase, but the planning gap itself is
a real "what didn't work" — even a carefully dependency-mapped migration missed one real caller.

### Unexpected Discoveries

This migration's three duplicate `deriveModuleKey()` definitions (`useGenericStore.js`,
`DynamicPage.jsx`, `GenericAdminDashboard.jsx`) are now recorded in
`evolution/capability-contracts.md` as the **third independent confirmed instance** of that file's
own tracked pattern — "a second implementation grows unnoticed next to a first, in an unrelated
part of the codebase" — after Media's dual hero-write-path (first instance, 2026-07-23) and a
public-catalog-routes duplication (second instance, 2026-07-24).

### Architecture Impact

Ratified as `.claudedocs/adr/TOS-004-plural-capability-resolution.md` — retires the
`Tenant → One Module` concept platform-wide in favor of `Tenant → Capabilities`, resolved through
`hasCapability(activeServices, key)` / `hasOrderCapability(activeServices)`. This is a real change
to how every future "does this tenant support X" question in the frontend must be answered — never
a new single-value derivation.

### Promote?

No further promotion needed this Review — already promoted to an ADR (`TOS-004`) and the full
5-phase migration is complete and independently verified (Architecture Success Criteria in
`.claudedocs/reviews/capability-resolution-phase5-verification.md` all met). This Review closes
that arc rather than opening a new one.

### Next Actions

- `evolution/catalog-module-taxonomy.md`'s own open watch-point — should
  `CatalogCategory.moduleKey`'s 4-value string set become a typed registry — remains unresolved,
  not yet due for its own promotion.
- `KanbanBoard.jsx` — confirmed dead code throughout this migration, still contains the old wrong
  `moduleKey === 'catalog'` pattern. Deliberately left unfixed (no live render path, no way to get
  real verification for a change) — revisit only if it's ever wired back into a real route.
- `evolution/capability-resolution-layer.md`'s watch-point (should `capabilities.js` grow into a
  narrow-per-consumer Registry instead of the shared `hasCapability`/`hasOrderCapability` pair)
  remains open — qualitative signal, not a function-count threshold.
- `catalog.md`'s own still-open **Duplicate Architecture** finding (`store.py`/`restaurant.py`
  bypassing `catalog_service.py`) is unrelated to this migration and remains unresolved — a
  candidate for a future Implementation Contract, not this Review's scope.

## Related

- `.claudedocs/adr/TOS-004-plural-capability-resolution.md` — the ratified decision this Review
  closes out.
- `.claudedocs/architecture/CAPABILITY_RESOLUTION_PLAN.md` — the full 5-phase migration plan.
- `.claudedocs/reviews/capability-resolution-phase5-verification.md` — final Architecture Success
  Criteria evidence.
- `.claudedocs/evolution/capability-contracts.md` — the cross-cutting pattern this Review's
  Unexpected Discoveries section is the third confirmed instance of.
- `.claudedocs/architecture/capabilities/catalog.md` — the current-state Contract/Maturity summary.
