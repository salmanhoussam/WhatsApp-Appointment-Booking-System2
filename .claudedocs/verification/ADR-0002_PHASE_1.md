# ADR-0002 — Verification: Phase 1 — `lifecycle_state` Schema Addition

Governed by `.claudedocs/implementation/ADR-0002_IMPLEMENTATION_CONTRACT.md` §2/§6. First code change of ADR-0002's first slice — schema only, zero behavior change (nothing reads or enforces the new field yet).

## File changed
`prisma/schema.prisma` — `Client.lifecycle_state String @default("trial")`, added next to `status`/`trial_ends_at` under the existing "Trial & Lifecycle" section, with inline comments documenting the Tenant-Status-vs-Lifecycle-State split and pointing to `ADR-0002.md`. `status` itself is unchanged (same column, same type) — only its *intended* valid value set narrows going forward, per the contract; no DB constraint enforces that narrowing yet (matches how `status`'s existing value set was never DB-constrained either).

## Execution
`prisma format` (no content change, alignment only) → `prisma db push` against the live Supabase database: *"Your database is now in sync with your Prisma schema. Done in 11.46s"* → `prisma generate` succeeded (Prisma Client Python v0.15.0).

## Direct evidence (queried against the real database after apply)
- Column exists with correct type/default: `information_schema.columns` → `lifecycle_state | text | 'trial'::text | NOT NULL`.
- Zero data loss: `clients` row count unchanged — **15 before, 15 after** (matches the baseline established throughout ADR-0001's verification docs).
- Existing rows backfilled by the schema default, as expected for an additive `db push`:

  | lifecycle_state | status | count |
  |---|---|---|
  | trial | active | 3 |
  | trial | demo | 1 |
  | trial | trial | 11 |

  **This is expected and confirms, with real data, exactly the gap the Implementation Contract's Migration Strategy (§5) flagged in advance**: the 3 `status="active"` tenants now sit at the schema default `lifecycle_state="trial"`, which is wrong for them — they are not currently on trial. This is precisely why §5 requires the migration script to print these rows for manual review rather than trust the default. No script has been run yet; this data point is direct confirmation the concern was real, not hypothetical.
- `app.main` imports successfully after the change: `120 paths` (same count as the 2026-07-18 Project Status Audit baseline), same pre-existing non-fatal duplicate-operation-ID warning on `/health` — no new warnings or errors introduced.

## Scope confirmation
Nothing in the codebase reads `lifecycle_state` yet — `app/core/tenant.py`, `registration_service.py`, `demo_service.py`, and `super/clients.py` are all untouched in this step. Zero behavior change for any tenant, active or otherwise. This matches the Implementation Contract's §1 statement that this slice "only guarantees the field exists" before any enforcement or write-path logic is added.

## Known stale-documentation note (not fixed here, flagged for the user)
`.claudedocs/architecture/database_report.md` (last updated 2026-05-05, predates Phase 54's model unification) is not updated by this change, despite `CLAUDE.md`'s Auto-Reporting rule nominally calling for it on every schema edit — the file is already significantly out of date (lists removed models like `MenuCategory`/`StoreProduct`, missing `SecurityAuditLog`/Fleet/Moments models). Appending one more line to an already-stale document would misrepresent it as current; a full regeneration is a separate, larger task not undertaken as part of this narrow schema step.
