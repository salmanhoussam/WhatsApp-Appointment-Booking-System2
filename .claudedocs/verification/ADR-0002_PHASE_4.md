# ADR-0002 — Verification: Phase 4 — Creation-Flow Unification + Migration Script

Governed by `.claudedocs/implementation/ADR-0002_IMPLEMENTATION_CONTRACT.md` §2/§5/§6. Final code phase of ADR-0002's first slice.

## Files changed
- `app/services/registration_service.py` — `status: "trial"` → `status: "active"` + `lifecycle_state: "trial"`. Trial duration was already 14 days (unchanged) — now documented as the canonical default.
- `app/services/demo_service.py` — `TRIAL_DAYS = 7` → `TRIAL_DAYS = 14` (retires the exact inconsistency ADR-0002 was written to fix). `status: "trial"` → `status: "active"` + `lifecycle_state: "trial"`.
- `scripts/migrate_lifecycle_state.py` (new) — one-time migration implementing ADR-0002 §9.3 exactly: `trial`→`active`/`trial` (grace extension only if already past-due), `demo`→`active`/`evergreen` (with `trial_ends_at=null`), anything else (`active`/`suspended`/stray legacy values) → left untouched, printed for manual review, never guessed. `--dry-run` and `--grace-days` flags.

## 🐛 Real bug caught and fixed before the real migration ran (not after)

The first `--dry-run` surfaced a 16th client row (`tsuspe3bdf4d1`) that shouldn't have existed. Investigation confirmed it was a genuine leftover from an earlier crashed test run in this same session (`ADR-0002_PHASE_2.md`'s original `TestClient`-based script, which failed with a `RuntimeError: ...bound to a different event loop` — the crash happened *mid-request*, after the test tenant and its admin user had already been created but before the script's cleanup code could run, since the crash was an uncaught exception with no `finally` block). That script's later successful rerun (with `httpx.AsyncClient`/`ASGITransport` instead of `TestClient`) created and cleaned up a *different* set of tenants correctly, but never went back for the orphan from the earlier crash — and I didn't check for one at the time, since the printed "16 → 16" summary from that successful rerun looked clean on its own.

**This was caught here, before the real migration touched any data**, via a full-project scan for any `Client` row matching the test-data naming pattern (`name` starting with `test-`, or `slug` starting with the test-script prefixes). Exactly one match — the orphan — confirmed and deleted (along with its orphaned `User` row; it had zero audit rows). Verified: `clients: 16 → 15`, `users: 16 → 15`, restoring the correct baseline. A second scan after deletion confirmed zero remaining stray rows.

## Direct evidence — dry run (before any write)
11 tenants with `status="trial"`, 1 with `status="demo"`, 3 already `status="active"` (`footlab`, `caracas`, `olivello` — flagged for manual review, not guessed, exactly as designed) — **9 of the 11 trial tenants already had a `trial_ends_at` in the past**, confirming the grace-period design was solving a real, non-hypothetical problem: without it, 9 real tenants would have moved straight to Soft Block on migration day with zero warning.

## Direct evidence — real run
Matched the dry run exactly (11 trial / 1 demo / 3 manual-review). Post-migration direct query:

| status | lifecycle_state | count |
|---|---|---|
| active | evergreen | 1 |
| active | trial | 14 |

**15 total — matches.** Spot-checked the two tenants explicitly discussed this session:
- `anas` → `active` / `trial`, `trial_ends_at` still `null` (it had none set before migration, so no grace logic applied — correctly reflects its still-unstarted free trial).
- `smar` → `active` / `evergreen`, `trial_ends_at` cleared — the platform's own flagship tenant now correctly never expires, exactly what the `demo`→`evergreen` mapping is for.

## Idempotency confirmed with a real second run
Re-ran the script (not a dry run) immediately after the first: **0 trial-migrated, 0 demo-migrated, 0 new grace extensions** — all 15 rows now correctly fall into "needs manual review" (their `status` is already `active`, so neither migration branch matches anymore). Directly confirmed `roz`'s `trial_ends_at` is byte-identical to the *first* run's grace-extension timestamp (`2026-07-23T20:15:49.056...`), not a new one — proves the grace period was not double-applied. Total client count unchanged (15 → 15).

## `app.main` import check
121 paths (unchanged from Phase 3), same pre-existing non-fatal `/health` warning, no new errors.

## Remaining manual-review items (by design, not a gap)
`footlab`, `caracas`, and `olivello` are real, already-onboarded businesses (`status="active"`) whose `lifecycle_state` currently sits at the schema default (`"trial"`) — which is very likely wrong for at least some of them. Per the Implementation Contract §5, this script deliberately does not guess their correct value; a human (Super Admin) needs to set each one explicitly via the new `PATCH /clients/{id}/lifecycle` endpoint (Phase 3).

## Manual follow-up needed (not automated in this slice)
9 tenants (`roz`, `magic-test`, `test-fashion`, `sneakers-beirut`, `cafe`, `test-catalog-fix`, `tastybites`, `sneakers-lb`, `assi`) had already-expired trials and received a 5-day grace extension. Per ADR-0002 §9.3, they should be notified of this — no notification channel is wired up in this slice (that's Phase 3 of `TENANT_LIFECYCLE_PLAN.md`, not built yet); this is a manual action item, not a bug.

---

## ADR-0002 First Slice — Complete

All items from the Implementation Contract are implemented and verified: `lifecycle_state` schema field (Phase 1), Hard Block/Soft Block split in `tenant.py` with a live allowlist consumer (Phases 2–3), the `super/clients.py` PATCH split (Phase 3), and creation-flow unification plus the one-time migration (Phase 4, this document). Ready for a Post-Implementation Review before archiving, per `.claude/rules/documentation-policy.md`.
