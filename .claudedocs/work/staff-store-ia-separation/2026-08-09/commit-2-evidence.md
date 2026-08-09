# Staff/Store IA Separation — Commit 2 Evidence

Follows: `.claudedocs/implementation/STAFF_STORE_IA_SEPARATION_CONTRACT.md`. Commit 2: new
`StoreTab.jsx` (Categories/Items/Orders) + `GenericAdminDashboard.jsx` nav rewiring.

## Changes

- New `frontend/src/pages/generic-admin/tabs/StoreTab.jsx` — internal `subView` toggle
  (`'categories' | 'items' | 'orders'`), wired to `store.py`'s existing endpoints only. Orders
  sub-view renders the existing `<OrdersTab />` directly, unmodified.
- `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` — `buildNav()`'s `hasReservations`
  branch: removed `catalog`/`orders` top-level entries, added `store`. `renderTab()`: added
  `case 'store'`; `case 'catalog'`/`case 'orders'` kept (still required by the untouched
  non-`hasReservations` branch, used by other tenant types).

## Real API-contract findings, confirmed by reading `store.py` before writing code (not assumed)

1. `store.py`'s `PATCH` routes (`CategoryIn`/`ProductIn`) require the **full object** on every
   call — unlike `catalog.py`'s all-`Optional` partial-patch schemas. Every mutation in `StoreTab.jsx`
   sends the complete current object, never a bare `{is_active: ...}` patch.
2. `store.py`'s `DELETE` routes are confirmed **hard deletes**
   (`admin_catalog_repo.delete_category_by_filter`/`delete_item_by_filter`, real `delete_many`
   calls) — unlike `catalog.py`'s soft-delete `DELETE`. "Hide" in `StoreTab.jsx` is always a `PATCH`
   with `is_active: false`; the `DELETE` routes are never called from this file.
3. `ProductIn` has no `sort_order` field — Store Items cannot be reordered via the existing
   endpoints. No reorder UI built for Items (Categories still support it). Named as a real backend
   gap, not fixed here — zero backend changes stays the Contract's scope.
4. Items is a flat, always-visible list (`GET /store/products` with no `category_id` returns every
   store item) — never gated behind clicking a category first, per Salman's explicit requirement.

## Real Verification (Tenant Admin, `rk`)

- **Nav**: التقويم → الحجوزات → الموظفون → **المتجر** → العملاء → الإشعارات → الإعدادات → نظرة
  عامة. الكتالوج and the standalone top-level الطلبات both confirmed absent.
- **Categories**: exactly 1 card, "منتجات العناية," not hidden. الخدمات confirmed absent.
- **Items**: exactly the 4 real products, all correctly marked مخفي with إظهار controls.
- **Negative check** (`document.body.innerText`, 8 strings checked: الخدمات, شعر ودقن, كرياتين, دقن,
  تمشيط أو تسريح, حنة أو صبغة, شعر as a standalone word, خدمة singular/badge text) — **all 8
  `false`**. This is the Contract's hard requirement, satisfied structurally (server-side
  `module_key='store'` filtering), not by a client-side badge or filter.
- **Show/hide round-trip**: toggled one product visible then hidden again, confirmed both state
  transitions render correctly, data left exactly as found.
- **Orders sub-view**: 5 real orders render (same data `OrdersTab.jsx` always showed), expandable
  detail view works.
- **Console**: 0 errors, 0 warnings during the entire RK Admin session.
- **Regression — Jaafar (STAFF)**: fresh login, nav confirmed unchanged — exactly التقويم /
  الحجوزات / عملائي, no Store/Catalog leakage.

## Side Findings (named, not actioned — out of this Commit's scope)

- **No per-row order status-change control found in the Orders sub-view.** `OrdersTab.jsx` itself
  was not modified in this commit — rendered exactly as it already existed. If this is a real gap,
  it's pre-existing and unrelated to the IA separation; worth a separate look, not fixed here.
- **Jaafar's session logged 5 console `403` errors** for `/catalog/categories`, `/catalog/items`,
  `/store/orders` — the backend correctly rejects them (Phase B/D authorization working as
  designed), but *something* in his render tree still fires these requests despite his nav having
  no Store/Catalog entry at all. Not a security gap (requests are correctly blocked) — a wasted-
  fetch/console-noise pattern, pre-existing and unrelated to this commit's nav changes (`StoreTab`/
  `CatalogTab` are never rendered for `STAFF`, per `STAFF_NAV`). Named for a future look, not
  investigated further here per the Contract's explicit "no scope expansion."

## Regression

Staff↔Service (Phase 3.7C), Commit 1's Services CRUD, and the full `STAFF_NAV`/Phase D scoping all
confirmed unaffected by this commit's real browser evidence above.
