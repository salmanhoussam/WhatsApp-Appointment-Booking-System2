-- Order Engine Unification (2026-09-07)
--
-- One order table for every vertical needs somewhere to put the fields only some verticals have.
-- The restaurant checkout carries `table_number`; a future vertical will carry something else.
-- `metadata` is the same escape hatch CatalogItem.metadata and Reservation.metadata already use in
-- this schema -- not a new convention, the existing one.
--
-- Additive and nullable: every existing row stays valid with metadata = NULL.

ALTER TABLE "store_orders"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;
