-- Phase 2a, Data Model Consolidation (2026-09-07)
-- ~/.claude/plans/we-moved-on-new-hazy-barto.md
--
-- Purpose: give CatalogService the three things the legacy `services` table has and it lacks, so
-- smar's real hotel/stay add-ons (إفطار، مساج، دخول المسبح، سرير أطفال ...) can move into it
-- without losing meaning. Salman's decision, 2026-09-07: "نرحّله لـcatalog_services".
--
-- Real columns, not metadata JSON -- following the precedent this same model already set for
-- durationMin ("promoted to a real column, not buried in metadata like CatalogItem's duration_min
-- was"). A stay add-on's pricing unit is load-bearing for what a guest is charged; it is not
-- decoration.
--
-- Additive only. Every existing catalog_services row gets property_id = NULL, pricing_unit = NULL,
-- is_included = false -- which is exactly what a barber service means: not tied to a property, not
-- per-night, not bundled. No existing column is altered, no existing row is rewritten.
--
-- Note on duration_min: it stays NOT NULL DEFAULT 30 and is meaningless for a stay add-on
-- (breakfast has no slot length). Deliberately not made nullable -- reservation_service.py's slot
-- math needs a hard int, and stay add-ons attach to Bookings, never to Reservations, so they never
-- reach that math. Documented rather than loosened.

ALTER TABLE "catalog_services"
  ADD COLUMN IF NOT EXISTS "property_id"  UUID,
  ADD COLUMN IF NOT EXISTS "pricing_unit" TEXT,
  ADD COLUMN IF NOT EXISTS "is_included"  BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "catalog_services"
  ADD CONSTRAINT "catalog_services_property_id_fkey"
  FOREIGN KEY ("property_id") REFERENCES "properties"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "catalog_services_property_id_idx"
  ON "catalog_services" ("property_id");
