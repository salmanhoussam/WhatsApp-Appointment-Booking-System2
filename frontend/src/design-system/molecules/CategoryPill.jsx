import { motion } from 'framer-motion'
import { colors, radius } from '../tokens'
import { resolveTenantText } from '../../i18n/resolveTenantText'

/**
 * CategoryPill — Molecule
 *
 * Horizontal scroll pill for category navigation.
 * Accent color is tenant-driven.
 *
 * Props:
 *   cat     — { id, name_ar, name_en }
 *   active  — boolean
 *   accent  — tenant primary color
 *   onClick — () => void
 *   lang    — optional (ADR-0006 Phase 3, 2026-09-01), default 'ar' -- existing callers that
 *             don't pass it keep their exact current behavior.
 */
export default function CategoryPill({ cat, active, accent = colors.gold, onClick, lang = 'ar' }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: '8px 20px',
        borderRadius: radius.full,
        flexShrink: 0,
        border: `1.5px solid ${active ? accent : colors.border}`,
        background: active ? `${accent}22` : colors.surface,
        color: active ? accent : colors.textMuted,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {resolveTenantText(cat, 'name', lang)}
    </motion.button>
  )
}
