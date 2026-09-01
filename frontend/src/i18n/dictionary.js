/**
 * dictionary.js — shared static UI-string dictionary for the real tenant product
 * (ADR-0006, Phase 1). New, isolated code — not yet imported by any live component.
 *
 * Flat key -> { ar, en } shape, reusing the convention already proven correct in
 * `pages/marketing/translations.js` (a real, complete, working system for its own audience) —
 * not inventing a third shape alongside it.
 *
 * Seeded with the generic, cross-page strings the Bilingual/i18n Architecture Audit
 * (.claude/docs/implementation/BILINGUAL_I18N_ARCHITECTURE_AUDIT/evidence.md) found needing
 * this — TenantModuleNav/CartPage/ReservePage-class vocabulary that currently has no English
 * rendering path at all (Category C2). Deliberately NOT an attempt to enumerate every string in
 * the app up front — extended key-by-key as each real page is migrated (ADR-0006's own Migration
 * Plan), not guessed at in bulk now.
 */

export const DICTIONARY = {
  bookNow:       { ar: 'احجز الآن',       en: 'Book Now' },
  addToCart:     { ar: 'أضف للسلة',        en: 'Add to Cart' },
  viewDetails:   { ar: 'عرض التفاصيل',     en: 'View Details' },
  available:     { ar: 'متاح',             en: 'Available' },
  unavailable:   { ar: 'غير متاح',         en: 'Unavailable' },
  booked:        { ar: 'محجوز',            en: 'Booked' },
  search:        { ar: 'ابحث...',          en: 'Search...' },
  noResults:     { ar: 'لا توجد نتائج',    en: 'No results' },
  cart:          { ar: 'السلة',            en: 'Cart' },
  viewCart:      { ar: 'عرض السلة',        en: 'View Cart' },
  confirm:       { ar: 'تأكيد',            en: 'Confirm' },
  cancel:        { ar: 'إلغاء',            en: 'Cancel' },
  loading:       { ar: 'جارٍ التحميل...',  en: 'Loading...' },
  signIn:        { ar: 'تسجيل الدخول',     en: 'Sign In' },
  createAccount: { ar: 'إنشاء حساب',       en: 'Create Account' },
  retry:         { ar: 'إعادة المحاولة',    en: 'Retry' },
  total:         { ar: 'المجموع',          en: 'Total' },
  featured:      { ar: 'مميز',             en: 'Featured' },
  notAvailable:  { ar: 'غير متوفر',         en: 'Not Available' },
  moreDetails:   { ar: 'تفاصيل أكثر',       en: 'More Details' },
  sending:       { ar: 'جارٍ الإرسال...',    en: 'Sending...' },

  // Reservation flow (ADR-0006, Phase 4 — ReservePage.jsx's BookingPage/CalendarPanel, previously
  // the one real page left entirely un-migrated after Phase 3).
  bookingHeading:       { ar: 'احجز موعدك',                    en: 'Book Your Appointment' },
  stepChooseService:    { ar: 'اختر الخدمة',                   en: 'Choose Service' },
  stepChooseBarber:     { ar: 'اختر الحلاق',                    en: 'Choose Barber' },
  stepChooseDateShort:  { ar: 'اختر الموعد',                    en: 'Choose Date' },
  sectionChooseDateTime:{ ar: 'اختر اليوم والوقت',              en: 'Choose Date & Time' },
  availableDaysNote:    { ar: 'الأيام المتاحة قابلة للاختيار',   en: 'Available days can be selected' },
  slotsErrorText:       { ar: 'حدث خطأ أثناء تحميل المواعيد. يرجى المحاولة مجدداً.', en: 'An error occurred while loading time slots. Please try again.' },
  noSlotsText:          { ar: 'لا توجد مواعيد متاحة في هذا اليوم — جرّب يوماً آخر.', en: 'No time slots available on this day — try another day.' },
  localTimeNote:        { ar: 'التوقيت المحلي (GMT+3)',          en: 'Local time (GMT+3)' },
  bookingSummary:       { ar: 'ملخص الحجز',                     en: 'Booking Summary' },
  serviceLabel:         { ar: 'الخدمة',                         en: 'Service' },
  barberLabel:          { ar: 'الحلاق',                         en: 'Barber' },
  dayLabel:             { ar: 'اليوم',                          en: 'Day' },
  timeLabel:             { ar: 'الوقت',                          en: 'Time' },
  durationLabel:        { ar: 'المدة',                          en: 'Duration' },
  priceLabel:           { ar: 'السعر',                          en: 'Price' },
  minutesUnit:          { ar: 'دقيقة',                          en: 'min' },
  quickMethod:          { ar: 'طريقة سريعة ومريحة',              en: 'Quick and convenient' },
  confirmViaWhatsAppBtn:{ ar: 'متابعة الحجز عبر واتساب',          en: 'Continue via WhatsApp' },
  confirmingText:       { ar: 'جارٍ التأكيد...',                 en: 'Confirming...' },
  orSeparator:          { ar: 'أو',                              en: 'or' },
  completeFromSite:     { ar: 'أكمل الحجز من الموقع',            en: 'Complete Booking on Site' },
  confirmedInstantly:   { ar: 'سيتم تأكيد الحجز فوراً',           en: 'Your booking will be confirmed instantly' },
  namePlaceholder:      { ar: 'الاسم',                          en: 'Name' },
  phonePlaceholder:     { ar: 'رقم الهاتف',                      en: 'Phone Number' },
  confirmBookingBtn:    { ar: 'تأكيد الحجز من الموقع',           en: 'Confirm Booking' },
  bookingCreatedTitle:  { ar: 'تم إنشاء حجزك',                   en: 'Your Booking Has Been Created' },
  whatsappConfirmMsg:   { ar: 'فتحنا لك واتساب برسالة جاهزة — أرسلها لصاحب المحل لتأكيد الحجز نهائياً.', en: 'We opened WhatsApp with a ready message — send it to the shop owner to finalize your booking.' },
  localConfirmMsg:      { ar: 'تم تسجيل حجزك — سيتواصل معك صاحب المحل لتأكيد الموعد.', en: 'Your booking has been recorded — the shop owner will contact you to confirm the appointment.' },
  reservationNumberLabel:{ ar: 'رقم الحجز',                      en: 'Booking Number' },
  openWhatsAppLink:     { ar: 'لم تفتح صفحة واتساب؟ اضغط هنا',    en: "WhatsApp didn't open? Click here" },
  customerSupportLabel: { ar: 'دعم العملاء',                     en: 'Customer Support' },
  ourLocationLabel:     { ar: 'موقعنا لبنان',                     en: 'Our location: Lebanon' },
  workingHoursLabel:    { ar: 'ساعات العمل',                     en: 'Working Hours' },
  dailyPrefix:          { ar: 'يومياً',                          en: 'Daily' },
  reservationUnavailable:{ ar: 'خدمة الحجز غير متاحة حالياً.',    en: 'Booking service is currently unavailable.' },
  reservationLoadError: { ar: 'حدث خطأ أثناء تحميل صفحة الحجز. يرجى المحاولة مجدداً.', en: 'An error occurred while loading the booking page. Please try again.' },
}

/**
 * t(key, lang) — resolves one dictionary entry. Falls back to Arabic if the requested
 * language's string is missing (same asymmetric-Arabic-default convention as
 * resolveTenantText.js and UnitCard.jsx's own fallback logic), then to the raw key itself if the
 * key isn't in the dictionary at all — never throws, never renders blank.
 */
export function t(key, lang = 'ar') {
  const entry = DICTIONARY[key]
  if (!entry) return key
  return entry[lang] || entry.ar || key
}
