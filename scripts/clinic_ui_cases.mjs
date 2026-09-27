/**
 * Real behavioural cases for the clinic flow's PURE logic — CALLED, not grepped.
 * Driven from scripts/test_p5e_clinic_ui.py. Emits one JSON array on stdout.
 */
import {
  CLINIC_TEXT, CLINIC_ERROR_MAP, CLINIC_STEPS, resolveClinicError, invalidationOnReturnTo,
} from '../frontend/src/pages/generic/normal/clinicStrings.js'

const r = []
const yes = (label, passed, detail = '') => r.push({ label, passed, detail })

// ── §6's second table: every code maps to the right string AND the right step ────────────────────
const TABLE = {
  SLOT_TAKEN:                  ['n12', 'time'],
  RESOURCE_SERVICE_MISMATCH:   ['n13', 'service'],
  SERVICE_NOT_BOOKABLE_ONLINE: ['n18', 'service'],
  SERVICE_MISCONFIGURED:       ['n19', 'service'],
  SERVICE_ID_REQUIRED:         ['n13', 'service'],
  SLOT_IN_PAST:                ['n12', 'time'],
  PATIENT_NOT_FOUND:           ['n13', 'service'],
  PATIENT_ACCESS_DENIED:       ['n13', 'service'],
}
const wrong = Object.entries(TABLE).filter(([code, [key, step]]) => {
  const got = resolveClinicError(code)
  return got.text !== CLINIC_TEXT[key] || got.backTo !== step || got.mapped !== true
})
yes("T-هـ-b1  🔴 all 8 error codes of §6's table resolve to the exact ratified string AND the exact "
    + "return step — measured per code, not as a count",
    wrong.length === 0, wrong.length ? `wrong: ${wrong.map(([c]) => c)}` : '8/8 exact')

yes("T-هـ-b2  🔴 THREE different causes share status 409 and still read differently — SLOT_TAKEN "
    + "says ن-١٢, SERVICE_NOT_BOOKABLE_ONLINE says ن-١٨, SERVICE_MISCONFIGURED says ن-١٩. Branching "
    + "on the status alone would tell a patient the slot was taken when it was not",
    resolveClinicError('SLOT_TAKEN').text === CLINIC_TEXT.n12
    && resolveClinicError('SERVICE_NOT_BOOKABLE_ONLINE').text === CLINIC_TEXT.n18
    && resolveClinicError('SERVICE_MISCONFIGURED').text === CLINIC_TEXT.n19
    && new Set([CLINIC_TEXT.n12, CLINIC_TEXT.n18, CLINIC_TEXT.n19]).size === 3)

yes("T-هـ-b3  only the time-related refusals refresh the slot list, and they return to ④ — the "
    + "patient is never sent back to the beginning and never loses their typed details (§2)",
    resolveClinicError('SLOT_TAKEN').refreshSlots === true
    && resolveClinicError('SLOT_IN_PAST').refreshSlots === true
    && resolveClinicError('RESOURCE_SERVICE_MISMATCH').refreshSlots === false
    && resolveClinicError('SLOT_TAKEN').backTo === 'time')

yes("T-هـ-b4  an UNMAPPED or missing code falls back to ن-١٣ and step ①, and says so (`mapped:false`) "
    + "— silence is a missing text, not neutral behaviour",
    resolveClinicError('SOMETHING_NEW').text === CLINIC_TEXT.n13
    && resolveClinicError(null).text === CLINIC_TEXT.n13
    && resolveClinicError(undefined).mapped === false
    && resolveClinicError('SOMETHING_NEW').backTo === 'service')

yes("T-هـ-b5  the map itself holds exactly the 8 codes §6 names — no more, no fewer",
    Object.keys(CLINIC_ERROR_MAP).length === 8
    && Object.keys(TABLE).every((c) => c in CLINIC_ERROR_MAP),
    Object.keys(CLINIC_ERROR_MAP).length + ' codes')

// ── §2's back-cascade ───────────────────────────────────────────────────────────────────────────
yes("T-هـ-b6  returning to ① kills BOTH doctor and time — eligibility and duration both changed",
    JSON.stringify(invalidationOnReturnTo('service')) === JSON.stringify({ doctor: true, time: true }))
yes("T-هـ-b7  returning to ② or ③ kills the time ONLY — the calendar is that doctor's",
    JSON.stringify(invalidationOnReturnTo('doctor')) === JSON.stringify({ doctor: false, time: true })
    && JSON.stringify(invalidationOnReturnTo('day')) === JSON.stringify({ doctor: false, time: true }))
yes("T-هـ-b8  🔴 returning to ⑤ kills NOTHING — the patient's typed details are never cleared, which "
    + "is what makes a 409 recoverable instead of a restart",
    JSON.stringify(invalidationOnReturnTo('patient')) === JSON.stringify({ doctor: false, time: false })
    && JSON.stringify(invalidationOnReturnTo('confirm')) === JSON.stringify({ doctor: false, time: false }))

// ── shape ───────────────────────────────────────────────────────────────────────────────────────
yes("T-هـ-b9  §2's six steps, in order",
    JSON.stringify(CLINIC_STEPS)
      === JSON.stringify(['service', 'doctor', 'day', 'time', 'patient', 'confirm']),
    CLINIC_STEPS.join(' → '))
yes("T-هـ-b10  every ratified string is a non-empty string — no placeholder slipped in",
    Object.values(CLINIC_TEXT).every((v) => typeof v === 'string' && v.trim().length > 0),
    `${Object.keys(CLINIC_TEXT).length} strings`)

process.stdout.write(JSON.stringify(r))
