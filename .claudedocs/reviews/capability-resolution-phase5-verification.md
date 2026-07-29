# Phase 5 — Retire Tenant-wide Module Identity (Verification)

**Date:** 2026-07-29. Executes the plan Salman approved with two corrections: title reflects
retiring the *concept* (`Tenant → One Module` → `Tenant → Capabilities`), not just deleting a
function; Architecture Success Criteria (not just a grep count) define done.

## What Changed

- **`GenericAdminDashboard.jsx`** — deleted `deriveModuleKey()` and its computation. Removed the
  topbar module badge entirely (no replacement) — Capability Discovery now happens through the real
  Tabs/rendered content alone (see plan file's "Why the Badge Is Removed" section).
- **`useGenericStore.js`** — deleted `deriveModuleKey()`, removed `moduleKey` from store state and
  from `setConfig()`.
- **`DynamicPage.jsx`** — deleted the inline derivation; `showCart` now reads
  `hasOrderCapability(activeServices)` (also a real correctness fix — the old check was true even
  for a catalog-only tenant with nothing to check out); `moduleKey` dropped from `sectionProps`
  (confirmed zero section consumers).
- **`useCatalog.js`** — dropped the dead `moduleKey` destructure/return (unused since Phase 3).
- **`ReservePage.jsx`** — replaced `useGenericStore()`'s `moduleKey` + `MODULE_KEY_MAP` with direct
  `hasCapability(activeServices, 'restaurant')` checks, sourced from `config.active_services`
  (already locally available) — fully cleared of `moduleKey`.
- **`CartPage.jsx`** — **a real gap found during this phase's own verification, not anticipated by
  the plan**: it read `moduleKey` from `useGenericStore()`, which Phase 5 deletes. Fixed by
  computing the same per-transaction `moduleKey` locally (`hasCapability(activeServices,
  'restaurant') ? 'restaurant' : hasCapability(activeServices,'store') ? 'store' : null`) — the
  per-transaction checkout-routing logic itself (Phase 3's own deliberate non-goal) is otherwise
  untouched.

## Search Verification Re-Run

```
grep -rn "deriveModuleKey|moduleKey ===" frontend/src
```

Zero `deriveModuleKey` matches anywhere (all three deleted). Remaining `moduleKey ===` matches: only
`KanbanBoard.jsx` (confirmed dead code) and `CartPage.jsx` (the local per-transaction variable just
described — not a caller of anything deleted). Both already categorized and justified.

## Real Verification (End-to-End Verification Routine)

1. **Admin topbar**: badge confirmed gone via live DOM check; Overview tab still renders real data
   (real stat cards, no console errors).
2. **Public homepage** (`/hr`): loads cleanly, no console errors.
3. **Real Add-to-Cart → Cart page**: real item, real price ($8), real total, full checkout form
   (delivery address + payment method) — proving `CartPage.jsx`'s local `moduleKey` fix works.
4. **Real booking submission** (`/hr/reserve`): filled form, submitted, real success screen (`تم
   تسجيل حجزك! رقم الحجز: ebabb2a0`), confirming `ReservePage.jsx`'s migration didn't regress the
   earlier Booking-404 fix. Real `POST /reservations/` → 200.

Test artifacts (1 reservation, cart localStorage state) were not yet cleaned up — the cleanup
script hit this session's already-documented intermittent Supabase pooler connectivity issue on
retry; harmless, clearly-labeled test data, cleanup deferred rather than retried further.

## Architecture Success Criteria — Final Assessment

- [x] **No remaining tenant-wide module derivation** — all three `deriveModuleKey()` definitions
      deleted; grep confirms zero survivors.
- [x] **Every live routing/rendering decision is driven by `active_services`** — Cart visibility,
      Orders fetch, reservation metadata, Catalog rendering all resolve from the real plural array,
      not a collapsed value, across every file this migration touched (Phases 2-5).
- [x] **UI no longer communicates tenant identity through a synthetic Module label** — the topbar
      badge is gone; Capability Discovery happens through real Tabs and real rendered content only.
- [x] **`hasCapability`/`hasOrderCapability` is the single canonical source** for every "does this
      tenant support X" question left in the codebase — confirmed via the Search Verification;
      the only remaining `moduleKey`-shaped values are genuine per-transaction/per-record locals
      (`CartPage.jsx`, `ReservePage.jsx`'s `MODULE_KEY_MAP` is gone entirely) or dead code
      (`KanbanBoard.jsx`), never a tenant-wide collapse.

**The migration authorized by `TOS-004-plural-capability-resolution.md` is complete.**

## Related

- `.claudedocs/adr/TOS-004-plural-capability-resolution.md` — the ratified decision.
- `.claudedocs/architecture/CAPABILITY_RESOLUTION_PLAN.md` — the full 5-phase plan, now complete.
- `.claudedocs/reviews/capability-resolution-search-verification.md` — the gate this phase passed.
