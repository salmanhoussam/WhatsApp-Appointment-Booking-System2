import { useState, useCallback } from 'react'
import { useNavigate }           from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import publicApi              from '../../../utils/publicApi'
import useTenantConfig        from '../../../hooks/useTenantConfig'
import useTenantSlug          from '../../../hooks/useTenantSlug'
import { useTenantBase }      from '../../../hooks/useTenantSlug'
import useReservationWizard   from '../../../hooks/useReservationWizard'
import TenantModuleNav        from '../../../design-system/organisms/TenantModuleNav'
import { hasCapability }      from '../../../utils/capabilities'

const SPRING = { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }

// ── Field atom (shared shape between the legacy form and the wizard's confirm step) ────────────

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
        تم تأكيد الحجز!
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

function LoadingDot({ accent }) {
  return (
    <div style={{ textAlign: 'center', padding: '120px 0' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: accent,
        margin: '0 auto', boxShadow: `0 0 20px 4px ${accent}66`,
        animation: 'rwdot 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes rwdot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  )
}

// ── Reservation Wizard — one journey, not four pages ────────────────────────────────────────────
// Service Picker -> Staff Picker -> Live Calendar Slots -> Confirmation, all inside one card that
// swaps its inner content per step (AnimatePresence), never a route change. Consumes only the
// existing Phase 1 backend (barbers/availability/create) -- no slot or conflict logic lives here.

const STEPS = [
  { key: 'service', label: 'الخدمة' },
  { key: 'staff',   label: 'الحلاق' },
  { key: 'slot',    label: 'الموعد' },
  { key: 'confirm', label: 'التأكيد' },
]

function StepDots({ step, accent }) {
  const idx = STEPS.findIndex((s) => s.key === step)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
      {STEPS.map((s, i) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: i < STEPS.length - 1 ? 1 : undefined }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              background: i <= idx ? accent : 'rgba(255,255,255,0.08)',
              color: i <= idx ? '#0a0a0f' : 'rgba(255,255,255,0.35)',
              transition: 'all 0.2s',
            }}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span style={{
              fontSize: 10, color: i <= idx ? accent : 'rgba(255,255,255,0.3)',
              whiteSpace: 'nowrap',
            }}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 1, background: i < idx ? accent : 'rgba(255,255,255,0.08)', marginBottom: 16 }} />
          )}
        </div>
      ))}
    </div>
  )
}

function PickCard({ selected, accent, onClick, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'right', cursor: 'pointer',
        padding: '16px 18px', borderRadius: 12,
        background: selected ? `${accent}18` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? accent : 'rgba(255,255,255,0.08)'}`,
        color: '#fff', fontFamily: "'Cairo', sans-serif",
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'all 0.15s',
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{subtitle}</div>}
      </div>
      {selected && <span style={{ color: accent, fontSize: 16 }}>✓</span>}
    </button>
  )
}

function ReservationWizard({ wiz, accent, base, navigate }) {
  const {
    step, goBack,
    barbers, barbersLoading, selectedBarber, chooseBarber,
    services, servicesLoading, selectedService, chooseService,
    date, setDate, slots, slotsLoading, selectedSlot, chooseSlot,
    customerName, setCustomerName, customerPhone, setCustomerPhone,
    submitting, submitError, submit, reservationId,
  } = wiz

  const today = new Date().toISOString().slice(0, 10)

  if (step === 'success') {
    return (
      <SuccessScreen accent={accent} reservationId={reservationId} onBack={() => navigate(`${base}`)} />
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '28px 24px',
    }}>
      <StepDots step={step} accent={accent} />

      {/* Running summary of choices made so far -- keeps this feeling like one booking, not four
          disconnected screens. */}
      {(selectedService || selectedBarber || selectedSlot) && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20,
          fontSize: 12, color: 'rgba(255,255,255,0.5)',
        }}>
          {selectedService && <span style={{ color: accent }}>{selectedService.name_ar}</span>}
          {selectedBarber && <span>· {selectedBarber.name}</span>}
          {selectedSlot && <span>· {date} {selectedSlot.time}</span>}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 'service' && (
          <motion.div key="service" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={SPRING}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {servicesLoading && <LoadingDot accent={accent} />}
            {!servicesLoading && services.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
                لا توجد خدمات قابلة للحجز حالياً.
              </p>
            )}
            {services.map((item) => (
              <PickCard
                key={item.id}
                accent={accent}
                selected={selectedService?.id === item.id}
                onClick={() => chooseService(item)}
                title={item.name_ar}
                subtitle={`${item.metadata?.duration_min} دقيقة · $${item.price}`}
              />
            ))}
          </motion.div>
        )}

        {step === 'staff' && (
          <motion.div key="staff" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={SPRING}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {barbersLoading && <LoadingDot accent={accent} />}
            {barbers.map((b) => (
              <PickCard
                key={b.id}
                accent={accent}
                selected={selectedBarber?.id === b.id}
                onClick={() => chooseBarber(b)}
                title={b.name}
              />
            ))}
            <BackButton onClick={goBack} />
          </motion.div>
        )}

        {step === 'slot' && (
          <motion.div key="slot" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={SPRING}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="التاريخ" type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              {...{ min: today }} />
            {slotsLoading && <LoadingDot accent={accent} />}
            {!slotsLoading && slots.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                لا توجد مواعيد متاحة في هذا التاريخ — جرّب تاريخاً آخر.
              </p>
            )}
            {!slotsLoading && slots.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {slots.map((s) => (
                  <button
                    key={s.time}
                    onClick={() => chooseSlot(s)}
                    style={{
                      padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                      background: selectedSlot?.time === s.time ? accent : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${selectedSlot?.time === s.time ? accent : 'rgba(255,255,255,0.1)'}`,
                      color: selectedSlot?.time === s.time ? '#0a0a0f' : '#fff',
                      fontSize: 13, fontWeight: 600, fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
            <BackButton onClick={goBack} />
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.form key="confirm" onSubmit={submit} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={SPRING}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="الاسم" required placeholder="اسمك الكريم"
              value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Field label="رقم الهاتف" type="tel" required placeholder="+961..."
              value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />

            {submitError && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5', fontSize: 13,
              }}>
                {submitError}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={submitting || !customerName || !customerPhone}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '14px 0',
                background: submitting ? 'rgba(255,255,255,0.1)' : accent,
                border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: (!customerName || !customerPhone) ? 0.5 : 1,
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              {submitting ? 'جارٍ التأكيد...' : 'تأكيد الحجز'}
            </motion.button>
            <BackButton onClick={goBack} />
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        alignSelf: 'flex-start', background: 'transparent', border: 'none',
        color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer',
        fontFamily: "'Cairo', sans-serif", padding: '4px 0',
      }}
    >
      ← رجوع
    </button>
  )
}

// ── Legacy generic form — unchanged, kept for every generic tenant that has no Barber rows ─────
// (restaurant table reservations, generic services without staff, etc.) -- not this Pilot's scope.

function LegacyReserveForm({ config, slug, accent, base, navigate }) {
  const activeServices = config?.active_services ?? []

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    date: today, time: '12:00', duration_min: '', party_size: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [reservationId, setReservationId] = useState(null)

  const f = useCallback((key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  }), [form])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const reservedAt = new Date(`${form.date}T${form.time}:00`).toISOString()
      const isRestaurant = hasCapability(activeServices, 'restaurant')
      const metadata = isRestaurant ? { party_size: Number(form.party_size) || undefined } : undefined

      const { data } = await publicApi.post(
        `/reservations/`,
        {
          module_key: isRestaurant ? 'restaurant' : 'services',
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email || null,
          reserved_at: reservedAt,
          duration_min: form.duration_min ? Number(form.duration_min) : null,
          notes: form.notes || null,
          metadata,
        },
        { params: { client_slug: slug } }
      )
      setReservationId(data?.data?.id ?? data?.data?.reservation_id ?? null)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'حدث خطأ أثناء إرسال الحجز. يرجى المحاولة مجدداً.')
    } finally {
      setSubmitting(false)
    }
  }, [form, activeServices, slug])

  if (reservationId !== null) {
    return <SuccessScreen accent={accent} reservationId={reservationId} onBack={() => navigate(`${base}`)} />
  }

  return (
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="التاريخ" type="date" required {...f('date')} />
        <Field label="الوقت" type="time" required {...f('time')} />
      </div>
      {hasCapability(activeServices, 'restaurant') && (
        <Field label="عدد الأشخاص" type="number" placeholder="2" {...f('party_size')} hint="عدد الأشخاص في الطاولة" />
      )}
      <Field label="ملاحظات" as="textarea" placeholder="أي طلبات خاصة أو ملاحظات — اختياري" {...f('notes')} />
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
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
  )
}

// ── ReservePage ───────────────────────────────────────────────────────────────

export default function ReservePage() {
  const slug     = useTenantSlug()
  const base     = useTenantBase()
  const navigate = useNavigate()
  const wiz      = useReservationWizard()
  const { config, configLoading, mode } = wiz
  const accent   = config?.primary_color ?? '#d4a853'

  const activeServices = config?.active_services ?? []
  const hasReservations = activeServices.includes('reservations')

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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl' }}>
      <TenantModuleNav />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '88px 20px 80px' }}>
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

        {(configLoading || mode === 'loading') && <LoadingDot accent={accent} />}

        {!configLoading && mode === 'wizard' && (
          <ReservationWizard wiz={wiz} accent={accent} base={base} navigate={navigate} />
        )}

        {!configLoading && mode === 'legacy' && (
          <LegacyReserveForm config={config} slug={slug} accent={accent} base={base} navigate={navigate} />
        )}
      </div>
    </div>
  )
}
