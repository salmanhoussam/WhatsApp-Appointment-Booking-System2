/**
 * bookingMode.js — which booking experience a tenant gets, and nothing else.
 *
 * T-ب-٦ of .claudedocs/implementation/CLINIC_Q5B_BOOKING_MODULE_CONTRACT.md, the first gate of
 * P5-D (Salman, 2026-09-27). Until now this was an inline ternary inside useReservationBooking.js
 * that read `barbers.length > 0`, i.e. the page worked out WHAT KIND OF BUSINESS it was rendering
 * by counting staff rows. That is the inference ق-٥-ب removed: the server resolves
 * `booking_module` and the page is told.
 *
 * 🔴 WHY COUNTING WAS WRONG, IN THE PROJECT'S OWN HISTORY
 * An empty barber list already meant two different things, and the hook's own :176-180 comment
 * documents the 2026-08-10 fix that separated them — a FAILED request used to be indistinguishable
 * from a tenant that genuinely has no staff, silently dropping a real customer into the legacy
 * form. A clinic would have loaded that same empty array with a THIRD meaning: "this tenant does
 * not use barbers at all". Deciding a vertical by `length === 0` re-creates a bug already paid for.
 *
 * Extracted into its own module for one concrete reason: this project has NO JavaScript test runner
 * (measured — zero vitest/jest/@testing-library in frontend/package.json, zero *.test.* files under
 * frontend/src). A pure function with no React and no network can be CALLED by a real test from
 * node, so this derivation is proven by behaviour instead of by a grep over source text, which
 * would only prove the file says something (feedback_assert_on_code_not_text).
 */

/** The four states a caller may receive. `clinic` is named here and consumed by P5-E. */
export const BOOKING_MODES = ['loading', 'error', 'booking', 'clinic', 'legacy']

/**
 * @param {object}  s
 * @param {boolean} s.configLoading  the tenant config request is still in flight
 * @param {string|null|undefined} s.bookingModule  server-resolved: 'barber' | 'clinic' | null
 * @param {boolean} s.barbersLoading the barber list request is in flight (barber tenants only)
 * @param {boolean} s.barbersError   that request failed (distinct from "no staff")
 * @returns {'loading'|'error'|'booking'|'clinic'|'legacy'}
 */
export function deriveBookingMode({ configLoading, bookingModule, barbersLoading, barbersError }) {
  // The module is what decides the experience, so an unresolved CONFIG is the real "not yet known"
  // state. Previously `barbersLoading` stood in for this, which is why a legacy tenant's page was
  // gated on a request it had no use for.
  if (configLoading) return 'loading'

  // Ordered before the barber branch on purpose: a clinic must never be decided by anything to do
  // with barbers, not even a pending or failed barber request.
  if (bookingModule === 'clinic') return 'clinic'

  if (bookingModule === 'barber') {
    // These two only ever apply to a barber tenant now. `barbersError` stays a distinct outcome
    // from an empty list — that distinction is the 2026-08-10 fix and it is preserved deliberately.
    if (barbersLoading) return 'loading'
    if (barbersError) return 'error'
    return 'booking'
  }

  // null (unassigned vertical — 5 of 9 real client rows) and any unregistered value both land here.
  // This is what those tenants already get today: they hold no Barber rows, so the old
  // `barbers.length > 0` test sent them to the legacy form too. Zero behaviour change for them —
  // and, unlike before, a failed barber request can no longer hide their page behind an error
  // screen, because the request is not made for them at all.
  return 'legacy'
}
