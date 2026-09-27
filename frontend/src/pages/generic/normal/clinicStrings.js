/**
 * clinicStrings.js — the 19 patient-facing strings, ratified verbatim before any code existed.
 *
 * Source of truth: .claudedocs/architecture/CLINIC_WEB_UX_CONTRACT.md §6, approved by Salman
 * (2026-09-26, with ن-١٨/ن-١٩ added 2026-09-27 alongside the F-2 decisions). §6's own heading says
 * it: "تُعتمَد حرفيّاً قبل أيِّ كود" — ratified verbatim, before any code.
 *
 * 🔴 NOT ONE OF THESE MAY BE REWORDED, SHORTENED OR "IMPROVED" HERE.
 * scripts/test_p5e_clinic_ui.py parses §6's table out of the contract and compares every string
 * BYTE-FOR-BYTE with this file. A typo of mine fails that gate; so does a well-meant edit. If a
 * string needs to change, it changes in the contract first, with Salman's word, and then here.
 *
 * WHY THE SERVER'S OWN MESSAGES NEVER APPEAR
 * The service layer raises English developer-facing sentences ("This slot is already reserved..."),
 * and §6 is explicit: "ولا تُعرَض رسالةُ الخادمِ للمريضِ أبداً". The UI branches on `error.code`
 * from the envelope — a stable name — never on prose. That is also why the 55 call sites reading
 * `data.detail` are out of scope by decision: the clinic is built on error.code from line one.
 *
 * DIALECT, per §6's closing note: polite Lebanese, as in Lia's texts — neither stiff Modern
 * Standard nor overdone slang. And no new emoji; that rule already stands.
 *
 * 🔴 ARABIC ONLY, AND THAT IS A DECLARED GAP, NOT AN OVERSIGHT.
 * §6 ratified Arabic. No English equivalents were ever approved, and inventing them here would be
 * exactly the "اجتهاد في الصياغة" this file forbids. So a visitor who switches the page to English
 * still sees these Arabic strings. That is a real, open item for whoever owns bilingual clinic copy
 * (ADR-0006 covers the barber path); it is written down rather than papered over with a guess.
 */

/** §6's table, keyed by its own ن-numbers so a reader can diff this against the contract by eye. */
export const CLINIC_TEXT = {
  n1:  'احجز موعدك',
  n2:  'شو الخدمة يلي بتحتاجها؟',
  n3:  'مع أي دكتور؟',
  n4:  'أي يوم بيناسبك؟',
  n5:  'اختر الوقت',
  n6:  'الموعد إلك ولا لشخص تاني؟',
  n7_self:  'إلي',
  n7_other: 'لشخص تاني',
  n8:  'ما في دكتور بيقدّم هالخدمة حالياً.',
  n9:  'ما في مواعيد فاضية بهذا اليوم. جرّب يوم تاني.',
  n10_name:  'اسمك',
  n10_phone: 'رقمك',
  n11_name:  'اسم المريض',
  n11_phone: 'رقمك للتواصل',
  n12: 'هالوقت انحجز قبل شوي. اختر وقت تاني — بياناتك محفوظة.',
  n13: 'هالخدمة أو الدكتور ما عاد متاح. خلينا نبلّش من جديد.',
  n14: 'ما قدرنا نجيب المعلومات. جرّب مرة تانية.',
  n14_retry: 'إعادة المحاولة',
  n15: 'أكّد الموعد',
  n15_sending: 'عم نأكّد...',
  n16: 'رجوع',
  n17: 'رح نتواصل معك على الرقم يلي كتبته.',
  n18: 'هذه الخدمة مخصصة للحجز الداخلي فقط.',
  n19: 'لا يمكن الحجز (مدة الخدمة غير محددة).',
}

/**
 * §5's own button for the "zero doctors perform this service" state, which §5 is careful to call
 * NOT an error: it is the correct result of the hard eligibility filter (ق-٤-ز). Ratified in §5's
 * table ("ن-٨ + زرّ «اختر خدمةً ثانية»"), so it lives here with the rest rather than being typed
 * inline at the one place it renders.
 */
export const CLINIC_PICK_ANOTHER_SERVICE = 'اختر خدمةً ثانية'

/**
 * The success screen's four strings. §5 and §6 both say the existing success screen stays as it is,
 * "بنصوصِها الحاليّةِ كما هي" — so these are COPIED from ReservePage.jsx's own SuccessScreen, not
 * written. They are duplicated here for one reason: that component is dark-themed (white text) and
 * the clinic page is light by §8, so it cannot be reused as a component without editing it, and
 * editing it is what the contract forbids. The gate asserts each of these appears verbatim inside
 * ReservePage.jsx, so the copy cannot drift from the original.
 */
export const CLINIC_SUCCESS = {
  title:   'تم تأكيد الحجز!',
  refLabel: 'رقم الحجز:',
  note:    'سنتواصل معك على الرقم الذي أدخلته للتأكيد.',
  home:    'العودة للرئيسية',
}

/** The six steps of §2, in order. */
export const CLINIC_STEPS = ['service', 'doctor', 'day', 'time', 'patient', 'confirm']

/**
 * §6's second table: `error.code` -> which string the patient reads, and which step they return to.
 * 🔴 The FIRST table is not enough on its own, and §6 says why: `staff_only` stayed 409 rather than
 * 403 (Salman's decision — 403 would have forced amending T-6 of the tenant contract), so THREE
 * different causes arrive as one 409. Branching on the status code alone would show "this slot was
 * just taken" to someone refused for an entirely different reason — the exact failure
 * rules/text-context-rule.md exists to prevent, and the reason ن-١٨/ن-١٩ were written at all.
 */
export const CLINIC_ERROR_MAP = {
  SLOT_TAKEN:                  { text: 'n12', backTo: 'time',    refreshSlots: true },
  SLOT_IN_PAST:                { text: 'n12', backTo: 'time',    refreshSlots: true },
  RESOURCE_SERVICE_MISMATCH:   { text: 'n13', backTo: 'service' },
  SERVICE_NOT_BOOKABLE_ONLINE: { text: 'n18', backTo: 'service' },
  SERVICE_MISCONFIGURED:       { text: 'n19', backTo: 'service' },
  SERVICE_ID_REQUIRED:         { text: 'n13', backTo: 'service' },
  PATIENT_NOT_FOUND:           { text: 'n13', backTo: 'service' },
  PATIENT_ACCESS_DENIED:       { text: 'n13', backTo: 'service' },
}

/**
 * Resolve a failed confirmation into what the patient reads and where they go back to.
 * An UNMAPPED or missing code falls back to ن-١٣ and step ①, deliberately: §6 gives no text for a
 * cause nobody classified, and silence is a missing text rather than neutral behaviour
 * (rules/text-context-rule.md, consequence 1). ن-١٣ is the safe one — it says "let's start again"
 * and never claims a specific cause that may be wrong.
 */
export function resolveClinicError(code) {
  const hit = CLINIC_ERROR_MAP[code]
  if (!hit) return { text: CLINIC_TEXT.n13, backTo: 'service', refreshSlots: false, mapped: false }
  return {
    text: CLINIC_TEXT[hit.text],
    backTo: hit.backTo,
    refreshSlots: !!hit.refreshSlots,
    mapped: true,
  }
}

/**
 * §2's cascade: going back invalidates only what the change actually invalidates, and never the
 * patient's typed details.
 *   to ① service -> doctor AND time die (eligibility and duration both changed)
 *   to ② doctor  -> time dies only (the calendar is that doctor's)
 *   to ③ day     -> time dies only
 *   to ⑤ patient -> nothing dies
 */
export function invalidationOnReturnTo(step) {
  if (step === 'service') return { doctor: true, time: true }
  if (step === 'doctor' || step === 'day') return { doctor: false, time: true }
  return { doctor: false, time: false }
}
