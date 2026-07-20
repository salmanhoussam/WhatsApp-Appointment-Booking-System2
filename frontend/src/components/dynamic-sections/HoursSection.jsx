/**
 * HoursSection — Dynamic Section Renderer
 * data: { heading_ar, rows: [{ day_ar, open_ar, close_ar, closed }] }
 */
import { motion } from 'framer-motion'

export default function HoursSection({ data, accent }) {
  const rows = data.rows ?? []

  if (rows.length === 0) return null

  return (
    <section style={{ marginBottom: 56, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{
          margin: 0,
          fontSize: 'clamp(20px, 3vw, 30px)',
          fontWeight: 800,
          color: '#f0f0f5',
          letterSpacing: '-0.01em',
          fontFamily: "'Cairo', sans-serif",
        }}>
          {data.heading_ar || 'أوقات العمل'}
        </h2>
        <div style={{ width: 36, height: 3, background: accent, borderRadius: 2 }} />
      </div>

      {/* Rows */}
      <div style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {rows.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 220, damping: 26, delay: i * 0.05 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent',
              borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}
          >
            <span style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: '#f0f0f5',
              fontFamily: "'Cairo', sans-serif",
            }}>
              {row.day_ar}
            </span>
            {row.closed ? (
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#ef4444',
                fontFamily: "'Cairo', sans-serif",
              }}>
                مغلق
              </span>
            ) : (
              <span style={{
                fontSize: 13,
                color: accent,
                fontFamily: "'Cairo', sans-serif",
                direction: 'ltr',
              }}>
                {row.open_ar} — {row.close_ar}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  )
}
