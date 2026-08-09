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

## Phase 1 — Security Closure (BLOCKING — do this first, nothing below matters if this is open)

- **Close `customers.py`/`prices.py`/`booking_services.py`'s missing auth.** Confirmed twice now:
  zero tenant resolution, zero role check. Anyone who knows a `client_id` can read/write them
  today. This is the one item on this whole roadmap that is a real security incident waiting to
  happen, not a quality issue.
- **Decide the fate of the dead admin CRUD scaffolding** (`customers.py`, `prices.py`,
  `booking_services.py`, `listings.py`, none registered in `admin/__init__.py`) — for each file:
  finish wiring it with real auth, or delete it. Do not leave an unauthenticated file sitting
  unregistered and call that "safe" — an unregistered route is one router-mount away from becoming
  live.
- **Re-confirm `settings.py`'s deliberate exclusion from the router-level auth floor** still holds
  (it's a documented exception for the Soft-Block allowlist ordering, not an oversight) — a
  20-minute check, not new work.

Estimate: 1 session (mostly decision + wiring, code footprint is small).

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
- **Customer-facing booking flow** — service selection, staff picker, calendar/slot picking,
  confirmation (WhatsApp), mobile experience specifically (most real bookings will be on phones).
- **Admin dashboard** — Calendar (Today/Week), Reservations List, Staff, Store, Orders — the
  dashboard redesign shipped this week, so this is the first real chance to evaluate it as a
  finished product rather than a work-in-progress.
- **Staff-scoped experience** (Jaafar's real account) — the newest surface, least product-reviewed
  so far.

Every screen gets exactly one verdict — Keep as-is / Improve / Redesign — per this project's own
UX review vocabulary. Anything landing on Redesign this late risks the deadline; flag those
immediately rather than discovering them in Phase 5.

Estimate: 1 session for the review itself, 1-3 sessions to act on what it finds (depends entirely
on what the review surfaces — unknown until run).

## Phase 4 — Platform Hardening

- **Recurring Supabase pooler flakiness** — root-cause it or document a real mitigation (retry
  policy, connection pool tuning) rather than continuing to treat every occurrence as a one-off.
- **Response-serialization pattern (camelCase Prisma vs. snake_case Pydantic `response_model`)** —
  confirmed in `bookings.py`/`properties.py` (different tenant, but same bug class); worth a
  targeted grep across reservation-adjacent routes to confirm it isn't silently present there too
  before calling this line production-hardened.
- ~~Super Admin Dashboard~~ — **deferred past 2026-08-31**, per the scope decision above (not part
  of "best booking web app" for RK/Ali's own users).

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

Phase 1 (1) + Phase 2 (2-3) + Phase 3 (1-2) + Phase 3.5 (2-4) + Phase 4 (1-2) + Phase 5 (1) =
**8-13 sessions**. At this project's actual pace this window (near-daily heavy sessions,
15-23 commits/session-day), that fits inside the 22 remaining days — but Phase 3.5 is the real
wildcard, since its second half depends on what the Product Review actually finds. Recommend
running Phase 1 + Phase 3.5's review in the very next session or two, in parallel — security first,
and an early read on the UX bar so any "Redesign" verdict has runway instead of surfacing days
before the deadline.

## Still Open — flag before Phase 2 starts

**`store.py`/`catalog_service.py` dual-write-path** — kept in Phase 2 by default since it was
already scoped there before this deadline was set; this is real architecture work (needs its own
Implementation Contract per this project's rules, not a `safe-refactor`), so it's worth one more
explicit check before committing engineering time to it this month: confirm whether closing it is
truly worth spending part of this tight timeline on, versus deferring past 2026-08-31 alongside
Payments and the Super Admin Dashboard.
