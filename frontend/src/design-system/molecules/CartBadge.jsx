import { motion } from 'framer-motion'
import { colors } from '../tokens'

/**
 * CartBadge — Molecule
 *
 * Fixed floating cart button — appears when cart has items.
 * Positioned bottom-left to avoid covering RTL content.
 *
 * Props:
 *   count   — number of items (renders nothing when 0)
 *   accent  — tenant primary color
 *   onClick — () => void
 */
export default function CartBadge({ count, accent = colors.gold, onClick }) {
  if (!count) return null

  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.93 }}
      style={{
        position: 'fixed',
        bottom: 28,
        left: 24,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '13px 24px',
        borderRadius: 999,
        background: accent,
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 700,
        boxShadow: `0 8px 32px ${accent}55`,
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      <span style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 800,
      }}>
        {count}
      </span>
      عرض السلة
    </motion.button>
  )
}
