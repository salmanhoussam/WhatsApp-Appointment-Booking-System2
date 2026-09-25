-- Clinic P3 — the Service Booking Contract. 2026-09-25.
--
-- A service is WHAT is booked. These two columns are the CONDITIONS under which it may be:
--
--     instructions   what the patient is told at booking time ("bring your previous reports").
--                    Data only. Who renders it, and when, is P5/P6's decision.
--     bookable_by    "patients" | "staff_only". Enforced in reservation_service.create_reservation
--                    and nowhere else, against the channel the booking came from.
--
-- NO SECOND "MOTIF" ENTITY, and the reason is in the code rather than in taste:
-- `Reservation.serviceId` is already the write path, so a separate motif model would mean a
-- second nullable FK beside it -- two ways to name the same thing, which
-- rules/backend/architecture.md §9 forbids. `catalog_services` has absorbed vertical-specific,
-- elsewhere-inert columns once before (property_id / pricing_unit / is_included, for smar's stay
-- add-ons) with the same reasoning; this is not a new precedent.
--
-- `patient_category` (new patient vs. known patient) is DELIBERATELY NOT HERE. The evidence for
-- it does not exist yet, and in v1 a clinic expresses the same thing with two separate services
-- ("first consultation", "follow-up") which already carry their own duration and price. What is
-- deferred is the REFUSAL, not the naming. It enters only on one specific piece of evidence: a
-- real clinic that refuses NEW patients for a given service, AND states how it defines "new".
--
-- MEASURED BEFORE APPLYING: catalog_services holds 38 rows (37 active). Every one of them
-- becomes instructions=NULL and bookable_by='patients' -- which is not a placeholder but the
-- true description of what all 38 already were. Zero behavioural change, zero backfill.
--
-- Both are additive; `bookable_by` carries a NOT NULL DEFAULT so no existing row needs a write.
-- Reviewed from `prisma migrate diff` output: ONE statement, zero DROP/TRUNCATE/DELETE.
-- `prisma db push` is never used in this project.
--
-- ROLLBACK: ALTER TABLE catalog_services DROP COLUMN bookable_by, DROP COLUMN instructions;
--           plus a git revert. Zero data loss -- nothing but defaults was ever written.

BEGIN;

-- AlterTable
ALTER TABLE "public"."catalog_services" ADD COLUMN     "bookable_by" TEXT NOT NULL DEFAULT 'patients',
ADD COLUMN     "instructions" TEXT;


COMMIT;
