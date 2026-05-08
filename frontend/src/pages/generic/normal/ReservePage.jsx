import { useState, useCallback } from 'react'
import { useNavigate }           from 'react-router-dom'
import { motion }                from 'framer-motion'
import publicApi         from '../../../utils/publicApi'
import useTenantConfig   from '../../../hooks/useTenantConfig'
import useTenantSlug     from '../../../utils/useTenantSlug'
import { useTenantBase } from '../../../utils/useTenantSlug'
import TenantModuleNav   from '../../../design-system/organisms/TenantModuleNav'
import useGenericStore   from '../store/useGenericStore'

// Maps our moduleKey to the VALID_MODULE_KEYS expected by the reservations API
const MODULE_KEY_MAP = {
  restaurant: 'restaurant',
  store:      'services',
  catalog:    'services',
}

// ── Field atom ────────────────────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, required, placeholder, hint, as: Tag = 'input', rows }) {
  const shared = {
    value,
    onChange,
    required,
    placeholder,
    style: {
      width: '100%', padding: '11px 16px', boxSizing: 'border-box',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 10, color: '#fff', fontSize: 14,
      outline: 'none', fontFamily: "'Cairo', sans-serif",
      resize: Tag === 'textarea' ? 'vertical' : undefined,
    },
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: '#ef4444', marginRight: 3 }}>*</span>}
      </label>
      {Tag === 'textarea'
        ? <textarea rows={rows ?? 3} {...shared} />
        : <input type={type} {...shared} />
      }
      {hint && (
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{hint}</p>
      )}
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ accent, reservationId, onBack }) {
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
        تم تسجيل حجزك!
      </h2>
      {reservationId && (
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          رقم الحجز:{' '}
          <span style={{ color: accent, fontWeight: 600 }}>
            {reservationId.slice(0, 8)}
          </span>
        </p>
      )}
      <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 300 }}>
        سنتواصل معك على الرقم الذي أدخلته للتأكيد.
      </p>
      <button
        onClick={onBack}
        style={{
          marginTop: 16, padding: '12px 28px', borderRadius: 999,
          border: `1.5px solid ${accent}`, background: 'transparent',
          color: accent, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
        }}
      >
        العودة للرئيسية
      </button>
    </motion.div>
  )
}

// ── ReservePage ───────────────────────────────────────────────────────────────

export default function ReservePage() {
  const { config } = useTenantConfig()
  const slug       = useTenantSlug()
  const base       = useTenantBase()
  const navigate   = useNavigate()
  const accent     = config?.primary_color ?? '#d4a853'

  const { moduleKey } = useGenericStore()
  const activeServices = config?.active_services ?? []
  const hasReservations = activeServices.includes('reservations')

  // ── Form state ────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    customer_name:  '',
    customer_phone: '',
    customer_email: '',
    date:           today,
    time:           '12:00',
    duration_min:   '',
    party_size:     '',
    notes:          '',
  })
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState(null)
  const [reservationId,  setReservationId]  = useState(null)

  const f = useCallback((key) => ({
    value:    form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  }), [form])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Combine date + time into an ISO datetime string
      const reservedAt = new Date(`${form.date}T${form.time}:00`).toISOString()

      // Module-specific metadata
      const metadata = moduleKey === 'restaurant'
        ? { party_size: Number(form.party_size) || undefined }
        : undefined

      const { data } = await publicApi.post(
        `/${slug}/reservations/`,
        {
          module_key:     MODULE_KEY_MAP[moduleKey] ?? 'services',
          customer_name:  form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email || null,
          reserved_at:    reservedAt,
          duration_min:   form.duration_min ? Number(form.duration_min) : null,
          notes:          form.notes || null,
          metadata,
        },
        { params: { client_slug: slug } }
      )

      setReservationId(data?.data?.id ?? data?.data?.reservation_id ?? null)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : 'حدث خطأ أثناء إرسال الحجز. يرجى المحاولة مجدداً.'
      )
    } finally {
      setSubmitting(false)
    }
  }, [form, moduleKey, slug])

  // ── Guard — service not active ────────────────────────────────────────────
  if (!hasReservations) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', direction: 'rtl' }}>
        <TenantModuleNav />
        <div style={{
          maxWidth: 480, margin: '160px auto 0', padding: '0 20px',
          textAlign: 'center', color: 'rgba(255,255,255,0.3)',
          fontFamily: "'Cairo', sans-serif", fontSize: 16,
        }}>
          خدمة الحجز غير متاحة حالياً.
        </div>
      </div>
    )
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (reservationId !== null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', direction: 'rtl' }}>
        <TenantModuleNav />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '88px 20px 80px' }}>
          <SuccessScreen
            accent={accent}
            reservationId={reservationId}
            onBack={() => navigate(`${base}`)}
          />
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl' }}>
      <TenantModuleNav />

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '88px 20px 80px' }}>

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
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>احجز موعد</h1>
            {config?.name_ar && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                {config.name_ar}
              </p>
            )}
          </div>
        </div>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '28px 24px',
            display: 'flex', flexDirection: 'column', gap: 18,
          }}
        >
          <Field label="الاسم" required placeholder="اسمك الكريم" {...f('customer_name')} />
          <Field label="رقم الهاتف" type="tel" required placeholder="+961..." {...f('customer_phone')} />
          <Field label="البريد الإلكتروني" type="email" placeholder="اختياري" {...f('customer_email')} />

          {/* Date + Time side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field
              label="التاريخ"
              type="date"
              required
              {...f('date')}
            />
            <Field
              label="الوقت"
              type="time"
              required
              {...f('time')}
            />
          </div>

          {moduleKey === 'restaurant' && (
            <Field
              label="عدد الأشخاص"
              type="number"
              placeholder="2"
              {...f('party_size')}
              hint="عدد الأشخاص في الطاولة"
            />
          )}

          <Field
            label="ملاحظات"
            as="textarea"
            placeholder="أي طلبات خاصة أو ملاحظات — اختياري"
            {...f('notes')}
          />

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
              marginTop: 4, padding: '14px 0',
              background: submitting ? 'rgba(255,255,255,0.1)' : accent,
              border: 'none', borderRadius: 12,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: (!form.customer_name || !form.customer_phone) ? 0.5 : 1,
              transition: 'all 0.2s',
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            {submitting ? 'جارٍ الإرسال...' : 'تأكيد الحجز'}
          </motion.button>
        </form>
      </div>
    </div>
  )
}
