# Implementation Contract — ADR-0002 Second Slice (Subscription & Plan Domain)

**Status: Completed and Archived (2026-07-19).** All 4 phases implemented and verified (`.claudedocs/verification/ADR-0002_CONTRACT02_PHASE_1.md` through `_PHASE_4.md`); Post-Implementation Review complete and recommends Ready to Archive (`.claudedocs/reviews/ADR-0002_CONTRACT02_POST_IMPLEMENTATION_REVIEW.md`). Two follow-ups named there, tracked as Tech Debt in `.claudedocs/todo_list.md`, not blocking this archival: removing `SuperRepository.update_client_lifecycle_state()`'s residual dual-write capability, and wiring `assign_plan()` into `registration_service.py`/`demo_service.py` at tenant creation.

Governs implementation against `.claudedocs/adr/ADR-0002.md` §11 (Subscription & Plan Domain design) and §12 (confirms Subscription Operations automation is a separate future slice, not part of this contract). Any change during coding gets measured against **this document**, not developer judgment in the moment.

## 1. Scope

**In scope:** `Plan` table, `Subscription` table, `subscription_service` as the single write path to `Client.lifecycle_state`, a Super Admin manual Plan-assignment endpoint, and a one-time migration.

**Explicitly out of scope:** Payment/Invoice/Billing (`TENANT_LIFECYCLE_PLAN.md` Phase 5, pending a payment-provider decision). Usage tracking. Self-service plan-change UI. Add-ons' relationship to `Plan` (ADR-0002 §11.0b, still open). Enterprise/custom pricing. Multi-subscription per client. Organization/Account layer (ADR-0002 §11.0a — `Subscription.clientId → Client` only). **Subscription Operations** — plan upgrade/downgrade, renewal, cancellation, and lifecycle-transition automation (ADR-0002 §12's separate next slice; not touched here even partially). A separate `PricingVersion`/`PriceBook` entity (§11.0b's Product-vs-Price question stays open — `Plan.monthly_price` remains a provisional field, not a resolution of it).

## 2. Files That Will Change

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `Plan` model + `Subscription` model. No new scalar column on `Client` — only a new `subscriptions Subscription[]` relation. |
| `app/repositories/plan_repo.py` (new) | Prisma queries for `Plan` only. |
| `app/repositories/subscription_repo.py` (new) | Prisma queries for `Subscription` only. |
| `app/services/subscription_service.py` (new) | The single write path (Decision 9.1): assigning/changing a `Client`'s `Plan` creates/updates its `Subscription` and updates `Client.lifecycle_state` as a cached mirror (Option A, ADR-0002 §11.2). |
| `app/api/v1/super/clients.py` | New `PATCH /clients/{client_id}/subscription` endpoint (assign/change `Plan`). Existing `PATCH /clients/{client_id}/lifecycle` (built in the first slice) is **re-routed internally** to call `subscription_service` instead of writing `Client.lifecycle_state` directly — exactly one write path regardless of entry point (resolves Decision 9.1). |
| `scripts/seed_plans.py` (new) | One-time: seed `Plan` rows for `regular`/`pro`/`ultra`. |
| `scripts/migrate_subscriptions.py` (new) | One-time: backfill one `Subscription` row per existing `Client` from their current `tier`/`lifecycle_state`. |

## 3. Schema

- **`Plan`**: `id, key (unique), name_ar, name_en, monthly_price, currency, createdAt, updatedAt`. `monthly_price` is **provisional** — not a resolution of §11.0b's Product-vs-Price question.
- **`Subscription`**: `id, clientId (FK → Client), planId (FK → Plan), startedAt, endedAt (nullable), status, createdAt, updatedAt`.
- **`Client`**: no new scalar field. Gains a `subscriptions Subscription[]` back-relation. `Client.tier` is unchanged as a column (Decision 9.4 — comment-only deprecation, not enforced).

## 4. What Will NOT Change

- `app/core/tenant.py` — zero touch. Every Hard/Soft Block mechanism keeps reading `Client.lifecycle_state` exactly as it does today; only *who writes* that field changes.
- `Client.status`, `Client.trial_ends_at` — untouched.
- No `Payment`/`Invoice`/`Billing` model.
- No Subscription Operations automation (upgrade/downgrade/renewal/cancellation) — that is ADR-0002 §12, a distinct future contract, not built here even partially.
- `Client.tier` — not removed, not renamed, not enforced read-only at the DB or application layer. Marked deprecated in a code comment only (Decision 9.4).

## 5. Migration Strategy — ⚠️ Mandatory Precondition (closes a real gap from the first slice)

**Before `scripts/migrate_subscriptions.py` runs for real against the live database, one of the following is REQUIRED — not optional, and not satisfied by `--dry-run` alone:**

(a) a rehearsal against a staging copy of the database, **or**
(b) an explicit pre-migration snapshot (e.g. `pg_dump`, or a confirmed-adequate Supabase point-in-time-recovery window) taken immediately before the run.

This directly closes the gap the first slice's Post-Implementation Review found and could not close retroactively (`.claudedocs/reviews/ADR-0002_POST_IMPLEMENTATION_REVIEW.md` §3; see the persistent-memory lesson `feedback-migration-staging-discipline`). A `--dry-run` preview proves the *read* side is correct; it says nothing about the *write* path. **Phase 4's own verification document must record which of (a) or (b) was actually done — not assume or imply it happened.**

Migration steps, once the precondition above is satisfied:
1. `scripts/seed_plans.py` — create `Plan` rows for `regular` (`monthly_price=15`), `pro` (`22`), `ultra` (`35`) — values already documented in `prisma/schema.prisma:39`, not a new pricing decision (Decision 9.2).
2. `scripts/migrate_subscriptions.py` — for every existing `Client`: create one `Subscription` row with `planId` matching their current `tier`, `startedAt = Client.createdAt`, `status` mirrored from their current `Client.lifecycle_state` at migration time, `endedAt = null`.
3. **Explicit, permanent caveat — belongs in this document, not just a commit message (Decision 9.3):** `Subscription.startedAt` values produced by this migration are a best-effort proxy using `Client.createdAt`, not a true historical subscription-start record. No better data source exists anywhere in the system today. Any future reporting or analytics built on `startedAt` for pre-migration tenants must account for this explicitly.
4. **Idempotent** — same discipline as `scripts/migrate_lifecycle_state.py`: re-running must not create a duplicate `Subscription` for a `Client` that already has one (check for an existing row with `endedAt IS NULL` before inserting).

## 6. Compatibility with ADR-0001

- `tenant.py`'s enforcement is unaffected — `Client.lifecycle_state` keeps being read exactly as today, by the exact same functions verified in the first slice.
- `Client.lifecycle_state`'s write path changes from "two independent, potentially-drifting writers" (today: only the manual `PATCH /lifecycle` endpoint) to "one writer, reachable from two entry points" (both `PATCH /lifecycle` and the new `PATCH /subscription` end inside `subscription_service`) — this is the concrete resolution of Decision 9.1 and directly eliminates the dual-write drift risk named in ADR-0002 §11's risk analysis.

## 7. Implementation Phases

- **Phase 1** — Schema: `Plan` + `Subscription` tables only. Zero behavior change; nothing reads or writes them yet.
- **Phase 2** — `plan_repo.py`, `subscription_repo.py`, `subscription_service.py`. Service/repository layer only, unit-testable in isolation, no route yet.
- **Phase 3** — `PATCH /clients/{id}/subscription` (new) + re-route `PATCH /clients/{id}/lifecycle` through `subscription_service`.
- **Phase 4** — Migration, gated by §5's mandatory precondition: seed `Plan` rows, backfill `Subscription` rows.

## 8. Required Tests

- Unit: `subscription_service` correctly updates `Client.lifecycle_state` whenever a `Subscription`'s status changes.
- Integration: `PATCH /clients/{id}/subscription` creates/updates a `Subscription`, and `Client.lifecycle_state` reflects it on the very next request — same cache-correctness rigor already proven in `ADR-0002_PHASE_2.md`/`ADR-0002_PHASE_3.md`.
- Integration: `PATCH /clients/{id}/lifecycle` (the old endpoint) still works, and is provably routed through the same single write path — confirmed both by a functional test and a `grep`-level check that no code outside `subscription_service` writes `Client.lifecycle_state` directly.
- Regression: the full Hard/Soft Block test matrix from the first slice re-run unchanged (`suspended`/`expired`/`trial`/`paid`/`grace_period`/`cancelled`/`archived`/`evergreen` all behave identically to `ADR-0002_PHASE_2.md`/`ADR-0002_PHASE_3.md`).
- Migration: dry-run, the §5 staging/snapshot precondition actually satisfied and recorded, and idempotency proven with a real second run (no duplicate `Subscription` rows).

## 9. Rollback Plan

Phases 1–3 are purely additive (new tables, new service, new endpoint) and independently revertible, same pattern as every prior phase in this ADR. Phase 4's rollback plan **is** §5's precondition — restoring from the staging validation or the pre-migration snapshot, not "hope it worked," which is exactly what the first slice's migration lacked.

## 10. Non-Goals (explicit, matching ADR-0002 §11.0b / §12)

This contract does not build: `Payment`/`Invoice`/`Billing`, Usage tracking, a self-service plan-change UI, Subscription Operations (upgrade/downgrade/renewal/cancellation automation — §12), a `PricingVersion`/`PriceBook` entity, an Add-ons-to-`Plan` relationship, an Organization/Account ownership layer, or multi-subscription support per `Client`.
