/**
 * StorySection — Dynamic Section Renderer
 * data: { heading_ar, body_ar, stats: [{num, label}] }
 */
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import EditableRegion from '../../tenant-os/EditableRegion'
import { contentSchema } from '../../tenant-os/schemas/content'
import { homepageTokens } from './homepageTokens'

function StatCard({ num, label, accent, delay, useBlackGold }) {
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
        background: useBlackGold ? homepageTokens.surface : 'rgba(255,255,255,0.03)',
        border: `1px solid ${useBlackGold ? homepageTokens.border : 'rgba(255,255,255,0.07)'}`,
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
        fontFamily: useBlackGold ? homepageTokens.headingFont : "'Cairo', sans-serif",
      }}>
        {num}
      </div>
      <div style={{
        fontSize: 13,
        color: useBlackGold ? homepageTokens.mutedText : 'rgba(255,255,255,0.5)',
        fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
        lineHeight: 1.4,
      }}>
        {label}
      </div>
    </motion.div>
  )
}

export default function StorySection({ data, accent, homepageTheme }) {
  const ref   = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const useBlackGold = homepageTheme === 'black_gold'
  const themeAccent = useBlackGold ? homepageTokens.accent : accent

  const stats  = (data.stats ?? []).filter(s => s.num)
  // P2 empty-state remediation (2026-08-16, ALZABT_P2_EMPTY_STATE_LOCATION_STORY_PROPOSAL.md) --
  // defensive hardening only, no observed bug on RK/Ali (both have real body_ar today). Protects a
  // future tenant with a genuinely empty story from showing a bare heading with nothing beneath it.
  const hasBody = Boolean((data.body_ar ?? '').trim())

  if (!hasBody && stats.length === 0) return null

  return (
    <section ref={ref} style={{ marginBottom: 56 }}>
      {/* Thin accent line */}
      <div style={{ width: 36, height: 3, background: themeAccent, borderRadius: 2, marginBottom: 20 }} />

      <EditableRegion capability="content" fieldKey="story.heading" schema={contentSchema['story.heading']}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{
            margin: '0 0 16px',
            fontSize: 'clamp(22px, 3.5vw, 36px)',
            fontWeight: 800,
            color: useBlackGold ? homepageTokens.text : '#f0f0f5',
            letterSpacing: '-0.01em',
            fontFamily: useBlackGold ? homepageTokens.headingFont : "'Cairo', sans-serif",
          }}
        >
          {data.heading_ar || 'قصتنا'}
        </motion.h2>
      </EditableRegion>

      {data.body_ar && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.1 }}
          style={{
            margin: '0 0 36px',
            fontSize: 16,
            color: useBlackGold ? homepageTokens.mutedText : 'rgba(255,255,255,0.55)',
            lineHeight: 1.85,
            maxWidth: 700,
            fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
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
              accent={themeAccent}
              delay={i * 0.07}
              useBlackGold={useBlackGold}
            />
          ))}
        </div>
      )}
    </section>
  )
}
