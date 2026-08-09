-- Staff Scoped Access, Phase A (2026-08-09)
-- .claudedocs/implementation/STAFF_SCOPED_ACCESS_CONTRACT.md
--
-- Additive only: new enum value + new nullable, unique column + FK. No existing data touched,
-- no existing column altered. Distinct from Staff<->Service (BarberService) -- this links a
-- login account (User) to the Barber it's scoped to, for backend-enforced authorization.

-- Postgres requires ALTER TYPE ... ADD VALUE to run outside an explicit transaction block in
-- older versions; IF NOT EXISTS makes this safe to re-run.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STAFF';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "barber_id" UUID;

ALTER TABLE "users"
  ADD CONSTRAINT "users_barber_id_key" UNIQUE ("barber_id");

ALTER TABLE "users"
  ADD CONSTRAINT "users_barber_id_fkey"
  FOREIGN KEY ("barber_id") REFERENCES "barbers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
