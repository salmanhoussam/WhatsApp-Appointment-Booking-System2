-- Unified Provisioning Contract -- Phase 1: Client.provisioning_status column
-- Additive only, no existing column touched, no backfill (nullable -- every existing row,
-- including RK/Ali/alzabt-demo, correctly stays NULL: "predates this gate," not "incomplete").
-- Nothing writes this field yet -- this migration only adds the column; Phase 2/3 of the Unified
-- Provisioning Contract wire the actual reads/writes in. See
-- .claudedocs/architecture/ALZABT_UNIFIED_PROVISIONING_CONTRACT_FINAL.md (Decision 2).
-- Run once against the Supabase database:
--   psql $DIRECT_URL -f prisma/migrations/add_client_provisioning_status.sql

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS provisioning_status TEXT;

-- Verify: every existing row must show provisioning_status = NULL immediately after this runs.
SELECT slug, vertical, provisioning_status FROM public.clients ORDER BY created_at;
