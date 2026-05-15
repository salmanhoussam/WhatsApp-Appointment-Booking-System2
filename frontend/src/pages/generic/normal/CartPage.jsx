import { useState, useCallback, useEffect } from 'react'
import { useNavigate }           from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import publicApi         from '../../../utils/publicApi'
import useTenantConfig   from '../../../hooks/useTenantConfig'
import useTenantSlug     from '../../../utils/useTenantSlug'
import { useTenantBase } from '../../../utils/useTenantSlug'
import TenantModuleNav   from '../../../design-system/organisms/TenantModuleNav'
import useGenericStore   from '../store/useGenericStore'

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

function SuccessScreen({ accent, orderId, onBack }) {
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

// ── CartPage ──────────────────────────────────────────────────────────────────

export default function CartPage() {
  const { config } = useTenantConfig()
  const slug       = useTenantSlug()
  const base       = useTenantBase()
  const navigate   = useNavigate()
  const accent     = config?.primary_color ?? '#d4a853'

  const { moduleKey, sessionId, cartItems, updateQuantity, removeItem, clearCart, totalPrice, setConfig: setStoreConfig } =
    useGenericStore()

  // Sync config into store so moduleKey is available even on direct /cart navigation
  useEffect(() => {
    if (config && config.slug !== 'unknown') {
      setStoreConfig(config, config.active_services ?? [])
    }
  }, [config, setStoreConfig])

  const [form, setForm] = useState({
    customer_name:    '',
    customer_phone:   '',
    table_number:     '',
    notes:            '',
    payment_method:   'cash',
    shipping_address: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)
  const [orderId,    setOrderId]    = useState(null)

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
        setOrderId(data?.data?.id ?? null)
      }

      clearCart()
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'حدث خطأ، يرجى المحاولة مجدداً.')
    } finally {
      setSubmitting(false)
    }
  }, [cartItems, form, moduleKey, sessionId, slug, clearCart])

  // ── Guard — redirect if unsupported module ────────────────────────────────
  if (moduleKey && moduleKey !== 'restaurant' && moduleKey !== 'store') {
    return null
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (orderId !== null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', direction: 'rtl' }}>
        <TenantModuleNav />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '88px 20px 80px' }}>
          <SuccessScreen accent={accent} orderId={orderId} onBack={() => navigate(`${base}/${moduleKey === 'restaurant' ? 'menu' : 'store'}`)} />
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
