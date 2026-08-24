-- Phase A, Customer Identity + WhatsApp Booking Study (2026-08-24)
-- .claude/plans/we-moved-on-new-hazy-barto.md
--
-- Additive only: one new nullable column + FK + index. No existing data touched, no existing
-- column altered. Every existing reservations row gets customer_id = NULL (this schema's own
-- established honest-null convention). Reservation.customerName/Phone/Email stay unchanged as
-- the permanent historical snapshot -- this FK is additive alongside them, not a replacement.

ALTER TABLE "reservations"
  ADD COLUMN IF NOT EXISTS "customer_id" UUID;

ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "reservations_client_id_customer_id_idx"
  ON "reservations" ("client_id", "customer_id");
