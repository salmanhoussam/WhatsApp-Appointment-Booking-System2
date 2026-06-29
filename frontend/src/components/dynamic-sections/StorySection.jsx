/**
 * StorySection — Dynamic Section Renderer
 * data: { heading_ar, body_ar, stats: [{num, label}] }
 */
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

function StatCard({ num, label, accent, delay }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: 'spring', stiffness: 160, damping: 22, delay }}
      style={{
        textAlign: 'center',
        padding: '20px 24px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.07)`,
        flex: '1 1 120px',
        minWidth: 100,
      }}
    >
      <div style={{
        fontSize: 'clamp(26px, 4vw, 42px)',
        fontWeight: 900,
        color: accent,
        lineHeight: 1,
        marginBottom: 8,
        fontFamily: "'Cairo', sans-serif",
      }}>
        {num}
      </div>
      <div style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: "'Cairo', sans-serif",
        lineHeight: 1.4,
      }}>
        {label}
      </div>
    </motion.div>
  )
}

export default function StorySection({ data, accent }) {
  const ref   = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const stats = (data.stats ?? []).filter(s => s.num)

  return (
    <section ref={ref} style={{ marginBottom: 56, direction: 'rtl' }}>
      {/* Thin accent line */}
      <div style={{ width: 36, height: 3, background: accent, borderRadius: 2, marginBottom: 20 }} />

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        style={{
          margin: '0 0 16px',
          fontSize: 'clamp(22px, 3.5vw, 36px)',
          fontWeight: 800,
          color: '#f0f0f5',
          letterSpacing: '-0.01em',
          fontFamily: "'Cairo', sans-serif",
        }}
      >
        {data.heading_ar || 'قصتنا'}
      </motion.h2>

      {data.body_ar && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.1 }}
          style={{
            margin: '0 0 36px',
            fontSize: 16,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.85,
            maxWidth: 700,
            fontFamily: "'Cairo', sans-serif",
            whiteSpace: 'pre-line',
          }}
        >
          {data.body_ar}
        </motion.p>
      )}

      {stats.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {stats.map((st, i) => (
            <StatCard
              key={i}
              num={st.num}
              label={st.label}
              accent={accent}
              delay={i * 0.07}
            />
          ))}
        </div>
      )}
    </section>
  )
}
