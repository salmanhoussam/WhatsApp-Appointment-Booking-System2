# Products/Services Separation — Track B — Evidence (2026-08-20)

Follows the architecture plan (`~/.claude/plans/we-moved-on-new-hazy-barto.md`, Track B) and
Salman's explicit execute instruction. Separates "Book a Service" from "Buy a Product" on the
public homepage, structurally, not by a fragile per-item flag.

## Code changes

**Step 0 — `products` becomes a real, addable section**:
- `app/repositories/content_sections_repo.py` — new `add_section(client_id, section_type, enabled=True)`,
  idempotent append matching every other real section entry's shape (`id`, `type`, `order`,
  `enabled`, `data`).
- `app/services/content_service.py` — thin passthrough, validates `section_type in SECTION_SCHEMAS`.
- `app/api/v1/admin/content.py` — new `POST /content/sections`, `TENANT_ADMIN`-gated, idempotent.
- `scripts/add_products_section_rk.py` — one-off, calls `content_service.add_section` (never raw
  Prisma, per `section_schemas.py`'s own going-forward convention), run once for `rk` only.
- No general "Add Section" UI built in `SettingsTab.jsx` — deliberately deferred, same shape as
  Footer in Phase 5.

**Step 1** — `app/schemas/section_schemas.py`: new `products` entry, meta-only (`heading_ar`, `limit`).

**Step 2** — `FeaturedItemsSection.jsx`: the `item.metadata?.requires_booking` check is gone
entirely — every item now always renders with `onBookNow`. The multi-category pooling branch now
filters out `module_key === 'store'` categories before fetching items.

**Step 3** — new `frontend/src/components/dynamic-sections/ProductsSection.jsx`: single fetch path
(`fetchCategories('store', slug)` + `fetchItems('store', slug, categoryId)`), self-gates to `null`
when `store` isn't in `active_services`, renders via `CatalogItemCard` with `onAddToCart` only —
reuses the shared `addItem` Zustand action already injected into every section via `sectionProps`.

**Step 4** — wired into `dynamic-sections/index.js` and `SECTION_MAP` (`DynamicPage.jsx`).

**Step 5** — `SettingsTab.jsx`'s `CAPABILITY_LINKS` map extended with a `products` entry whose
target tab resolves dynamically: `hasReservations ? 'store' : 'catalog'` (a real capability-flag
branch matching `buildNav()`'s own existing split, not a tenant check). `hasReservations` threaded
through `SettingsTab` → `SectionSettingsArea` → `SectionEditorPanel` → `CapabilityLink`, and both
`GenericAdminDashboard.jsx` call sites updated.

## Two real bugs found and fixed during this Track's own verification

1. **My own bug, caught immediately via a real React console error**: `add_section`'s first version
   omitted the `id` field every other real section entry has (`s_hero`, `s_featured`, ...) —
   `DynamicPage.jsx` keys its rendered sections on `id`, not `type`. Caught live: a real "Each child
   in a list should have a unique key prop" console error on `rk`'s public page immediately after
   running the backfill script. Fixed in `add_section` (now sets `id: f"s_{section_type}"`), and the
   already-inserted `rk` row was corrected in place (one-time direct patch, not re-run through the
   idempotent `add_section` which would have no-op'd on the already-present type). Re-verified: 0
   console errors after the fix.
2. **Pre-existing, unrelated bug, found while cleaning up test data**: `store.py`'s `delete_product`
   crashed with a real 500 (`AttributeError: 'int' object has no attribute 'count'`) — `delete_many()`
   returns a plain int in this Prisma version, same bug class already fixed once in
   `reservation_repo.py`. Fixed as its own separate commit (`bb66a49`), not bundled into this
   Track's diff — see that commit for full evidence.

## Real verification — both tenants, real browser, real data

**rk**:
- Ran the Step 0 backfill (`scripts/add_products_section_rk.py`) — real output: `BEFORE` 10
  sections, `AFTER` 11 (`products` appended at `order: 10, enabled: True`). Confirmed live via
  `GET /content/sections`.
- Public homepage: 0 console errors (after the `id` fix). All 7 real service cards show "احجز
  الآن" only — confirmed via `document.querySelectorAll('button')` count, zero "أضف للسلة" mixed
  in (the exact ambiguity Track B exists to remove).
- Confirmed the "منتجاتنا" text appearing in an initial broad text-search was a **false positive**
  — a real, pre-existing, unrelated `story_experience`/`video_story` section (a real authored
  video about hair-care products) happens to share the same Arabic heading text. Verified via the
  actual DOM (`ps-pulse` keyframe presence, the real `<section>` markup) that `ProductsSection`
  itself correctly rendered nothing, since RK's real "Grooming Products" Store category has zero
  real products — self-gating confirmed correct, not broken.
- **Real end-to-end product test** (temporary, reverted): created a real test product ("شامبو
  اختبار مؤقت", $12.50) via `POST /store/products`. Reloaded the public page — `ProductsSection`
  now rendered for real, exactly 1 "أضف للسلة" button, the real product name visible. Clicked it —
  confirmed via `localStorage`'s real `rk_generic-cart` that the product was added to the exact
  same shared cart `CatalogPage.jsx`/`/rk/store` already use (`catalogItemId` matching the real
  product id, correct name/price) — no new cart mechanism, proven by inspecting the real client
  state, not assumed. **Real forensic confirmation of the bug Track B fixes**: that same cart
  already contained a real Service item ("شعر", qty 2) added during earlier testing this session
  *before* this Track's fix — direct evidence the old `requires_booking` logic really did let a
  bookable service end up in the purchasable cart.
- Cleanup: deleted the test product (`DELETE /store/products/{id}`, after fixing the pre-existing
  bug above), cleared the local test cart state. Re-verified: test product gone from the public
  page, 0 "أضف للسلة" buttons, 7 "احجز الآن" buttons — back to the real, correct empty-Products
  state.
- Section Editor: clicked "المنتجات" in the section list (real, selectable, confirming the
  backfill is visible in the Dashboard) → "إدارة المنتجات ←" button present → clicked it → landed
  on `/rk/dashboard/store` (correctly resolved `hasReservations=true` → `store`, not `catalog`) →
  real `StoreTab.jsx` content rendered ("أقسام المتجر", real "منتجات العناية" category listed) —
  0 console errors.

**mr-h**: confirmed zero behavior change — 7 real "احجز الآن" buttons, 0 "أضف للسلة", no
"منتجاتنا" section (no `store` capability active, `ProductsSection` self-gates, and the backfill
script was never run for this tenant per the plan). 0 console errors.

**Code check**: `grep -n requires_booking FeaturedItemsSection.jsx` → 0 live-code matches, only
explanatory comments.

## Acceptance, checked explicitly

- ✅ Services section always "احجز الآن" — verified, both tenants.
- ✅ Products section always "أضف للسلة", reuses the existing cart — verified end-to-end on `rk`
  with a real temporary product, reverted afterward, restoring exact original state.
- ✅ Self-gates correctly on tenants without `store` — verified on `mr-h`.
- ✅ Section Editor deep-link resolves the correct tab based on `hasReservations`, not a slug check.
- ✅ Zero new CRUD, zero new cart mechanism — confirmed via diff (no new backend routes touch
  `CatalogItem`/`StoreOrder`/cart state; `ProductsSection` only ever calls the existing public
  `store.py` read routes and the existing shared `addItem` action).
- ✅ 0 console errors, both tenants, after both real bugs found during verification were fixed.
- ✅ No test data left behind — real product created, verified, and deleted; local cart state
  cleared.

## Result

Track B done and verified on both real tenants. Two real bugs found and fixed along the way (one
in this Track's own new code, caught immediately; one pre-existing and unrelated, fixed separately
as its own commit). Ready for review.
