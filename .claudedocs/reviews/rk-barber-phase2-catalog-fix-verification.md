# RK Barber — Phase 2 Fix Verification (Public Catalog Rendering)

**Tenant:** `hr` — **Date:** 2026-07-28 — Follows `investigation-protocol.md`'s evidence discipline
and `CAPABILITY_RESOLUTION_PLAN.md`'s Phase 2 definition. Closes Acceptance Review Finding #5
(services invisible) and, as a direct consequence of the same root-cause fix, Finding #6 (category
tabs non-functional) — not two separate patches.

## Methodology (per Salman's explicit instruction)

1. **Compare Old Consumer vs. New Consumer.** The "old"/already-correct consumer: the Admin Catalog
   tab (`CatalogTab.jsx`), which calls `GET /admin/catalog/categories` with **no** `module_key`
   filter and has always correctly shown both of `hr`'s real categories (confirmed in the earlier
   store-products verification). The "new"/broken consumers: `useCatalog.js`,
   `FeaturedItemsSection.jsx`, `CategoriesGridSection.jsx` — all three called
   `catalogApi.js`'s `fetchCategories(moduleKey, slug)`, which routes to a **capability-specific**
   endpoint (`/store/categories`, `/restaurant/menu/categories`, or the generic endpoint *with* a
   narrowing `module_key` filter) based on the single collapsed tenant-wide `moduleKey`.
2. **Why one works and the other doesn't:** the public generic catalog endpoint
   (`GET /{slug}/catalog/categories`, `app/api/v1/public/catalog.py`) already accepts an
   **optional** `module_key` — omit it, get everything, exactly like the Admin tab does. The public
   frontend's own `catalogApi.js` never had a code path that called this endpoint *without* the
   filter; every branch either hit a type-specific endpoint or supplied a narrowing filter to the
   generic one.
3. **Where the Contract broke:** not in the backend (confirmed already correct — no backend change
   made or needed), and not really in any individual UI component either — it broke in
   `catalogApi.js`/`useCatalog.js`, the shared data-fetching layer every one of the broken consumers
   goes through. Fixing it there, once, fixed all three consumers and one additional symptom
   (Finding #6) that wasn't even the original target.

## Fix

- **`frontend/src/services/catalogApi.js`** — added `fetchAllCategories(slug)`: calls the existing,
  already-correct generic endpoint with no `module_key` filter. The old `fetchCategories(moduleKey,
  slug)` is untouched, left available for any genuinely type-specific future caller (none of the
  three fixed consumers needed it once corrected).
- **`frontend/src/hooks/useCatalog.js`** — categories effect now calls `fetchAllCategories(slug)`,
  gated only on `slug` (not the tenant-wide `moduleKey`). Items effect now calls
  `fetchItems(activeCategory.module_key, slug, activeCategory.id)` — routed by the **specific
  category's own** `module_key` (per-record ownership, exactly `TOS-004` §4.1's Capability
  Resolution Layer model), not a tenant-wide derived value. `moduleKey` itself is left unchanged in
  the hook's return value — still used by `CatalogPage.jsx`'s `canOrder` check, which is explicitly
  Phase 3's scope, not this phase's.
- **`frontend/src/components/dynamic-sections/CategoriesGridSection.jsx`** — same fix: fetches all
  categories, no `moduleKey` prop dependency.
- **`frontend/src/components/dynamic-sections/FeaturedItemsSection.jsx`** — the actual visible bug.
  Now fetches items from **every** real category (previously "first category only"), pooling all
  items together before applying the existing, unchanged "prefer `is_featured`, fall back to first
  N" selection logic. No new visual/section design invented, per the Plan's explicit Non-Goal —
  the fix is that the correct pool of real items is available to that existing logic.

## Evidence

**Public homepage (`/hr`, cold visitor, no admin token) — "خدماتنا" (Our Services) section:**
Before this fix (per the Acceptance Review): showed the 4 store products under this heading. After:
shows the real haircut services — الشعر (Hair), قصة (Haircut), كرياتين (Keratin) — each correctly
marked "مميز" (Featured), which is why they win the pool over the (non-featured) store items rather
than being merged/diluted with them. Confirmed via a real headless-Chrome screenshot and a direct
API check (`GET /{slug}/catalog/categories/{category_id}/items`) showing `is_featured: true` on all
three real service items, `price: 5.0` each — the visible "٥" in the screenshot is the Arabic-Indic
digit for 5, confirmed via `CatalogItemCard.jsx`'s `toLocaleString('ar-SA')` formatting, not a price
bug.

**`/hr/catalog` (the actual catalog browse page):** now shows a real, correctly-populated category
tab list — "الخدمات" (Services) and "منتجات العناية" (Grooming Products) — where before both tabs
of the *older*, separate, hardcoded `TenantModuleNav` (الخدمات/الوحدات/المتجر) were non-functional
decorations over a single fixed product list. Verified both directions:
- Default load → shows real services (الشعر/قصة/كرياتين), each priced correctly.
- Clicking "منتجات العناية" → shows the real 4 store products (سبراي/واكس/جل/عطر) with working
  "أضف للسلة" buttons — Finding #6 (category tabs decorative/broken) closed as a direct consequence,
  not a separate fix.

No console errors in any of the above checks.

## Explicit Scope Note (Non-Goals honored)

- Did not touch `TenantModuleNav`'s static "الخدمات/الوحدات/المتجر" bar or its still-broken
  "الوحدات" (Units) tab — a separate, unrelated route, out of this phase's scope.
- Did not touch `CatalogPage.jsx`'s `canOrder` gate, `CartPage.jsx`, or `ReservePage.jsx` — Phase
  3's scope, not this one.
- Did not invent a new visual design for "what a two-category homepage section looks like" — the
  existing featured/fallback selection logic was reused unchanged; it simply now runs against a
  correct data pool instead of a truncated one.
- Did not delete `catalogApi.js`'s original `fetchCategories`, `useGenericStore.js`'s
  `deriveModuleKey()`, or any of the other two duplicate derivation functions — per the Plan's own
  explicit constraint, deletion is Phase 5's job, after Phases 3-4 are independently verified.

## Verdict

- [x] Root cause fixed at the correct layer (the shared data-fetching functions), not patched
      per-component.
- [x] Real end-to-end verification via actual browser rendering, not just an API-level check.
- [x] A second, related symptom (Finding #6) closed as a natural consequence, confirming the fix
      was applied at the right altitude.
- [x] No regression: `CatalogTab.jsx` (admin) and the Store Cart/Checkout flow (unchanged files)
      were not touched by this phase.

## Related

- `.claudedocs/architecture/CAPABILITY_RESOLUTION_PLAN.md` — Phase 2's own definition, now marked
  complete.
- `.claudedocs/reviews/rk-barber-acceptance-review-2026-07-28.md` — Findings #5 and #6, both closed.
- `.claudedocs/adr/TOS-004-plural-capability-resolution.md` — the ratified decision this phase
  executes.
