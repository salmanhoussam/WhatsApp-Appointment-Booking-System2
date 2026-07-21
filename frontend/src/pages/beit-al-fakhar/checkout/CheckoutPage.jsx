import { useState, useCallback, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import publicApi from '../../../utils/publicApi'
import useTenantConfig from '../../../hooks/useTenantConfig'
import { useTenantBase } from '../../../hooks/useTenantSlug'
import TenantModuleNav from '../../../design-system/organisms/TenantModuleNav'
import useGenericStore from '../../generic/store/useGenericStore'
import ShowroomPanel from './ShowroomPanel'
import CheckoutForm from './CheckoutForm'

const SLUG = 'beit-al-fakhar'

function buildWhatsAppMessage({ form, cartItems, totalPrice, currency, orderId }) {
  const lines = []
  lines.push('طلب جديد من بيت الفخار 🏺')
  lines.push('')
  lines.push(`الاسم: ${form.customer_name}`)
  lines.push(`الهاتف: ${form.customer_phone}`)
  if (form.customer_email) lines.push(`البريد: ${form.customer_email}`)
  lines.push(`العنوان: ${form.address}${form.city ? `, ${form.city}` : ''}`)
  lines.push('طريقة الدفع: الدفع عند الاستلام — نقداً')
  if (form.notes) lines.push(`ملاحظات: ${form.notes}`)
  lines.push('')
  lines.push('القطع المطلوبة:')
  cartItems.forEach((item) => {
    const priceText = item.price > 0
      ? `${(item.price * item.quantity).toLocaleString('ar-SA')} ${currency}`
      : 'السعر يُحدد حسب الطلب'
    lines.push(`- ${item.name_ar} × ${item.quantity} — ${priceText}`)
  })
  lines.push('')
  lines.push(totalPrice > 0 ? `الإجمالي: ${totalPrice.toLocaleString('ar-SA')} ${currency}` : 'الإجمالي: السعر يُحدد حسب الطلب')
  if (orderId) lines.push('', `رقم الطلب: ${orderId.slice(0, 8)}`)
  return lines.join('\n')
}

export default function CheckoutPage() {
  const { config } = useTenantConfig()
  const base = useTenantBase()
  const navigate = useNavigate()

  const {
    cartItems, updateQuantity, removeItem, totalPrice, clearCart, sessionId,
    setConfig: setStoreConfig,
  } = useGenericStore()

  useEffect(() => {
    if (config && config.slug !== 'unknown') setStoreConfig(config, config.active_services ?? [])
  }, [config, setStoreConfig])

  const accent = config?.primary_color ?? '#C1683A'
  const currency = config?.currency ?? 'USD'

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const handleSubmit = useCallback(async (form) => {
    setError(null)
    setSubmitting(true)

    try {
      const params = { client_slug: SLUG }

      // Sync local cart to the server cart (same pattern the generic CartPage
      // already uses for the store module) before checkout.
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
          session_id: sessionId,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email || null,
          payment_method: 'cash',
          shipping_address: { address: form.address, city: form.city, zip: form.zip },
          notes: form.notes || null,
        },
        { params }
      )

      const orderId = data?.data?.id ?? null
      const message = buildWhatsAppMessage({ form, cartItems, totalPrice: totalPrice(), currency, orderId })
      const phone = (config?.whatsapp_number || '').replace(/[^0-9]/g, '')

      if (phone) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
      }

      setToast(phone
        ? 'تم إنشاء طلبك بنجاح — جارٍ فتح واتساب لإرسال التفاصيل...'
        : 'تم إنشاء طلبك بنجاح! سنتواصل معك قريباً.')
      clearCart()
    } catch (err) {
      const detail = err?.response?.data?.detail ?? err?.response?.data?.error?.message
      setError(typeof detail === 'string' ? detail : 'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مجدداً.')
    } finally {
      setSubmitting(false)
    }
  }, [cartItems, sessionId, totalPrice, currency, config])

  // Auto-dismiss the toast after a few seconds — the customer is heading to
  // WhatsApp anyway, this isn't a page they need to keep staring at.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  const isEmpty = cartItems.length === 0 && !toast

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl' }}>
      <TenantModuleNav />

      {/* Toast/banner instead of a separate success screen — the customer is
          leaving for WhatsApp next, not staying on this page. */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            style={{
              position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
              background: '#1a1410', border: `1px solid ${accent}66`, borderRadius: 14,
              padding: '12px 22px', color: '#f5efe6', fontSize: 13.5, fontFamily: "'Cairo', sans-serif",
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)', maxWidth: '90vw', textAlign: 'center',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '88px 20px 100px' }}>

        {/* Breadcrumb — gallery language, matching the Product Page's convention */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28,
          fontSize: 12.5, color: 'rgba(255,255,255,0.4)', fontFamily: "'Cairo', sans-serif",
        }}>
          <Link to={`${base}/home`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>بيت الفخار</Link>
          <span>—</span>
          <Link to={`${base}/store`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>المنتجات</Link>
          <span>—</span>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>إتمام الطلب</span>
        </div>

        {isEmpty ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)', fontFamily: "'Cairo', sans-serif" }}>
            <div style={{ fontSize: 42, marginBottom: 16, opacity: 0.3 }}>🏺</div>
            <p style={{ marginBottom: 20 }}>لا توجد قطع في سلتك بعد</p>
            <Link to={`${base}/store`} style={{ color: accent, textDecoration: 'none', fontWeight: 700 }}>
              تصفح المنتجات ←
            </Link>
          </div>
        ) : (
          // 60/40 — the pieces are the hero, the form is the action
          <div className="baf-checkout-grid" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 40, alignItems: 'start' }}>
            <ShowroomPanel
              accent={accent}
              currency={currency}
              cartItems={cartItems}
              updateQuantity={updateQuantity}
              removeItem={removeItem}
              totalPrice={totalPrice()}
              onContinueShopping={() => navigate(`${base}/store`)}
            />
            <CheckoutForm
              accent={accent}
              submitting={submitting}
              error={error}
              onSubmit={handleSubmit}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) {
          .baf-checkout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
