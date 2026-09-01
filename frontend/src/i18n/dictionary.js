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
