/**
 * StaffSection — Dynamic Section Renderer
 * data: { heading_ar }
 *
 * P1.1 (2026-08-15, ALZABT_P1_1_STAFF_SECTION_PROPOSAL.md). Per the resolved P0.3 constraint, this
 * section's staff identity/content is NEVER author-defined (`data` carries only an optional
 * heading) -- it always reads the real, already-public, already-live `GET /reservations/barbers`
 * endpoint (extended this same round to also return `image_url`/`description`, additive and
 * backward-compatible; the booking picker's own existing use of this endpoint is unaffected).
 *
 * Capability-gated, not vertical-gated: calls the endpoint only when this tenant's real
 * `active_services` includes "reservations" -- never a `vertical === 'barber'` check, staying
 * consistent with the platform's vertical-neutral Section System boundary.
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import publicApi from '../../utils/publicApi'
import { homepageTokens } from './homepageTokens'

const CARD_SURFACE = 'rgba(255,255,255,0.025)'

function Avatar({ imageUrl, name, accent }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        style={{
          width: 88, height: 88, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
        }}
      />
    )
  }
  // No fabricated placeholder photo -- a neutral, accent-tinted initial, same "no-image"
  // convention CatalogItemCard.jsx already uses for items with no image_url.
  return (
    <div style={{
      width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
      background: `${accent}12`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 28, opacity: 0.35, color: accent }}>
        {(name || '').trim().charAt(0) || '◈'}
      </span>
    </div>
  )
}

export default function StaffSection({ data, accent, slug, config, homepageTheme }) {
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const useBlackGold = homepageTheme === 'black_gold'
  const themeAccent = useBlackGold ? homepageTokens.accent : accent

  // Same StrictMode dev-mode double-invoke guard already established in
  // FeaturedItemsSection.jsx/HoursSection.jsx's siblings.
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!slug) { setLoading(false); return }

    const activeServices = config?.active_services ?? []
    if (!activeServices.includes('reservations')) {
      setLoading(false)
      return
    }

    publicApi.get('/reservations/barbers', { params: { client_slug: slug } })
      .then(res => {
        if (!mountedRef.current) return
        setBarbers(res.data?.data ?? [])
      })
      .catch(() => { if (mountedRef.current) setBarbers([]) })
      .finally(() => { if (mountedRef.current) setLoading(false) })
  }, [slug, config])

  if (!loading && barbers.length === 0) return null

  return (
    <section style={{ marginBottom: 56, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{
          margin: 0,
          fontSize: 'clamp(20px, 3vw, 30px)',
          fontWeight: 800,
          color: useBlackGold ? homepageTokens.text : '#f0f0f5',
          letterSpacing: '-0.01em',
          fontFamily: useBlackGold ? homepageTokens.headingFont : "'Cairo', sans-serif",
        }}>
          {data.heading_ar || 'فريقنا'}
        </h2>
        <div style={{ width: 36, height: 3, background: themeAccent, borderRadius: 2 }} />
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeletons"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                borderRadius: 16, height: 160,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                animation: 'staff-pulse 1.6s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes staff-pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
          </motion.div>
        ) : (
          <motion.div
            key="staff"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {barbers.map((barber, i) => (
              <motion.div
                key={barber.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 220, damping: 26, delay: i * 0.05 }}
                style={{
                  borderRadius: 16,
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 10,
                  background: useBlackGold ? homepageTokens.surface : CARD_SURFACE,
                  border: `1px solid ${useBlackGold ? homepageTokens.border : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <Avatar imageUrl={barber.image_url} name={barber.name} accent={themeAccent} />
                <span style={{
                  fontSize: 14.5, fontWeight: 700,
                  color: useBlackGold ? homepageTokens.text : '#f0f0f5',
                  fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
                }}>
                  {barber.name}
                </span>
                {/* Missing description degrades honestly -- omitted entirely, never invented text. */}
                {barber.description && (
                  <p style={{
                    margin: 0, fontSize: 12,
                    color: useBlackGold ? homepageTokens.mutedText : 'rgba(255,255,255,0.55)',
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
                  }}>
                    {barber.description}
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
