-- Phase 3.7C, Commit 3: BarberService join table -- the real Staff<->Service relationship.
-- Mirrors ClientService's already-proven bridge-table shape. onDelete: CASCADE both sides (unlike
-- Reservation's FKs, which use SET NULL to preserve historical rows) -- this table only records a
-- *current* qualification fact.

CREATE TABLE IF NOT EXISTS public.barber_services (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL,
  barber_id  UUID NOT NULL,
  service_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT barber_services_barber_fk
    FOREIGN KEY (barber_id) REFERENCES public.barbers(id) ON DELETE CASCADE,
  CONSTRAINT barber_services_service_fk
    FOREIGN KEY (service_id) REFERENCES public.catalog_services(id) ON DELETE CASCADE,
  CONSTRAINT barber_services_unique UNIQUE (barber_id, service_id)
);
CREATE INDEX IF NOT EXISTS barber_services_client_id_idx ON public.barber_services(client_id);
