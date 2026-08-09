# Reservation System — Roadmap to Production

Created 2026-08-09, in response to Salman's request for a deadline before this project (the
Reservation/Booking system — RK Barber Shop as reference tenant, plus the shared capabilities it
runs on) is called production-ready. Built from the Open Risks in
`.claudedocs/reviews/WEEKLY_REVIEW_2026-07-27_to_2026-08-09.md` plus relevant items already logged
in `.claudedocs/todo_list.md`.

**This file states phases, sequencing, and effort in sessions — not a calendar date.** A calendar
deadline requires knowing the real target (RK alone going live vs. RK+Ali both live, and whether
there's an external commitment driving it) — that's Salman's decision, not something to invent
here. Once he picks a target, this file's phase estimates convert directly into a date.

## What "production-ready" means here (proposed definition, not yet ratified)

A tenant on this system can be handed to a real paying merchant and their staff, with real
customers booking real appointments and buying real products, without:
- an unauthenticated route existing anywhere in its request path,
- data-correctness bugs in money/pricing fields,
- an admin action silently doing nothing (e.g., no way to change an order's status),
- a second, independent rollout (Ali) requiring new code instead of new configuration.

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
- **Payments decision.** Cash-only today by a real 2026-07-20 decision (ADR-0004 names the gap).
  Decide explicitly: is cash-only acceptable for the production launch, or does a payment gateway
  integration need to land first? This changes Phase 3's size significantly either way — needs
  Salman's call before estimating further.
- **Ali's real onboarding**, now unblocked (Services/Orders confirmed ready per this week's work).
  This is the actual proof that "production-ready" means repeatable-by-configuration, not just
  "RK works." A second tenant going live for real is the strongest evidence this roadmap can
  produce.

Estimate: 2-4 sessions depending on the Payments decision; Ali onboarding itself is ~1 session of
real configuration work (no new code expected, per the RK/Ali shared-system decision).

## Phase 4 — Platform Hardening

- **Recurring Supabase pooler flakiness** — root-cause it or document a real mitigation (retry
  policy, connection pool tuning) rather than continuing to treat every occurrence as a one-off.
- **Response-serialization pattern (camelCase Prisma vs. snake_case Pydantic `response_model`)** —
  confirmed in `bookings.py`/`properties.py` (different tenant, but same bug class); worth a
  targeted grep across reservation-adjacent routes to confirm it isn't silently present there too
  before calling this line production-hardened.
- **Super Admin Dashboard** — needed if Salman is the one managing tenant lifecycle/billing at
  production scale; currently has a design but no build, explicitly queued behind template work.
  Only include in this roadmap if RK/Ali going live is meant to happen without it — otherwise it's
  a real blocking dependency, not a nice-to-have.

Estimate: 1-2 sessions for the audit items; Super Admin Dashboard is its own multi-session build if
it turns out to be blocking (needs a scope decision first).

## Phase 5 — Production Gate

- Full regression Browser Verification pass across all 3 roles (Super Admin / Tenant Owner /
  Staff) on both RK and Ali, back to back — the same discipline already used for every phase this
  session, applied once at the end as a real go/no-go gate, not assumed from individual phase
  verifications alone.
- Explicit Go/No-Go review against the "what production-ready means" definition above.

Estimate: 1 session.

## Total estimate

7-11 sessions across the 5 phases, heavily dependent on two decisions only Salman can make: the
Payments scope (Phase 3) and whether Super Admin Dashboard is blocking (Phase 4). At this project's
recent real pace (~15-20 commits/session-day this window), that's roughly 2-3 more weeks of the
same cadence — a proposal to react to, not a commitment made on his behalf.

## Decisions Required From Salman

1. **Target date and scope** — RK alone, or RK+Ali, by what real date (external commitment, or an
   internal target I should propose from the estimate above)?
2. **Payments** — cash-only acceptable for launch, or blocking?
3. **Super Admin Dashboard** — blocking for this launch, or deferred past it?
4. **`store.py`/`catalog_service.py` dual-write-path** — approve opening a real Implementation
   Contract for Phase 2, or defer past this production push?
