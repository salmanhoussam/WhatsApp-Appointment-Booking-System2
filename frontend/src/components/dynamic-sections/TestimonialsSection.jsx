/**
 * TestimonialsSection — Dynamic Section Renderer
 * data: { heading_ar, items: [{ text_ar, author, rating }] }
 */
import { motion } from 'framer-motion'

function Stars({ rating = 5, accent }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          style={{
            fontSize: 13,
            color: i < rating ? accent : 'rgba(255,255,255,0.15)',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function TestimonialsSection({ data, accent }) {
  const items = data.items ?? []

  if (items.length === 0) return null

  return (
    <section style={{ marginBottom: 56 }}>
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
          {data.heading_ar || 'ماذا يقول زبائننا'}
        </h2>
        <div style={{ width: 36, height: 3, background: accent, borderRadius: 2 }} />
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
      }}>
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 24, delay: i * 0.06 }}
            style={{
              borderRadius: 14,
              padding: '20px 20px 18px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Stars rating={item.rating} accent={accent} />
            {item.text_ar && (
              <p style={{
                margin: '0 0 14px',
                fontSize: 13.5,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.7,
                fontFamily: "'Cairo', sans-serif",
              }}>
                {item.text_ar}
              </p>
            )}
            {item.author && (
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: accent,
                fontFamily: "'Cairo', sans-serif",
              }}>
                {item.author}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  )
}
