-- Phase 3a, Data Model Consolidation (2026-09-07)
--
-- store_orders.customer_id referenced `store_customers` -- a table with 0 rows and 0 code
-- references anywhere in the repo (only schema declarations). The column was therefore NULL on all
-- 15 real orders, which is exactly why the Customer Registry has to merge Reservation + StoreOrder
-- by PHONE STRING at query time instead of by a foreign key.
--
-- Repointed to `customers`, the one real tenant customer identity. ON DELETE SET NULL matches what
-- Reservation.customer_id already does, so a deleted customer never takes the order with it -- the
-- order keeps its own customer_name/customer_phone snapshot columns regardless.
--
-- Safe: all 15 rows are NULL, so no value needs validating against the new parent. Verified before
-- running.

ALTER TABLE "store_orders"
  DROP CONSTRAINT IF EXISTS "store_orders_customer_id_fkey";

ALTER TABLE "store_orders"
  ADD CONSTRAINT "store_orders_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "store_orders_client_id_customer_id_idx"
  ON "store_orders" ("client_id", "customer_id");
