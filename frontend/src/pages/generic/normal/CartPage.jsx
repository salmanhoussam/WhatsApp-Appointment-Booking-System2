import { useState, useCallback, useEffect } from 'react'
import { useNavigate }           from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import publicApi         from '../../../utils/publicApi'
import useTenantConfig   from '../../../hooks/useTenantConfig'
import useTenantSlug     from '../../../hooks/useTenantSlug'
import { useTenantBase } from '../../../hooks/useTenantSlug'
import TenantModuleNav   from '../../../design-system/organisms/TenantModuleNav'
import useGenericStore   from '../store/useGenericStore'
import { hasCapability, hasOrderCapability } from '../../../utils/capabilities'

// ── Cart item row ─────────────────────────────────────────────────────────────

function CartRow({ item, accent, onUpdate, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, direction: 'rtl',
      }}
    >
      {/* Image */}
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.name_ar || item.name_en}
          style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 64, height: 64, borderRadius: 10, flexShrink: 0,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20, opacity: 0.3 }}>◈</span>
        </div>
      )}

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
          {item.name_ar || item.name_en}
        </div>
        <div style={{ fontSize: 13, color: accent, marginTop: 3, fontWeight: 700 }}>
          {(item.price * item.quantity).toLocaleString('ar-SA')}
        </div>
      </div>

      {/* Quantity controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => onUpdate(item.catalogItemId, item.quantity - 1)}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          −
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', minWidth: 20, textAlign: 'center' }}>
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdate(item.catalogItemId, item.quantity + 1)}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            border: `1px solid ${accent}`,
            background: `${accent}22`,
            color: accent, fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          +
        </button>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.catalogItemId)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.3)', fontSize: 18, padding: 4,
          lineHeight: 1, transition: 'color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
      >
        ×
      </button>
    </motion.div>
  )
}

// ── Input field ───────────────────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, required, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: '#ef4444', marginRight: 3 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%', padding: '11px 16px', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 10, color: '#fff', fontSize: 14,
          outline: 'none', fontFamily: "'Cairo', sans-serif",
        }}
      />
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ accent, orderId, whatsappSent, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        textAlign: 'center', padding: '80px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: `${accent}22`, border: `2px solid ${accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
      }}>
        ✓
      </div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
        تم استلام طلبك!
      </h2>
      {whatsappSent && (
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          جارٍ فتح واتساب لإرسال تفاصيل الطلب...
        </p>
      )}
      {orderId && (
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          رقم الطلب: <span style={{ color: accent, fontWeight: 600 }}>{orderId.slice(0, 8)}</span>
        </p>
      )}
      <button
        onClick={onBack}
        style={{
          marginTop: 16, padding: '12px 28px', borderRadius: 999,
          border: `1.5px solid ${accent}`, background: 'transparent',
          color: accent, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
        }}
      >
        العودة للقائمة
      </button>
    </motion.div>
  )
}

// ── WhatsApp order message (store module) ──────────────────────────────────────
// Generalized from beit-al-fakhar/checkout/CheckoutPage.jsx's buildWhatsAppMessage() --
// the first bespoke build already proved this logic live (2026-07-21, CDP-verified real
// wa.me sends). This is the 2nd real case: the same message shape, reused for the generic
// (shared) checkout path instead of a tenant-specific one, per this project's Abstraction
// Rule (generalize once a 2nd real case proves the shape, not before).
function buildStoreWhatsAppMessage({ businessName, form, cartItems, totalPrice, currency, orderId }) {
  const lines = []
  lines.push(`طلب جديد${businessName ? ` من ${businessName}` : ''} 🛍️`)
  lines.push('')
  lines.push(`الاسم: ${form.customer_name}`)
  lines.push(`الهاتف: ${form.customer_phone}`)
  if (form.shipping_address) lines.push(`عنوان التوصيل: ${form.shipping_address}`)
  lines.push(`طريقة الدفع: ${form.payment_method}`)
  if (form.notes) lines.push(`ملاحظات: ${form.notes}`)
  lines.push('')
  lines.push('المنتجات المطلوبة:')
  cartItems.forEach((item) => {
    const priceText = item.price
      ? `${(item.price * item.quantity).toLocaleString('ar-SA')}`
      : 'السعر يُحدد حسب الطلب'
    lines.push(`- ${item.name_ar || item.name_en} × ${item.quantity} — ${priceText}`)
  })
  lines.push('')
  lines.push(totalPrice > 0 ? `الإجمالي: ${totalPrice.toLocaleString('ar-SA')} ${currency}` : 'الإجمالي: السعر يُحدد حسب الطلب')
  if (orderId) lines.push('', `رقم الطلب: ${orderId.slice(0, 8)}`)
  return lines.join('\n')
}

// ── Config error state ───────────────────────────────────────────────────────
// Final Production Gate Audit, 2026-08-22 -- reuses the same retry/error-screen PATTERN
// GenericAdminDashboard.jsx's own DashboardErrorState already established (a clear message + a
// button that reloads the page), styled for this file's own dark public-facing theme rather than
// importing that admin-side component directly (generic-admin/ and generic/ are separate
// presentation trees in this codebase, never cross-imported). Not a new retry mechanism --
// useTenantConfig()'s own `retry: 2` already handles the retry itself; this is only what renders
// once that's exhausted.
function CartErrorState({ accent, message }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: 24, fontFamily: "'Cairo', sans-serif", textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, opacity: 0.4 }}>⚠</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>
        {message || 'تعذّر تحميل السلة'}
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          padding: '11px 26px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: accent, color: '#fff', fontSize: 14, fontWeight: 700,
          fontFamily: "'Cairo', sans-serif",
        }}
      >
        إعادة المحاولة
      </button>
    </div>
  )
}

// ── CartPage ──────────────────────────────────────────────────────────────────

export default function CartPage() {
  const { config, error: configError } = useTenantConfig()
  const slug       = useTenantSlug()
  const base       = useTenantBase()
  const navigate   = useNavigate()
  const accent     = config?.primary_color ?? '#d4a853'

  const { sessionId, cartItems, updateQuantity, removeItem, clearCart, totalPrice, setConfig: setStoreConfig } =
    useGenericStore()

  // Sync config into store (activeServices is what every real consumer reads) even on direct
  // /cart navigation
  useEffect(() => {
    if (config && config.slug !== 'unknown') {
      setStoreConfig(config, config.active_services ?? [])
    }
  }, [config, setStoreConfig])

  const activeServices = config?.active_services ?? []
  // Which single order-bearing capability this cart is for, if any -- no real tenant has both
  // Restaurant and Store active at once today (Module Resolution Review, 2026-07-28). A real
  // per-transaction decision (which endpoint, which fields), not a tenant-wide collapse -- kept
  // local to this component rather than sourced from a deleted store field.
  const moduleKey = hasCapability(activeServices, 'restaurant') ? 'restaurant'
    : hasCapability(activeServices, 'store') ? 'store'
    : null

  const [form, setForm] = useState({
    customer_name:    '',
    customer_phone:   '',
    table_number:     '',
    notes:            '',
    payment_method:   'cash',
    shipping_address: '',
  })
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState(null)
  const [orderId,      setOrderId]      = useState(null)
  const [whatsappSent, setWhatsappSent] = useState(false)

  const f = useCallback((key) => ({
    value:    form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  }), [form])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!cartItems.length) return
    setError(null)
    setSubmitting(true)

    try {
      const params = { client_slug: slug }

      if (moduleKey === 'restaurant') {
        const { data } = await publicApi.post(
          '/restaurant/orders',
          {
            customer_name:  form.customer_name,
            customer_phone: form.customer_phone,
            table_number:   form.table_number || null,
            notes:          form.notes || null,
            items: cartItems.map((i) => ({
              catalog_item_id: i.catalogItemId,
              quantity:        i.quantity,
            })),
          },
          { params }
        )
        setOrderId(data?.data?.id ?? null)

      } else if (moduleKey === 'store') {
        // Sync local cart to server, then checkout
        for (const item of cartItems) {
          await publicApi.post(
            '/store/cart',
            { session_id: sessionId, catalog_item_id: item.catalogItemId, quantity: item.quantity },
            { params }
          )
        }
        const { data } = await publicApi.post(
          '/store/orders',
          {
            session_id:       sessionId,
            customer_name:    form.customer_name,
            customer_phone:   form.customer_phone || null,
            payment_method:   form.payment_method,
            shipping_address: form.shipping_address
              ? { address: form.shipping_address }
              : null,
            notes: form.notes || null,
          },
          { params }
        )
        const newOrderId = data?.data?.id ?? null
        setOrderId(newOrderId)

        // Send the order to the merchant via WhatsApp — generalized from
        // beit-al-fakhar/checkout/CheckoutPage.jsx's proven buildWhatsAppMessage() (2026-07-21,
        // CDP-verified live). 2nd real case for this logic, reused for the generic checkout path.
        const phone = (config?.whatsapp_number || '').replace(/[^0-9]/g, '')
        if (phone) {
          const message = buildStoreWhatsAppMessage({
            businessName: config?.name_ar,
            form,
            cartItems,
            totalPrice: totalPrice(),
            currency: config?.currency ?? 'USD',
            orderId: newOrderId,
          })
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
          setWhatsappSent(true)
        }
      }

      clearCart()
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'حدث خطأ، يرجى المحاولة مجدداً.')
    } finally {
      setSubmitting(false)
    }
  }, [cartItems, form, moduleKey, sessionId, slug, clearCart, config, totalPrice])

  // ── Config load failure — real error state, never a silent blank page ───────────────────
  // Final Production Gate Audit, 2026-08-22 (P0 fix): useTenantConfig() never returns `null` on
  // error -- it falls back to `{...DEFAULT_CONFIG, slug: <the REAL slug>}` (see that hook's own
  // comment), specifically so a page never hard-crashes. But that real slug is exactly what made
  // the guard below indistinguishable from "genuinely no order capability": DEFAULT_CONFIG's
  // `active_services` is `[]`, so `hasOrderCapability([])` is false either way, and this component
  // silently `return null`ed on a real fetch failure -- confirmed live, reproducible (3 consecutive
  // real 503s on `/rk/cart` left `#root` completely empty, no error, no way forward for a real
  // customer). Checking `configError` first (the hook's own error signal, already exposed, just
  // never read here before) resolves the ambiguity before the capability guard ever runs.
  if (configError) {
    return <CartErrorState accent={accent} message={configError} />
  }

  // ── Guard — hide Cart entirely if this tenant has no order-bearing capability at all ──────
  // Plural check (TOS-004) against the tenant's real active_services, not the tenant-wide
  // collapsed `moduleKey` -- a tenant with both Catalog and Store active (e.g. RK Barber) must
  // still see a working Cart; the old check only happened to work for such a tenant because
  // `store` outranked `catalog` in derivation priority, not because it was correct.
  if (config && config.slug !== 'unknown' && !hasOrderCapability(config.active_services)) {
    return null
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (orderId !== null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', direction: 'rtl' }}>
        <TenantModuleNav />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '88px 20px 80px' }}>
          <SuccessScreen accent={accent} orderId={orderId} whatsappSent={whatsappSent} onBack={() => navigate(`${base}/${moduleKey === 'restaurant' ? 'menu' : 'store'}`)} />
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl' }}>
      <TenantModuleNav />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '88px 20px 80px' }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '8px 14px',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 20,
            }}
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
            سلة الطلبات
          </h1>
        </div>

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {cartItems.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            color: 'rgba(255,255,255,0.3)', fontSize: 16,
            fontFamily: "'Cairo', sans-serif",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🛒</div>
            السلة فارغة
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* ── Cart items ──────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
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
            </div>

            {/* ── Total ───────────────────────────────────────────────── */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 0',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 32,
            }}>
              <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>المجموع</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: accent }}>
                {totalPrice().toLocaleString('ar-SA')}
                <span style={{ fontSize: 12, fontWeight: 400, marginRight: 4, color: 'rgba(255,255,255,0.4)' }}>
                  {config?.currency ?? 'USD'}
                </span>
              </span>
            </div>

            {/* ── Checkout form ────────────────────────────────────────── */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '24px 20px',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                بيانات الطلب
              </h2>

              <Field label="الاسم" required placeholder="اسمك الكريم" {...f('customer_name')} />
              <Field label="رقم الهاتف" type="tel" required placeholder="+961..." {...f('customer_phone')} />

              {moduleKey === 'restaurant' && (
                <Field label="رقم الطاولة" placeholder="A4 — اختياري" {...f('table_number')} />
              )}
              {moduleKey === 'store' && (
                <Field label="عنوان التوصيل" placeholder="اختياري" {...f('shipping_address')} />
              )}

              {moduleKey === 'store' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    طريقة الدفع
                  </label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}
                    style={{
                      padding: '11px 16px', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 10, color: '#fff', fontSize: 14,
                      outline: 'none', fontFamily: "'Cairo', sans-serif",
                      colorScheme: 'dark',
                    }}
                  >
                    {(config?.payment_methods ?? ['cash']).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              <Field label="ملاحظات" placeholder="أي ملاحظات إضافية — اختياري" {...f('notes')} />

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={submitting || !form.customer_name || !form.customer_phone}
                whileTap={{ scale: 0.97 }}
                style={{
                  marginTop: 8, padding: '14px 0',
                  background: submitting ? 'rgba(255,255,255,0.1)' : accent,
                  border: 'none', borderRadius: 12,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: (!form.customer_name || !form.customer_phone) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  fontFamily: "'Cairo', sans-serif",
                }}
              >
                {submitting ? 'جارٍ الإرسال...' : 'تأكيد الطلب'}
              </motion.button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
