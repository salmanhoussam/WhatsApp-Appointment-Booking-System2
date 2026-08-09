# Admin Dashboard Product Review — `rk` (Phase 3.5, Pass 2)

Real Playwright browser (desktop 1440×900), Tenant Owner login (`rkbarber@dev.invalid`). Per-screen
verdicts use this project's established vocabulary: ✅ Keep as-is / 🟡 Improve / 🔴 Redesign — no
fix work started inline, per Salman's own rule.

## Correction (made before this report was finalized, not after)

The raw review claimed "no staff↔service assignment UI exists anywhere," based on opening a
**Service's** edit modal (Staff tab → الخدمات → edit "شعر") and finding no assignment checklist
there. **This is wrong.** The assignment UI exists in the **Staff member's** edit modal instead
(Staff tab → الموظفون → edit a barber → "الخدمات التي يقدمها" checklist) —
confirmed directly in `frontend/src/pages/generic-admin/tabs/StaffTab.jsx:584`, the same file/
feature whose stale-fetch bug was found and fixed earlier this session
(`.claudedocs/work/staff-store-ia-separation/2026-08-09/commit-1-evidence.md`). The reviewer
checked the wrong direction (Service→Staff instead of Staff→Service) and drew the wrong conclusion.
Not propagated as fact — corrected here per this project's Evidence Interrogation standard, same
discipline already applied once this session to the `customers.py`/`prices.py` false claim.

## Per-Screen Verdicts

| Screen | Verdict | Why |
|---|---|---|
| Calendar — Today | 🟡 Improve | Real, working barber-column layout; but 3 of 5 visible barber columns are QA/debug artifacts sitting undistinguished next to real staff; "+" new-reservation button under-labeled |
| Calendar — Week | 🟡 Improve | Toggle works, but **loses the per-barber column layout** Today has — a real structural inconsistency, not just a taste issue: "is Hussein free Tuesday" is answerable from Today, not from Week |
| Reservations List | 🟡 Improve | Search/status tabs/table all clear; one real polish bug — "النوع" (Type) column shows raw untranslated `"barber"` |
| Staff — Employees | 🟡 Improve | CRUD clear; 3 of 5 staff entries are test data, one with no working hours set, none visually distinguished from real staff |
| Staff — Services | 🟡 Improve | Functional (assignment correctly lives on the Staff side, see correction above); 2 of 8 services are named test artifacts |
| Store — Categories | ✅ Keep as-is | Clean, real, correctly separated from Staff/Services |
| Store — Items | 🟡 Improve | All 4 real products are hidden by default with no prompt nudging the owner to publish — a new owner could easily not notice their storefront is empty |
| Store — Orders | 🟡 Improve (known, not new) | Already-logged gap re-confirmed directly: no per-row status control exists, only read-only filter tabs; one order's internal QA note ("REAL E2E TEST -- Store products...") is visible in a field a real owner/customer view would show |
| Settings | ✅ Keep as-is | Reviewer's own words: "the strongest screen in the review" — organized blocks, live preview iframe is a genuinely useful touch |
| Overview | 🔴 Redesign-candidate | See below — several independent, non-cosmetic problems stacked on one screen |

## Overview — why it lands on 🔴, specifically

1. Only 2 stat cards (categories, products) — no revenue, no today's booking count, no pending-
   reservation count, no customer count. Not what an owner opens this page to see.
2. "Recent Activity" feed is close to 100% QA test-run names ("Playwright Mobile Week Test",
   "Phase 1.x Verify Admin Create") — an owner's first real look at "what's been happening" is
   developer noise.
3. **"Recent Orders" says "no orders yet," directly contradicting the Store → Orders screen**,
   which shows 5 real rows including one still pending. Confirmed via network evidence the
   underlying `GET /admin/store/orders` call succeeds (200) — the discrepancy is in how the
   Overview widget consumes/renders that response, not a failed request. Root cause not traced in
   this pass — flagged as a real Unknown, not guessed at.
4. "From Catalog" duplicates the Services list already shown in full under Staff, with no stated
   purpose on this screen.
5. Positioned **last** in the nav (after Settings) despite being the natural first/landing screen
   for a shop owner checking "how's my shop doing."

None of these five are a visual-taste complaint — each is either wrong data, contradictory data, or
missing the data the screen exists to show. This is why it's flagged 🔴 rather than 🟡: per Salman's
own rule, this becomes a candidate for a separate, scoped Implementation Contract, not a same-turn
fix.

## Cross-Cutting Finding — Test Data Hygiene (the one item spanning almost every screen)

Confirmed present on: Calendar (barber columns), Staff Employees, Staff Services, Store Orders
(including a literal internal QA note in a real order), and Overview's Activity feed. This is a
real, pre-existing item this project already named once (`todo_list.md`'s "Permanent Demo Tenant"
idea, 2026-08-02) but this review is the first time it's been confirmed as spanning **this many**
real, currently-live screens on the actual tenant meant to go live by 2026-08-31 — a second
independent confirmation, per this project's own pattern-escalation rule, worth naming as a real
priority candidate rather than logging a third time later.

## Confirmed, Not New

- No per-row order-status control (already logged, `.claudedocs/sessions/2026-08-09.md`'s carry-
  forward list) — re-confirmed directly in the browser, not just inferred.

## Console/Network

0 real errors post-login across ~500 requests (one pre-login 401 was expected/unauthenticated, one
`ERR_ABORTED` was a cancelled in-flight request from navigating away mid-load — not a server
error). 9 non-blocking dev warnings (Vite HMR, a `recharts` `ResponsiveContainer` sizing warning
firing 7×, one Framer Motion warning, one autocomplete suggestion).

## Not Yet Reviewed

Staff-scoped (`Jaafar`/`STAFF`) pass — next in the agreed sequence.
