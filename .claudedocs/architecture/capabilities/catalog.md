# Catalog Capability (Products)

Per the Capability Contract model (`../adr/TOS-003-capability-contract-model.md`). Extracted from
`TENANT_OS_PLAN.md` §13 (Contract), §19 (Open Findings), §20 (Maturity), §12 (this Capability's own
retroactive Proposal Gate check) during the ADR-0003 migration (Phase 5).

## Ownership

`CatalogItem` and `CatalogCategory` (the Phase 54 unification of what were previously separate
Menu/Store models) — the single source of truth for any sellable item a tenant lists, across the
restaurant, store, and catalog module types. Category ownership itself is documented separately in
`category.md`, since it shares this Capability's Service but is conceptually distinct.

## Capability Proposal Gate (retroactive check, `TOS-003` §4.2)

| Question | Answer |
|---|---|
| Problem, for whom? | Tenants need to list distinct sellable items with prices and photos, for their own customers to browse and order |
| New or extension? | Was genuinely new (the Phase 54 unification that replaced separate Menu/Store models) |
| More than one Interface? | Yes — Dashboard is real today; AI and a tenant-authoring API are named, reserved future consumers |
| Source of Truth? | `CatalogItem`/`CatalogCategory` — unambiguous |
| Client's own success measure? | "I can list a real product, and a real customer can find and buy it" — non-technical, checkable |

## Contract

| Sub-capability | Status | Mechanism |
|---|---|---|
| Create Product | ✅ Real | `CatalogItem` CRUD (`catalog.py`, `CatalogTab.jsx`) |
| Edit Product (name/description/price/currency) | ✅ Real | same |
| Delete Product | ✅ Real | same |
| Duplicate Product | ⚠️ Gap | No clone/duplicate endpoint found |
| Reorder Products | ⚠️ Gap | `sortOrder` field exists; no reorder endpoint |
| Archive / Hide Product | ✅ Real | `CatalogItem.isActive` |
| Publish / Unpublish | ✅ Real today, provisional | Currently equivalent to `isActive`; will become a distinct action once a real draft/publish mechanism exists (`TOS-002` §4.6, Live Preview) |
| Product-type extras (SKU, weight, variants) | ✅ Real | `CatalogItem.metadata` (`Json?`) |

## Operations (Editing Engine, `TOS-002`)

| Field | Operation type |
|---|---|
| name/description/price/currency | `UpdateField` |
| images | `ReplaceMedia` (per-item, not yet wired through the Editing Engine — Dashboard uses its own upload flow today) |
| sort order | `ReorderList` — Gap, no endpoint yet |
| isActive (archive/hide, publish/unpublish) | `ToggleVisibility` |

## Schema

`CatalogItem`: `id`, `name_ar`/`name_en`, `description_ar`/`description_en`, `price` (Decimal),
`currency`, `images[]`, `metadata` (`Json?` — SKU/weight/variants), `sortOrder`, `isActive`,
`categoryId`.

## Admin Projection

`app/api/v1/admin/catalog.py` → `catalog_service.py` → `CatalogItem`/`CatalogCategory` CRUD. This
is the **only** correct write path — see Open Findings below for where this is currently violated.

## Public Projection

`GET /api/v1/public/{module}/catalog` (already real, unchanged by this Capability's own work) —
read-only, published items only.

## Single Source of Truth

`CatalogItem` is the model; `catalog_service.py` is the intended single write path. **Violated
today** — see Open Findings (Duplicate Architecture).

## Governance

**Permissions** (Client / AI — identical by design, `../adr/TOS-001-tenant-os.md` §4's AI-plugs-in
principle): Create/Edit/Delete/Archive/Publish Product ✅/✅; Create/Rename/Delete Category ✅/✅;
Duplicate Product 🔜/🔜; Reorder Products/Categories 🔜/🔜 (blocked on the same reorder Gap noted in
Contract above).

**Draft/Publish**: provisional only — Publish today ≈ `CatalogItem.isActive`, not the staged
Live Preview mechanism (`../adr/TOS-002-editing-engine.md` §4.6) — a distinct action, not yet
built.

**Audit / Versioning / Activity**: Gap, shared platform-wide (not specific to this Capability) —
see `SecurityAuditLog`'s real, structurally-suitable-but-unused shape, named once rather than
repeated per Capability file.

## Acceptance

Scored in full detail (this project's only Capability scored criterion-by-criterion, not
approximated):

| Criterion | Status | Score |
|---|---|---|
| Dashboard | ✅ Real (`CatalogTab.jsx`) | 1 |
| AI | ❌ Not built | 0 |
| API (tenant-authoring) | ❌ Not built — distinct from the existing shopper-facing public API | 0 |
| Validation | ✅ Likely — Pydantic is this project's mandatory convention and `catalog.py` is confirmed clean; not independently re-verified field-by-field | 1 |
| Audit | ❌ Gap | 0 |
| Activity | ❌ Gap | 0 |
| Permissions | ✅ Real rows exist in the Governance table above | 1 |
| Draft/Publish | ⚠️ Provisional only | 0.5 |
| Documentation | ✅ Real — `.claude/rules/frontend/catalog-contract.md`, `service-system.md`'s table entry, this file | 1 |

**Total: 4.5 / 9 ≈ 50%.** A real, computed number — replaces "Catalog seems done" with an
auditable figure anyone can recompute.

## Maturity

**Developing** — Contract and a working Dashboard Interface exist, but Implementation carries a
live Architecture Integrity Finding (below), so it cannot yet be called Stable.

**Missing Architecture (resolved 2026-07-28)** — `CatalogCategory.moduleKey` (`catalog|booking|
restaurant|store`) was already the correct, working mechanism for separating a bookable service
from a purchasable product — `store_repo.py` reads `category.moduleKey == "store"` for its Cart/
Checkout queries and this was confirmed still true. But the Generic Admin Dashboard's
`CatalogTab.jsx` never exposed `module_key` when creating a category (its `EMPTY_CAT` had no such
field, so every category silently fell back to the backend's `module_key: str = "catalog"`
default in `app/api/v1/admin/catalog.py`'s `CategoryCreate`), which is why a `services`-type
tenant (RK Barber Shop) saw its haircut services and any future retail products flattened into one
undifferentiated list. Fixed by adding a Service/Product type selector to the category-creation
modal (set once, at creation — not editable afterward, since `CategoryUpdate` doesn't accept
`module_key` either, deliberately left alone to avoid re-classifying a category with existing
orders/reservations already keyed to its old module) plus a colored type badge on each category
card. Verified end-to-end for real: a new `store`-moduleKey category + 4 real products (spray, wax,
gel, cologne) were created for `hr`, surfaced correctly through `GET /public/store/products`, and a
real Cart + Cash Checkout order was placed and confirmed both in the DB and in the Dashboard's
Orders tab. See `.claudedocs/reviews/rk-barber-store-products-verification.md`.

**Reviewed 2026-07-29 (Review 1)** — first Architecture Review under
`.claude/rules/architecture-review-loop.md`. Beyond this file's own `moduleKey`-selector fix above,
the same session's investigation grew into a platform-wide finding: every frontend consumer that
collapsed a tenant's real plural capability set into one derived value has been migrated to
`hasCapability`/`hasOrderCapability`, ratified as `.claudedocs/adr/TOS-004-plural-capability-
resolution.md` and fully executed (5 phases + a Search Verification gate). Full ledger:
`.claudedocs/maturity/catalog.md`.

## Two unrelated things are both called "catalog" (2026-09-16)

Recorded after decision **Q2** of the catalog-model investigation
(`.claudedocs/work/catalog-model-investigation/2026-09-16/summary.md`). No structural change was
made and none is needed — this is a NAMING collision, and writing it down is the whole fix.

```
CatalogCategory.moduleKey = "catalog"     a PARTITION inside the shared catalog tables
client_services.serviceKey = "catalog"    a CAPABILITY KEY gating admin/catalog.py
```

**They are not related, and they do not have to agree.** Measured 2026-09-16:

| | |
|---|---|
| All 36 `CatalogService` rows | sit in `moduleKey="catalog"` categories |
| Yet their real gate | is `require_service("reservations")` (`admin/catalog_services.py:66`) |
| And `serviceKey="catalog"` | is **inactive on all three live tenants** (`rk`, `barberlab-test`, `mr-h`) |
| While services work there | correctly — because they never pass through that gate |

So a reader who assumes `moduleKey` names the gating capability concludes the data is
mis-classified. It is not. `moduleKey` answers **"which vertical's partition does this row belong
to"**, and it answers it consistently — `admin/store.py` passes `module_key="store"` on **eight**
call sites (create, read, update, delete, for both category and item), and `admin/restaurant.py`
does the same with `"restaurant"`. Items line up with their capability (`store`→`store`,
`restaurant`→`restaurant`); services deliberately use the generic `catalog` partition while being
gated by `reservations`.

**An earlier note in this project's own working reports said `moduleKey` "lies about its most
important table". That was stated more strongly than the evidence supports, and is corrected
here:** the column does its job without a single exception. What is true is narrower — one VALUE,
`"catalog"`, names two unrelated concepts.

**Consequence for anything new:** derive a capability gate from the ROUTE that owns the surface,
never from a category's `moduleKey`. Lia's product operation follows this — it is gated on `store`
because `admin/store.py` is, and it writes into a `moduleKey="store"` category because that is the
partition products live in. Two separate facts that happen to agree, not one fact used twice.

## Open Findings

**Duplicate Architecture** — `app/api/v1/admin/store.py` and `app/api/v1/admin/restaurant.py`
independently perform the exact same CRUD on the exact same `CatalogItem`/`CatalogCategory`
tables (confirmed: `create_item`, `update_item`, `delete_item_by_filter`, `create_category`,
`update_category`, `delete_category_by_filter` all called directly via `admin_catalog_repo` from
both files), completely bypassing `catalog_service.py`. Three route files, two different patterns,
one shared pair of tables. Not resolved as of this migration — left for a future Implementation
Contract to close, one canonical write path (`catalog_service.py`) for all three routes.

## Related

- `category.md` — shares this Capability's Service and Duplicate Architecture finding.
- `../adr/TOS-003-capability-contract-model.md` — the Contract model this file follows.
- `../adr/TOS-004-plural-capability-resolution.md` — the platform-wide capability-resolution
  migration this Capability's own moduleKey fix grew into.
- `../../maturity/catalog.md` — the full Architecture Review ledger this file's Maturity section
  summarizes.
- `../../reviews/capability-contract-consistency-review-2026-07-29.md` — re-confirms this file's
  Duplicate Architecture finding is still real today, compared against Media and Content.
