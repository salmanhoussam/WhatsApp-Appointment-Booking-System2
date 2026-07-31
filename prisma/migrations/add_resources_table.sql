-- Reservation Strategy Architecture — Resources table + reservations.resource_id FK
-- See .claude/plans (Reservation Strategy Architecture design doc) for the full design.
-- Run once against the Supabase database:
--   psql $DIRECT_URL -f prisma/migrations/add_resources_table.sql

-- 1. Resources table (single-table v1 design — see schema.prisma's Resource model comment)
CREATE TABLE IF NOT EXISTS public.resources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  name          TEXT NOT NULL,
  specialty     TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  working_hours JSONB,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_client_type   ON public.resources (client_id, type);
CREATE INDEX IF NOT EXISTS idx_resources_client_active  ON public.resources (client_id, is_active);

-- 2. Nullable FK on reservations — additive, no backfill (no prior column existed to migrate
--    data from; every existing reservation row simply gets NULL).
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_client_resource_time
  ON public.reservations (client_id, resource_id, reserved_at);

-- 3. Verify
SELECT count(*) AS reservations_total, count(resource_id) AS with_resource FROM public.reservations;
SELECT * FROM public.resources LIMIT 5;
