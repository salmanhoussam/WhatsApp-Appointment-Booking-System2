/**
 * staffSurface.js — one staff list, two sets of names, and no way for them to drift apart.
 *
 * ق-٥-ب follow-up, option (أ) approved by Salman 2026-09-27. The booking hook's state is named
 * `barbers` / `selectedBarberId` / `chooseBarber`, and for a clinic tenant it holds DOCTORS. That is
 * a naming lie under rules/text-context-rule.md, whose second consequence is explicit: "اسمُ المفتاح
 * جزءٌ من العقد" -- a key's NAME is part of the contract, and reusing `daily_log_*` in a booking path
 * was judged wrong even when the words were accurate, because whoever reads the code a month later
 * believes the two paths are one thing.
 *
 * So a NEUTRAL surface is added: `staff`, `selectedStaffId`, `chooseStaff`, and so on. Additively.
 *
 * WHY ADDITIVELY, AND NOT A RENAME
 * A rename would touch BookingPage, the only live revenue-earning booking UI (rk, mr-h, and two
 * more), and this session has no real browser available -- rules/frontend/
 * browser-verification-protocol.md is explicit that a frontend conclusion without browser evidence
 * is not verified, and the Playwright MCP does not hot-load into a running session. Shipping a
 * rename of that path on source reading alone is a risk with no upside today, since the only NEW
 * consumer is P5-E, which has not been written yet.
 *
 * 🔴 AND WHY A FUNCTION RATHER THAN SEVEN EXTRA KEYS IN THE RETURN OBJECT
 * Two literal keys per value is exactly how parallel names DRIFT: someone updates `barbers` and
 * forgets `staff`, and the two disagree silently. Here the neutral name is DERIVED from the legacy
 * one at the moment the surface is built, so divergence is not a discipline problem, it is
 * structurally impossible. The mapping is data, so a test can enumerate it instead of trusting a
 * reviewer to spot a missing line.
 *
 * MIGRATION STATE, WITH A STATED END
 * rules/backend/architecture.md §9's promoted principle: "Parallel implementations must be treated
 * as temporary migration states, not permanent architecture." This is one. It ends when BookingPage
 * is switched to the neutral names -- with real browser evidence on a live barber tenant -- and this
 * module is deleted. Until then the legacy names remain the ones the live UI reads, untouched.
 */

/** neutral name -> the legacy key it mirrors. Data, so it can be enumerated by a test. */
export const STAFF_ALIAS_MAP = {
  staff:           'barbers',
  staffLoading:    'barbersLoading',
  staffError:      'barbersError',
  retryStaff:      'retryBarbers',
  selectedStaffId: 'selectedBarberId',
  selectedStaff:   'selectedBarber',
  chooseStaff:     'chooseBarber',
}

/**
 * Returns `surface` plus the neutral aliases. Never removes or rewrites anything: the legacy keys
 * stay exactly as they are, because the live UI reads them.
 * @param {object} surface the hook's own barber-named surface
 */
export function withStaffAliases(surface) {
  const out = { ...surface }
  for (const neutral in STAFF_ALIAS_MAP) {
    // Assigned from the legacy key by reference -- same array, same function, same value. An alias
    // that COPIED would be a second source of truth, which is the thing being avoided.
    out[neutral] = surface[STAFF_ALIAS_MAP[neutral]]
  }
  return out
}
