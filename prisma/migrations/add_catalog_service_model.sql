-- Phase 3.7C, Commit 1: CatalogService model + Reservation.service_id FK + conservative data copy.
-- Named "CatalogService", not "Service" -- a completely unrelated `Service` model already exists
-- for smar's property-booking add-ons (catches the exact naming collision this project has hit
-- before, before it became a real table-name collision -- both would have mapped to "services").
--
-- Conservative by explicit instruction: the original catalog_items rows are copied, NOT moved --
-- they stay in catalog_items completely untouched. Deleting them is a separate, later, real
-- decision, gated on confirming reservations/booking/admin views all resolve correctly through
-- the new model first.

CREATE TABLE IF NOT EXISTS public.catalog_services (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL,
  category_id    UUID NOT NULL,
  name_ar        TEXT NOT NULL,
  name_en        TEXT,
  description_ar TEXT,
  description_en TEXT,
  image_url      TEXT,
  price          DECIMAL(10,2),
  currency       TEXT NOT NULL DEFAULT 'USD',
  duration_min   INTEGER NOT NULL DEFAULT 30,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  is_featured    BOOLEAN NOT NULL DEFAULT false,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT catalog_services_client_fk
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT catalog_services_category_fk
    FOREIGN KEY (category_id) REFERENCES public.catalog_categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS catalog_services_client_id_idx ON public.catalog_services(client_id);
CREATE INDEX IF NOT EXISTS catalog_services_category_id_idx ON public.catalog_services(category_id);

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS service_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_service_fk'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_service_fk
      FOREIGN KEY (service_id) REFERENCES public.catalog_services(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Conservative copy: catalog_items -> catalog_services, SAME id reused (makes "keep the old id as
-- a reference during the transition" free -- no separate mapping column needed). Originals in
-- catalog_items are untouched by this statement.
INSERT INTO public.catalog_services
  (id, client_id, category_id, name_ar, name_en, description_ar, description_en, image_url,
   price, currency, duration_min, is_active, is_featured, sort_order, metadata, created_at, updated_at)
SELECT
  id, client_id, category_id, name_ar, name_en, description_ar, description_en, image_url,
  price, currency,
  COALESCE((metadata->>'duration_min')::int, 30) AS duration_min,
  is_active, is_featured, sort_order, metadata, created_at, updated_at
FROM public.catalog_items
WHERE metadata->>'requires_booking' = 'true'
ON CONFLICT (id) DO NOTHING;

-- Backfill reservations.service_id from the legacy metadata.service_id convention, only where it
-- resolves to a real migrated row (same id as its source catalog_items row, by construction above).
-- The UUID-format regex guard is required, not cosmetic -- real historical rows contain a literal
-- "dummy" string in metadata.service_id (found live, applying this migration), and casting a
-- non-UUID string throws before EXISTS can filter it out (Postgres evaluates the cast regardless
-- of the surrounding WHERE clause's other conditions).
UPDATE public.reservations r
SET service_id = (r.metadata->>'service_id')::uuid
WHERE r.metadata->>'service_id' IS NOT NULL
  AND r.metadata->>'service_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND r.service_id IS NULL
  AND EXISTS (SELECT 1 FROM public.catalog_services cs WHERE cs.id = (r.metadata->>'service_id')::uuid);
