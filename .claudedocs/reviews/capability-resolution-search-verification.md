# Search Verification — Every Order-Capability Derivation, Before Phase 5

**Date:** 2026-07-29 — Requested explicitly by Salman before authorizing Phase 5 (deleting the
three duplicate `moduleKey` derivations): *"اعمل grep... تأكد أن جميع أماكن اشتقاق الـ Order
Capability أصبحت تمر عبر hasOrderCapability(). إذا بقي استثناء، إما أن يكون مبررًا أو يُصلح قبل
الحذف."* Runs exactly the exit criterion `CAPABILITY_RESOLUTION_PLAN.md`'s Phase 5 already named
(`grep -rn "deriveModuleKey\|moduleKey ==="`), but as its own explicit, dated gate rather than an
implicit assumption.

## Command

```
grep -rn "deriveModuleKey\|moduleKey ===" frontend/src
```

## Every Result, Categorized

**1. Justified — genuine per-transaction/per-record decisions, already reviewed in Phases 3-4, not
Order-Capability derivation at all:**

- `ReservePage.jsx:145,269` — `moduleKey === 'restaurant'` gates the restaurant-only `party_size`
  field. Reviewed in Phase 3: `MODULE_KEY_MAP` already collapses `store`/`catalog` to the identical
  output, and no real tenant has Restaurant alongside anything else today
  (Module Resolution Review). Justified, unchanged.
- `CartPage.jsx:219,236,286,375,378,382` — per-transaction checkout endpoint routing and form-field
  selection. Explicitly scoped out of Phase 3 on purpose (a real per-order decision, not a
  tenant-wide collapse) — see `rk-barber-phase3-cart-gating-fix-verification.md`'s own Scope Note.
  Justified, unchanged.
- `catalogApi.js:14,16,25,27,38` — `moduleKey` here is a **function parameter**, not an internally
  re-derived value; every real caller has passed a correctly-scoped, per-category value since Phase
  2 (`activeCategory.module_key`, never the collapsed tenant-wide one). Justified, unchanged.
- `CatalogPage.jsx:63` — a code comment referencing the old check for historical/explanatory
  purposes, not executable logic. Not a real site.

**2. Justified but noteworthy — blocks Phase 5's function *deletion*, not a functional bug:**

- `GenericAdminDashboard.jsx:108` (`deriveModuleKey()`'s own definition) **still has one real
  caller**: line 344, feeding the topbar's own single-value badge display
  (`{moduleKey.toUpperCase()}`). This is a cosmetic "what's the primary type shown" display, not an
  Order-Capability gate — genuinely out of this Plan's stated scope (which is about order/catalog
  *behavior*, not a status badge's label) — but it means this specific duplicate derivation
  function **cannot simply be deleted in Phase 5 without first deciding what the topbar badge
  should show instead** (e.g. all active capabilities, or its own small locally-scoped pick). Named
  explicitly here as a new, real precondition for Phase 5 that the Plan's original table didn't
  anticipate.
- `KanbanBoard.jsx` (4 sites, lines 54/334/338/378) — confirmed still dead code (zero real imports,
  reconfirmed via `grep -rln "KanbanBoard" frontend/src --include=*.jsx` returning only its own
  definition file). Not a live bypass of anything — nothing calls it — but it still contains the
  same wrong hardcoded pattern Phase 4 named and deliberately did not touch (no real verification
  possible for unwired code). Unchanged, per that same reasoning.
- `useGenericStore.js:5` (`deriveModuleKey()`'s own definition) and `:54` (its one remaining call,
  computing the `moduleKey` value still stored for the topbar/legacy consumers) — the third
  duplicate, kept exactly as-is per Phase 5's own not-yet-started status.

**3. Genuine exception found — fixed now, not deferred:**

- **`useGenericStore.js:80`** — `if (moduleKey === 'store' && nextSlug && (tenantChanged ||
  !get().sessionId))`, gating creation of the server-side Store cart session ID. This is a real
  functional decision (not per-transaction, not cosmetic) that was never reviewed in Phases 1-4
  because it lives inside `setConfig()`, not inside any of the consumer files the Plan's original
  table enumerated. It was working for `hr` only because `store` currently wins the tenant-wide
  priority contest — the exact same "correct by luck, not by design" shape as everything already
  fixed in Phases 3-4. For a tenant with Store active but *not* winning that priority, this session
  ID would never be created and Store's real Cart/Checkout flow would silently never initialize.
  **Fixed**: `moduleKey === 'store'` → `hasCapability(activeServices, 'store')`. Verified live —
  repeated the exact Add-to-Cart → Cart-page walkthrough from Phase 3's own verification; identical
  correct result (real item, real price, real total, real checkout form), confirming no regression.

## Conclusion

One genuine, previously-unreviewed exception existed and has been fixed. Every other remaining
`moduleKey ===`/`deriveModuleKey` site is either a legitimate per-transaction/per-record decision
already reviewed and deliberately left alone, a function parameter already fed correctly-scoped
values since Phase 2, a dead-code site with no live impact, or the topbar badge's own cosmetic
display — which is a **new, real precondition for Phase 5** (the badge's own future shape must be
decided before `deriveModuleKey()` can be deleted, since it is still that function's one live
caller). Phase 5 is not yet unconditionally clear to start — this is the concrete, checkable
finding the Search Verification exists to produce, not a rubber stamp.

## Related

- `.claudedocs/architecture/CAPABILITY_RESOLUTION_PLAN.md` — Phase 5's own deletion criteria.
- `.claudedocs/reviews/rk-barber-phase3-cart-gating-fix-verification.md`,
  `rk-barber-phase4-admin-dashboard-fix-verification.md` — the phases this verification checks
  against.
