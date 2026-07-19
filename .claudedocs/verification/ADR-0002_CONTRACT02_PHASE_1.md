# ADR-0002 (Contract 02) — Verification: Phase 1 — `Plan` + `Subscription` Schema

Governed by `.claudedocs/implementation/ADR-0002_IMPLEMENTATION_CONTRACT_02.md` §2/§3/§7 (Phase 1). Named `CONTRACT02_PHASE_1` (not a continuation of the first contract's `PHASE_1..5`) to keep the two Implementation Contracts under ADR-0002 clearly separated in the verification history.

## File changed

`prisma/schema.prisma` only — confirmed via `git status` after the change: `prisma/schema.prisma` is the sole modified file; zero files touched under `app/` or `scripts/`.

- New model `Plan`: `id, key (unique), name_ar, name_en, monthly_price, currency, createdAt, updatedAt`. `monthly_price` explicitly commented as provisional (§11.0b's Product-vs-Price question stays open).
- New model `Subscription`: `id, clientId (FK → Client, Cascade), planId (FK → Plan), startedAt, endedAt (nullable), status, createdAt, updatedAt`. Comment documents the ownership decision (§11.0a — `Client` only, Organization/Account named as the future migration point if introduced) and the `Client.createdAt` proxy caveat for the future migration step.
- `Client` model: no new scalar column — only a new `subscriptions Subscription[]` back-relation, exactly as scoped ("Client gets no new column in this contract").

## Execution

`prisma format` (alignment only) → `prisma db push` against the live Supabase database: *"Your database is now in sync with your Prisma schema. Done in 13.25s"* → `prisma generate` succeeded (Prisma Client Python v0.15.0).

## Direct evidence (queried against the real database after apply)

- Both tables exist: `plans`, `subscriptions` (confirmed via `information_schema.tables`).
- `plans` columns match the schema exactly (8 columns, correct types — `monthly_price` is `numeric`, `id`/`created_at`/`updated_at` etc. as expected).
- `subscriptions` columns match exactly (8 columns; `ended_at` is the only nullable column, matching the schema's `DateTime?`).
- Foreign keys confirmed via `information_schema`: `subscriptions.client_id → clients`, `subscriptions.plan_id → plans` — both relations wired correctly, matching Contract §3/§6 (ownership is `Client`-only, per §11.0a).
- **Zero rows in either new table** (`plans: 0`, `subscriptions: 0`) — correct for this phase; seeding/backfill is Phase 4, gated by the Contract §5 staging/snapshot precondition, not this step.
- **Zero data loss**: `clients` row count unchanged at **15** before and after.

## Zero Behavior Change confirmation (the Contract's explicit Phase 1 requirement)

- `git status` after the change shows exactly one modified file: `prisma/schema.prisma`. No route, service, or `app/core/tenant.py` touched.
- `app.main` imports successfully: **121 paths** — identical to the count before this change (Contract 01's `ADR-0002_PHASE_4.md` and the Post-Implementation Review both recorded 121) — confirms the new models introduce zero new/changed endpoints and zero import-time side effects.
- Nothing in the codebase reads or writes `Plan`/`Subscription` yet — grep-confirmed no references outside `prisma/schema.prisma` itself.

## Scope confirmation

This step is schema-only, exactly as scoped in Contract §7 Phase 1. Phase 2 (`plan_repo.py`, `subscription_repo.py`, `subscription_service.py`) is next.
