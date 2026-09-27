/**
 * Real behavioural cases for frontend/src/hooks/bookingMode.js — CALLED, not grepped.
 *
 * This project has no JS test runner (measured: zero vitest/jest/@testing-library in
 * frontend/package.json, zero *.test.* under frontend/src), so this file is driven from
 * scripts/test_p5d_booking_mode_signal.py, which prints the results in the suite's own format and
 * owns the exit code. It emits one JSON array on stdout and nothing else.
 */
import { deriveBookingMode, BOOKING_MODES } from '../frontend/src/hooks/bookingMode.js'

const r = []
const eq = (label, got, want, note = '') =>
  r.push({ label, passed: got === want, detail: `got ${JSON.stringify(got)}` + (note ? ` — ${note}` : '') })

// ── the resolved module decides, and nothing else does ──────────────────────────────────────────
eq("T-ب-٦-b1  bookingModule='barber' + list loaded            -> 'booking'",
   deriveBookingMode({ configLoading: false, bookingModule: 'barber' }), 'booking')
eq("T-ب-٦-b2  bookingModule='clinic'                          -> 'clinic'",
   deriveBookingMode({ configLoading: false, bookingModule: 'clinic' }), 'clinic')
eq("T-ب-٦-b3  bookingModule=null (unassigned vertical)        -> 'legacy'",
   deriveBookingMode({ configLoading: false, bookingModule: null }), 'legacy')
eq("T-ب-٦-b4  an UNREGISTERED value is not guessed at         -> 'legacy'",
   deriveBookingMode({ configLoading: false, bookingModule: 'clnic' }), 'legacy')

// ── 🔴 the whole point: staff count no longer decides the experience ────────────────────────────
// The old derivation was `barbers.length > 0 ? 'booking' : 'legacy'`. These two cases are the ones
// it got WRONG, and they are the reason this gate exists.
eq("T-ب-٦-b5  🔴 a barber tenant with ZERO staff is still 'booking', not 'legacy' — under the old "
   + "`barbers.length > 0` rule this returned 'legacy'",
   deriveBookingMode({ configLoading: false, bookingModule: 'barber', barbersLoading: false }),
   'booking')
eq("T-ب-٦-b6  🔴 a clinic is 'clinic' even while a barber request is pending or failed — a clinic "
   + "is never decided by anything to do with barbers",
   deriveBookingMode({ configLoading: false, bookingModule: 'clinic', barbersError: true }), 'clinic')

// ── the 2026-08-10 distinction survives, and is now barber-only ─────────────────────────────────
eq("T-ب-٦-b7  barber + request FAILED -> 'error' (kept distinct from 'no staff', the 2026-08-10 fix)",
   deriveBookingMode({ configLoading: false, bookingModule: 'barber', barbersError: true }), 'error')
eq("T-ب-٦-b8  🔴 but a LEGACY tenant with the same failed request is 'legacy', NOT 'error' — before "
   + "this gate that tenant's page was replaced by an error screen over a request it never needed",
   deriveBookingMode({ configLoading: false, bookingModule: null, barbersError: true }), 'legacy')
eq("T-ب-٦-b9  barber + request in flight -> 'loading'",
   deriveBookingMode({ configLoading: false, bookingModule: 'barber', barbersLoading: true }), 'loading')

// ── config is the gate now, not the barber request ─────────────────────────────────────────────
eq("T-ب-٦-b10  configLoading wins over everything — the module is not known yet",
   deriveBookingMode({ configLoading: true, bookingModule: null, barbersError: true }), 'loading')

// ── shape ──────────────────────────────────────────────────────────────────────────────────────
r.push({
  label: "T-ب-٦-b11  every returned value is one of the 5 declared BOOKING_MODES",
  passed: [
    { configLoading: true }, { configLoading: false, bookingModule: 'barber' },
    { configLoading: false, bookingModule: 'clinic' }, { configLoading: false, bookingModule: null },
    { configLoading: false, bookingModule: 'barber', barbersError: true },
  ].every((s) => BOOKING_MODES.includes(deriveBookingMode(s))),
  detail: BOOKING_MODES.join('|'),
})
r.push({
  label: "T-ب-٦-b12  a missing/undefined bookingModule is treated as null, never as 'barber'",
  passed: deriveBookingMode({ configLoading: false }) === 'legacy'
       && deriveBookingMode({ configLoading: false, bookingModule: undefined }) === 'legacy',
  detail: 'undefined -> legacy',
})

process.stdout.write(JSON.stringify(r))
