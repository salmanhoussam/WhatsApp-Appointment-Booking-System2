import { T } from '../../theme'

// Shared content-container style (Dashboard Design System Completion, 2026-08-05) -- replaces the
// independently-defined card/panel wrappers that used to exist per-tab (OverviewTab had 4 of its
// own, Catalog/Orders/Settings each had one local `glass` const). Same visual shape already
// established and Browser-Verified in ReservationsTab.jsx's own `card` const -- reused here rather
// than re-invented, per this migration's own Design Principle (consistency over creativity).
export default function Card({ children, padding = 20, style, ...rest }) {
  return (
    <div
      style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        boxShadow: T.shadow,
        padding,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
