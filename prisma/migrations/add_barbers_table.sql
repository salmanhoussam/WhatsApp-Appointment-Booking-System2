-- Reservation Strategy Architecture — Barbers table + reservations.barber_id FK
-- Second real Reservation Strategy case (2026-07-31), built independently of resources.sql /
-- Clinic per Salman's explicit instruction — its own table, own FK, no reuse of resources.
-- Run once against the Supabase database:
--   psql $DIRECT_URL -f prisma/migrations/add_barbers_table.sql

-- 1. Barbers table (no `type` column, no `specialty` column — see schema.prisma's Barber model
--    comment for why those two Resource fields weren't carried over)
CREATE TABLE IF NOT EXISTS public.barbers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  working_hours JSONB,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barbers_client_active ON public.barbers (client_id, is_active);

-- 2. Nullable FK on reservations — additive, no backfill.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_client_barber_time
  ON public.reservations (client_id, barber_id, reserved_at);

-- 3. Verify
SELECT count(*) AS reservations_total, count(barber_id) AS with_barber FROM public.reservations;
SELECT * FROM public.barbers LIMIT 5;
