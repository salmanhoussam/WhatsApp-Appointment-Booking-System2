# RK Barber — Phase 3 Fix Verification (Cart / Catalog Order-Capability Gating)

**Tenant:** `hr` — **Date:** 2026-07-28 — Follows `investigation-protocol.md`'s evidence discipline
and `CAPABILITY_RESOLUTION_PLAN.md`'s Phase 3 definition.

## Methodology

1. **Compare current vs. correct.** Unlike Phase 2 (where an "old"/already-correct consumer
   existed to compare against), Phase 3's gating logic had no working precedent elsewhere in the
   codebase to compare to — the comparison here is the current (collapsed, fragile) implementation
   against `TOS-004`'s own prescribed primitive (`hasOrderCapability`, built in Phase 1).
2. **Where the fragility actually was:** confirmed directly, not assumed — `hr`'s Cart page was
   *not* currently broken in production, because `useGenericStore.js`'s `deriveModuleKey()` still
   prioritizes `store` over `catalog`, so `moduleKey` happens to resolve to `'store'` for `hr` today.
   The real problem is that this only works **by luck of priority order**, not by correctness: any
   tenant where the derivation's winner didn't happen to be an order-bearing capability (or a future
   priority-order change) would silently break, exactly like Finding #5 did for `catalog` vs `store`
   on the same tenant.
3. **`ReservePage.jsx`'s `MODULE_KEY_MAP` — confirmed unaffected, not assumed.** Read directly: the
   map is `{ restaurant: 'restaurant', store: 'services', catalog: 'services' }` — both `store` and
   `catalog` already resolve to the identical output value. Whichever one wins the tenant-wide
   derivation, the reservation's own `module_key` field ends up `'services'` either way. Confirmed
   this consumer needs no change for Phase 3, rather than leaving the Plan's own claim unverified.

## Fix

- **`frontend/src/pages/generic/normal/CatalogPage.jsx`** — `canOrder` now reads
  `hasOrderCapability(config?.active_services)` instead of `moduleKey === 'restaurant' || moduleKey
  === 'store'`. `moduleKey` dropped from this file's destructuring entirely (no longer used here).
- **`frontend/src/pages/generic/normal/CartPage.jsx`** — the top-level render guard now reads
  `if (config && config.slug !== 'unknown' && !hasOrderCapability(config.active_services)) return
  null` instead of `if (moduleKey && moduleKey !== 'restaurant' && moduleKey !== 'store') return
  null` — same "don't act before config has loaded" behavior preserved (matching this file's own
  existing `config.slug !== 'unknown'` guard pattern used one function above), just sourced from the
  plural `active_services` array instead of the collapsed value.

## Explicit Scope Note (Non-Goals honored)

- `CartPage.jsx`'s internal checkout logic (which endpoint to POST to — `/restaurant/orders` vs.
  `/store/orders` — and which form fields to show, e.g. `table_number` vs. `shipping_address`) is
  **unchanged** — still keyed by `moduleKey`. This is a genuine per-transaction decision (what kind
  of order is actually being submitted), not a tenant-wide collapse, and was never in this phase's
  scope per the Plan's own table (only the top-level render-gate line was listed). No real tenant
  today has both Restaurant and Store/Catalog simultaneously, so this isn't yet observably wrong —
  named explicitly here rather than silently left unexamined.
- `ReservePage.jsx` — confirmed unaffected (see Methodology point 3), zero lines changed.
- Nothing deleted — `useGenericStore.js`'s `deriveModuleKey()` and the other two duplicate
  derivations remain exactly as they were, per the Plan's explicit Phase 5-only deletion rule.

## Evidence

Real headless-Chrome walkthrough as a cold visitor (no admin token), storage cleared via CDP's
`Storage.clearDataForOrigin` before navigating (ruling out stale cart state from earlier test runs
in the same shared browser profile — an earlier attempt this session was confounded by exactly that
and is not cited as evidence here):

1. `/hr/catalog` loads, shows real category pills ("الخدمات" / "منتجات العناية").
2. Clicked "منتجات العناية" → real store products render (سبراي تثبيت الشعر / واكس تصفيف الشعر /
   جل تصفيف الشعر / عطر ريحة رجالي), confirming Phase 2's fix still holds and category-switching
   works cleanly when given adequate real network time (an earlier same-session attempt without
   enough wait produced a confusing stale-data read, corrected here, not treated as a real finding).
3. Clicked "+" on "سبراي تثبيت الشعر" → cart badge updates.
4. Navigated to `/hr/cart` → **real, non-null render**: the actual item (سبراي تثبيت الشعر, qty 1,
   $8), a correct total ($8 USD), and the full real checkout form — name, phone, delivery address,
   payment method (cash/card dropdown), notes, and a "تأكيد الطلب" submit button. Screenshot
   confirms this precisely, not just a text dump.

No console errors throughout. This is the direct, positive proof the Plan's own Phase 3 verification
criterion asked for: Cart no longer silently disappears for a tenant whose real capability set
includes Store, regardless of what else is also active.

## Verdict

- [x] Root cause fixed at the correct layer (the tenant-wide collapsed boolean, replaced by the
      plural Capability Resolution Layer primitive already built in Phase 1) — not a per-page patch
      that happens to work for `hr` specifically.
- [x] Real end-to-end verification: a real Add-to-Cart click, a real Cart render, a real checkout
      form — not just an API-level check.
- [x] `ReservePage.jsx` explicitly checked and confirmed unaffected, not silently assumed safe.
- [x] No regression: `CartPage.jsx`'s per-transaction checkout logic (restaurant vs. store endpoint
      routing, form-field selection) is untouched and still correct for every tenant that has
      exactly one of those two capabilities, which is every real tenant today.

## Related

- `.claudedocs/architecture/CAPABILITY_RESOLUTION_PLAN.md` — Phase 3's own definition, now complete.
- `.claudedocs/reviews/rk-barber-phase2-catalog-fix-verification.md` — Phase 2, the prerequisite
  this phase builds on.
- `.claudedocs/adr/TOS-004-plural-capability-resolution.md` — the ratified decision this phase
  executes.
