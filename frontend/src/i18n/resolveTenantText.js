/**
 * resolveTenantText.js — the one tenant-content fallback-pair resolver (ADR-0006, Phase 1).
 * New, isolated code — not yet imported by any live component.
 *
 * Generalizes the already-correct pattern in `design-system/molecules/UnitCard.jsx:54-55`
 * (`lang === 'ar' ? (name_ar || name_en) : (name_en || name_ar)`) past its one current caller,
 * so any tenant-authored field (a unit/service/product name, a homepage section's own heading or
 * body text) can be resolved the same, already-proven-correct way — not a new pattern invented
 * here, a real one extracted and named.
 *
 * Most tenant content today is Arabic-only (confirmed by the audit — no `content.sections` field
 * has a real `_en` value anywhere yet); resolving with `lang: 'en'` on such a record silently
 * falls back to the Arabic value rather than rendering blank, exactly like UnitCard.jsx already
 * does.
 */

/**
 * resolveTenantText(source, field, lang) — reads `source[field + '_ar']` / `source[field + '_en']`
 * with the same symmetric fallback UnitCard.jsx already proves correct.
 *
 * @param {object} source - the tenant-authored record (a unit, a service, a section's `data`, ...)
 * @param {string} field  - the field base name, e.g. 'name' for name_ar/name_en
 * @param {'ar'|'en'} lang
 * @returns {string} the resolved text, or '' if neither language variant exists
 */
export function resolveTenantText(source, field, lang = 'ar') {
  if (!source) return ''
  const ar = source[`${field}_ar`]
  const en = source[`${field}_en`]
  return lang === 'ar' ? (ar || en || '') : (en || ar || '')
}
