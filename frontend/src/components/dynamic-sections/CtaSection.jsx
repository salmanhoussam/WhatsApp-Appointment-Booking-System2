/**
 * CtaSection — Dynamic Section Renderer
 * data: { text_ar, subtext_ar, link, button_ar, variant }
 *
 * `variant` (2026-08-18, Homepage Phase 2.3, Contract §1.1 — corrects
 * ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md's original "fold into featured_items" call):
 *   undefined/"plain" — original tinted-gradient treatment, unchanged for any tenant not using
 *                        the other variants.
 *   "banner"          — full solid-accent background, the one deliberate "break the black
 *                        dominance" surface named in the Design Spec §3.4 — dark text for contrast.
 *   "promo-strip"     — compact charcoal card, thin accent border, heading+button on one row
 *                        (the "Starting from $X ... View Full Price List" reference pattern).
 * `homepageTheme` gate: same real, per-tenant opt-in as every other section this phase — when
 * `'black_gold'`, the fixed gold token replaces the tenant's own `accent` throughout, absent for
 * every tenant except Mister H (byte-identical elsewhere).
 */
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { homepageTokens } from './homepageTokens'

export default function CtaSection({ data, accent, homepageTheme }) {
  const ref     = useRef(null)
  const inView  = useInView(ref, { once: true, margin: '-40px' })
  const navigate = useNavigate()
  const useBlackGold = homepageTheme === 'black_gold'
  const themeAccent = useBlackGold ? homepageTokens.accent : accent
  const variant = data.variant ?? 'plain'

  const handleClick = () => {
    if (!data.link) return
    if (data.link.startsWith('http')) {
      window.open(data.link, '_blank', 'noopener noreferrer')
    } else {
      navigate(data.link)
    }
  }

  if (variant === 'promo-strip') {
    return (
      <motion.section
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ type: 'spring', stiffness: 100, damping: 22 }}
        style={{ marginBottom: 56 }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          padding: '20px 24px',
          borderRadius: 16,
          background: useBlackGold ? homepageTokens.surface : 'rgba(255,255,255,0.03)',
          border: `1px solid ${themeAccent}40`,
        }}>
          <div>
            {data.text_ar && (
              <h3 style={{
                margin: '0 0 4px',
                fontSize: 17,
                fontWeight: 800,
                color: useBlackGold ? homepageTokens.text : '#f0f0f5',
                fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
              }}>
                {data.text_ar}
              </h3>
            )}
            {data.subtext_ar && (
              <p style={{
                margin: 0, fontSize: 13,
                color: useBlackGold ? homepageTokens.mutedText : 'rgba(255,255,255,0.5)',
                fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
              }}>
                {data.subtext_ar}
              </p>
            )}
          </div>
          {data.link && (
            <motion.button
              onClick={handleClick}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                flexShrink: 0,
                padding: '10px 22px',
                borderRadius: 999,
                background: 'transparent',
                color: themeAccent,
                border: `1px solid ${themeAccent}`,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
                whiteSpace: 'nowrap',
              }}
            >
              {data.button_ar || 'اطّلع أكثر'}
            </motion.button>
          )}
        </div>
      </motion.section>
    )
  }

  const isBanner = variant === 'banner'

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      style={{
        marginBottom: 56,
        marginLeft: -24,
        marginRight: -24,
      }}
    >
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '56px 32px',
        textAlign: 'center',
        background: isBanner
          ? themeAccent
          : `linear-gradient(135deg, ${themeAccent}22 0%, ${themeAccent}08 50%, transparent 100%)`,
        borderTop: isBanner ? 'none' : `1px solid ${themeAccent}33`,
        borderBottom: isBanner ? 'none' : `1px solid ${themeAccent}22`,
      }}>
        {/* Background glow — plain variant only, a solid banner doesn't need it */}
        {!isBanner && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400, height: 200,
            background: `radial-gradient(ellipse, ${themeAccent}18 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
        )}

        {/* Text */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {data.text_ar && (
            <h2 style={{
              margin: '0 0 12px',
              fontSize: 'clamp(22px, 4vw, 38px)',
              fontWeight: 900,
              color: isBanner ? homepageTokens.background : (useBlackGold ? homepageTokens.text : '#f0f0f5'),
              letterSpacing: '-0.02em',
              fontFamily: useBlackGold ? homepageTokens.headingFont : "'Cairo', sans-serif",
              lineHeight: 1.2,
            }}>
              {data.text_ar}
            </h2>
          )}

          {data.subtext_ar && (
            <p style={{
              margin: '0 0 32px',
              fontSize: 15,
              color: isBanner ? 'rgba(8,8,8,0.65)' : (useBlackGold ? homepageTokens.mutedText : 'rgba(255,255,255,0.5)'),
              fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
              lineHeight: 1.7,
              maxWidth: 500,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              {data.subtext_ar}
            </p>
          )}

          {data.link && (
            <motion.button
              onClick={handleClick}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 44px',
                borderRadius: 999,
                background: isBanner ? homepageTokens.background : themeAccent,
                color: isBanner ? themeAccent : (useBlackGold ? homepageTokens.background : '#fff'),
                border: isBanner ? `1px solid ${homepageTokens.background}` : 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
                boxShadow: isBanner ? 'none' : `0 8px 32px ${themeAccent}44`,
                letterSpacing: '0.02em',
              }}
            >
              {data.button_ar || 'تواصل معنا'}
            </motion.button>
          )}
        </div>
      </div>
    </motion.section>
  )
}
