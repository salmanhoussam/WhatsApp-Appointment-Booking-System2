/**
 * LocationSection — Dynamic Section Renderer
 * data: { heading_ar, para_ar, maps_url, tags: string[] }
 */
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

export default function LocationSection({ data, accent }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  const tags = (data.tags ?? []).filter(Boolean)

  return (
    <section ref={ref} style={{ marginBottom: 56, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{
            margin: 0,
            fontSize: 'clamp(20px, 3vw, 30px)',
            fontWeight: 800,
            color: '#f0f0f5',
            letterSpacing: '-0.01em',
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {data.heading_ar || 'الموقع'}
        </motion.h2>
        <div style={{ width: 36, height: 3, background: accent, borderRadius: 2 }} />
      </div>

      {/* Paragraph */}
      {data.para_ar && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.08 }}
          style={{
            margin: '0 0 20px',
            fontSize: 15,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.85,
            fontFamily: "'Cairo', sans-serif",
            whiteSpace: 'pre-line',
          }}
        >
          {data.para_ar}
        </motion.p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.14 }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: data.maps_url ? 20 : 0 }}
        >
          {tags.map((tag, i) => (
            <span key={i} style={{
              padding: '5px 14px',
              borderRadius: 999,
              border: `1px solid ${accent}55`,
              color: accent,
              fontSize: 12,
              fontFamily: "'Cairo', sans-serif",
              fontWeight: 600,
            }}>
              {tag}
            </span>
          ))}
        </motion.div>
      )}

      {/* Map embed */}
      {data.maps_url && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.2 }}
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.07)',
            height: 300,
          }}
        >
          <iframe
            src={data.maps_url}
            width="100%"
            height="300"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="location-map"
          />
        </motion.div>
      )}
    </section>
  )
}
