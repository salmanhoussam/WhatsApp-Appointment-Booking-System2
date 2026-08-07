# Catalog UX Gap Investigation

**Date:** 2026-08-07 | **Type:** Investigation only — no code written, per explicit instruction.
**Trigger:** Salman's own framing before opening Phase 3.7B (Catalog UX): "ليس كودًا... بل
Investigation صغير جدًا... عنوانه Catalog UX Gap Investigation، وليس Catalog API" — answering 10
specific UX questions with evidence before writing the phase's implementation plan, the same
discipline that kept Calendar's Week-View parity work from turning into "عشر ترقيعات صغيرة."

## Method

Per `investigation-protocol.md` and `browser-verification-protocol.md`: real evidence before
conclusions. Three sources, cross-checked against each other:
1. **Frontend code** — `frontend/src/pages/generic-admin/tabs/CatalogTab.jsx` (full read, 480 lines).
2. **Backend code** — `app/api/v1/admin/catalog.py` (full read) + `app/repositories/
   catalog_repository.py` / `admin_catalog_repo.py` (ordering logic) + `prisma/schema.prisma`
   (`CatalogCategory`/`CatalogItem` models).
3. **Real browser evidence** — nested Playwright session, logged into `hr`'s real admin dashboard
   (`rkbarber@dev.invalid`), navigated to the real Catalog tab, real DOM evaluation + 2 screenshots
   against `hr`'s actual live data (not a mock/empty state).

## Confirmed Findings — real evidence, cited

- **`hr`'s real Catalog today**: 2 categories — "منتجات العناية / Grooming Products" (`store`
  type) and "الخدمات / Services" (`catalog` type) — the Services category has 6 real items, all
  priced identically at `$5 USD` (placeholder pricing, not yet differentiated). Confirmed via
  `browser_evaluate` DOM read + 2 real screenshots (category-list view, item-list view after
  selecting "الخدمات").
- **No Search anywhere** — confirmed `hasSearchInput: false` via real DOM query on the live tab;
  confirmed in code (`CatalogTab.jsx`) no search state/input exists; confirmed in backend
  (`admin/catalog.py`'s `list_items`/`list_categories`) neither endpoint accepts a `q`/`search`
  param. Real gap, both ends.
- **No Filters anywhere** — confirmed `hasFilterButton: false` via real DOM query. The *backend*
  already accepts `module_key`, `parent_id`, `include_inactive` (categories) and `featured_only`,
  `include_inactive` (items) as query params (`admin/catalog.py:74-90`, `:161-171`) — real,
  working filter capability that the frontend never calls with anything but defaults.
- **No images render today** — confirmed `itemCardCount` (via `<img>` count) `= 0` across all 6
  real items in the Services category, via real DOM evaluation and visual confirmation in the
  screenshot (plain text rows, no thumbnails). The upload capability itself is not missing — the
  Create/Edit modal has a working file-picker + `useImageUpload.js` `context: 'catalog_item'` flow
  (`CatalogTab.jsx:227-233`), the exact pattern this session proved out again for Staff photos
  (`StaffTab.jsx`). This is a **data-population gap riding on top of a real UX gap**, not a broken
  feature — the images were simply never uploaded for these 6 items.
- **Only a single image per item, ever** — `prisma/schema.prisma:451` gives `CatalogItem` a real
  `galleryImages GalleryImage[]` relation, unused by any Catalog UI anywhere (`CatalogTab.jsx` only
  ever reads/writes the single `image_url` field). Same "schema-ready, implementation hasn't caught
  up" shape already logged for Restaurant/Menu in the 2026-07-29 Restaurant Capability
  Investigation — a second independent instance of that pattern, worth naming as such rather than
  re-discovering it as new.
- **No Bulk operations** — confirmed no checkboxes/select-all in the real screenshots or the DOM
  button-text dump (only `تعديل`/`حذف` per row). Confirmed in the backend: `admin/catalog.py` only
  exposes single-id `PATCH`/`DELETE` for both categories and items — no `/items/bulk` route exists
  anywhere in the router.
- **No Inline Edit** — every field (name, price, description, image, etc.) is bundled into one
  Create/Edit modal (`CatalogTab.jsx:394-476`); no click-to-edit-in-place on any list row.
- **Category tree is schema-ready but 100% unused** — `CatalogCategory.parentId` is a real
  self-relation (`CatalogCategoryTree`, `schema.prisma:409/420-421`), `admin/catalog.py` already
  accepts and filters by `parent_id` on both create and list. `CatalogTab.jsx`'s `EMPTY_CAT`
  (line 75) and its create/edit form (lines 361-389) never reference `parent_id` at all — there is
  no "Parent Category" field anywhere in the UI. Confirmed in real data: both of `hr`'s real
  categories are top-level (no nesting exists to even display). No real tenant today has more than
  a flat, 2-category catalog — a full recursive tree UI would be solving a problem no real tenant
  has yet.
- **Reorder is schema-ready and already *applied* server-side, but has zero UI to change it** —
  `catalog_repository.py`/`admin_catalog_repo.py` already `order={"sortOrder": "asc"}` on every
  list query, for both categories and items independently (item order is naturally scoped per
  category, since items are always fetched `?category_id=X`). Real, subtle side finding: this
  `order` uses **`sortOrder` alone, no secondary tiebreaker** (`createdAt`/`id`) — since every real
  row today has `sortOrder = 0` (the schema default, never set to anything else because no UI has
  ever written it), Postgres gives no stability guarantee for the display order among tied rows.
  This means "the order looks arbitrary/shifts between refreshes" is a real, currently-latent
  symptom of the missing reorder UI, not a separate bug — worth fixing in the same pass that adds
  reorder (add a `sortOrder, createdAt` compound order, or backfill real sequential `sortOrder`
  values on rollout) rather than as a new ticket.
- **No `is_active`/`is_featured` toggle in the UI**, despite both being real fields the backend
  already accepts on `PATCH` (`ItemUpdate.is_active`, `ItemUpdate.is_featured`,
  `CategoryUpdate.is_active`). The only way to remove an item from view today is `deleteItem()`
  (a real, permanent `DELETE`, `CatalogTab.jsx:246-250`) — there is no soft "hide without deleting"
  path, unlike Staff (`StaffTab.jsx`'s deactivate) or Reservations.
- **Drag & Drop tooling already exists in this codebase** (`@dnd-kit/core`, proven in
  `ReservationsTodayView.jsx`'s Calendar drag-reschedule) — but per Salman's own explicit decision
  already on record for this same phase split, reorder should use ↑/↓ buttons instead, not
  drag-and-drop. Not re-litigated here — restated only to confirm the tooling question ("do we even
  have DnD available") is moot; the choice not to use it was already made deliberately, not for
  lack of a library.

## Answers to the 10 questions, in order

1. **ماذا ينقص المستخدم فعلاً؟** — a way to see items visually (images, currently 0/6 populated
   despite a working upload path), a way to soft-hide an item/category without deleting it
   (`is_active` exists in the DB, has no UI), and a stable, controllable display order (currently
   silently arbitrary because `sortOrder` is never set to anything but the default).
2. **ما الذي يكرر النقرات؟** — two real repeat-click patterns, not hypothetical: (a) changing
   several items the same way (e.g. temporarily hiding 3 out of 6 services) requires opening and
   saving N separate modals sequentially, since there is no bulk action; (b) the selected category
   is component state only, not a URL param — a page refresh silently drops back to "no category
   selected," forcing the same category-click to happen again every reload.
3. **ما الذي يحتاج Drag & Drop؟** — nothing, by design (see above) — reorder should be ↑/↓ buttons
   per the already-made decision, and no other interaction (e.g. dragging an item between
   categories) has been requested or observed as needed at `hr`'s real scale.
4. **Tree حقيقية أم Nested List؟** — a simple optional "Parent Category" dropdown (Parent
   Selector), not a real recursive tree component. The schema/backend already support real nesting,
   but no real tenant (including `hr`, the only real generic-dashboard tenant with live data) has
   more than a flat 2-category catalog today — building a full tree UI now would be ahead of any
   real, evidenced need. Matches Salman's own already-stated preference for this phase.
5. **ترتيب الخدمات يكفي أم داخل كل Category؟** — both are needed and both are already independent
   at the schema/query level: category order (which section shows first) and item order (within a
   selected category) are two separate `sortOrder` columns, already queried separately. The reorder
   UI needs to operate at both levels — category-list reorder and item-list-within-category
   reorder — not just one.
6. **هل الصور الحالية كافية؟** — no: 0 of 6 real items have an image today, and even a populated
   item would only ever get one image, never a gallery, despite `GalleryImage[]` already existing
   as a real relation on `CatalogItem`.
7. **هل توجد Bulk؟** — no, confirmed on both the frontend (no checkboxes) and backend (no bulk
   route).
8. **هل توجد Filters؟** — no on the frontend (confirmed via real DOM query), but yes, unused, on
   the backend (`module_key`/`parent_id`/`include_inactive`/`featured_only` already accepted).
9. **هل توجد Search؟** — no, on both ends — the one gap here with no existing backend support to
   build on, unlike Filters.
10. **هل يوجد Inline Edit؟** — no, every field change goes through the shared Create/Edit modal.

## Side Findings (real, adjacent to the reported scope, not the point of this investigation)

- The already-logged **Catalog Admin bypass** (`admin/restaurant.py`/`admin/store.py` calling
  `admin_catalog_repo` directly instead of `catalog_service.py`, `.claudedocs/todo_list.md:254`) is
  a write-path architecture concern, not a UX one — flagged here only as a reminder it exists
  adjacent to whatever 3.7B touches in `catalog_service.py`, not re-investigated.
- The missing secondary sort key (`sortOrder` alone, no `id`/`createdAt` tiebreaker) noted above is
  a real, small, worth-bundling fix once reorder is built — not required before 3.7B starts.

## Unknowns

- Whether any other real tenant besides `hr` has generic-dashboard Catalog data to compare against
  was not checked — `hr` is the only tenant this session has real admin credentials for and the
  only one previously confirmed live on `GenericAdminDashboard`'s Catalog tab.
- Real click-count/time-on-task data (how long does a real bulk price change currently take) was
  not measured — the repeated-click claim in Q2 is a structural read of the code path (N modal
  round-trips, one per item), not a timed user-testing session.

## Recommendation (not a decision — Salman's to make when scoping 3.7B)

Given the evidence above, the highest-value slice of 3.7B (Catalog UX) is: (1) a simple
`sortOrder`-driven ↑/↓ reorder for both categories and items (bundling the compound-sort-key fix),
(2) a Parent Category dropdown (not a tree component), (3) an `is_active` toggle exposed in both
modals (soft-hide, matching Staff's existing deactivate pattern) — all three are schema/backend-
ready today, zero backend work needed. Search, Filters-surfaced-in-UI, Bulk actions, and multi-image
galleries are real but lower-urgency at `hr`'s current 2-category/6-item scale, and Search/Bulk
would need new backend work first (no `q` param, no bulk route exist yet) — candidates for a later
slice once a real tenant's catalog actually grows past what makes them worth it.
