import { useState, useCallback } from 'react'
import { useNavigate }           from 'react-router-dom'
import { motion }                from 'framer-motion'
import publicApi              from '../../../utils/publicApi'
import useTenantSlug          from '../../../hooks/useTenantSlug'
import { useTenantBase }      from '../../../hooks/useTenantSlug'
import useReservationBooking  from '../../../hooks/useReservationBooking'
import TenantModuleNav        from '../../../design-system/organisms/TenantModuleNav'
import { hasCapability }      from '../../../utils/capabilities'

// ── Field atom (legacy form + local secondary confirm) ──────────────────────────────────────────

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
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: accent,
        margin: '0 auto', boxShadow: `0 0 20px 4px ${accent}66`,
        animation: 'rwdot 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes rwdot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  )
}

// ── Single-screen booking page ───────────────────────────────────────────────────────────────────
// Redesigned 2026-08-03 per Salman's real product review of the first single-screen version
// (🟡 Improve): the calendar becomes the visual centerpiece (a real month grid, not a 7-day strip),
// WhatsApp confirmation becomes the PRIMARY action, and the local name/phone form is kept only as
// a collapsed secondary option -- never removed. Consumes only the existing backend
// (barbers/availability/create) -- no slot or conflict logic lives here.

function Pill({ selected, accent, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 18px', borderRadius: 999, cursor: 'pointer',
        background: selected ? accent : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? accent : 'rgba(255,255,255,0.12)'}`,
        color: selected ? '#0a0a0f' : '#fff',
        fontSize: 13, fontWeight: 600, fontFamily: "'Cairo', sans-serif",
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em',
      textTransform: 'uppercase', marginBottom: 10, fontWeight: 700,
    }}>
      {children}
    </div>
  )
}

// ── Calendar — the visual centerpiece ────────────────────────────────────────────────────────────

function CalendarBlock({ booking, accent }) {
  const {
    monthGrid, goPrevMonth, goNextMonth, monthOffset, weekdaysShort,
    selectedDate, chooseDate,
    slots, slotsLoading, selectedSlot, chooseSlot,
  } = booking

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: `1px solid ${accent}2a`,
      borderRadius: 18, padding: '22px 20px',
    }}>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <button
          onClick={goPrevMonth}
          disabled={monthOffset === 0}
          style={{
            width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 16,
            cursor: monthOffset === 0 ? 'not-allowed' : 'pointer',
            opacity: monthOffset === 0 ? 0.3 : 1,
          }}
        >
          ›
        </button>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{monthGrid.label}</div>
        <button
          onClick={goNextMonth}
          style={{
            width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 16, cursor: 'pointer',
          }}
        >
          ‹
        </button>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {weekdaysShort.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {monthGrid.cells.map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`} />
          const active = cell.iso === selectedDate
          return (
            <button
              key={cell.iso}
              disabled={cell.isPast}
              onClick={() => chooseDate(cell.iso)}
              style={{
                aspectRatio: '1', borderRadius: 10, cursor: cell.isPast ? 'not-allowed' : 'pointer',
                background: active ? accent : 'rgba(255,255,255,0.03)',
                border: cell.isToday && !active ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.06)',
                color: active ? '#0a0a0f' : cell.isPast ? 'rgba(255,255,255,0.2)' : '#fff',
                fontSize: 13, fontWeight: active ? 800 : 500,
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              {cell.dayNum}
            </button>
          )
        })}
      </div>

      {/* Time slots for the selected day -- lives inside the same calendar block */}
      <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {slotsLoading && <LoadingDot accent={accent} />}
        {!slotsLoading && slots.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>
            لا توجد مواعيد متاحة في هذا اليوم — جرّب يوماً آخر.
          </p>
        )}
        {!slotsLoading && slots.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
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
      </div>
    </div>
  )
}

function BookingScreen({ booking, accent }) {
  const {
    services, servicesLoading, selectedServiceId, selectedService, chooseService,
    barbers, barbersLoading, selectedBarberId, selectedBarber, chooseBarber,
    selectedDate, selectedSlot,
    showLocalForm, toggleLocalForm,
    customerName, setCustomerName, customerPhone, setCustomerPhone,
    submitting, submitError, reservationId, confirmMethod, whatsappUrl,
    canConfirm, confirmViaWhatsApp, confirmLocally,
    formatArabicDate,
  } = booking

  if (reservationId) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
          background: `${accent}22`, border: `2px solid ${accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>
          ✓
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: '#fff' }}>
          تم إنشاء حجزك
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 380, marginInline: 'auto' }}>
          {confirmMethod === 'whatsapp'
            ? 'فتحنا لك واتساب برسالة جاهزة — أرسلها لصاحب المحل لتأكيد الحجز نهائياً.'
            : 'تم تسجيل حجزك — سيتواصل معك صاحب المحل لتأكيد الموعد.'}
          {' '}رقم الحجز: <span style={{ color: accent }}>{reservationId.slice(0, 8)}</span>
        </p>
        {confirmMethod === 'whatsapp' && whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', marginTop: 16, fontSize: 13, color: '#25D366',
              fontWeight: 700, fontFamily: "'Cairo', sans-serif",
            }}
          >
            لم تفتح صفحة واتساب؟ اضغط هنا
          </a>
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 28,
    }}>
      {/* ── Service ──────────────────────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>الخدمة</SectionLabel>
        {servicesLoading ? <LoadingDot accent={accent} /> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {services.map((s) => (
              <Pill key={s.id} accent={accent} selected={selectedServiceId === s.id} onClick={() => chooseService(s.id)}>
                {s.name_ar} · {s.metadata?.duration_min} دقيقة
              </Pill>
            ))}
          </div>
        )}
      </div>

      {/* ── Staff ────────────────────────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>الحلاق</SectionLabel>
        {barbersLoading ? <LoadingDot accent={accent} /> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {barbers.map((b) => (
              <Pill key={b.id} accent={accent} selected={selectedBarberId === b.id} onClick={() => chooseBarber(b.id)}>
                {b.name}
              </Pill>
            ))}
          </div>
        )}
      </div>

      {/* ── Calendar — the centerpiece ───────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>التقويم</SectionLabel>
        <CalendarBlock booking={booking} accent={accent} />
      </div>

      {/* ── Confirmation ─────────────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <SectionLabel>ملخص الحجز</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
          <div>الخدمة: <span style={{ color: '#fff', fontWeight: 600 }}>{selectedService?.name_ar ?? '—'}</span></div>
          <div>الحلاق: <span style={{ color: '#fff', fontWeight: 600 }}>{selectedBarber?.name ?? '—'}</span></div>
          <div>
            الوقت:{' '}
            <span style={{ color: '#fff', fontWeight: 600 }}>
              {selectedSlot ? `${formatArabicDate(selectedDate)} - ${selectedSlot.time}` : '—'}
            </span>
          </div>
        </div>

        {submitError && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5', fontSize: 13,
          }}>
            {submitError}
          </div>
        )}

        {/* Primary — WhatsApp */}
        <motion.button
          onClick={confirmViaWhatsApp}
          disabled={submitting || !canConfirm}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '15px 0',
            background: submitting ? 'rgba(255,255,255,0.1)' : '#25D366',
            border: 'none', borderRadius: 12,
            color: '#0a0a0f', fontSize: 15, fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: !canConfirm ? 0.5 : 1,
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {submitting ? 'جارٍ التأكيد...' : 'متابعة الحجز عبر واتساب'}
        </motion.button>

        {/* Secondary — local confirm, collapsed by default */}
        {!showLocalForm ? (
          <button
            type="button"
            onClick={toggleLocalForm}
            disabled={!canConfirm}
            style={{
              background: 'transparent', border: 'none', textAlign: 'center',
              color: 'rgba(255,255,255,0.4)', fontSize: 12.5, cursor: canConfirm ? 'pointer' : 'not-allowed',
              fontFamily: "'Cairo', sans-serif", padding: '2px 0', textDecoration: 'underline',
            }}
          >
            أو أكمل الحجز من الموقع
          </button>
        ) : (
          <form onSubmit={confirmLocally} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            <Field label="الاسم" required placeholder="اسمك الكريم"
              value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Field label="رقم الهاتف" type="tel" required placeholder="+961..."
              value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            <motion.button
              type="submit"
              disabled={submitting || !customerName || !customerPhone}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '13px 0',
                background: submitting ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: (!customerName || !customerPhone) ? 0.5 : 1,
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              تأكيد الحجز من الموقع
            </motion.button>
          </form>
        )}
      </div>
    </div>
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
  const booking  = useReservationBooking()
  const { config, configLoading, mode } = booking
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
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>احجز موعدك</h1>
            {config?.name_ar && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                {config.name_ar}
              </p>
            )}
          </div>
        </div>

        {(configLoading || mode === 'loading') && <LoadingDot accent={accent} />}

        {!configLoading && mode === 'booking' && (
          <BookingScreen booking={booking} accent={accent} />
        )}

        {!configLoading && mode === 'legacy' && (
          <LegacyReserveForm config={config} slug={slug} accent={accent} base={base} navigate={navigate} />
        )}
      </div>
    </div>
  )
}
