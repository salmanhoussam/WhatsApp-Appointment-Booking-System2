/**
 * Real behavioural cases for frontend/src/hooks/staffSurface.js — CALLED, not grepped.
 * Driven from scripts/test_p5d_booking_mode_signal.py. Emits one JSON array on stdout.
 */
import { withStaffAliases, STAFF_ALIAS_MAP } from '../frontend/src/hooks/staffSurface.js'

const r = []
const yes = (label, passed, detail = '') => r.push({ label, passed, detail })

const barbersArr = [{ id: 'b1', name: 'جعفر' }]
const retryFn = () => 'retried'
const chooseFn = (id) => id
const legacy = {
  barbers: barbersArr, barbersLoading: false, barbersError: true,
  retryBarbers: retryFn, selectedBarberId: 'b1',
  selectedBarber: barbersArr[0], chooseBarber: chooseFn,
  // untouched neighbours, to prove the projection is additive and not a filter
  mode: 'booking', bookingModule: 'barber', slots: [1, 2, 3],
}
const out = withStaffAliases(legacy)

// ── every mapped name is present, and is the SAME thing, not a copy ─────────────────────────────
const identical = Object.keys(STAFF_ALIAS_MAP)
  .filter((n) => out[n] !== legacy[STAFF_ALIAS_MAP[n]])
yes("T-ب-٨-b1  🔴 every neutral name is the SAME REFERENCE as its legacy key, not a copy — a copy "
    + "would be a second source of truth, which is the drift this module exists to make impossible",
    identical.length === 0, identical.length ? `diverged: ${identical}` : 'all 7 identical by ===')

yes("T-ب-٨-b2  the map really covers the 7 staff-named members of the surface",
    Object.keys(STAFF_ALIAS_MAP).length === 7, Object.keys(STAFF_ALIAS_MAP).join(','))

// ── additive: nothing removed, nothing rewritten ────────────────────────────────────────────────
const lost = Object.keys(legacy).filter((k) => !(k in out))
yes("T-ب-٨-b3  INVARIANT — NOTHING is removed: every legacy key the live BookingPage reads is still "
    + "there, byte-identical (positive control, since the live barber UI depends on exactly these)",
    lost.length === 0 && out.barbers === barbersArr && out.chooseBarber === chooseFn,
    lost.length ? `lost: ${lost}` : 'all legacy keys intact')
yes("T-ب-٨-b4  INVARIANT — unrelated members pass through untouched",
    out.mode === 'booking' && out.bookingModule === 'barber' && out.slots === legacy.slots)
yes("T-ب-٨-b5  the input object is not mutated — the projection returns a new object",
    !('staff' in legacy) && out !== legacy)

// ── the aliases behave, not merely exist ────────────────────────────────────────────────────────
yes("T-ب-٨-b6  aliased FUNCTIONS are callable through the neutral name and do the same thing",
    out.retryStaff() === 'retried' && out.chooseStaff('b9') === 'b9')
yes("T-ب-٨-b7  and a falsy legacy value is carried as-is, not coerced (barbersLoading=false stays "
    + "false, barbersError=true stays true)",
    out.staffLoading === false && out.staffError === true)

// ── a clinic's list flows through the neutral name, which is the whole point ─────────────────────
const doctors = [{ id: 'r1', name: 'د. سارة', specialty: 'أسنان' }]
const clinic = withStaffAliases({
  barbers: doctors, barbersLoading: false, barbersError: false, retryBarbers: retryFn,
  selectedBarberId: 'r1', selectedBarber: doctors[0], chooseBarber: chooseFn,
})
yes("T-ب-٨-b8  🔴 a CLINIC's doctors are reachable as `staff` / `selectedStaff` — which is why this "
    + "exists: P5-E never has to read a doctor out of a key called `barbers`",
    clinic.staff === doctors && clinic.selectedStaff.name === 'د. سارة'
    && clinic.selectedStaff.specialty === 'أسنان')

process.stdout.write(JSON.stringify(r))
