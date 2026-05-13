import { useState } from 'react'
import { motion } from 'framer-motion'
import { colors, radius } from '../tokens'

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
 *   onAddToCart  — optional, renders add-to-cart overlay when provided
 */
export default function CatalogItemCard({ item, accent = colors.gold, onAddToCart }) {
  const [imgHovered, setImgHovered] = useState(false)
  const available = item.is_available !== false && item.is_active !== false

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={cardTransition}
      whileHover={{ y: -4 }}
    >
      <div
        style={{
          borderRadius: radius.lg,
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          transition: 'border-color 0.25s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${accent}44` }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border }}
      >
        {/* Image */}
        <div
          style={{
            height: 200,
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
            background: item.image_url ? undefined : `${accent}12`,
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
          ) : (
            <span style={{ fontSize: 36, opacity: 0.2 }}>◈</span>
          )}

          {/* Add-to-cart hover overlay */}
          {onAddToCart && (
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
                onClick={(e) => { e.stopPropagation(); onAddToCart(item) }}
                whileTap={{ scale: 0.92 }}
                style={{
                  padding: '10px 26px',
                  borderRadius: 999,
                  background: accent,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Cairo', sans-serif",
                  boxShadow: `0 4px 20px ${accent}66`,
                }}
              >
                + أضف للسلة
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
                background: accent,
                color: '#fff',
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '3px 9px',
                borderRadius: 999,
                textTransform: 'uppercase',
                fontFamily: "'Cairo', sans-serif",
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
            color: colors.textPrimary,
            lineHeight: 1.4,
            fontFamily: "'Cairo', sans-serif",
          }}>
            {item.name_ar || item.name_en}
          </h3>

          {(item.description_ar || item.description_en) && (
            <p style={{
              margin: 0,
              fontSize: 12,
              color: colors.textMuted,
              lineHeight: 1.65,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontFamily: "'Cairo', sans-serif",
            }}>
              {item.description_ar || item.description_en}
            </p>
          )}

          {item.price != null && (
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: accent }}>
                {Number(item.price).toLocaleString('ar-SA')}
              </span>
              {item.currency && (
                <span style={{ fontSize: 10, color: colors.textDim }}>
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
