/**
 * PhoneField — the one phone input for the whole platform.
 *
 * Established 2026-09-08 (`.claude/rules/phone-numbers.md`), from a real production failure: a
 * staff member's number was stored as a bare national number, Meta rejected the WhatsApp send, and
 * the owner was told the invite had gone out. The rule that came out of it:
 *
 *     Storage is always WITH the country code. Entry is always WITHOUT it.
 *
 * So this component shows a country selector (defaulting to Lebanon) beside a national-number
 * input, and its `onChange` emits the **already-normalised international value** — "96170764479".
 * A call site therefore never sees, stores, or submits a partial number; it keeps whatever state
 * shape it already had.
 *
 * STYLING. It is used across five different visual languages (Field, FieldLight, Input, GlassInput,
 * raw inputs on tenant pages), so it imposes none: pass `inputStyle` / `selectStyle` /
 * `containerStyle` / `className` and it inherits the surrounding form's look. Only layout and
 * direction are opinionated, because both are correctness rather than taste — the number and the
 * code must read LTR even inside an RTL page.
 */
import { useMemo } from 'react'

// Kept in sync with app/core/phone.py's SUPPORTED_COUNTRY_CODES — same list, same order, so the
// selector can never offer a prefix the backend normaliser would not recognise.
export const COUNTRIES = [
  { code: '961', flag: '🇱🇧', labelAr: 'لبنان',      labelEn: 'Lebanon' },
  { code: '966', flag: '🇸🇦', labelAr: 'السعودية',   labelEn: 'Saudi Arabia' },
  { code: '971', flag: '🇦🇪', labelAr: 'الإمارات',   labelEn: 'UAE' },
  { code: '970', flag: '🇵🇸', labelAr: 'فلسطين',     labelEn: 'Palestine' },
  { code: '962', flag: '🇯🇴', labelAr: 'الأردن',     labelEn: 'Jordan' },
  { code: '20',  flag: '🇪🇬', labelAr: 'مصر',        labelEn: 'Egypt' },
  { code: '965', flag: '🇰🇼', labelAr: 'الكويت',     labelEn: 'Kuwait' },
  { code: '974', flag: '🇶🇦', labelAr: 'قطر',        labelEn: 'Qatar' },
  { code: '973', flag: '🇧🇭', labelAr: 'البحرين',    labelEn: 'Bahrain' },
  { code: '968', flag: '🇴🇲', labelAr: 'عُمان',      labelEn: 'Oman' },
]

export const DEFAULT_COUNTRY_CODE = '961'

const _CODES_LONGEST_FIRST = COUNTRIES.map(c => c.code).sort((a, b) => b.length - a.length)

/** Mirror of app/core/phone.py:split_for_display. */
export function splitPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return [DEFAULT_COUNTRY_CODE, '']
  for (const code of _CODES_LONGEST_FIRST) {
    if (digits.startsWith(code) && digits.length > code.length) {
      return [code, digits.slice(code.length)]
    }
  }
  return [DEFAULT_COUNTRY_CODE, digits]
}

/** Mirror of app/core/phone.py:normalize_for_storage, for the value this component emits. */
export function joinPhone(countryCode, national) {
  const digits = String(national ?? '').replace(/\D/g, '').replace(/^0+/, '')
  return digits ? `${countryCode}${digits}` : ''
}

export default function PhoneField({
  value,
  onChange,                 // (fullInternationalValue: string) => void
  label,
  required        = false,
  disabled        = false,
  placeholder     = '70 123 456',
  lang            = 'ar',
  error,
  containerStyle,
  labelStyle,
  selectStyle,
  inputStyle,
  className,
  inputProps      = {},
  ...rest
}) {
  const [countryCode, national] = useMemo(() => splitPhone(value), [value])

  const emit = (cc, nat) => onChange?.(joinPhone(cc, nat))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }} className={className} {...rest}>
      {label && (
        <label style={{ fontSize: 13, opacity: 0.85, ...labelStyle }}>
          {label}{required && <span style={{ color: '#e5484d' }}> *</span>}
        </label>
      )}

      {/* dir="ltr" is not styling: a phone number is read left-to-right in every locale, and the
          country code must sit to the LEFT of the number even on an RTL page. */}
      <div style={{ display: 'flex', gap: 6, direction: 'ltr', width: '100%' }}>
        <select
          value={countryCode}
          disabled={disabled}
          onChange={e => emit(e.target.value, national)}
          aria-label={lang === 'ar' ? 'مفتاح الدولة' : 'Country code'}
          style={{
            ...inputStyle, ...selectStyle,
            // AFTER the spread, deliberately: every call site passes a form's own inputStyle, and
            // those are almost always `width: 100%`. Inherited as-is, the selector ate the entire
            // row and pushed the number input out of view -- reported from a real dashboard,
            // 2026-09-09. Sizing is this component's own responsibility, not the caller's.
            flex: '0 0 auto', width: 'auto', minWidth: 92, maxWidth: 120,
            direction: 'ltr', cursor: disabled ? 'default' : 'pointer',
            paddingInline: 8,
          }}
        >
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>
              {c.flag} +{c.code}
            </option>
          ))}
        </select>

        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={national}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          // Strip non-digits as the user types so a pasted "+961 70 764 479" cannot double the
          // country code once joinPhone prefixes the selected one.
          onChange={e => emit(countryCode, e.target.value)}
          // Same reason as the selector above: `width` comes from flex here, never from the
          // caller's 100%, or the two controls overflow their row.
          style={{ ...inputStyle, flex: '1 1 auto', width: 'auto', minWidth: 0, direction: 'ltr' }}
          {...inputProps}
        />
      </div>

      {error && <span style={{ fontSize: 12, color: '#e5484d' }}>{error}</span>}
    </div>
  )
}
