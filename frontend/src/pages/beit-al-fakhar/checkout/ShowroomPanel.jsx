import { motion, AnimatePresence } from 'framer-motion'

/**
 * ShowroomPanel — the left, "hero" 60% of the Showroom Checkout Experience.
 *
 * Reserved showroom-photo area (gradient placeholder — no image generated,
 * per explicit instruction; a real photo can replace it later via `imageUrl`
 * with zero layout change) sits above the real cart contents. Deliberately
 * does NOT repeat each item's long description/story — that belongs to the
 * Product Page only. Just: image, name, quantity, price (or "price upon
 * request", same wording as ProductPage.jsx — consistency, not a rephrase).
 */
export default function ShowroomPanel({
  accent, currency, cartItems, updateQuantity, removeItem, totalPrice, onContinueShopping, imageUrl,
}) {
  return (
    <div>
      {/* Reserved showroom visual — gradient today, a real photo later, same slot */}
      <div style={{
        width: '100%', aspectRatio: '16 / 7', borderRadius: 20, marginBottom: 32,
        background: imageUrl
          ? `url(${imageUrl}) center/cover`
          : `linear-gradient(135deg, ${accent}22 0%, rgba(20,15,10,0.85) 100%)`,
        border: `1px solid ${accent}33`,
        display: 'flex', alignItems: 'flex-end', padding: 28, boxSizing: 'border-box',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{
            margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: accent, fontFamily: "'Cairo', sans-serif",
          }}>
            بيت الفخار
          </p>
          <h1 style={{
            margin: 0, fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, color: '#f5efe6',
            fontFamily: "'Cairo', sans-serif",
          }}>
            اختياراتك من بيت الفخار
          </h1>
        </div>
      </div>

      {/* Real cart contents — no long text repeated, just what's needed to confirm the order */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <AnimatePresence mode="popLayout">
          {cartItems.map((item) => {
            const hasRealPrice = item.price > 0
            return (
              <motion.div
                key={item.catalogItemId}
                layout
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                }}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name_ar} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18, opacity: 0.3 }}>◈</span>
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5', fontFamily: "'Cairo', sans-serif" }}>
                    {item.name_ar}
                  </div>
                  <div style={{ fontSize: 12.5, color: hasRealPrice ? accent : 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: "'Cairo', sans-serif" }}>
                    {hasRealPrice ? `${(item.price * item.quantity).toLocaleString('ar-SA')} ${currency}` : 'السعر يُحدد حسب الطلب'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => updateQuantity(item.catalogItemId, item.quantity - 1)} style={qtyBtn()}>−</button>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.catalogItemId, item.quantity + 1)} style={qtyBtn(accent)}>+</button>
                </div>

                <button
                  onClick={() => removeItem(item.catalogItemId)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 17, padding: 4 }}
                >×</button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Totals */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 20,
      }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', fontFamily: "'Cairo', sans-serif" }}>الإجمالي</span>
        {totalPrice > 0 ? (
          <span style={{ fontSize: 20, fontWeight: 800, color: accent }}>
            {totalPrice.toLocaleString('ar-SA')}
            <span style={{ fontSize: 12, fontWeight: 400, marginRight: 4, color: 'rgba(255,255,255,0.4)' }}>{currency}</span>
          </span>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Cairo', sans-serif" }}>
            السعر يُحدد حسب الطلب
          </span>
        )}
      </div>

      <button
        onClick={onContinueShopping}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
          fontSize: 13, cursor: 'pointer', fontFamily: "'Cairo', sans-serif", padding: 0,
        }}
      >
        ← متابعة التسوق
      </button>
    </div>
  )
}

function qtyBtn(accent) {
  return {
    width: 26, height: 26, borderRadius: '50%',
    border: `1px solid ${accent ? `${accent}66` : 'rgba(255,255,255,0.15)'}`,
    background: accent ? `${accent}18` : 'rgba(255,255,255,0.05)',
    color: accent ?? 'rgba(255,255,255,0.6)',
    fontSize: 14, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
