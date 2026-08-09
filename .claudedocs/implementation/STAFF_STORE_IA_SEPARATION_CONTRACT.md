# Implementation Contract — Staff/Store Information Architecture Separation

Per `documentation-policy.md`. Follows two investigations, both committed:
`.claudedocs/work/staff-store-ia-separation/2026-08-09/phase-1-investigation.md` (UI/code
evidence) and bo-hussein's DB Orders investigation (this conversation — real row counts, code
paths, zero Service↔Order relationship at any layer). Salman's explicit green light: "هذا الفصل
التام الموثق بالأدلة والأرقام من قاعدة البيانات يمنحك الضوء الأخضر."

## Scope

UI/IA only. **Zero backend changes** — both investigations confirmed the backend already has
everything needed, fully isolated: `store.py` (Categories/Items/Orders, all hardcoded
`module_key='store'` server-side) and `catalog_services.py` (full `CatalogService` CRUD, Phase
3.7C). Zero permission changes — neither endpoint family includes `STAFF` today, none added.
`CatalogTab.jsx`/`catalog.py`'s generic `/catalog/*` endpoints are left exactly as they are, simply
no longer this UI's data source — not deleted, not refactored.

## Navigation Structure (new)

Scoped to `GenericAdminDashboard.jsx`'s `hasReservations` branch only (what `rk` uses). The
non-`hasReservations` branch (pure restaurant/store generic tenants, no Staff concept) is a fully
independent code path in `buildNav()` — **left completely untouched**, out of scope by Salman's own
framing (this request is about the Staff+Reservations tenant shape).

```
Staff (existing nav id 'staff', unchanged)
  internal toggle (same pattern as Catalog 3.7B/3.7C's proven UI conventions):
    ├── Employees — existing StaffTab.jsx content, byte-for-byte unchanged
    └── Services  — NEW: CatalogService CRUD (create/edit/reorder/hide-show), wired to the
                     already-built /catalog-services/ endpoints (catalog_services.py, Phase 3.7C)

Store (NEW nav id 'store')
  internal toggle:
    ├── Categories — NEW, wired to existing /admin/store/categories (store.py, already
    │                hardcoded module_key='store' server-side — structurally cannot return a
    │                Service category)
    ├── Items      — NEW, wired to existing /admin/store/products (store.py, same guarantee)
    └── Orders     — renders the EXISTING <OrdersTab /> component directly, unchanged, as a
                     child — no logic duplicated, no behavior change

Removed from the hasReservations branch's top level: 'catalog' (الكتالوج), 'orders' (الطلبات) —
both now live inside the sections above. Both ids/components stay real and importable; only the
top-level nav entries move.
```

## Files Changed

1. **`frontend/src/pages/generic-admin/tabs/StaffTab.jsx`** — add an internal `subView` toggle
   state (`'employees' | 'services'`), matching the exact pattern already designed (never executed)
   in the earlier abandoned Phase 3.7D plan (`.claudedocs/evolution/staff-capability.md`'s
   2026-08-08 entry). Employees sub-view: existing content, untouched. Services sub-view: new,
   reuses this file's own existing local `Modal`/`Field` components — full CRUD (name_ar/en,
   description, category dropdown filtered to `module_key='catalog'`, price+currency, duration_min,
   image upload reusing the `catalog_service` upload context from the earlier abandoned plan),
   reorder (↑/↓, Catalog 3.7B pattern), hide/show (`is_active` toggle, same pattern).

2. **NEW `frontend/src/pages/generic-admin/tabs/StoreTab.jsx`** — new file, internal `subView`
   toggle (`'categories' | 'items' | 'orders'`). Categories/Items sub-views: own local `Modal`/
   `Field` (not shared with `CatalogTab.jsx` or the new Staff Services sub-view — per Salman's
   explicit "no refactor," each stays independently written, matching this project's Abstraction
   Rule default). Orders sub-view: `import OrdersTab from './OrdersTab'` and render it directly with
   its existing props (`activeServices`, `color`, `currency`) — zero new order logic.

3. **`frontend/src/pages/generic-admin/GenericAdminDashboard.jsx`**:
   - `buildNav()`'s `hasReservations` branch: remove `catalog`/`orders` entries, add one `store`
     entry (label "المتجر"). `staff` entry unchanged (its internal toggle lives inside
     `StaffTab.jsx` itself, no nav-level change needed, same as the Services sub-view).
   - `renderTab()`: remove `case 'catalog'`, remove `case 'orders'`, add
     `case 'store': return <StoreTab color={color} currency={currency} activeServices={activeServices} />`.
   - Import `StoreTab` instead of/alongside `CatalogTab` (the `CatalogTab` import can stay if
     still referenced elsewhere — verify at implementation time; if truly unused after this
     change, leave the file in place regardless, per "no refactor beyond what's asked").
   - Non-`hasReservations` branch: **zero changes**.

## Git Discipline

Two commits, each independently Browser-Verified before the next starts — same discipline as every
other multi-commit phase this session:

- **Commit 1** — Staff gains the Employees/Services toggle + Service CRUD.
- **Commit 2** — New `StoreTab.jsx` + `GenericAdminDashboard.jsx` nav rewiring (Catalog/Orders →
  Store).

No investigation, implementation, and unrelated fixes bundled in one commit, matching this
session's own established pattern.

## Tests / Required Browser Verification (real, on `rk`, as Tenant Admin)

1. Open **Staff** → confirm Employees sub-view unchanged (existing barbers list/edit/working
   hours/assignment checklist all still work).
2. Switch to **Services** sub-view → confirm it lists the real `CatalogService` rows (rk has 6),
   create one new test service, confirm it appears immediately in a staff member's "الخدمات التي
   يقدمها" checklist (same page, other sub-view) — closing the loop live, matching the original
   Phase 3.7D verification plan.
3. Open **Store** → **Categories** → confirm only `moduleKey='store'` categories appear (rk: exactly
   "منتجات العناية," never "الخدمات").
4. **Store → Items** → confirm only the 4 real store items appear (سبراي/واكس/جل/عطر), still marked
   "مخفي" as before — **explicit negative check**: search the full rendered DOM text for "الخدمات"
   or any of the 6 service names (شعر, شعر ودقن, كرياتين, دقن, تمشيط أو تسريح, حنة أو صبغة) — result
   must be zero matches, not "hidden by a badge."
5. **Store → Orders** → confirm it renders the same real order list as today's `OrdersTab.jsx`,
   confirm status update still works, confirm zero references to any Service anywhere in this view.
6. Console: zero errors throughout.
7. **Regression**: confirm `catalog.py`'s backend routes still respond correctly if hit directly
   (nothing removed backend-side) — not required to be reachable from the UI, just proving no
   backend regression. Confirm `STAFF`-role login (Jaafar) still sees exactly Calendar/Reservations/
   My Clients — this change doesn't touch `STAFF_NAV` at all, but verify no accidental leak.

## Rollback Plan

Both commits are additive-UI-only — no schema, no migration, no backend route removed. Reverting
either commit restores the exact prior nav/rendering with zero data risk, since nothing server-side
changes at any point in this contract.

## Explicitly Not Done In This Task (named, not actioned)

- `store.py` bypassing `catalog_service.py` (the dual-write-path architecture finding, confirmed
  twice now) — untouched, no refactor, no Routes→Services migration.
- `StoreCustomer` dead-code / `Float` vs `Decimal` precision findings from the DB investigation —
  logged, not fixed.
- Deleting/archiving `CatalogTab.jsx` or `catalog.py` — left in place, simply unused by this UI.
- Any permission/role change — none needed, none made.

Nothing in this contract has been executed yet. Awaiting final confirmation before Commit 1 starts.
