/**
 * OffersSection — Dynamic Section Renderer
 * data: { heading_ar, items: [{ title_ar, desc_ar, badge, accent }] }
 */
import { motion } from 'framer-motion'

export default function OffersSection({ data, accent }) {
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
          {data.heading_ar || 'عروضنا'}
        </h2>
        <div style={{ width: 36, height: 3, background: accent, borderRadius: 2 }} />
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 14,
      }}>
        {items.map((item, i) => {
          const itemAccent = item.accent || accent
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 200, damping: 24, delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              style={{
                position: 'relative',
                borderRadius: 14,
                padding: '20px 20px 18px',
                background: `linear-gradient(135deg, ${itemAccent}18 0%, rgba(255,255,255,0.03) 60%)`,
                border: `1px solid ${itemAccent}33`,
                overflow: 'hidden',
              }}
            >
              {item.badge && (
                <span style={{
                  display: 'inline-block',
                  marginBottom: 12,
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: itemAccent,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  fontFamily: "'Cairo', sans-serif",
                }}>
                  {item.badge}
                </span>
              )}
              {item.title_ar && (
                <h3 style={{
                  margin: '0 0 6px',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#f0f0f5',
                  fontFamily: "'Cairo', sans-serif",
                }}>
                  {item.title_ar}
                </h3>
              )}
              {item.desc_ar && (
                <p style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.5)',
                  lineHeight: 1.6,
                  fontFamily: "'Cairo', sans-serif",
                }}>
                  {item.desc_ar}
                </p>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
