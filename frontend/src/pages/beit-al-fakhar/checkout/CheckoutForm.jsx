import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'

/**
 * CheckoutForm — the right, 40% "action" side of the Showroom Checkout
 * Experience. Opens with a real heading + one short sentence, so it reads as
 * the next step of the same visit, not a form that appeared out of nowhere.
 *
 * Pure layout + controlled inputs — order-creation, the WhatsApp message, and
 * the submit sequence (spinner -> create order -> open WhatsApp) all live in
 * the parent CheckoutPage.jsx, which is the "Actions" layer.
 */
export default function CheckoutForm({ accent, submitting, error, onSubmit }) {
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    address: '', city: '', zip: '', notes: '',
  })

  const f = useCallback((key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  }), [form])

  const canSubmit = form.customer_name.trim() && form.customer_phone.trim() && form.address.trim() && !submitting

  return (
    <div style={{
      background: '#f5efe6', borderRadius: 20, padding: '32px 28px',
      color: '#2a2420',
    }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#2a2420', fontFamily: "'Cairo', sans-serif" }}>
        أكمل طلبك
      </h2>
      <p style={{ margin: '0 0 26px', fontSize: 13.5, color: '#6b5f54', lineHeight: 1.7, fontFamily: "'Cairo', sans-serif" }}>
        سنرسل طلبك مباشرة عبر واتساب للتأكيد.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(form) }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={sectionLabel(accent)}>بيانات التواصل</p>
        <FieldLight label="الاسم الكامل" required placeholder="اسمك الكريم" {...f('customer_name')} />
        <FieldLight label="رقم الهاتف" type="tel" required placeholder="+961..." {...f('customer_phone')} />
        <FieldLight label="البريد الإلكتروني (اختياري)" type="email" placeholder="you@example.com" {...f('customer_email')} />

        <p style={sectionLabel(accent)}>عنوان التوصيل</p>
        <FieldLight label="العنوان" required placeholder="المبنى / الشارع / المنطقة" {...f('address')} />
        <div style={{ display: 'flex', gap: 12 }}>
          <FieldLight half label="المدينة" placeholder="بيروت" {...f('city')} />
          <FieldLight half label="الرمز البريدي" placeholder="اختياري" {...f('zip')} />
        </div>

        <p style={sectionLabel(accent)}>طريقة الدفع</p>
        <div style={{
          padding: '11px 14px', borderRadius: 10, background: 'rgba(42,36,32,0.05)',
          border: '1px solid rgba(42,36,32,0.12)', fontSize: 13.5, color: '#4a4038',
          fontFamily: "'Cairo', sans-serif",
        }}>
          الدفع عند الاستلام — نقداً
        </div>

        <p style={sectionLabel(accent)}>ملاحظات</p>
        <FieldLight label="أي ملاحظات إضافية (اختياري)" placeholder="مثال: يفضل التوصيل مساءً" {...f('notes')} />

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.25)', color: '#b91c1c', fontSize: 13,
            fontFamily: "'Cairo', sans-serif",
          }}>
            {error}
          </div>
        )}

        {/* The most important button on the page — beit-al-fakhar's own accent,
            never WhatsApp's stock green, so it stays part of the gallery's
            visual identity rather than borrowing someone else's brand. */}
        <motion.button
          type="submit"
          disabled={!canSubmit}
          whileTap={{ scale: 0.98 }}
          style={{
            marginTop: 6, padding: '15px 0', borderRadius: 14, border: 'none',
            background: canSubmit ? accent : 'rgba(42,36,32,0.25)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: "'Cairo', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          {submitting ? (
            <>
              <span style={spinnerStyle()} />
              جارٍ إرسال طلبك...
            </>
          ) : (
            <>
              <WhatsAppIcon />
              إرسال الطلب عبر واتساب
            </>
          )}
        </motion.button>
        <p style={{ margin: 0, fontSize: 11.5, color: '#948a7f', textAlign: 'center', fontFamily: "'Cairo', sans-serif" }}>
          بياناتك آمنة وتُستخدم فقط لتأكيد هذا الطلب.
        </p>
      </form>
    </div>
  )
}

function sectionLabel(accent) {
  return {
    margin: '4px 0 -6px', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: accent, fontFamily: "'Cairo', sans-serif",
  }
}

function FieldLight({ label, type = 'text', value, onChange, required, placeholder, half }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: half ? '1 1 0' : '1 1 100%', minWidth: 0 }}>
      <label style={{ fontSize: 11, color: '#8a7f72', letterSpacing: '0.06em', fontFamily: "'Cairo', sans-serif" }}>
        {label}{required && <span style={{ color: '#c0392b', marginRight: 3 }}>*</span>}
      </label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        style={{
          width: '100%', padding: '11px 14px', boxSizing: 'border-box',
          background: '#fff', border: '1px solid rgba(42,36,32,0.15)',
          borderRadius: 10, color: '#2a2420', fontSize: 14, outline: 'none',
          fontFamily: "'Cairo', sans-serif",
        }}
      />
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="#fff">
      <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592z"/>
    </svg>
  )
}

function spinnerStyle() {
  return {
    width: 16, height: 16, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
    display: 'inline-block', animation: 'spin 0.7s linear infinite',
  }
}
