# ADR-0002 (Contract 02) — Verification: Phase 4 — Seeding + Migration

Governed by `.claudedocs/implementation/ADR-0002_IMPLEMENTATION_CONTRACT_02.md` §5/§7 (Phase 4). Final phase of the second slice's Implementation Contract.

## ⚠️ Mandatory precondition (§5) — how it was actually satisfied, disclosed honestly

The Contract required a staging rehearsal **or** an explicit pre-migration snapshot before any real execution — not satisfied by `--dry-run` alone. Neither option was available in its literal, originally-assumed form in this sandboxed environment:

- **No `pg_dump`/`psql` binary exists**, and installing `postgresql-client` via `apt` requires a `sudo` password not available here.
- **No staging environment exists or could be provisioned** — that requires a separate Supabase project, which needs the user's account access, not something achievable from this session.

**What was actually done instead:** installed `psycopg2` via `pip` (no `sudo` required), connected to `DIRECT_URL` in a **read-only session** (`conn.set_session(readonly=True)` — the snapshot process itself is structurally incapable of writing), and produced a real, restorable SQL dump of every row this migration reads or could affect: the full `clients` table (all rows, all columns) plus the confirmed pre-migration state of `plans`/`subscriptions`.

- Snapshot file: `pre_migration_snapshot_20260719T104729Z.sql` (24 lines of header/comments + 15 real `INSERT INTO clients (...) VALUES (...)` statements, one per existing tenant, 28,763 bytes) + a manifest JSON recording row counts per table at snapshot time (`clients: 15, plans: 0, subscriptions: 0`).
- Stored in the session scratchpad directory, **not committed to the repository** — the file contains real tenant PII (phone numbers, emails) and does not belong in git history.
- This is disclosed here explicitly as a **substitution**, not presented as literally satisfying "run `pg_dump`" — the underlying safety goal (a restorable record of pre-migration state, taken via a connection that cannot write) is met; the specific tool named in casual conversation was not available and was not silently swapped in without saying so.

## Scripts added

- `scripts/seed_plans.py` — seeds `Plan` with `regular=$15`, `pro=$22`, `ultra=$35` (from `prisma/schema.prisma:39`, per Decision 9.2 — not new pricing). Idempotent via upsert-by-`key`.
- `scripts/migrate_subscriptions.py` — for every `Client`, creates one `Subscription` linked to the `Plan` matching their `tier`, `startedAt = Client.createdAt` (Decision 9.3, explicit proxy caveat), `status` mirrored from `Client.lifecycle_state`. Never writes `Client` itself. Idempotent — skips any `Client` that already has an active (`endedAt IS NULL`) `Subscription`.

## Direct evidence

**Dry-run first (both scripts), then real execution:**
- `seed_plans.py --dry-run` → 3 would-create, 0 would-update.
- `seed_plans.py` (real) → 3 created (`regular`, `pro`, `ultra`).
- `migrate_subscriptions.py --dry-run` → previewed all 15 `Client`s with their exact target `plan`/`status`/`startedAt`, 0 skipped.
- `migrate_subscriptions.py` (real) → 15 `Subscription`s created, 0 skipped, 0 "no matching Plan" — matching the dry-run preview exactly.

**Post-migration state (direct DB query):** `plans: 3`, `subscriptions: 15`, `clients: 15` (unchanged). Distribution: 1 `evergreen` (`smar`, `regular` plan), 14 `trial` (`regular` plan) — matches the pre-existing `lifecycle_state` distribution from `ADR-0002_PHASE_4.md` (the first slice) exactly, since this migration only mirrors what already existed, never invents a new value. Spot-checked `anas`: `plan=regular`, `status=trial`, `startedAt` = its real `createdAt` (2026-07-13) — correctly reflects its still-unstarted free trial.

**Idempotency — proven with a real second run, not just re-reasoned about:**
- `seed_plans.py` (2nd real run) → 0 created, 3 updated (upsert refreshes the same values — no duplicate `Plan` rows).
- `migrate_subscriptions.py` (2nd real run) → 0 created, **15 skipped ("already has an active Subscription")**, 0 "no matching Plan".
- Direct row-count re-check after the second run: `plans: 3`, `subscriptions: 15` — **identical to after the first run**, confirming zero duplication.

## `app.main` import check

**122 paths** — unchanged from Phase 3. No route touched in this phase.

## Contract 02 — Complete

All four phases of the second Implementation Contract are implemented and verified: schema (Phase 1), repositories + `subscription_service` (Phase 2), routes wired with the dual-write path eliminated (Phase 3), and seeding + migration with the mandatory precondition satisfied via a disclosed substitution (Phase 4, this document). Ready for a Post-Implementation Review before archiving, per `.claude/rules/documentation-policy.md`.
