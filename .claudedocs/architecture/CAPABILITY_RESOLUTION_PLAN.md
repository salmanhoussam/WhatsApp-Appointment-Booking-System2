# Capability Resolution Plan — Migrating Off the Single Tenant-Wide `moduleKey`

**Status:** Design only. No code changes yet — this document is the Architecture Plan authorized by
`.claudedocs/adr/TOS-004-plural-capability-resolution.md`; each phase below gets its own
Implementation Contract before any of it is built, per `documentation-policy.md`'s standard
workflow. Revised as phases complete — this is a living plan, not a one-time snapshot.

## 1. The Target Model

Replace "the tenant's one `moduleKey`" with two small, real primitives, both already backed by data
that exists today — no new backend concept, no migration, no schema change:

```js
// 1. Plural membership — "is capability X active for this tenant at all?"
//    Backed by: GET /{slug}/config's real `active_services` array (already correct, already plural)
hasCapability(activeServices, 'store')      // → boolean
hasCapability(activeServices, 'catalog')    // → boolean
hasCapability(activeServices, 'restaurant') // → boolean

// 2. Per-record ownership — "what capability does THIS specific thing belong to?"
//    Backed by: CatalogCategory.moduleKey (already per-category, already real) /
//    Reservation.moduleKey (already per-row, already real) — read directly off the record,
//    never inferred from "the tenant."
category.module_key   // 'catalog' | 'store' | 'booking' | 'restaurant' — already on every category
reservation.module_key // already on every reservation row
```

No component asks "what is the tenant's moduleKey" going forward. Each component asks exactly one
of the two questions above, whichever its actual decision requires — most consumers need only the
first (plural membership); only true per-record decisions need the second.

## 2. Per-Consumer Migration Design

Each row: the real file (from the Module Resolution Review's survey), what it does today, what it
becomes. "Behavior change" is stated explicitly — some consumers change nothing observable for a
single-capability tenant, only for a multi-capability one like `hr`.

| # | File | Today | Becomes | Behavior change for `hr` |
|---|---|---|---|---|
| 1 | `useGenericStore.js`'s `deriveModuleKey()` | Collapses `activeServices` to one winner, stores it | Deleted. Store keeps `activeServices` (the real array) as-is; nothing derives a winner | — (removes the bug's own root) |
| 2 | `DynamicPage.jsx:272-275` | Duplicate inline derivation | Deleted; passes `activeServices` down directly, no `moduleKey` prop | — |
| 3 | `GenericAdminDashboard.jsx`'s own `deriveModuleKey()` | Third, differently-behaving copy | Deleted; same as #2 for the admin tree | — |
| 4 | `useCatalog.js` | Fetches categories/items for one derived `moduleKey` | Fetches categories/items with **no** `module_key` filter (the repository already supports this — omit it, get every category across every type for this tenant, per Module Resolution Review point 3) | `hr`'s `useCatalog()` now returns both the `catalog` and `store` categories together |
| 5 | `catalogApi.js` | Routes fetch by single `moduleKey` (`restaurant`→menu endpoint, `store`→store endpoint, else→generic) | Becomes capability-aware per call: if the *caller* needs one specific capability's items (e.g. a section explicitly about Store), pass that capability explicitly; if the caller needs "everything," omit the filter (per #4) | No silent single-category truncation |
| 6 | `FeaturedItemsSection.jsx` | "First category of the one moduleKey" | Fetches **all** categories (via #4), groups by `category.module_key`, and renders each group under its own real heading (or, minimally for a first cut, simply stops assuming one category — see §4 Non-Goals for what's deferred) | RK Barber's "خدماتنا" heading shows real haircut services again; store products get their own real section instead of overwriting it |
| 7 | `CategoriesGridSection.jsx` | Same single-moduleKey category fetch | Same fix as #6 | Both category types render |
| 8 | `CatalogPage.jsx` | `canOrder = moduleKey === 'restaurant' \|\| moduleKey === 'store'` (global, page-wide) | `canOrder = hasCapability(activeServices, 'restaurant') \|\| hasCapability(activeServices, 'store')` — same boolean logic, plural-sourced input, so this one file's *code shape* barely changes, only what it reads from | None observable — already latently correct once `activeServices` is plural at the source |
| 9 | `CartPage.jsx:271-272` | Returns `null` (renders nothing) if derived `moduleKey` is `'catalog'` | Renders whenever `hasCapability(activeServices,'store') \|\| hasCapability(activeServices,'restaurant')` is true, regardless of whether `catalog` is *also* active | Cart page stops disappearing for a tenant that has both Catalog and Store |
| 10 | `ReservePage.jsx`'s `MODULE_KEY_MAP` | Maps a single derived `moduleKey` to the *reservation's own* `module_key` value on create | **Unchanged** — this is a genuine per-record decision (what `module_key` to stamp on the new reservation), not a tenant-wide collapse. Explicitly named as correctly-scoped in TOS-004 §3, Option B | None — not in scope for migration |
| 11 | `OverviewTab.jsx` | `hasOrders = moduleKey === 'restaurant' \|\| moduleKey === 'store'`; fetches `/${moduleKey}/orders` | `hasOrders` becomes the same plural check as #8; order-fetching becomes **per-active-capability** — fetch `/store/orders` if Store is active, fetch `/restaurant/orders` if Restaurant is active, merge if a tenant somehow has both (not expected today, but no longer silently wrong if it happens) | Stat cards reflect real Store orders once Store is active, unconditionally on whether Restaurant/Catalog also are |
| 12 | `OrdersTab.jsx` | Entire tab keyed off one `moduleKey` (`MODULE_STATUSES[moduleKey]`, fetch `/${moduleKey}/orders`) | Same per-active-capability fetch/merge as #11; `MODULE_STATUSES`/`TRANSITIONS` keyed by each order's own capability, not the tab's assumed single type | Orders tab shows real Store orders reliably (this migration also removes the tab's dependency on the same collapsed value implicated in the Acceptance Review's Finding #11a chain) |
| 13 | `KanbanBoard.jsx` | Hardcoded `if (moduleKey === 'catalog') return <"no orders">` | Shows the board whenever `hasCapability(activeServices,'store') \|\| hasCapability(activeServices,'restaurant')` is true, columns/transitions selected per the specific order's own capability, not a tenant-wide guess | Currently-dead code (per Acceptance Review Finding #12) — fixing this is only relevant if/when this component is ever wired back in; otherwise its fix is definitional, not user-visible yet |

Consumers explicitly **not** touched: `Reservation.moduleKey`, `CatalogCategory.moduleKey`
themselves (already correct, per-record, real Source of Truth — TOS-004 §6), and any purely
cosmetic/branding single-value field (e.g. `page_type` for Hero layout choice) that was never about
capability resolution in the first place.

## 3. Migration Sequence (phased, each with its own verification gate)

Ordered so that at every phase boundary, the app is in a real, working, verifiable state — never a
partial rewrite with some consumers on the old model and some on the new model producing
inconsistent behavior mid-migration for the *same* decision.

**Phase 1 — Introduce the primitives, touch nothing else.**
Add `hasCapability(activeServices, key)` as a small, real, tested utility (likely
`frontend/src/utils/` or alongside `useGenericStore.js`). Zero consumers changed yet. Verification:
a unit-level check that `hasCapability(['catalog','store'], 'store')` and equivalents return
correctly — trivial, but real, not skipped.

**Phase 2 — Migrate the Public-facing Catalog rendering path** (#4, #5, #6, #7 above) — this is the
exact path behind the Acceptance Review's Finding #5, so it closes the highest-impact known bug
first. Verification: real screenshot of `hr`'s public homepage showing **both** its real haircut
services and its real store products, each under their own correct heading — the precise before/
after proof this migration exists to produce.

**Phase 3 — Migrate Cart + Reserve gating** (#8, #9; confirm #10 needs no change). Verification: a
real Add-to-Cart → Checkout click-through on `hr`'s live Catalog page (closing the Unknown left open
in the Acceptance Review about UI-driven Cart not being re-walked), confirming the Cart page no
longer disappears.

**Phase 4 — Migrate the Admin Dashboard's Overview/Orders/Kanban** (#11, #12, #13). Verification:
real screenshots of `hr`'s Admin Overview and Orders tabs showing real Store order data reliably —
paired with the separate, already-tracked Finding #11a/#11b investigation (the `useTenantConfig`
fallback and the still-unexplained Catalog-tab stuck-loading state), since this phase touches
adjacent code but does **not** claim to fix those two issues by itself; they get their own
verification regardless of this migration's outcome.

**Phase 5 — Delete the three duplicate derivation functions** (#1, #2, #3) once every real consumer
has been migrated and independently verified in Phases 2-4. Verification: `grep -rn
"deriveModuleKey\|moduleKey ===" frontend/src` returns nothing outside of intentionally-unchanged,
per-record contexts (`ReservePage.jsx`'s `MODULE_KEY_MAP`, `CatalogCategory`/`Reservation`'s own
`module_key` field reads) — a concrete, checkable exit criterion for "migration complete," not a
subjective judgment call.

Each phase is its own Implementation Contract (file list, tests, rollback plan) before it starts, in
line with this project's standard workflow — this Architecture Plan does not itself authorize
writing code; it authorizes the *shape* of the work each future Contract will execute.

## 4. Explicit Non-Goals (first cut)

- **Multi-section rendering polish** — Phase 2's fix to `FeaturedItemsSection.jsx` guarantees real
  services and real products both render *somewhere real*, correctly attributed; it does not commit
  to a specific new visual design for "what a two-category homepage looks like" (e.g., two separate
  section blocks vs. one merged grid with type badges) — that is a design decision for whoever
  executes Phase 2's Contract, informed by real tenant content, not pre-decided here.
- **A tenant genuinely having both `restaurant` AND `store` active simultaneously** (#11/#12's
  "merge if a tenant has both") — no real tenant does this today; the design leaves room for it
  (fetch-and-merge per active capability, not an if/else picking one) but this plan does not invent
  UI for a case with zero real examples to design against yet, per this project's own Abstraction
  Rule.
- **`CatalogCategory.moduleKey`'s own value set becoming a typed registry** — tracked separately in
  `.claudedocs/evolution/catalog-module-taxonomy.md`, explicitly out of scope here (TOS-004 §6).
- **Fixing Finding #11a/#11b** (the `useTenantConfig` DEFAULT_CONFIG fallback silently disabling
  tabs, and the still-unexplained Catalog-tab stuck-loading state) — real, related, adjacent, but a
  separate root cause from the single-`moduleKey` collapse; not folded into this plan just because
  Phase 4 touches nearby code.

## Related

- `.claudedocs/adr/TOS-004-plural-capability-resolution.md` — the decision this plan executes.
- `.claudedocs/reviews/module-resolution-review-2026-07-28.md` — the investigation both derive from.
- `.claudedocs/reviews/rk-barber-acceptance-review-2026-07-28.md` — Findings #5, #11a/#11b, #12.
