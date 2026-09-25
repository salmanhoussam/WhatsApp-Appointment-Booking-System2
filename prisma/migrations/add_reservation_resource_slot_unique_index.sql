-- Clinic P1-B (Safety Fences), 2026-09-25.
--
-- Closes, for the RESOURCE-backed path, the exact race that
-- add_reservation_barber_slot_unique_index.sql closed for the barber one on 2026-08-24. That
-- file named this as a real, deliberately out-of-scope follow-up rather than silently ignoring
-- it; this is that follow-up.
--
-- create_reservation()'s conflict check for a resource-backed moduleKey ("clinic" today) is a
-- plain read-then-write: SELECT overlapping rows via find_overlapping_by_resource(), decide in
-- Python, then INSERT. Two concurrent requests for the same resource+slot can both pass the
-- read-side check before either INSERT commits. Postgres enforces this index atomically at
-- INSERT time regardless of connection pooling -- the same reason the barber file gives for
-- choosing a DB-native constraint over pg_advisory_xact_lock, which was measured NOT to provide
-- real mutual exclusion through this project's pooled Supabase connection (port 6543).
--
-- Not expressible in schema.prisma's @@unique (no partial-index support in Prisma's schema DSL)
-- -- applied as raw SQL, same convention as add_reservation_barber_slot_unique_index.sql,
-- add_unit_type.sql and add_reservation_customer_id.sql before it.
--
-- MEASURED BEFORE APPLYING (.claudedocs/work/clinic-preflight/2026-09-25/evidence.md):
--   * reservations carrying resource_id : 0
--   * reservations with module_key='clinic' : 0
--   * total reservations : 66, every one of them barber
-- So this index touches no existing row, and it CANNOT be exercised by any row that exists
-- today. It is a fence built before the road: its correctness is proven structurally here
-- (pg_indexes), and its race closure is deliberately NOT claimed as live-verified. That proof
-- belongs with the first real clinic booking (P4/P6) and is recorded as an open Unknown.
--
-- Leaves reservations_active_barber_slot_uidx untouched: different name, different column,
-- different predicate.
--
-- Inherits the same documented boundary as the barber index: it does not close overlaps with
-- DIFFERENT start times (09:00-09:30 vs 09:15-09:45 are distinct reserved_at values). A true
-- zero-gap guarantee needs a GiST exclusion constraint over the derived range (btree_gist), not
-- pursued without a confirmed real need -- stated here as a known, accepted boundary, not an
-- oversight.

CREATE UNIQUE INDEX IF NOT EXISTS reservations_active_resource_slot_uidx
ON reservations (client_id, resource_id, reserved_at)
WHERE status IN ('pending', 'confirmed', 'arrived') AND resource_id IS NOT NULL;
