import { motion } from 'framer-motion'
import { colors, radius } from '../tokens'

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
 */
export default function CategoryPill({ cat, active, accent = colors.gold, onClick }) {
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
      {cat.name_ar || cat.name_en}
    </motion.button>
  )
}
