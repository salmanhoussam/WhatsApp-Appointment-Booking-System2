# Category Capability

Per the Capability Contract model (`../adr/TOS-003-capability-contract-model.md`). Extracted from
`TENANT_OS_PLAN.md` §13 (Contract), §19/§20 (shared with Catalog) during the ADR-0003 migration
(Phase 5).

## Ownership

`CatalogCategory` — the grouping structure a tenant's `CatalogItem` rows belong to. Shares
`catalog_service.py` and the Catalog Capability's data model family (`catalog.md`), but documented
as its own Capability since a Category can exist, be renamed, or be hidden independently of any
specific product.

## Contract

| Sub-capability | Status | Mechanism |
|---|---|---|
| Create / Rename Category | ✅ Real | `CatalogCategory` CRUD |
| Delete Category | ✅ Real | same |
| Reorder Categories | ⚠️ Gap | same gap as Product reorder — `sortOrder` field exists, no reorder endpoint |
| Show / Hide Category | ✅ Real | `CatalogCategory.isActive` |

## Operations (Editing Engine, `TOS-002`)

| Field | Operation type |
|---|---|
| name | `UpdateField` |
| sort order | `ReorderList` — Gap, no endpoint yet |
| isActive | `ToggleVisibility` |

## Schema

`CatalogCategory`: `id`, `name_ar`/`name_en`, `sortOrder`, `isActive`, `clientId`.

## Admin Projection

`app/api/v1/admin/catalog.py` → `catalog_service.py` → `CatalogCategory` CRUD — the same canonical
path Catalog itself uses, and the same path currently bypassed by the Duplicate Architecture
finding below.

## Public Projection

`GET /api/v1/public/{module}/catalog` — categories are returned nested with their items, same
public read path as Catalog.

## Single Source of Truth

`CatalogCategory` is the model; `catalog_service.py` is the intended single write path.
**Violated today** — shares Catalog's Duplicate Architecture finding.

## Governance

**Permissions** (Client / AI, identical by design): Create/Rename/Delete Category ✅/✅; Reorder
Categories 🔜/🔜 (same reorder Gap as Catalog).

**Draft/Publish, Audit, Versioning, Activity**: shared platform-wide Gaps, same as `catalog.md` —
not repeated in full here to avoid two independently-drifting copies.

## Acceptance

Not independently re-scored criterion-by-criterion — approximated at **~50%**, same profile as
Catalog (shares its Contract/Implementation/Governance status). A future Implementation Contract
that wants an exact figure would repeat `catalog.md`'s own per-criterion table for Category
specifically.

## Maturity

**Developing** — shares `catalog_service.py` and Catalog's own Duplicate Architecture finding; not
independently more or less mature than Catalog itself.

## Open Findings

Shares Catalog's Duplicate Architecture finding — `store.py`/`restaurant.py` independently
implement `create_category`/`update_category`/`delete_category_by_filter` via
`admin_catalog_repo`, bypassing `catalog_service.py`. See `catalog.md`'s Open Findings for the full
evidence; not repeated here to avoid two independently-drifting copies of the same finding.

## Related

- `catalog.md` — the sibling Capability this one shares its Service and finding with.
