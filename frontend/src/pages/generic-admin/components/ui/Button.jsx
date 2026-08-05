import { T, FONT } from '../../theme'

// Shared button (Dashboard Design System Completion, 2026-08-05) -- replaces the ~19 independently
// hand-rolled inline button styles found across Overview/Catalog/Orders/Settings. Variant shapes are
// pulled from patterns already shipped and Browser-Verified elsewhere in the dashboard (Catalog's
// modal Save/Cancel pair for primary/secondary, Orders' outlined refresh button for secondary,
// ReservationsTab's danger-tinted status colors for danger) -- not a new look, per this migration's
// Design Principle (consistency over creativity).
const SIZES = {
  md: { padding: '8px 16px', fontSize: 13 },
  sm: { padding: '5px 12px', fontSize: 12 },
}

export default function Button({
  children,
  variant = 'secondary', // 'primary' | 'secondary' | 'danger'
  size = 'md',           // 'md' | 'sm'
  color,                 // tenant accent override for primary/secondary; defaults to T.green
  disabled = false,
  style,
  ...rest
}) {
  const accent = color || T.green
  const sizeStyle = SIZES[size] || SIZES.md

  const variants = {
    primary: {
      background: accent,
      border: `1px solid ${accent}`,
      color: '#fff',
    },
    secondary: {
      background: T.cardBg,
      border: `1px solid ${T.border}`,
      color: T.textSecond,
    },
    danger: {
      background: T.dangerSoft,
      border: `1px solid ${T.danger}33`,
      color: T.danger,
    },
  }

  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        ...sizeStyle,
        borderRadius: 8,
        fontFamily: FONT,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s, background 0.15s',
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
