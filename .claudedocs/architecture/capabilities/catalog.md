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

## Maturity

**Developing** — Contract and a working Dashboard Interface exist, but Implementation carries a
live Architecture Integrity Finding (below), so it cannot yet be called Stable.

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
