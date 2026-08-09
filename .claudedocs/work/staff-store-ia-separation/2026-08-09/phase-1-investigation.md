# Phase 1 Investigation — Staff/Store Information Architecture Separation

Follows: `investigation-protocol.md`. Requested by Salman: real IA separation — Services live under
Staff, Store Items live under a genuinely separate Store section, zero Service data anywhere in
Store→Items (not even a badge). Investigation only, no code. Two Explore passes (frontend nav/
StaffTab, backend endpoint capabilities) plus direct verification of the repository layer.

## Confirmed Findings — answering all 8 questions

### 1. Where are Services currently displayed?

**Nowhere, as a manageable entity.** No CRUD UI for `CatalogService` exists anywhere in the
frontend. `StaffTab.jsx`'s own header comment says so explicitly: "Barber roster CRUD only ... No
Services/Categories/Skills/Pricing field anywhere in this file, not even a placeholder." The only
place Services appear at all is the per-barber **assignment** checklist ("الخدمات التي يقدمها,"
`StaffTab.jsx:362-391`) — toggling which *already-existing* services a barber can perform, fetched
read-only via `GET /catalog-services/` (`StaffTab.jsx:123-127`). That is Staff↔Service
*relationship* management, not Service *entity* management — a real, existing distinction this
investigation confirms is currently correct and untouched by this task.

### 2. Where are Store Items currently displayed?

`CatalogTab.jsx`, via the **generic** `GET /catalog/items` (`catalog.py`) — not via `store.py`'s
own, already-built, already-correctly-scoped `GET /admin/store/products`. This is the single root
cause of the mixing: the admin UI's only catalog-browsing surface goes through the generic path,
which has no reason to distinguish `moduleKey`.

### 3. How is `moduleKey` determined?

A field on `CatalogCategory` (`'catalog'` vs `'store'`), set at category creation and never on
`CatalogItem` directly — an item's type is derived through its category relation. Confirmed at the
repository layer: `admin_catalog_repo.list_items()` (`:92-114`) already supports
`where["category"] = {"moduleKey": module_key}` (`:107-108`) as a real, working Prisma relation
filter.

### 4. Is there an existing, reusable Store navigation/endpoint surface?

**No frontend nav/tab** — confirmed via broad grep, zero hits for a genuine "Store" admin section
(only a static QR-code display in `SettingsTab.jsx`, and tenant-specific bespoke store pages under
`frontend/src/pages/footlab/` that belong to a different, non-generic dashboard entirely — not
reusable here). **But yes, a fully-built, already-correctly-isolated BACKEND surface**:
`app/api/v1/admin/store.py` already has `GET/POST/PATCH/DELETE /categories` (`:247-324`, hardcoded
`module_key="store"` on every call, `:255,270`) and `GET/POST/PATCH/DELETE /products`
(`:118-245`, same hardcoding, `:131`) — both structurally incapable of ever returning a Service,
since they never query anything but `moduleKey='store'`-scoped rows. This is the single most
important finding: **the backend Store capability already exists, fully isolated, and has simply
never been wired to its own dedicated UI.**

### 5. Are Services currently linked to Staff?

Only via the assignment checklist (question 1) — real, correct, and out of scope for this task
(Staff↔Service, per Salman's earlier Phase 3.7C work, stays untouched). No Service *management* UI
exists under Staff or anywhere else.

### 6. Minimal UI/IA change to achieve the requested separation

Two additive frontend pieces, both consuming already-existing backend endpoints:
- A new **Store** section (new nav entry) with Categories + Items sub-views, wired to `store.py`'s
  existing `/store/categories` and `/store/products` — not `catalog.py`'s generic endpoints.
- A **Services** sub-view added to the existing Staff section (internal toggle alongside
  Employees), wired to the already-fully-built `catalog_services.py` CRUD (`/catalog-services/`,
  shipped in Phase 3.7C). This is close to a plan already designed once before and never executed —
  see Side Finding below.
- `CatalogTab.jsx`/`catalog.py`'s generic `/catalog/*` endpoints are simply no longer this UI's data
  source for Store/Services going forward. Nothing about them needs to change or be deleted — they
  become unused by the new UI, which is sufficient.

### 7. Do we need backend changes?

**No — evidence strongly says no backend change is required for the core separation.** Both halves
already have dedicated, already-correctly-scoped endpoints (`store.py` for Store, plus its
repository-level `module_key` filter already proven working; `catalog_services.py` for Services).
The gap is entirely that the frontend never pointed its Catalog/Store browsing UI at the endpoints
that already do the right thing.

### 8. Does any existing endpoint return Services and Store Items mixed?

**No, structurally impossible.** `CatalogService` and `CatalogItem` are entirely separate Prisma
models/tables with entirely separate endpoint families (`/catalog-services/` vs `/catalog/items` vs
`/store/products`) — no single response can ever contain both. The only mixing found anywhere is a
**frontend rendering choice**: `CatalogTab.jsx`'s category grid displays both `moduleKey` values
together with no filter (confirmed the sole mixing point — broadly searched, no other component in
`frontend/src/pages/generic-admin/` combines Service and Store Item data).

## Side Finding

An earlier, abandoned plan (this same session, before a topic pivot — recorded in
`.claudedocs/evolution/staff-capability.md`'s 2026-08-08 entries) already designed almost exactly
the "Staff gains an internal Employees/Services toggle, reusing existing local Modal/Field
components, wired to `catalog_services.py`" shape requested now. Never executed — no code exists
from it. Named here as directly relevant prior art, not to be treated as already done.

## Unknowns

None remaining for the 8 questions asked — all answered from direct code evidence, no guessing.

## Proposed Information Architecture (for confirmation before Phase 2 Contract)

```
Staff (existing nav entry, unchanged id/route)
  ├── Employees — existing StaffTab.jsx content, byte-for-byte unchanged
  └── Services  — NEW sub-view, CatalogService CRUD via existing /catalog-services/ endpoints

Store (NEW top-level nav entry)
  ├── Categories — NEW, wired to existing /store/categories (already module_key='store'-only)
  └── Items      — NEW, wired to existing /store/products (already module_key='store'-only)

Orders (existing top-level nav entry — proposed: left exactly where it is)
```

**One open design point, not resolved by evidence alone — flagging rather than deciding**:
Salman's own sketch shows Orders nested *under* Store. The investigation found `OrdersTab.jsx` is
already 100% correctly scoped to Store Items only (never touches `CatalogService`) — so nesting it
is a **visual grouping preference**, not a behavior fix. Two options:

- **A (recommended — least complex, zero regression risk)**: leave `orders` exactly where it is
  today, a flat top-level nav entry, completely unchanged. It already only ever shows Store Items.
  Every one of Salman's stated Acceptance Criteria is satisfied without touching it.
- **B (matches the literal sketch)**: nest Orders under a new Store parent nav item. `buildNav()`
  today is a flat array with no parent/child concept — this would mean introducing a new grouped-nav
  UI pattern, a materially bigger frontend change than A, and would need to leave the
  non-`hasReservations` branch's own standalone `orders` entry (used by other tenant types) alone,
  since that branch has no Store/Staff split at all.

Recommendation: **A**, unless Salman specifically wants the nested-nav visual and accepts the
larger UI change that implies.
