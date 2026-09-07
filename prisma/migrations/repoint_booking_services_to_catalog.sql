-- Phase 2c, Data Model Consolidation (2026-09-07)
--
-- booking_services.service_id referenced the legacy `services` table. Once public_service.py's
-- booking flow prices add-ons from `catalog_services` (Phase 2c), it writes CatalogService ids into
-- this column -- which the old FK would reject. Repointed rather than dropped.
--
-- WHY NOT DROPPED, despite the plan saying so: the write is LIVE. public_service.py's
-- create_booking() still does `booking_data["services"] = {"create": valid_services}` for smar's
-- stay add-ons. Dropping the table means a booking would still have the add-on money folded into
-- totalPrice while losing every record of WHICH add-ons were bought. The table is empty today, so
-- repointing costs one statement; dropping it costs smar its itemisation. Flagged for Salman
-- rather than executed as written.
--
-- Safe because the table holds 0 rows platform-wide -- verified before running. No data is
-- rewritten; only the constraint target moves.

ALTER TABLE "booking_services"
  DROP CONSTRAINT IF EXISTS "booking_services_service_id_fkey";

ALTER TABLE "booking_services"
  ADD CONSTRAINT "booking_services_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "catalog_services"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
