-- Phase 3.7A — Staff Foundation: Barber photo + description
-- Additive only, no existing column touched, no backfill needed (both nullable).
-- Run once against the Supabase database:
--   psql $DIRECT_URL -f prisma/migrations/add_barber_photo_description.sql

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS image_url   TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Verify
SELECT id, name, image_url, description FROM public.barbers LIMIT 5;
