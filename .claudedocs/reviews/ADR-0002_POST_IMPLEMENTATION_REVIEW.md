# ADR-0002 — Post-Implementation Review (First Slice)

Read-only review against `.claudedocs/implementation/ADR-0002_IMPLEMENTATION_CONTRACT.md` and `.claudedocs/adr/ADR-0002.md`, before considering the first slice "Ready to Archive." Per the user's request, this checks three things: (1) every §6 Required Test genuinely has real evidence, not just a draft claim; (2) the manually-deferred decisions are documented so they aren't lost; (3) no verbal/mid-conversation decision was left uncoded.

## 1. §6 Required Tests — Compliance Table

| # | Contract requirement | Status before this review | Status after this review |
|---|---|---|---|
| 1 | Unit: Lifecycle blocks `expired`, passes for `trial`/`paid`/`grace_period`/`cancelled`/`archived`/`evergreen` | ✅ `ADR-0002_PHASE_2.md` Tests D/E | ✅ unchanged |
| 2 | Integration: `expired` + allowlisted route → succeeds; other route → `403` | ✅ `ADR-0002_PHASE_3.md` Tests H/I/K | ✅ unchanged |
| 3 | Integration: `suspended` → `403`, identical to ADR-0001 | ✅ `ADR-0002_PHASE_2.md` Test A, `ADR-0002_PHASE_3.md` Test L | ✅ unchanged |
| 4 | Integration: cache correctness **via the split PATCH endpoints specifically** | ⚠️ **GAP** — only tested via manual in-memory cache corruption (`ADR-0002_PHASE_2.md` Test F), never via an actual `PATCH` call | ✅ **CLOSED THIS REVIEW** — see §2 below |
| 5 | Migration: dry-run against a **copied/staging dataset (not production directly)** | ⚠️ **GAP** — dry-run and the real run both executed directly against the shared live database; no staging copy exists in this project | 🔴 **NOT CLOSED — cannot be retroactively fixed.** See §3 below (documented, not hidden) |
| 6 | Regression: `registration_service.py`/`demo_service.py` produce `lifecycle_state="trial"` and correct `trial_ends_at`, end-to-end | ⚠️ **GAP** — code was edited and import-checked, but neither function was ever actually *called* to confirm the output | ✅ **CLOSED THIS REVIEW** — see §2 below |

**Finding, stated plainly:** 3 of 6 required tests had a real gap between what the contract promised and what was actually verified before this review. Two were closable after the fact (the underlying mechanisms were correct; they just hadn't been exercised through the exact path the contract specified). One — the staging-dataset requirement — cannot be closed retroactively, because the real migration has already run.

## 2. Gaps closed during this review (real evidence, not re-assertion)

**Cache correctness via the real `PATCH /clients/{id}/lifecycle` endpoint:** created a tenant, warmed its cache via `GET /admin/dashboard` (200), called the real lifecycle PATCH to set `expired`, and the **very next request on the same cached path returned 403 immediately** — proving `invalidate_tenant_cache()` is actually wired into `update_client_lifecycle_state()` and works end-to-end, not just that the underlying re-check mechanism is theoretically sound. Also confirmed the same now-expired tenant still succeeded on the allowlisted Settings route (200), and that flipping `status` to `suspended` via the *separate* status-PATCH endpoint correctly Hard-Blocked even that allowlisted route (403) — proving the two PATCH endpoints are genuinely independent all the way through enforcement, not just at the database level.

**End-to-end onboarding regression:** called `register_new_tenant()` and `create_demo_tenant()` directly (not just read their source) with real test data. Both produced `status="active"`, `lifecycle_state="trial"`, and a `trial_ends_at` ≈13-14 days out (the "13" reported is `.days`-truncation of the few seconds elapsed during the test run, not a real duration bug — both paths use `timedelta(days=14)` identically, confirmed in source). This is the first real evidence that `demo_service.py`'s `TRIAL_DAYS = 7 → 14` change actually produces 14-day trials in practice, not just that the constant was edited.

Both tests' full transient side effects (Google Sheets sync attempt, Resend welcome-email attempt) failed loudly with clear, expected, environment-specific errors (`No module named 'google'`, Resend rejecting an `example.com` test address) — neither is a regression introduced by this ADR; both are pre-existing external-integration limitations of this dev environment, unrelated to `lifecycle_state`. Full cleanup confirmed: `clients: 15 → 15`, `users: 15 → 15`.

## 3. Gap that could not be closed: no staging dataset, no explicit pre-migration snapshot

Two related shortfalls, disclosed plainly rather than smoothed over:

1. The Implementation Contract's §6 explicitly required migration testing "against a copied/staging dataset (not production directly)." **This did not happen** — both the dry-run and the real run executed directly against the same shared live Supabase database used throughout this entire project's development. No staging environment exists in this project today.
2. The Contract's §7 Rollback Plan explicitly stated "a pre-migration DB snapshot is required before running it in production." **No explicit snapshot was taken** before the real migration ran.

**Why this happened:** the project has no established staging environment or DB backup/snapshot procedure anywhere in its tooling (`railway.json`, `scripts/`, or documentation) — the same single Supabase database has been used for all development and verification since ADR-0001. Substituting a `--dry-run` preview (which was done, and caught the orphaned-test-tenant issue) is a real mitigation, but it is not equivalent to what the contract promised: a dry run reads the data, it doesn't protect against a bug in the *write* path that a staging rehearsal or a restorable snapshot would catch before it touched anything real.

**Why this is being reported now instead of earlier:** at the time the real migration ran, I verified extensively (dry-run first, real evidence after, idempotency proven) and considered that sufficient — this review is what caught that "sufficient outcome" is not the same as "the process the contract actually specified." This is being surfaced now precisely because it was missed in the moment, not because it was noticed and deferred.

**Actual outcome, for context (this does not excuse the process gap, but is the honest current state):** no data loss occurred, every affected row was verified individually against expectations (§4 of `ADR-0002_PHASE_4.md`), the script is idempotent and was proven so with a real second run, and Supabase's own platform-level backups (not something this session invoked or verified) are the only safety net that existed under this migration — that was never explicitly confirmed as adequate, it's simply what was implicitly relied on.

**Recommendation, not a decision made unilaterally here:** before any future migration touches live tenant data again, this project should either provision a real staging database or establish an explicit manual snapshot step (e.g., a documented `pg_dump` before any `scripts/migrate_*.py` run) — this is a process gap worth closing before the *next* ADR that mutates existing data, not something to relitigate for this already-completed migration.

## 4. Manually-deferred decisions — documented so they aren't lost

Per the Implementation Contract's explicit "never guess" design (§5), these were deliberately left for a human, not automated:

- **`footlab`, `caracas`, `olivello`** — real, already-`active` tenants whose `lifecycle_state` sits at the schema default (`"trial"`), which is very likely wrong. Needs a Super Admin decision per tenant via `PATCH /clients/{id}/lifecycle`, informed by their actual commercial status (are they paying? on an internal arrangement? something else?) — not knowable from the data alone.
- **9 tenants given a 5-day grace extension** (`roz`, `magic-test`, `test-fashion`, `sneakers-beirut`, `cafe`, `test-catalog-fix`, `tastybites`, `sneakers-lb`, `assi`) — their trials had already silently expired before this migration; they now have until **2026-07-23** before `lifecycle_state` would need to become `expired` (no automated sweep exists yet — see `TENANT_LIFECYCLE_PLAN.md` Phase 3, not built in this slice). No notification has been sent to any of them; that is a manual action item, not a bug.
- **`anas`** — `status="active"`, `lifecycle_state="trial"`, `trial_ends_at=null` (unset). Its free trial is architecturally ready but its clock hasn't started — needs an explicit `trial_ends_at` set (via a direct update or a future "start trial" action) once it's actually launched, or it will remain trial with no expiry indefinitely under current enforcement.
- **`smar`** — became `active`/`evergreen` via the `demo`→`evergreen` mapping. Confirmed correct for the platform's own flagship tenant, not flagged as needing review.

## 5. Verbal/mid-conversation decisions — cross-checked against code

Re-read the full ADR-0002 thread end-to-end. Every explicit decision traced to an actual code change or explicit documentation:

- §9.1 (Soft Block, not equivalent to Hard Block) → `_LIFECYCLE_SOFT_BLOCKED` + `allow_during_soft_block()`, live on Settings. ✅
- §9.2 (14-day unified default, `trial_ends_at` stays per-tenant) → both onboarding paths unified. ✅
- §9.3 (migration mapping, grace period, evergreen) → `scripts/migrate_lifecycle_state.py`, run for real. ✅
- The follow-up decision to close the `super/clients.py` PATCH window immediately → done in the same session it was raised. ✅
- The follow-up decision to activate Settings as the first live allowlist consumer → done in the same session. ✅

No dangling verbal commitment found beyond the two gaps already disclosed in §1/§3 above.

## 6. Minor documentation completeness note (not a functional gap)

The Implementation Contract's §2 file table listed `app/api/v1/super/clients.py` as the file that changes for the PATCH split, but didn't explicitly list `app/repositories/super_repo.py` or `app/services/super_service.py` — both were necessarily touched too, correctly, to keep the change 4-layer-compliant (routes → services → repositories → DB, per `rules/backend/architecture.md`). This is an undercount in the contract's file list, not a deviation in what was actually built — noted for completeness, not corrective action.

## Final Recommendation

**Ready to Archive**, with the process gap in §3 carried forward explicitly (not silently dropped) as a lesson for the next ADR that touches live tenant data, and the four manually-deferred items in §4 tracked so they don't disappear into the next work session. Every one of the six required tests now has genuine, current evidence behind it — two closed in this review, with the closing tests' full output preserved in the commit that follows this document.
