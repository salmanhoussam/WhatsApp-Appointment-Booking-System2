-- Clinic P2 — Patient Identity Foundation. 2026-09-25.
--
-- WHAT THIS IS FOR. Measured on production the same day (sealed read-only,
-- .claudedocs/work/clinic-preflight/2026-09-25/evidence.md): three of ten `customers` rows
-- already carry reservations under MORE THAN ONE name. One `WALK_IN` row holds SEVEN people;
-- two REAL phone numbers hold five names between them. The system's identity is the PHONE, and
-- the phone is not the person. In a barbershop that is untidy; in a clinic it attaches a medical
-- history to the wrong human being.
--
--     customers        = a CONTACT — a number that can be reached.   UNCHANGED BY THIS FILE.
--     patients         = the person an appointment is FOR.
--     patient_contacts = the many-to-many between them, carrying a role.
--
-- WHAT THIS FILE DELIBERATELY DOES NOT DO, and it is the most important part:
--     * It does NOT touch `customers` — no column, no constraint, and
--       `customers_client_id_phone_key` stays exactly as it is.
--     * It does NOT backfill. Not one existing row becomes a Patient. A `Customer` created by
--       the barber flow must never silently become a patient, precisely because one of them
--       already holds seven different people.
--     * It does NOT migrate WhatsApp conversations, WALK_IN, or anything belonging to Barber.
--       P2 builds a Patient layer ON TOP of the current reality (Salman, 2026-09-25).
--
-- MEASURED BEFORE APPLYING: 66 reservations exist, every one of them `module_key='barber'`, and
-- all 66 correctly receive `patient_id = NULL`. The column is nullable for that reason — NULL is
-- the true answer for a barber row, not a placeholder.
--
-- REVIEWED, NOT GENERATED BLIND. The statements below are `prisma migrate diff`'s own output,
-- read line by line before being committed: 14 statements, 2 CreateTable, 6 CreateIndex,
-- 5 AddForeignKey, 1 AlterTable — and ZERO DROP/TRUNCATE/DELETE/UPDATE. `prisma db push` is
-- never used in this project; it would silently drop production indexes that schema.prisma does
-- not describe.
--
-- `patient_contacts.client_id` carries a REAL foreign key. `barber_services.client_id` carries
-- none — a known defect in this schema. It is not fixed here (that belongs to Barber, out of
-- P2's scope) but it is not inherited either.
--
-- ROLLBACK, in this order:
--     1. stop writing patient_id  (no existing row is affected — they are all NULL)
--     2. git revert the code
--     3. ALTER TABLE reservations DROP COLUMN patient_id;
--     4. DROP TABLE patient_contacts; DROP TABLE patients;   ← ONLY if both hold zero rows.
--   🔴 If they hold rows, LEAVE THEM and stop the code path instead. A rollback never deletes
--      patient data.

BEGIN;

-- AlterTable
ALTER TABLE "public"."reservations" ADD COLUMN     "patient_id" UUID;

-- CreateTable
CREATE TABLE "public"."patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'self',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patients_client_id_idx" ON "public"."patients"("client_id");

-- CreateIndex
CREATE INDEX "patients_client_id_is_active_idx" ON "public"."patients"("client_id", "is_active");

-- CreateIndex
CREATE INDEX "patient_contacts_client_id_idx" ON "public"."patient_contacts"("client_id");

-- CreateIndex
CREATE INDEX "patient_contacts_customer_id_idx" ON "public"."patient_contacts"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_contacts_patient_id_customer_id_key" ON "public"."patient_contacts"("patient_id", "customer_id");

-- CreateIndex
CREATE INDEX "reservations_client_id_patient_id_idx" ON "public"."reservations"("client_id", "patient_id");

-- AddForeignKey
ALTER TABLE "public"."reservations" ADD CONSTRAINT "reservations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patients" ADD CONSTRAINT "patients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_contacts" ADD CONSTRAINT "patient_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_contacts" ADD CONSTRAINT "patient_contacts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_contacts" ADD CONSTRAINT "patient_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
