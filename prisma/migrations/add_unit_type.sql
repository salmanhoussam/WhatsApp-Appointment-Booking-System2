-- Migration: Add unit_type column to units table
-- Run this in Supabase SQL Editor (use DIRECT_URL / port 5432)
-- Date: 2026-04-10

-- 1. Add column (nullable, default 'chalet' for existing rows)
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS unit_type TEXT NOT NULL DEFAULT 'chalet';

-- 2. Back-fill: if you already know which rows are villas, run:
--    UPDATE public.units SET unit_type = 'villa'  WHERE unit_number IN ('V1','V2','V3');
--    UPDATE public.units SET unit_type = 'chalet' WHERE unit_type = 'chalet'; -- already correct

-- 3. Add index for fast filter queries
CREATE INDEX IF NOT EXISTS idx_units_client_type
  ON public.units (client_id, unit_type)
  WHERE is_active = true AND is_available = true;

-- 4. Verify
SELECT id, unit_number, unit_type FROM public.units LIMIT 20;
