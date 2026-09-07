# Phase 1a — the Services section chose its table from an arbitrary flag

## What the approved plan said, and why it was wrong

The plan said: delete the branch, make the section read `catalog_services` unconditionally.
**Measured, that would have blanked a live restaurant.** Recording the correction rather than
quietly executing something different.

`featured_items` is not one section serving one capability. It serves **three**:

| tenant | what its `featured_items` shows | source |
|---|---|---|
| rk · mr-h · alzabt-demo | bookable services | `catalog_services` |
| caracas | restaurant menu (97 items, 10 `restaurant` categories) | `catalog_items` |
| olivello · store-pilot-test | store products | `catalog_items`, `module_key='store'` |

`ProductsSection.jsx` cannot absorb caracas: it is store-only by construction (`hasStore` gate,
`module_key='store'` fetch). caracas has neither. So an unconditional switch removes its menu with
nowhere to move it to.

## The actual defect

```js
if (activeServices.includes('reservations') && !activeServices.includes('catalog'))
```

The **`!catalog` half is arbitrary**. `catalog` says nothing about whether a tenant's bookable
services exist. A tenant holding *both* keys fell through to the CatalogItem walk.

`alzabt-demo` is exactly that tenant: `booking, catalog, reservations, whatsapp_ordering` — with
**6 real `catalog_services` and 0 `catalog_items`**. It rendered an empty Services section, and is
invisible today only because `config.content.sections` is still `[]`.

A tenant activating a legitimate capability silently loses its Services section.

## The fix

Drop the `!catalog` clause. `reservations` alone is the honest condition — it is the same gate that
makes `catalog_services` reachable (`require_service("reservations")` on the route), so a tenant
holding it has a services table and one without it provably has none.

Also corrected the file's own docstring, which claimed *"every item this component fetches is a real
CatalogService"* — something the code has never done. The docstring and the code disagreed.

## Evidence — live production API, per tenant

`GET /api/v1/public/{slug}/catalog/categories`, counting what the CatalogItem walk actually sees:

```
olivello      categories=8   non-store (what the walk uses)=0   -> []
caracas       categories=10  non-store=10                       -> ['restaurant' x10]
rk            categories=0   non-store=0                        -> []
alzabt-demo   categories=1   non-store=1                        -> ['catalog']
```

Behaviour before → after:

| tenant | before | after | |
|---|---|---|---|
| alzabt-demo | items walk → 1 category, **0 items → empty** | services branch → **6 services** | ✅ **fixed** |
| rk · mr-h | services branch | services branch | unchanged |
| caracas | items walk → 10 restaurant categories | items walk → identical | unchanged |
| olivello | items walk → **0 non-store categories → already empty** | identical | unchanged |

## Side finding — olivello's section has been dead since 2026-08-20

olivello's 8 categories are **all** `module_key='store'`, and this component excludes store
categories (Track B). So its `featured_items` has rendered `null` since that change shipped —
**pre-existing, not caused here, and not caused by the plan either.** Its products should be on the
`products` section, which is exactly what `ProductsSection.jsx` was built for and which olivello's
keys (`store`, `store.cart`, `store.products`) fully support. One config change, not a code change.
Not done here: this commit changes code, not tenant data.

## Still open — the definitive split Salman asked for

One component still serves three capabilities. A real split needs a restaurant-menu section that
does not exist yet. Named, not deferred in silence.
