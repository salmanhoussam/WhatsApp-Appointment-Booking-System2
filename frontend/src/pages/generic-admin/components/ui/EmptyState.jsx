import { T, FONT } from '../../theme'

// Shared "no data yet" content (Dashboard Design System Completion, 2026-08-05) -- replaces the 8
// independently-coded empty-state blocks found across Overview/Catalog/Orders. Deliberately has no
// card chrome of its own -- callers wrap it in <Card> (or a <td colSpan> for table empty-rows), same
// as every existing usage already does, so it drops into both contexts unchanged.
export default function EmptyState({ icon, message, subMessage, style }) {
  return (
    <div
      style={{
        textAlign: 'center',
        color: T.textMuted,
        fontSize: 13,
        fontFamily: FONT,
        padding: '48px 24px',
        ...style,
      }}
    >
      {icon && <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>}
      <div>{message}</div>
      {subMessage && (
        <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>{subMessage}</div>
      )}
    </div>
  )
}
