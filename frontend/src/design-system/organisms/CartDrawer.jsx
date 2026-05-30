import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useTenantConfig from '../../hooks/useTenantConfig'
import { useTenantBase } from '../../hooks/useTenantSlug'
import useGenericStore from '../../pages/generic/store/useGenericStore'
import { colors, radius, spring } from '../tokens'

/**
 * CartDrawer — Organism
 *
 * Slide-in cart panel. Reads cart state from useGenericStore directly.
 * Navigates to /cart for full checkout — does not handle submission itself.
 *
 * Props:
 *   isOpen  — boolean
 *   onClose — () => void
 */
export default function CartDrawer({ isOpen, onClose }) {
  const { config } = useTenantConfig()
  const base = useTenantBase()
  const navigate = useNavigate()
  const accent = config?.primary_color ?? colors.gold
  const currency = config?.currency ?? 'USD'

  const { cartItems, updateQuantity, removeItem, totalPrice } = useGenericStore()

  const goToCart = useCallback(() => {
    onClose()
    navigate(`${base}/cart`)
  }, [onClose, navigate, base])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={spring.snappy}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 420,
              background: '#12121a',
              borderLeft: `1px solid ${colors.border}`,
              zIndex: 101,
              display: 'flex',
              flexDirection: 'column',
              direction: 'rtl',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 22px',
              borderBottom: `1px solid ${colors.border}`,
              flexShrink: 0,
            }}>
              <h2 style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: colors.textPrimary,
                fontFamily: "'Cairo', sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ color: accent }}>🛒</span>
                سلة الطلبات
                {cartItems.length > 0 && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: `${accent}22`,
                    color: accent,
                    padding: '2px 8px',
                    borderRadius: 999,
                    marginRight: 4,
                  }}>
                    {cartItems.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: colors.textMuted,
                  fontSize: 18,
                  lineHeight: 1,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted }}
              >
                ×
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {cartItems.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 12,
                  color: colors.textDim,
                  fontFamily: "'Cairo', sans-serif",
                }}>
                  <span style={{ fontSize: 48, opacity: 0.3 }}>🛒</span>
                  <span style={{ fontSize: 15 }}>السلة فارغة</span>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {cartItems.map((item) => (
                    <CartRow
                      key={item.catalogItemId}
                      item={item}
                      accent={accent}
                      onUpdate={updateQuantity}
                      onRemove={removeItem}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div style={{
                padding: '18px 20px 24px',
                borderTop: `1px solid ${colors.border}`,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}>
                  <span style={{ fontSize: 13, color: colors.textMuted, fontFamily: "'Cairo', sans-serif" }}>
                    المجموع
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: accent }}>
                    {totalPrice().toLocaleString('ar-SA')}
                    <span style={{ fontSize: 11, fontWeight: 400, marginRight: 4, color: colors.textDim }}>
                      {currency}
                    </span>
                  </span>
                </div>

                <motion.button
                  onClick={goToCart}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: radius.lg,
                    background: accent,
                    border: 'none',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif",
                    boxShadow: `0 6px 24px ${accent}44`,
                  }}
                >
                  إتمام الطلب ←
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── CartRow — inline sub-component ───────────────────────────────────────────

function CartRow({ item, accent, onUpdate, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {/* Image */}
      <div style={{
        width: 58,
        height: 58,
        borderRadius: radius.md,
        overflow: 'hidden',
        flexShrink: 0,
        background: `${accent}12`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name_ar || item.name_en}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: 20, opacity: 0.25 }}>◈</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: colors.textPrimary,
          fontFamily: "'Cairo', sans-serif",
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.name_ar || item.name_en}
        </div>
        <div style={{ fontSize: 13, color: accent, fontWeight: 700, marginTop: 3 }}>
          {(item.price * item.quantity).toLocaleString('ar-SA')}
        </div>
      </div>

      {/* Quantity controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <QtyBtn onClick={() => onRemove(item.catalogItemId)} label="×" danger />
        <button
          onClick={() => onUpdate(item.catalogItemId, item.quantity - 1)}
          style={qtyStyle()}
        >
          −
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', minWidth: 16, textAlign: 'center' }}>
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdate(item.catalogItemId, item.quantity + 1)}
          style={qtyStyle(accent)}
        >
          +
        </button>
      </div>
    </motion.div>
  )
}

function QtyBtn({ onClick, label, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 26, height: 26, borderRadius: '50%',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)'}`,
        background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)',
        color: danger ? '#ef4444' : colors.textMuted,
        fontSize: 15, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1, transition: 'opacity 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      {label}
    </button>
  )
}

function qtyStyle(accent) {
  return {
    width: 26, height: 26, borderRadius: '50%',
    border: `1px solid ${accent ? `${accent}55` : 'rgba(255,255,255,0.15)'}`,
    background: accent ? `${accent}18` : 'rgba(255,255,255,0.05)',
    color: accent ?? colors.textMuted,
    fontSize: 15, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1,
  }
}
