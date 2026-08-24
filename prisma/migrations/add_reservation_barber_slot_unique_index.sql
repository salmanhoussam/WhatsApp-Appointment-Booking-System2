-- Phase C (Reservation Integration, Study 6 race-condition close), 2026-08-24.
--
-- create_reservation()'s conflict check for the "barber" module_key was a plain
-- read-then-write: SELECT existing overlapping reservations, check in Python, then INSERT.
-- Two concurrent requests for the exact same barber+slot could both pass the read-side check
-- before either INSERT committed, producing a real double-booking. Confirmed via a real
-- concurrent-request test (see .claudedocs/implementation/CUSTOMER_IDENTITY_PHASE_C/evidence.md)
-- BEFORE this index existed, then re-confirmed closed AFTER.
--
-- A PostgreSQL advisory-lock-based approach (pg_advisory_xact_lock scoped to (client_id,
-- barber_id), held for the read-check + write span) was tried first and directly measured against
-- this project's real pooled Supabase connection (DATABASE_URL, pgbouncer transaction mode,
-- port 6543) -- it did NOT provide real mutual exclusion in that environment (a second concurrent
-- transaction acquired the "same" lock while the first still held it, confirmed by direct timing
-- measurement, not assumed). Abandoned in favor of this DB-native constraint, which Postgres
-- enforces atomically at INSERT time regardless of connection pooling.
--
-- Not expressible in schema.prisma's @@unique (no WHERE-clause/partial-index support in Prisma's
-- schema DSL) -- applied as raw SQL directly against the DB, same convention as
-- add_unit_type.sql / add_tenant_config.sql / add_reservation_customer_id.sql before it.
--
-- Scope: only the "barber" moduleKey's real barberId FK path (Study 6's own finding). The
-- resource-backed "clinic" path (Reservation.resourceId) has the identical theoretical race but
-- was NOT in this phase's scope -- named here as a real, deliberately out-of-scope follow-up, not
-- silently ignored.
--
-- Deliberately does NOT close every theoretical overlapping-duration race (e.g. a 09:00-09:30
-- booking and a 09:15-09:45 booking for the same barber have different reserved_at values, so
-- this index alone wouldn't catch that pair) -- get_available_slots() only ever offers
-- grid-aligned candidate times (slot_step_min, default 30 min) with a per-tenant fixed duration
-- default, so a genuine race between two real bookings through this system's own booking flow is,
-- in practice, always a same-reserved_at collision. A true zero-gap guarantee would need a
-- GiST exclusion constraint over the derived time range, which needs the btree_gist extension --
-- not pursued here without a confirmed real need for durations that vary enough to produce a
-- non-identical-start overlap; documented as a known, accepted boundary of this fix.

CREATE UNIQUE INDEX IF NOT EXISTS reservations_active_barber_slot_uidx
ON reservations (client_id, barber_id, reserved_at)
WHERE status IN ('pending', 'confirmed', 'arrived') AND barber_id IS NOT NULL;
