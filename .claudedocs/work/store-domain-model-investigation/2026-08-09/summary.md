# Store → Item → Order Domain Model Investigation — Confirmed via Real Browser

Follows: `investigation-protocol.md`. Origin: Salman reported RK's admin "Store" shows
services/categories but no items; proposed domain model `Store → Items → Order`, distinct from
`Service`. Code-only pass first (see the plan file's history), then real browser verification per
Salman's explicit instruction — no UI decision until confirmed live, not just via code reading.

## Confirmed Findings

1. **The domain model Salman proposed is already how the backend is built** —
   `CatalogService` (bookable, tied to `Reservation.serviceId`) is fully separate from `CatalogItem`
   with `moduleKey='store'` (sellable, tied to `StoreOrderItem.catalogItemId`). Confirmed in the
   2026-08-09 Orders investigation, not re-derived here.

2. **Real browser confirms the code-only hypothesis exactly, both parts:**
   - The Catalog tab's "الأقسام" grid shows **الخدمات** (badge "خدمة") and **منتجات العناية**
     (badge "منتج") together, no section header or tab separating a Services area from a Store
     area — the only differentiator is a small inline badge.
   - Clicking into منتجات العناية shows **all 4 real items**, each explicitly marked **"مخفي"**
     (hidden) with an "إظهار" (show) action — **not missing from the DOM**, just deactivated.
     Verified two ways: `browser_snapshot` structure and a raw `document.body.innerText` string
     match, both agreeing exactly.

3. **Root cause, confirmed live**: "Store shows services, not items" is not a data problem and not
   an items-are-hidden problem — the 4 items are real, correctly stored, and rendering correctly
   once you look at the right place. The actual gap is that there is **no distinct "Store" place to
   look** — Services and Store products live in one undifferentiated category grid, so an admin
   scanning it has no clear signal steering them into the one Store category versus the six Service
   categories.

## Side Finding (real, not the focus of this investigation)

`app/api/v1/admin/store.py`'s product routes bypass `app/services/catalog_service.py` entirely,
writing to `admin_catalog_repo` directly with their own separate `ProductIn` schema — a second,
independent confirmation of the "no Service layer for Store/Orders" gap already named in the
2026-08-09 Orders investigation. Per this project's pattern-escalation rule
(`architecture-review-loop.md`), a second independent finding is the trigger to name this as an
ADR/Review candidate — named here, not actioned. Separate from the UI question above; not bundled
into whatever UI fix gets decided.

## Unknowns

None remaining for the specific question asked — both parts of the hypothesis were directly
observed live, not inferred.

## Decision needed from Salman

UI-only, per his own explicit framing — backend/data confirmed correct and untouched:
- Split Catalog into two clearly-labeled sections ("الخدمات" / "منتجات المتجر") within the existing
  tab, or
- Build a real, separate "Store" tab (Categories → Items), keeping Catalog scoped to Services only.

Both are UI/IA changes only — no backend/data model change implied by either option. The
`store.py`/`catalog_service.py` dual-write-path finding is a separate, bigger, architecture-level
decision, not bundled into this one.
