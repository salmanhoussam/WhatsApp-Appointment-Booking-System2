# Overview — Fresh Evidence Pass (before writing the Implementation Contract)

Per Salman's explicit instruction: "اعمل أولًا evidence pass على الشاشة الحالية... وإذا ظهر أن
المشكلة ليست فعلًا Redesign بل مجرد polish، أوقف التصنيف واذكر ذلك." Real browser evidence
collected today (2026-08-10), against the *current* screen state — which has changed materially
since the original Admin Dashboard review (`.claudedocs/work/admin-dashboard-review/2026-08-10/
summary.md`), because the Production Data Hygiene cleanup (42 test rows deleted) landed in between.

**Full raw evidence**: fresh browser pass, `rk`, TENANT_ADMIN, desktop 1440×900 + mobile 390×844,
console/network captured. Screenshots: `overview-fresh-check.png`, `overview-fresh-mobile.png`.

## Re-checking each of the original 5 reasons Overview was called 🔴, against today's real state

| # | Original reason (2026-08-10, pre-cleanup) | Today's evidence | Status |
|---|---|---|---|
| 1 | "Only 2 stat cards — no revenue, no today's booking count, no pending-reservation count" | **All 6 stat cards present today**: طلبات اليوم, الإيرادات اليوم, معلّقة, مكتملة, الأقسام, المنتجات (all zero-valued, but all rendering) | **Does not reproduce** |
| 2 | "Recent Activity feed is close to 100% QA test-run names" | Feed shows exactly 7 items — all 7 are the deliberately-preserved *uncertain* reservations (ashraf kokha, ali aloka, bo salo, 4× زبون واتساب), not QA noise. Every confirmed-test row was already deleted by the Data Hygiene cleanup | **Resolved by #2's cleanup, not a redesign problem** — will self-resolve once the 7 rows are decided |
| 3 | "'Recent Orders' says 'no orders yet', contradicting the Store Orders screen" | Today, both correctly show 0 — `StoreOrder` really is empty post-cleanup (all 5 test orders deleted). No contradiction currently observable | **Cannot be re-confirmed as still-happening** — the data state that caused it no longer exists (real Unknown, not a live bug) |
| 4 | "'From Catalog' duplicates the Services list, no stated purpose on this screen" | Confirmed still present and unchanged — sits directly beside the empty "الأكثر مبيعاً" (Best Sellers) card, real risk of being misread as sales data at a glance | **Still real** — small, scoped |
| 5 | "Positioned last in nav, buried after Settings" | Confirmed unchanged — still last | **Still real** — small, scoped |

## New items found in this fresh pass (not in the original review)

- **No customer-count stat** — none of the 6 cards reflect customer count; whether this is
  feasible depends on whether a real queryable customer concept exists yet (this platform's own
  known gap — no dedicated `Customer` entity for the reservation module, per multiple earlier
  session findings). Flag, not solved here.
- **Possible mobile layout overlap** — the fixed bottom tab bar may sit over the "الأقسام"/
  "المنتجات" stat cards partway down the page on a real device. **Not confirmed** — the evidence
  pass explicitly flagged this as an Unknown (full-page screenshot stitching can visually overlap
  fixed elements even when live scrolling wouldn't clip real content) — needs a real scroll-and-
  screenshot-at-rest check before treating it as a confirmed bug.
- Zero console errors, zero network errors ≥ 400 anywhere in the session — the screen is
  functioning correctly end-to-end; nothing here is a broken-code problem.

## Honest Reclassification

Of the 5 original reasons Overview was rated 🔴:
- **3 no longer reproduce or were already resolved** by work already done (#1's cleanup, #3
  Availability fix not directly relevant here, but the Data Hygiene cleanup specifically).
- **2 are still real** (the Catalog/Best-Sellers mixup, the nav position) — but both are small,
  independently scoped fixes, not evidence of a broken information architecture needing a ground-up
  redesign.
- **2 new items found** (missing customer stat, possible mobile overlap) — also both small and
  independently scoped, not architecture-level.

**Recommendation, not a decision**: today's real evidence does not support treating this as a 🔴
ground-up Redesign. It supports a small, named set of 🟡 Improve items — reclassifying honestly
rather than writing a big Implementation Contract to match a scope that today's evidence doesn't
back up:

1. Move "نظرة عامة" earlier in the nav (first or near-first, matching its role as the natural
   landing screen for a shop owner) — small nav-order change.
2. Rename/remove/clarify the "من الكتالوج" widget so it can't be misread as sales data next to the
   empty "الأكثر مبيعاً" card.
3. Investigate whether a real customer-count stat is feasible given the current data model; if not,
   explicitly decide to leave the 6 cards as-is rather than silently drop the idea.
4. Confirm or refute the mobile bottom-nav overlap with a real scroll-position screenshot; fix only
   if confirmed.
5. Leave the Recent-Orders/Store-Orders "contradiction" as a named Unknown — re-test once real order
   data exists (either Ali's onboarding or RK's first real customer order), not fixable/verifiable
   against an empty dataset.

**Decision needed from Salman**: proceed with the 5 items above as scoped 🟡 fixes (fast, matches
what today's evidence actually shows), or still want a full ground-up Redesign Implementation
Contract regardless (e.g., anticipating that today's zero-data state is masking real information-
hierarchy problems that will only show once RK has real volume) — a legitimate reason to still want
one, just a different justification than the original 5 reasons, which mostly didn't hold up under
today's real evidence.
