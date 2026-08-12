// Shared light design tokens — the one light visual language across the customer-facing Booking
// Page and the admin dashboard (Salman's own approved reference, 2026-08-03). Structural only
// (background/border/text/shadow/font) — never a tenant's `primary_color`, which stays dynamic per
// tenant everywhere it's used (Alzabt Master Product Plan, Section A's "Two Distinct Brand Layers":
// tenant-rendered surfaces stay driven by Client.primary_color, this file never hardcodes over it).
//
// Previously duplicated as two separate literal copies in `pages/generic-admin/theme.js` and
// `pages/generic/normal/ReservePage.jsx` — extracted here so a future structural change (spacing,
// radius, shadow) applies once, not twice (Alzabt Master Product Plan, Section K step 1). The two
// copies had drifted on exactly one value (`shadowLg`: ReservePage.jsx had `rgba(...,0.06)`, the
// admin dashboard had `rgba(...,0.08)`) — real evidence for why this refactor matters, not just
// theoretical duplication. Kept the admin dashboard's value here (used across 10+ files vs.
// ReservePage.jsx's single local use); the visual difference is a barely-perceptible shadow-opacity
// shift on the Booking Page's cards, not a real regression.
export const T = {
  pageBg:      '#F7F8FA',
  cardBg:      '#FFFFFF',
  border:      'rgba(15,23,42,0.08)',
  borderSoft:  'rgba(15,23,42,0.05)',
  textPrimary: '#0F172A',
  textSecond:  '#6B7280',
  textMuted:   '#9CA3AF',
  green:       '#16A34A',
  greenSoft:   'rgba(22,163,74,0.10)',
  whatsapp:    '#25D366',
  danger:      '#DC2626',
  dangerSoft:  'rgba(220,38,38,0.08)',
  shadow:      '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
  shadowLg:    '0 4px 24px rgba(15,23,42,0.08)',
  shadowPopover: '0 20px 50px rgba(15,23,42,0.16)',
}

export const FONT = "'Cairo', 'Segoe UI', sans-serif"
