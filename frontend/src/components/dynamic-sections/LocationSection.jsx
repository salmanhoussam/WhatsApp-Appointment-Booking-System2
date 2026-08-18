/**
 * LocationSection — Dynamic Section Renderer
 * data: { heading_ar, para_ar, maps_url, tags: string[] }
 *
 * P2 empty-state remediation (2026-08-16, ALZABT_P2_EMPTY_STATE_LOCATION_STORY_PROPOSAL.md,
 * Option A, approved by Salman): a literal placeholder string ("قريباً") seeded as real content
 * is treated as no real content at all -- same "never render placeholder text indistinguishable
 * from real data" principle HoursSection.jsx already applies, extended here rather than
 * reinvented. When there's no real paragraph, no tags, and no map, the section renders nothing
 * (same mechanism GallerySection/TestimonialsSection already use) instead of a bare heading.
 */
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { homepageTokens } from './homepageTokens'

// Known seeded placeholder values that must never render as if they were real location content.
const PLACEHOLDER_PARA_VALUES = new Set(['قريباً', 'قريبا'])

export default function LocationSection({ data, accent, homepageTheme }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const useBlackGold = homepageTheme === 'black_gold'
  const themeAccent = useBlackGold ? homepageTokens.accent : accent

  const tags = (data.tags ?? []).filter(Boolean)
  const paraText   = (data.para_ar ?? '').trim()
  const hasRealPara = paraText.length > 0 && !PLACEHOLDER_PARA_VALUES.has(paraText)

  if (!hasRealPara && tags.length === 0 && !data.maps_url) return null

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
            color: useBlackGold ? homepageTokens.text : '#f0f0f5',
            letterSpacing: '-0.01em',
            fontFamily: useBlackGold ? homepageTokens.headingFont : "'Cairo', sans-serif",
          }}
        >
          {data.heading_ar || 'الموقع'}
        </motion.h2>
        <div style={{ width: 36, height: 3, background: themeAccent, borderRadius: 2 }} />
      </div>

      {/* Info-vs-map asymmetry (2026-08-18, Design Spec SS3.5): a small, quiet info column next to
          a visually larger map -- not a stacked list. flex (not a fixed-breakpoint grid) so it
          naturally stacks on narrow viewports once the two blocks no longer fit side by side,
          same responsive-without-breakpoints convention already used elsewhere in this codebase.
          Info column alone (no map) just takes the full width, unchanged from before. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
        <div style={{ flex: data.maps_url ? '1 1 260px' : '1 1 100%' }}>
          {/* Paragraph */}
          {hasRealPara && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.08 }}
              style={{
                margin: '0 0 20px',
                fontSize: 15,
                color: useBlackGold ? homepageTokens.mutedText : 'rgba(255,255,255,0.55)',
                lineHeight: 1.85,
                fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
                whiteSpace: 'pre-line',
              }}
            >
              {paraText}
            </motion.p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.14 }}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
            >
              {tags.map((tag, i) => (
                <span key={i} style={{
                  padding: '5px 14px',
                  borderRadius: 999,
                  border: `1px solid ${themeAccent}55`,
                  color: themeAccent,
                  fontSize: 12,
                  fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
                  fontWeight: 600,
                }}>
                  {tag}
                </span>
              ))}
            </motion.div>
          )}
        </div>

        {/* Map embed -- flex: 2 gives it the larger visual weight the Design Spec calls for */}
        {data.maps_url && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.2 }}
            style={{
              flex: '2 1 320px',
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${useBlackGold ? homepageTokens.border : 'rgba(255,255,255,0.07)'}`,
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
      </div>
    </section>
  )
}
