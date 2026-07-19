# ADR-0002 (Contract 02) — Post-Implementation Review

Read-only review against `.claudedocs/implementation/ADR-0002_IMPLEMENTATION_CONTRACT_02.md`, focused per the user's explicit request on: (1) final confirmation the `PATCH /lifecycle` dual-write gap is closed, (2) confirmation everything Out-of-Scope stayed untouched, (3) proof `app/core/tenant.py` isolation held throughout.

## 1. §8 Required Tests — Compliance Table

| # | Contract requirement | Status before this review | Status after this review |
|---|---|---|---|
| 1 | Unit: `subscription_service` updates `Client.lifecycle_state` on `Subscription` status change | ✅ `ADR-0002_CONTRACT02_PHASE_2.md` Tests A/D | ✅ unchanged |
| 2 | Integration: `PATCH /subscription` creates/updates + cache reflects immediately | ⚠️ **GAP** — Phase 3 only proved cache-*miss* correctness (the tenant was never cached before the PATCH in that test), not cache-*hit* | ✅ **CLOSED THIS REVIEW** — see §2 below |
| 3 | Integration: `PATCH /lifecycle` provably routed through the single write path | ✅ `ADR-0002_CONTRACT02_PHASE_3.md` Test B (same `Subscription.id` updated, not a new row) | ✅ unchanged |
| 4 | Regression: full Hard/Soft Block matrix re-run against the new code path | ⚠️ **GAP** — Phase 3 only re-tested `suspended` (Hard Block) and `expired` (Soft Block); the original five non-blocked states (`paid`/`grace_period`/`cancelled`/`archived`/`evergreen`) were never re-run with a real `Subscription` row now present | ✅ **CLOSED THIS REVIEW** — see §2 below |
| 5 | Migration: precondition satisfied + idempotency proven | ✅ `ADR-0002_CONTRACT02_PHASE_4.md` — precondition satisfied via a disclosed substitution, idempotency proven with a real second run | ✅ unchanged |

## 2. Gaps closed during this review (real evidence, not re-assertion)

**Cache-hit correctness through the real endpoints:** a tenant's cache was warmed with an ordinary successful request first (confirmed present in `_tenant_cache` afterward), *then* `PATCH /clients/{id}/lifecycle` was called via the real endpoint, and the very next request — still within the 5-minute cache TTL, hitting the *same* cache entry rather than triggering a fresh DB fetch — correctly returned `403`. This is the first real proof that `invalidate_tenant_cache()` fires through the new `subscription_service` write path specifically, not just that a cold/fresh lookup happens to read the updated value.

**Full regression matrix, re-run against the new reality:** all five previously-verified non-blocked lifecycle states (`paid`, `grace_period`, `cancelled`, `archived`, `evergreen`) were re-tested — this time with each tenant given a **real `Subscription` row** via the actual `PATCH /subscription` endpoint (not just a bare `Client.lifecycle_state` value as in the original Contract 01 tests). All five returned `200`, confirming that the presence of a live `Subscription` row alongside `Client.lifecycle_state` does not change `tenant.py`'s enforcement behavior in any way.

Both closing tests: full cleanup confirmed (`clients: 15 → 15`, `subscriptions: 15 → 15`, matching the Phase 4 baseline exactly).

## 3. Dual-write elimination — final confirmation, with an honest caveat

**Confirmed via a fresh `grep`, not recollection:** no route or service that is actually called by any live code path writes `Client.lifecycle_state` outside `app/services/subscription_service.py`'s `_sync_client_lifecycle_state()`. `PATCH /clients/{id}/lifecycle` and `PATCH /clients/{id}/subscription` both funnel through it — proven functionally in Phase 3 and again in §2 above.

**Caveat, disclosed rather than glossed over:** `app/repositories/super_repo.py`'s `update_client_lifecycle_state()` method — the repository function `super_service.update_client_lifecycle_state()` (now docstring-flagged as superseded, per Phase 3's explicit scope decision not to delete it) calls — **still physically exists and still writes `Client.lifecycle_state` directly if invoked.** The dual-write risk is closed in the sense that *nothing currently calls it*, but not in the sense that *it is impossible to call it again*. A future developer who doesn't read the docstring could reintroduce the exact risk this contract was built to eliminate. This was an explicit, deliberate scope decision in Phase 3 ("out of this phase's explicit scope to remove"), not an oversight — but it means "closed" should be understood as "closed in current behavior," not "structurally impossible to reopen." Recommend a small, separate follow-up to actually delete `SuperRepository.update_client_lifecycle_state()` and `super_service.update_client_lifecycle_state()` now that nothing references them.

## 4. Out-of-Scope confirmation

Checked via `git diff` across the full Contract 02 commit range for any mention of payment, invoice, billing, upgrade, downgrade, renewal, or cancellation logic being introduced: **none found.** The three files named as untouched in Contract 01 (`app/services/whatsapp_flow.py`, `app/api/v1/webhooks/samsara.py`, `app/api/v1/ai_settings_agent.py`) show an empty diff across the entire Contract 02 range — confirmed, not assumed. The full file list touched by Contract 02 is exactly the 12 files scoped: schema, two repositories, one service, one route file, one flagged-superseded service function, four verification docs, two migration scripts.

## 5. `app/core/tenant.py` isolation

`git diff` of `app/core/tenant.py` across the entire Contract 02 range (from the Contract's commit through the final Phase 4 commit) is **empty** — zero bytes changed. Every enforcement behavior exercised in this contract's tests (Hard Block, Soft Block, cache correctness) is the first ADR-0002 slice's code, completely unmodified, correctly handling a domain (`Plan`/`Subscription`) it has no awareness of.

## 6. New finding, not previously surfaced: new tenants get no `Subscription` at creation

`app/services/registration_service.py:122` and `app/services/demo_service.py:268` (both from the *first* ADR-0002 slice, untouched by Contract 02) write `Client.lifecycle_state = "trial"` directly on tenant creation — outside `subscription_service`, and **with no corresponding `Subscription` row created**. This means every tenant that registers *from now on* has `Client.lifecycle_state` set correctly, but zero `Subscription` history, until a Super Admin manually calls `PATCH /subscription` for them. This was never in Contract 02's scope (the Files table never mentioned these two files), so it isn't a broken promise — but it is a real, practical gap worth naming: `Subscription` is not yet actually "the source of truth" for new tenants in practice, only for tenants that have had a Plan explicitly assigned. Recommended as a small, separate follow-up (wiring `assign_plan` into both onboarding paths) rather than something silently left undiscovered.

## Final Recommendation

**Ready to Archive**, with two items carried forward explicitly rather than silently dropped: (1) `SuperRepository.update_client_lifecycle_state()`'s residual dual-write capability — dead but not deleted — recommended for a small cleanup follow-up, and (2) new tenant registration not yet creating a `Subscription` automatically — recommended as a small follow-up to wire `assign_plan` into `registration_service.py`/`demo_service.py`. Neither blocks archiving this contract; both are named so they don't disappear.
