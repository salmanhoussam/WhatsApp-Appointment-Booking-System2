import { useState } from 'react'
import { motion } from 'framer-motion'
import { colors, radius } from '../tokens'
import { serviceIconFor } from '../../utils/serviceIcons'
import { homepageTokens } from '../../components/dynamic-sections/homepageTokens'

const cardTransition = { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }

/**
 * CatalogItemCard — Molecule
 *
 * Generic catalog item card for restaurant, store, and catalog modules.
 * Accent color is tenant-driven (from config.primary_color).
 *
 * Props:
 *   item         — CatalogItem API response (id, name_ar, name_en, price, image_url, ...)
 *   accent       — tenant primary color (default: gold)
 *   onAddToCart  — optional, renders an "أضف للسلة" overlay when provided — cart/checkout
 *                  items only (store, restaurant). Mutually exclusive with onBookNow.
 *   onBookNow    — optional (2026-08-18, Homepage Phase 2.3), renders "احجز الآن" instead —
 *                  reservations-native services (no cart concept at all, confirmed in
 *                  ALZABT_MISTER_H_HOMEPAGE_DESIGN_SPECIFICATION.md's own booking-UX research:
 *                  Alzabt's Service -> Barber -> Slot -> Reservation model has no cart). A
 *                  caller passes at most one of onAddToCart/onBookNow, never both.
 *   onItemClick  — optional, additive only. When provided, clicking the card
 *                  (outside the overlay) calls onItemClick(item).
 *                  Omitted by default everywhere except where a real product
 *                  detail route exists (beit-al-fakhar) — every other tenant's
 *                  behavior is unchanged since this prop is simply never passed.
 *   homepageTheme — optional (2026-08-18, Homepage Phase 2.3). When `'black_gold'` (real,
 *                  per-tenant `Client.config.homepage_theme` opt-in — Mister H today, nobody
 *                  else), surface/border/text colors come from `homepageTokens` and the accent
 *                  used throughout is the fixed gold, not the tenant's own `accent` prop. Absent
 *                  for any other tenant, so this card's rendering elsewhere is byte-identical to
 *                  before this prop existed.
 */
export default function CatalogItemCard({ item, accent = colors.gold, onAddToCart, onBookNow, onItemClick, homepageTheme }) {
  const [imgHovered, setImgHovered] = useState(false)
  const available = item.is_available !== false && item.is_active !== false
  const useBlackGold = homepageTheme === 'black_gold'
  const themeAccent = useBlackGold ? homepageTokens.accent : accent
  // Richer generic fallback for real bookable services with no photo yet -- a gradient + the
  // service's own matched icon, editable the moment a real photo is uploaded (this is just the
  // fallback path; `item.image_url` still wins the instant it's set). Scoped to onBookNow only
  // (2026-08-18) -- store/restaurant items without a photo keep the original plain "◈" mark,
  // unchanged, since serviceIconFor's mapping is barber-service-specific and would be wrong for
  // e.g. a food item.
  const ServiceIcon = onBookNow ? serviceIconFor(item.name_ar) : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={cardTransition}
      whileHover={{ y: -4 }}
      onClick={onItemClick ? () => onItemClick(item) : undefined}
      style={onItemClick ? { cursor: 'pointer' } : undefined}
    >
      <div
        style={{
          borderRadius: radius.lg,
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: useBlackGold ? homepageTokens.surface : colors.surface,
          border: `1px solid ${useBlackGold ? homepageTokens.border : colors.border}`,
          transition: 'border-color 0.25s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${themeAccent}44` }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = useBlackGold ? homepageTokens.border : colors.border }}
      >
        {/* Image */}
        <div
          style={{
            height: 200,
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
            background: item.image_url
              ? undefined
              : (ServiceIcon
                  ? `radial-gradient(ellipse at 50% 30%, ${themeAccent}2a 0%, transparent 70%), linear-gradient(160deg, ${themeAccent}1c 0%, rgba(0,0,0,0.25) 100%)`
                  : `${themeAccent}12`),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={() => setImgHovered(true)}
          onMouseLeave={() => setImgHovered(false)}
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name_ar || item.name_en}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                transform: imgHovered ? 'scale(1.06)' : 'scale(1)',
              }}
            />
          ) : ServiceIcon ? (
            <ServiceIcon size={44} color={themeAccent} strokeWidth={1.25} style={{ opacity: 0.85 }} />
          ) : (
            <span style={{ fontSize: 36, opacity: 0.2 }}>◈</span>
          )}

          {/* Add-to-cart OR Book-Now hover overlay — mutually exclusive, never both */}
          {(onAddToCart || onBookNow) && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: imgHovered ? 1 : 0,
              transition: 'opacity 0.2s',
              pointerEvents: imgHovered ? 'auto' : 'none',
            }}>
              <motion.button
                onClick={(e) => { e.stopPropagation(); (onBookNow || onAddToCart)(item) }}
                whileTap={{ scale: 0.92 }}
                style={{
                  padding: '10px 26px',
                  borderRadius: 999,
                  background: themeAccent,
                  color: useBlackGold ? homepageTokens.background : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
                  boxShadow: `0 4px 20px ${themeAccent}66`,
                }}
              >
                {onBookNow ? 'احجز الآن' : '+ أضف للسلة'}
              </motion.button>
            </div>
          )}

          {/* Top-right badges */}
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            pointerEvents: 'none',
          }}>
            {item.is_featured && (
              <span style={{
                background: themeAccent,
                color: useBlackGold ? homepageTokens.background : '#fff',
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '3px 9px',
                borderRadius: 999,
                textTransform: 'uppercase',
                fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
              }}>
                مميز
              </span>
            )}
            {!available && (
              <span style={{
                background: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
                fontSize: 9,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 999,
                fontFamily: "'Cairo', sans-serif",
              }}>
                غير متوفر
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div style={{
          padding: '14px 16px 18px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          direction: 'rtl',
        }}>
          <h3 style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: useBlackGold ? homepageTokens.text : colors.textPrimary,
            lineHeight: 1.4,
            fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
          }}>
            {item.name_ar || item.name_en}
          </h3>

          {(item.description_ar || item.description_en) && (
            <p style={{
              margin: 0,
              fontSize: 12,
              color: useBlackGold ? homepageTokens.mutedText : colors.textMuted,
              lineHeight: 1.65,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
            }}>
              {item.description_ar || item.description_en}
            </p>
          )}

          {item.price != null && (
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: themeAccent }}>
                {Number(item.price).toLocaleString('ar-SA')}
              </span>
              {item.currency && (
                <span style={{ fontSize: 10, color: useBlackGold ? homepageTokens.mutedText : colors.textDim }}>
                  {item.currency}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
