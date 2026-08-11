# Reservation System — Roadmap to Production

Created 2026-08-09, in response to Salman's request for a deadline before this project (the
Reservation/Booking system — RK Barber Shop as reference tenant, plus the shared capabilities it
runs on) is called production-ready. Built from the Open Risks in
`.claudedocs/reviews/WEEKLY_REVIEW_2026-07-27_to_2026-08-09.md` plus relevant items already logged
in `.claudedocs/todo_list.md`.

## Decisions Made (2026-08-09, Salman's explicit call)

1. **Target date**: **2026-08-31** ("آخر الشهر" — end of this month). ~22 days from today
   (2026-08-09) at this project's current real cadence.
2. **Scope**: **RK + Ali, both live** — not RK alone. Ali's real onboarding is a hard requirement
   of this deadline, not an optional stretch item; it's the actual proof the system is
   configuration-repeatable, not a one-tenant special case.
3. **Payments**: **cash-only is acceptable for launch.** The ADR-0004 payment-gateway gap is
   explicitly deferred past this deadline — not in scope for 2026-08-31.
4. **Bar to clear**: Salman's own framing — this needs to be **"أحسن ويب آب بتاخد منها حجوزات"**
   (the best web app taking bookings) by the deadline. That's a real UX/product-quality bar, not
   just "no bugs" — added as its own phase below (Phase 3.5) rather than folded silently into
   "polish."

## Execution Order — ratified 2026-08-10 (supersedes phase-number order below)

The phases below are numbered by discovery order, not execution priority. Salman ranked the actual
remaining work by real Production impact after the three-sided Product Review closed; this is the
order work actually happens in, regardless of each item's phase number:

```
1. ✅ Availability reliability      DONE 2026-08-10 — see below
       ↓  — ran in parallel with #2 as a separate workstream (backend/reliability vs. data cleanup)
2. 🟡 Production Data Hygiene       (Phase 3.6) — ✅ 42 rows deleted 2026-08-10; 7 uncertain rows still open
       ↓
3. ✅ STAFF barbers-roster scoping  DONE 2026-08-10 — see below
       ↓
4. ✅ Overview UX improvements      DONE 2026-08-10 — reclassified 🔴→🟡 first, see below
       ↓
5. 🟡 Calendar / Reservations / Staff / Store polish   (Phase 3.5's Admin-pass Improve items)
       ↓
6. Ali onboarding                   (Phase 3)
       ↓
7. Final production regression      (Phase 5)
       ↓
8. 2026-08-31 LIVE
```

Rationale in Salman's own words: #1 can prevent a booking from completing at all — highest
Production impact by definition. #2 must precede #4 because a redesigned Overview built against
data known to contain "REAL E2E TEST — Store products..." and QA staff names would be building a
dashboard on top of not-production-ready data — real wasted work, not caution for its own sake. #3
is a real security/privacy issue independent of both, sequenced after data hygiene only because
it's lower urgency than #1/#2, not because it depends on them.

### #1 — Availability Reliability: ✅ DONE 2026-08-10

Three distinct, confirmed root causes (`httpx.ReadTimeout`, Prisma `DataError` P1001 under real
concurrent load, and — the highest-leverage one — `app/core/tenant.py`'s tenant-resolution call
being completely unwrapped despite running before every other dependency on every route). Fixed
via a shared `with_db_resilience()` helper at all three chokepoints, plus an independent frontend
fix distinguishing a real failure from a real empty result. Real load-test evidence: 10/10
sequential and 10/10 concurrent requests succeeded post-fix, vs. ~50% failure before. Full account:
`.claudedocs/work/availability-reliability/2026-08-10/summary.md` +
`frontend-verification.md`. Commits: `693c558`, `2cfdf40`, `b80cbab`.

### #2 — Production Data Hygiene: 42 rows deleted 2026-08-10; 7 uncertain rows still open

Full inventory: `.claudedocs/work/production-data-hygiene/2026-08-10/inventory.md`; per-row review
+ execution results: `deletion-review.md`. Confirmed worse than the original Product Review's
"scattered noise" framing: `rk` had **zero** confidently-real `StoreOrder` rows (0/5) and **zero**
confidently-real `Reservation` rows (0/39) before this cleanup. After Salman's explicit approval
of the full per-row report, **42 rows deleted** (3 Barber, 2 CatalogService, 5 StoreOrder, 32
Reservation — exact IDs in the evidence file) via a single transaction, re-verified before and
after (exact count deltas, the 7 preserved uncertain rows confirmed byte-identical, every other
row confirmed byte-identical, zero FK errors, real post-delete smoke checks all passing).

**Still open**: 7 `Reservation` rows remain, explicitly untouched, pending Salman's own knowledge
of RK's real August bookings — 4 "زبون واتساب" (phone-less WhatsApp-logged?) rows and 3 informal
names ("bo salo"/"ali aloka"/"ashraf kokha") with patterned phone numbers. Marked 🟡 not ✅ until
these are resolved.

### #3 — STAFF `/admin/barbers/` Roster Scoping: ✅ DONE 2026-08-10

Treated as a security/backend task per Salman's explicit instruction — investigation before any
code (`.claudedocs/work/staff-barbers-roster-scoping/2026-08-10/investigation.md`), then real-account
verification, not simulated. Reused the exact fail-closed pattern already proven in
`reservations.py` (Staff Scoped Access Phase B) rather than a new mechanism. Real tests: Jaafar
(real STAFF barber) now sees only himself; `TENANT_ADMIN` unchanged, full roster; a real
STAFF-account-with-no-barberId test row gets a real `403`, not a silent 200. Write routes
unaffected — investigation confirmed no related issue. Full browser regression on the Calendar
(Today + Week, both roles) — zero new errors, zero broken rendering. Evidence:
`.claudedocs/work/staff-barbers-roster-scoping/2026-08-10/evidence.md`. Commits: `6fd5712`,
`ec46266`.

**Still open, not yet decided** — assumed non-blocking for 2026-08-31 unless corrected:
- Super Admin Dashboard — not part of "best booking web app" framing above; treated as deferred
  past this deadline. Flag if that's wrong.
- `store.py`/`catalog_service.py` dual-write-path — kept in Phase 2 below by default (it was
  already scoped there); say so explicitly if this should be deferred instead to protect the
  deadline.

## What "production-ready" means here, for 2026-08-31

RK and Ali can both be handed to a real paying merchant and their staff, with real customers
booking real appointments and buying real products, cash-only, without:
- an unauthenticated route existing anywhere in its request path,
- data-correctness bugs in money/pricing fields,
- an admin action silently doing nothing (e.g., no way to change an order's status),
- Ali requiring new code instead of new configuration,
- the booking flow itself falling short of a real UX bar — not just functionally correct.

## Phase 1 — Orphaned Admin Router Cleanup — ✅ DONE 2026-08-09

Renamed from "Security Closure" — corrected while planning this phase, before writing any code:
`customers.py`/`prices.py`/`booking_services.py`/`listings.py` were never `include_router()`-ed
into `admin/__init__.py`, and `app/main.py` only mounts that one router — meaning these four files
were **never reachable by any real HTTP request**. The earlier "any caller who knows a client_id
can read/write them today" claim was wrong (not re-verified against router registration before
being written). This was confirmed dead/orphaned admin CRUD scaffolding — Repository Hygiene, not
a live security incident. Full evidence:
`.claudedocs/work/orphaned-admin-routers-cleanup/2026-08-09/summary.md`; correction recorded in
`.claudedocs/evolution/user-roles-permissions.md`'s 2026-08-09 correction entry.

- All four files deleted (`git rm`). Service/repository layer left untouched — `customer_repo.py`/
  `price_repo.py`/`price_service.py` remain live via other, already-secured paths
  (`admin/units.py`, `public_service.py`, `whatsapp_flow.py`); `customer_service.py`/
  `booking_service_service.py`/admin-side `ListingService` had no other live consumer at all.
- Verified: app imports cleanly post-deletion (`venv/bin/python3 -c "from app.main import app"`),
  zero dangling references anywhere in `app/`/`frontend/src/`, zero test coverage lost.
- **`settings.py`'s deliberate exclusion from the router-level auth floor** re-confirmed still
  holds — the documented Soft-Block allowlist ordering exception in `admin/__init__.py`'s own
  comment block, unaffected by this cleanup.

Actual time: well under the original 1-session estimate — the finding shrank once verified.

## Phase 2 — Core Data Model Cleanup

- **Resolve the `store.py`/`catalog_service.py` dual-write-path.** Confirmed independently twice
  (Orders investigation, Staff/Store IA investigation) — this project's own pattern-escalation rule
  says a second confirmation is the trigger to actually decide, not log a third time. Real decision
  needed: migrate `store.py`'s product routes onto `catalog_service.py`, or state the reason they
  stay separate. This is architecture work, not a `safe-refactor` — needs its own Implementation
  Contract.
- **Remove `StoreCustomer`** — 0 rows, 0 references, confirmed dead.
- **`StoreOrder`/`StoreOrderItem`'s `Float` price fields → `Decimal`** — a real correctness risk
  once real money moves through these tables, not cosmetic.
- **Decide the real-Customer-entity question** — Staff Scoped Access shipped "my clients" as a
  derived query (no schema change) by explicit choice; confirm that's acceptable long-term or scope
  a real `Customer` entity now, before more code assumes the derived-query shape.

Estimate: 2-3 sessions (the dual-write-path decision is the long pole — needs its own Contract).

## Phase 3 — Missing Operational Features

- **Order status-change control in the Store Orders UI.** Confirmed gap: only status-filter tabs
  exist, no per-row status editor. A merchant cannot mark an order "shipped"/"delivered" today.
  This blocks real operational use, not just polish.
- ~~Payments decision~~ — **resolved: cash-only accepted for launch.** Not in scope for
  2026-08-31.
- **Ali's real onboarding — now a hard requirement of the deadline**, not optional (Services/
  Orders confirmed ready per this week's work). Real branding, WhatsApp number, page copy,
  Staff↔Service assignments, real catalog — same discipline as RK, no copied placeholder data.

Estimate: 1-2 sessions (Payments removed from scope; Ali onboarding itself is ~1 session of real
configuration work, no new code expected, per the RK/Ali shared-system decision).

## Phase 3.5 — "Best Booking Web App" UX Bar

Added per Salman's explicit framing — this deadline isn't just "no bugs," it's a real quality bar.
Run a genuine Product Review (not a technical audit — see `feedback_product_review_vs_technical_audit`
memory: UX verdicts ✅/🟡/🔴, not a bug list) across the full customer + admin journey on both RK
and Ali:
- **Customer-facing booking flow** (run first — highest-stakes surface) — service selection, staff
  picker, calendar/slot picking, confirmation (WhatsApp), mobile experience specifically (most real
  bookings will be on phones). Reviewed against Salman's own question list, not "does the button
  exist": هل أفهم ماذا أفعل؟ هل الخطوة التالية واضحة؟ هل اختيار الخدمة/الموظف سهل ومنطقي؟ هل الـ
  calendar والـ slots مفهومة على الهاتف؟ هل WhatsApp confirmation طبيعي بلا احتكاك؟ هل التجربة تبدو
  كمنتج حقيقي أم admin system متحوّل إلى booking app؟
- **Admin dashboard** (RK, Tenant Owner) — Calendar (Today/Week), Reservations List, Staff, Store,
  Orders, Overview, Settings — the dashboard redesign shipped this week, so this is the first real
  chance to evaluate it as a finished product rather than a work-in-progress.
- **Staff-scoped experience** (Jaafar's real `STAFF` account) — Calendar, My Clients — the newest
  surface, least product-reviewed so far.

Ali is out of scope for this pass (not onboarded yet — reviewed as part of Phase 3's onboarding).

**STATUS: ✅ DONE 2026-08-10 — all three passes complete.** Customer:
`.claudedocs/work/customer-booking-flow-review/2026-08-09/summary.md`. Admin:
`.claudedocs/work/admin-dashboard-review/2026-08-10/summary.md`. Staff:
`.claudedocs/work/staff-scoped-review/2026-08-10/summary.md`. Fallout tracked as Phase 3.6
(Production Data Hygiene) and Phase 3.7 (Overview Redesign) below, plus the already-tracked
availability-endpoint blocker and one small new item: `GET /admin/barbers/` returns the full
unfiltered staff roster (names/phones/hours) to a `STAFF` token — real, independently confirmed via
direct `curl`, not yet scoped to fix (folded into Phase 4 below).

Every screen/flow gets exactly one verdict, per this project's own UX review vocabulary, and the
review's job stops at the verdict:
```
Review → ✅ Keep as-is (don't touch it)
       → 🟡 Improve (a specific, scoped fix)
       → 🔴 Redesign (opens its own separate Implementation Contract — never started inline)
```
Salman's explicit rule: no redesign work starts mid-review. This is what protects the 2026-08-31
deadline from turning into an open-ended UI rewrite — a 🔴 becomes a named, separate next task,
flagged immediately rather than discovered in Phase 5.

Estimate: 1 session for the review itself, 1-3 sessions to act on what it finds (depends entirely
on what the review surfaces — unknown until run).

**Pass 1 (Customer)**: done, `.claudedocs/work/customer-booking-flow-review/2026-08-09/summary.md`
— Steps 1-3 ✅ Keep as-is, the availability endpoint became its own Production Blocker (see Phase
3.6 below), the service-selection carousel shipped as a small, independent Improve
(`159c631`/`a065150`).

**Pass 2 (Admin, Tenant Owner)**: done, `.claudedocs/work/admin-dashboard-review/2026-08-10/
summary.md` — Settings and Store Categories ✅ Keep as-is; Calendar/Reservations/Staff/Store Items
& Orders 🟡 Improve; **Overview 🔴 Redesign-candidate** (see Phase 3.7 below). Surfaced the
cross-cutting Production Data Hygiene finding (see Phase 3.6).

**Pass 3 (Staff-scoped, `Jaafar`)**: next.

## Phase 3.6 — Production Data Hygiene (NEW, elevated to a named Production Blocker 2026-08-10)

Elevated by Salman's explicit call, not left as a 🟡 UX note: real QA/test data is confirmed
sitting inside `rk`'s actual data — the tenant meant to go live 2026-08-31 — on 5+ real screens
(Calendar barber columns, Staff Employees, Staff Services, Store Orders including a literal
internal QA note visible in a real order, Overview's Activity feed). This is the **second**
independent confirmation of an item first named 2026-08-02 (`todo_list.md`'s "Permanent Demo
Tenant" idea) — per this project's own pattern-escalation rule, a second confirmation is the
trigger to treat it as a real priority, not log it a third time.

**Why this outranks most 🟡 UX items**: a real merchant opening their own dashboard and seeing
"Test Staff NetCheck 1786131600" as a barber, or a customer-facing order note reading "REAL E2E
TEST — Store products," is a trust-breaking event, not a cosmetic one — worse than most of the
🟡 Improve items above.

Scope (not yet executed): identify every test/QA row across `Barber`, `CatalogService`,
`CatalogItem`, `StoreOrder`/`StoreOrderItem`, and whatever feeds the Overview activity widget on
`rk`; decide delete vs. archive per row (never touch real customer data by mistake); re-verify
each affected screen afterward. A real decision point: should this become a one-time cleanup script
run before every tenant's go-live (Ali included), or a recurring hygiene check? Not decided here.

Estimate: 1 session (mostly investigation + a careful, scoped delete pass — same discipline as any
data-touching change, per this project's migration-staging concerns).

## Phase 3.7 — Overview UX Improvements — ✅ DONE 2026-08-10 (reclassified 🔴→🟡 before any code)

Originally rated 🔴 (`.claudedocs/work/admin-dashboard-review/2026-08-10/summary.md`'s "Overview —
why it lands on 🔴": contradictory order counts, near-empty stat cards, a test-data activity feed,
buried last in nav). Before writing a redesign contract, a **fresh evidence pass**
(`.claudedocs/work/overview-redesign-contract/2026-08-10/evidence-pass.md`) re-checked all 5
reasons against current data — 3 no longer reproduced (all 6 stat cards render; the activity feed
now shows only the 7 deliberately-preserved uncertain reservations, not QA noise; Recent Orders and
Store Orders are no longer contradictory, both correctly show 0 post-cleanup). Per Salman's own
rule (🔴 must be based on a currently-proven problem, not a possible future one), reclassified to
🟡 — a small, explicitly-not-called-"redesign" contract instead:
`.claudedocs/implementation/OVERVIEW_UX_IMPROVEMENTS_CONTRACT.md`.

Of 5 investigated items, 2 needed code (removed the "من الكتالوج" widget — an arbitrary catalog
slice with no sales/order relevance; moved Overview to the front of the nav, matching a convention
this codebase's own other tenant-type branch already used) and 3 correctly resolved to **no
change** after real investigation/testing: a customer-count stat (no data available without
inventing a new backend API), a mobile bottom-nav overlay (a real *transient* mid-scroll overlap
existed, but a true max-scroll test confirmed nothing is ever *permanently* hidden — not a bug).
Full regression check (Calendar/Reservations/Staff/Store, both roles, both viewports) clean.
Evidence: `.claudedocs/work/overview-redesign-contract/2026-08-10/evidence.md`. Commits: `6d737d5`,
`aefa5fc`.

Actual time: well under the original 1-2 session redesign estimate — the finding shrank once
verified, same pattern as Phase 1's Orphaned Admin Router Cleanup.

## Phase 3.8 — Dashboard UX Corrections — 🟡 mostly done, one real bug open (2026-08-11/12)

13 real dashboard observations investigated + planned
(`.claudedocs/implementation/DASHBOARD_UX_CORRECTIONS_CONTRACT.md`), approved 2026-08-10, executed
in the plan's own Section E order. Items #4, #9, #10, #3, #7/C all shipped and real-browser
verified (desktop + mobile, evidence per item in
`.claudedocs/work/dashboard-ux-corrections/2026-08-10/`). Commits: `0373c3f` (#4), `73e8107` (#10),
`9577141` (#9), `5c5f381` (#3), `b0d3cea` (#7/C).

Item #2 (Reservations List-vs-Calendar) stays gated — it reverses a documented 2026-08-03 product
decision, needs explicit confirmation before any code (plan's own Section G Q1). Item #1 (Overview
empty-state) never had a reproducible case named, stays unimplemented per the plan's own rule.

**Item #11 (routing/URL fixes) — partially done, commit `08ce853`.** TENANT_ADMIN portion (URL↔tab
sync, canonical Login.jsx redirect, hard-refresh tab preservation) fully verified. A real STAFF
Overview-flash bug (transient 403s against catalog/store endpoints STAFF can't access) was found and
fixed as part of this work. **Left open, not silently shipped:** a real, confirmed, ~50%
intermittent bug where a STAFF user's first nav click after fresh login sometimes never reaches
React's click handler at all — reproduces on both the dev server AND a genuine `vite build` +
`vite preview` production run (ruling out React StrictMode's dev-only double-mount, the leading
hypothesis for several hours of real investigation). Root cause not isolated after 5 independent
real-browser test rounds. Self-resolves on a second click or reload — never permanently stuck. Full
investigation, every excluded alternative and its evidence:
`.claudedocs/work/dashboard-ux-corrections/2026-08-10/item-11-evidence.md`. Carried forward to
Phase 4 below as a named, real, unresolved item.

## Phase 4 — Platform Hardening

- **STAFF nav-click intermittent failure (Phase 3.8)** — real, confirmed, ~50% reproduction rate on
  a STAFF user's first dashboard nav click after fresh login, on both dev and production builds.
  Root cause not isolated (StrictMode ruled out; mobile state, router logic, and session-expiry all
  ruled out too). Needs a real debugging session with deeper tooling (React DevTools Profiler, or a
  non-CDP-driven manual test) before another fix attempt — full writeup:
  `.claudedocs/work/dashboard-ux-corrections/2026-08-10/item-11-evidence.md`.
- **`GET /admin/barbers/` is not role-scoped** — returns the full staff roster (names, phone
  numbers, working hours) to a `STAFF` token, confirmed via direct `curl` with Jaafar's real
  bearer token (`.claudedocs/work/staff-scoped-review/2026-08-10/summary.md`). Low current impact
  on `rk`'s own data (several phone fields null) but a real PII exposure once real staff phone
  numbers are on file — exactly the state RK/Ali reach by 2026-08-31. Matches this project's
  already-named "Least Privilege" principle (`todo_list.md`, 2026-07-30) — possibly its second
  confirming case.
- **Recurring Supabase pooler flakiness** — root-cause it or document a real mitigation (retry
  policy, connection pool tuning) rather than continuing to treat every occurrence as a one-off.
- **Response-serialization pattern (camelCase Prisma vs. snake_case Pydantic `response_model`)** —
  confirmed in `bookings.py`/`properties.py` (different tenant, but same bug class); worth a
  targeted grep across reservation-adjacent routes to confirm it isn't silently present there too
  before calling this line production-hardened.
- ~~Super Admin Dashboard~~ — **deferred past 2026-08-31**, per the scope decision above (not part
  of "best booking web app" for RK/Ali's own users).
- **`POST /api/v1/auth/users/login` is not covered by the availability-reliability fix** — hit a
  real, live `P1001` pooler failure on this exact route while gathering evidence for the Overview
  contract (2026-08-10), self-resolved on retry seconds later (same known transient class, real
  traceback confirmed in the backend log). `with_db_resilience()` (Production Blocker #1) was
  deliberately scoped to the reservation flow's hot paths and `require_service()`/`_verify_tenant()`
  — it never touched `app/api/v1/admin/auth.py`. A real customer/admin failing to even log in during
  a pooler hiccup is at least as bad as the availability-endpoint symptom #1 already fixed. Not
  fixed here (out of the Overview contract's scope) — named as a real follow-up candidate for this
  same wrapper, same pattern, different route.

Estimate: 1-2 sessions.

## Phase 5 — Production Gate

- Full regression Browser Verification pass across all 3 roles (Super Admin / Tenant Owner /
  Staff) on both RK and Ali, back to back — the same discipline already used for every phase this
  session, applied once at the end as a real go/no-go gate, not assumed from individual phase
  verifications alone.
- Explicit Go/No-Go review against the "what production-ready means" definition above, dated
  against the 2026-08-31 target.

Estimate: 1 session.

## Total estimate against the 2026-08-31 target

Phase 1 (done) + Phase 2 (2-3) + Phase 3 (1-2) + Phase 3.5 (Customer done, Admin done, Staff-scoped
pass remaining) + Phase 3.6 (1, new) + Phase 3.7 (1-2, new) + Phase 4 (1-2) + Phase 5 (1) =
**7-12 sessions remaining**. At this project's actual pace this window (near-daily heavy sessions,
15-23 commits/session-day), that comfortably fits inside the remaining days. Next up: Phase 3.5's
Staff-scoped (`Jaafar`) pass, completing the three-sided review (Customer/Admin/Staff) before
sequencing the 🔴/blocker work (availability endpoint, Production Data Hygiene, Overview) by real
impact rather than discovery order.

## Still Open — flag before Phase 2 starts

**`store.py`/`catalog_service.py` dual-write-path** — kept in Phase 2 by default since it was
already scoped there before this deadline was set; this is real architecture work (needs its own
Implementation Contract per this project's rules, not a `safe-refactor`), so it's worth one more
explicit check before committing engineering time to it this month: confirm whether closing it is
truly worth spending part of this tight timeline on, versus deferring past 2026-08-31 alongside
Payments and the Super Admin Dashboard.
