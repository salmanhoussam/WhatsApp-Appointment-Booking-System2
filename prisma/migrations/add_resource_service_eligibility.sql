-- Clinic P4-C-U1 — Doctor ⇄ Service eligibility. 2026-09-26.
--
-- WHAT IT ANSWERS: "which doctors perform this service?" Before this table the question had no
-- answer at all, which is why the clinic availability reader could compute slots for a doctor who
-- does not perform the requested procedure.
--
-- THE DIRECTION IS THE DECISION (ق-٤-ز, Salman, 2026-09-26): NO ROW MEANS NOT OFFERED. This is
-- deliberately the OPPOSITE of P3's `bookable_by`, where an unrecognised VALUE means "anyone may
-- book". The two rules do not conflict, and the distinction is the whole point:
--
--     an unknown VALUE in a contract column   -> do not close the system for a reason nobody wrote
--     a missing DOMAIN RELATION               -> do not invent a permission nobody granted
--
-- CONSEQUENCE, stated here rather than discovered later: provisioning a clinic MUST write these
-- rows. A clinic with doctors, services and zero rows here offers nothing. That obligation belongs
-- in the clinic tenant provisioning contract, which does not exist yet.
--
-- 🔴 THE client_id FOREIGN KEY IS THE POINT OF THE SHAPE. `barber_services` carries client_id with
-- an index and NO foreign key -- a recorded defect (BarberService.clientId has no FK) that lets a
-- row name a tenant that does not exist. It is NOT inherited here. It is also NOT fixed there:
-- repairing the barber path inside the clinic phase is what this vertical's contract forbids.
--
-- MEASURED BEFORE APPLYING (read-only, sealed reader):
--   * `resource_services` does not exist.
--   * `resources` holds 2 rows (both type='doctor', both INACTIVE, on rk) and 0 reservations
--     reference them -- so the strict rule this table enables cannot change any live behaviour.
--   * `catalog_services` holds 38 rows. None is touched: this migration adds no column anywhere.
--   * `barber_services` is not read, not altered, not referenced.
--
-- Reviewed from `prisma migrate diff --from-url <DIRECT_URL> --to-schema-datamodel` output, which
-- contained EXACTLY these seven statements and nothing else -- confirming production carries no
-- other pending drift against schema.prisma. Zero DROP, zero TRUNCATE, zero DELETE, zero UPDATE,
-- zero column added to any existing table, zero row written.
-- `prisma db push` is never used in this project.
--
-- ROLLBACK: DROP TABLE "public"."resource_services";  plus a git revert.
--           Zero data loss -- the table is new and empty, and nothing outside it changes.

BEGIN;

-- CreateTable
CREATE TABLE "public"."resource_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex -- the picker's question: which doctors do this service?
CREATE INDEX "resource_services_client_id_service_id_idx" ON "public"."resource_services"("client_id", "service_id");

-- CreateIndex -- the engine's question: does THIS doctor do this service?
CREATE INDEX "resource_services_client_id_resource_id_idx" ON "public"."resource_services"("client_id", "resource_id");

-- CreateIndex -- one assignment per pair
CREATE UNIQUE INDEX "resource_services_resource_id_service_id_key" ON "public"."resource_services"("resource_id", "service_id");

-- AddForeignKey -- 🔴 the one barber_services does not have
ALTER TABLE "public"."resource_services" ADD CONSTRAINT "resource_services_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resource_services" ADD CONSTRAINT "resource_services_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resource_services" ADD CONSTRAINT "resource_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."catalog_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
