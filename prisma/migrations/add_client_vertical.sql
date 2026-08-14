-- Alzabt Vertical Registry -- Client.vertical column
-- Additive only, no existing column touched, no backfill (nullable, defaults to NULL for every
-- existing row -- RK/Ali/alzabt-demo and every other tenant keep vertical = NULL until a separate,
-- explicitly-approved backfill step runs). See
-- .claudedocs/architecture/ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md and
-- .claudedocs/architecture/ALZABT_VERTICAL_IMPACT_AND_MIGRATION_ANALYSIS.md (Migration Plan, Step 1).
-- Run once against the Supabase database:
--   psql $DIRECT_URL -f prisma/migrations/add_client_vertical.sql

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS vertical TEXT;

-- Verify: every existing row must show vertical = NULL immediately after this runs.
SELECT slug, service_type, template_key, vertical FROM public.clients ORDER BY created_at;
