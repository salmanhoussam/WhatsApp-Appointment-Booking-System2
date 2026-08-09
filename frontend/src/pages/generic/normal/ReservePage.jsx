import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate }           from 'react-router-dom'
import { motion }                from 'framer-motion'
import {
  Scissors, UserRound, ScissorsLineDashed, Wind, Sparkles, Paintbrush,
  ChevronLeft, ChevronRight, Check, Phone, MapPin, Clock, CalendarDays, Timer, MessageCircle,
} from 'lucide-react'
import publicApi              from '../../../utils/publicApi'
import useTenantSlug          from '../../../hooks/useTenantSlug'
import { useTenantBase }      from '../../../hooks/useTenantSlug'
import useReservationBooking  from '../../../hooks/useReservationBooking'
import TenantModuleNav        from '../../../design-system/organisms/TenantModuleNav'
import { hasCapability }      from '../../../utils/capabilities'

const FONT = "'Cairo', 'Segoe UI', sans-serif"

// ── Light design tokens — used only by the booking-mode page ────────────────────────────────────
// Redesigned 2026-08-03 per Salman's own visual reference (light, Apple/Airbnb/Fresha-style app,
// not a dark dashboard). Scoped to `mode === 'booking'` only -- the legacy generic date/time form
// (other tenant types, out of this Pilot's scope) keeps its original dark styling untouched below.
const T = {
  pageBg:      '#F7F8FA',
  cardBg:      '#FFFFFF',
  border:      'rgba(15,23,42,0.08)',
  borderSoft:  'rgba(15,23,42,0.05)',
  textPrimary: '#0F172A',
  textSecond:  '#6B7280',
  textMuted:   '#9CA3AF',
  green:       '#16A34A',
  greenSoft:   'rgba(22,163,74,0.10)',
  whatsapp:    '#25D366',
  shadow:      '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
  shadowLg:    '0 4px 24px rgba(15,23,42,0.06)',
}

const SERVICE_ICONS = {
  'شعر':            Scissors,
  'دقن':            UserRound,
  'شعر ودقن':       ScissorsLineDashed,
  'تمشيط أو تسريح': Wind,
  'كرياتين':        Sparkles,
  'حنة أو صبغة':    Paintbrush,
}

function serviceIconFor(nameAr) {
  return SERVICE_ICONS[nameAr] ?? Scissors
}

// ── Shared dark-theme atoms (legacy form only) ───────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, required, placeholder, hint, as: Tag = 'input', rows }) {
  const shared = {
    value, onChange, required, placeholder,
    style: {
      width: '100%', padding: '11px 16px', boxSizing: 'border-box',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 10, color: '#fff', fontSize: 14,
      outline: 'none', fontFamily: FONT,
      resize: Tag === 'textarea' ? 'vertical' : undefined,
    },
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: '#ef4444', marginRight: 3 }}>*</span>}
      </label>
      {Tag === 'textarea' ? <textarea rows={rows ?? 3} {...shared} /> : <input type={type} {...shared} />}
      {hint && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{hint}</p>}
    </div>
  )
}

function SuccessScreen({ accent, reservationId, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: '50%', background: `${accent}22`, border: `2px solid ${accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
      }}>✓</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>تم تأكيد الحجز!</h2>
      {reservationId && (
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          رقم الحجز: <span style={{ color: accent, fontWeight: 600 }}>{reservationId.slice(0, 8)}</span>
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
          color: accent, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
        }}
      >
        العودة للرئيسية
      </button>
    </motion.div>
  )
}

// ── Light-theme atoms (booking mode) ─────────────────────────────────────────────────────────────

function LightLoadingDot() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: T.green,
        margin: '0 auto', animation: 'rwdot 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes rwdot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  )
}

function NumberedSection({ index, title, children }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
        fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 16,
      }}>
        {title}
        <span style={{ color: T.textMuted, fontWeight: 700 }}>.{index}</span>
      </div>
      {children}
    </div>
  )
}

// ServiceCircle -- horizontal-carousel presentation for service selection (2026-08-09, UI-only
// change per Salman's explicit spec: circular photo/icon, name + duration below, ring + small
// check badge for selected state, no size jump on select). Same selection semantics as the prior
// ServiceCard (selected/onClick), only the visual presentation changed -- chooseService/
// selectedServiceId, the API shape, and every other part of the booking flow are untouched.
function ServiceCircle({ item, selected, onClick }) {
  const Icon = serviceIconFor(item.name_ar)
  const size = 72
  return (
    <button
      onClick={onClick}
      style={{
        cursor: 'pointer', border: 'none', background: 'transparent', padding: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        flexShrink: 0, width: 84, scrollSnapAlign: 'start', fontFamily: FONT,
      }}
    >
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <div style={{
          width: size, height: size, borderRadius: '50%', overflow: 'hidden',
          background: T.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: selected ? `0 0 0 3px ${T.green}` : `0 0 0 1px ${T.border}`,
          transition: 'box-shadow 0.15s ease',
        }}>
          {item.image_url
            ? <img src={item.image_url} alt={item.name_ar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Icon size={26} color={T.green} strokeWidth={1.75} />}
        </div>
        {selected && (
          <span style={{
            position: 'absolute', top: -2, insetInlineStart: -2, width: 20, height: 20, borderRadius: '50%',
            background: T.green, border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={10} color="#fff" strokeWidth={3} />
          </span>
        )}
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, textAlign: 'center', lineHeight: 1.3 }}>
        {item.name_ar}
      </span>
      <span style={{ fontSize: 10.5, color: T.textSecond }}>{item.duration_min} دقيقة</span>
    </button>
  )
}

// Hides the native scrollbar on the services carousel while keeping real touch/mouse-wheel
// scroll intact -- scrollbarWidth (Firefox) is inline-settable, but ::-webkit-scrollbar needs a
// real stylesheet rule, so it's injected once via the same scoped <style> pattern LightLoadingDot
// already uses in this file.
function ServicesScrollStyle() {
  return <style>{`.rw-services-scroll::-webkit-scrollbar{display:none}`}</style>
}

function StaffCarousel({ barbers, selectedBarberId, onChoose }) {
  const [offset, setOffset] = useState(0)
  const visible = barbers[offset] ?? null
  const canPrev = offset > 0
  const canNext = offset < barbers.length - 1

  if (!visible) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <button
        onClick={() => canPrev && setOffset((o) => o - 1)}
        disabled={!canPrev}
        style={{
          width: 34, height: 34, borderRadius: '50%', border: `1px solid ${T.border}`,
          background: T.cardBg, cursor: canPrev ? 'pointer' : 'not-allowed', opacity: canPrev ? 1 : 0.3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ChevronRight size={16} color={T.textPrimary} />
      </button>

      <button
        onClick={() => onChoose(visible.id)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer',
          padding: '16px 32px', borderRadius: 16,
          background: selectedBarberId === visible.id ? T.greenSoft : T.cardBg,
          border: `1.5px solid ${selectedBarberId === visible.id ? T.green : T.border}`,
          boxShadow: selectedBarberId === visible.id ? 'none' : T.shadow, position: 'relative',
        }}
      >
        {selectedBarberId === visible.id && (
          <span style={{
            position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderRadius: '50%',
            background: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={12} color="#fff" strokeWidth={3} />
          </span>
        )}
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: T.borderSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserRound size={26} color={T.textSecond} strokeWidth={1.5} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: FONT }}>{visible.name}</span>
      </button>

      <button
        onClick={() => canNext && setOffset((o) => o + 1)}
        disabled={!canNext}
        style={{
          width: 34, height: 34, borderRadius: '50%', border: `1px solid ${T.border}`,
          background: T.cardBg, cursor: canNext ? 'pointer' : 'not-allowed', opacity: canNext ? 1 : 0.3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ChevronLeft size={16} color={T.textPrimary} />
      </button>
    </div>
  )
}

// Real-Time Calendar Awareness (Phase 3.3.1, 2026-08-05) -- local date-only "today" check, matching
// useReservationBooking.js's own todayUTC()/isoOf() convention (Date.UTC from local Y/M/D, then
// sliced to YYYY-MM-DD) without needing to change that hook -- it's read-only for this feature.
function isTodayIso(iso) {
  const now = new Date()
  const todayIso = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10)
  return iso === todayIso
}

function CalendarPanel({ booking }) {
  const {
    monthGrid, goPrevMonth, goNextMonth, monthOffset, weekdaysShort,
    selectedDate, chooseDate, slots, slotsLoading, selectedSlot, chooseSlot, formatArabicDate,
  } = booking

  // Bring the earliest (first) slot into view when viewing today -- no "find slot near now" search
  // of our own: the backend already returns slots past-filtered and chronologically ordered, so the
  // first slot in the array is already the correct one. Runs once slots finish loading for today;
  // does nothing when slots is empty (Scenario 4) or when a non-today date is selected.
  const firstSlotRef = useRef(null)
  useEffect(() => {
    if (!slotsLoading && slots.length > 0 && isTodayIso(selectedDate)) {
      firstSlotRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [slotsLoading, slots, selectedDate])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
      {/* Calendar grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button
            onClick={goPrevMonth} disabled={monthOffset === 0}
            style={{
              width: 30, height: 30, borderRadius: 10, border: `1px solid ${T.border}`, background: T.cardBg,
              cursor: monthOffset === 0 ? 'not-allowed' : 'pointer', opacity: monthOffset === 0 ? 0.3 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronRight size={15} color={T.textPrimary} />
          </button>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{monthGrid.label}</div>
          <button
            onClick={goNextMonth}
            style={{
              width: 30, height: 30, borderRadius: 10, border: `1px solid ${T.border}`, background: T.cardBg,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={15} color={T.textPrimary} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
          {weekdaysShort.map((w) => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11, color: T.textMuted, fontWeight: 700 }}>{w}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {monthGrid.cells.map((cell, i) => {
            if (!cell) return <div key={`pad-${i}`} />
            const active = cell.iso === selectedDate
            return (
              <button
                key={cell.iso}
                disabled={cell.isPast}
                onClick={() => chooseDate(cell.iso)}
                style={{
                  aspectRatio: '1', borderRadius: '50%', cursor: cell.isPast ? 'not-allowed' : 'pointer',
                  background: active ? T.green : 'transparent',
                  border: cell.isToday && !active ? `1px solid ${T.green}` : '1px solid transparent',
                  color: active ? '#fff' : cell.isPast ? T.textMuted : T.textPrimary,
                  fontSize: 13, fontWeight: active ? 800 : 500, fontFamily: FONT,
                  opacity: cell.isPast ? 0.4 : 1,
                }}
              >
                {cell.dayNum}
              </button>
            )
          })}
        </div>

        <p style={{ marginTop: 12, fontSize: 11, color: T.textMuted, textAlign: 'center' }}>
          الأيام المتاحة باللون الأسود
        </p>
      </div>

      {/* Time slots */}
      <div style={{ borderInlineStart: `1px solid ${T.borderSoft}`, paddingInlineStart: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <CalendarDays size={16} color={T.textSecond} />
          <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{formatArabicDate(selectedDate)}</span>
        </div>

        {slotsLoading && <LightLoadingDot />}
        {!slotsLoading && slots.length === 0 && (
          <p style={{ color: T.textMuted, fontSize: 13, textAlign: 'center', padding: '30px 0' }}>
            لا توجد مواعيد متاحة في هذا اليوم — جرّب يوماً آخر.
          </p>
        )}
        {!slotsLoading && slots.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
            {slots.map((s, i) => {
              const active = selectedSlot?.time === s.time
              return (
                <button
                  key={s.time}
                  ref={i === 0 ? firstSlotRef : undefined}
                  onClick={() => chooseSlot(s)}
                  style={{
                    padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                    background: active ? T.green : T.cardBg,
                    border: `1px solid ${active ? T.green : T.border}`,
                    color: active ? '#fff' : T.textPrimary,
                    fontSize: 13, fontWeight: 600, fontFamily: FONT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  {active && <Check size={12} strokeWidth={3} />}
                  {s.time}
                </button>
              )
            })}
          </div>
        )}
        <p style={{ marginTop: 14, fontSize: 11, color: T.textMuted, textAlign: 'center' }}>
          التوقيت المحلي (GMT+3)
        </p>
      </div>
    </div>
  )
}

function SummaryCard({ booking }) {
  const { selectedService, selectedBarber, selectedDate, selectedSlot, formatArabicDate } = booking
  const rows = [
    { icon: Scissors, label: 'الخدمة', value: selectedService?.name_ar },
    { icon: UserRound, label: 'الحلاق', value: selectedBarber?.name },
    { icon: CalendarDays, label: 'اليوم', value: selectedSlot ? formatArabicDate(selectedDate) : null },
    { icon: Clock, label: 'الوقت', value: selectedSlot?.time },
    { icon: Timer, label: 'المدة', value: selectedService?.duration_min ? `${selectedService.duration_min} دقيقة` : null },
  ]
  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 18, padding: '20px 22px',
      boxShadow: T.shadow, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>ملخص الحجز</div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textSecond, fontSize: 13 }}>
            <r.icon size={15} />
            {r.label}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{r.value ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}

function ConfirmPanel({ booking }) {
  const {
    showLocalForm, toggleLocalForm, customerName, setCustomerName, customerPhone, setCustomerPhone,
    submitting, submitError, canConfirm, confirmViaWhatsApp, confirmLocally,
  } = booking

  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 18, padding: '22px 22px',
      boxShadow: T.shadow, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <p style={{ margin: 0, fontSize: 11, color: T.textMuted, textAlign: 'center' }}>طريقة سريعة ومريحة</p>

      {submitError && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: 13,
        }}>
          {submitError}
        </div>
      )}

      <motion.button
        onClick={confirmViaWhatsApp}
        disabled={submitting || !canConfirm}
        whileTap={{ scale: 0.97 }}
        style={{
          padding: '15px 0', background: submitting ? '#93d3ab' : T.whatsapp, border: 'none', borderRadius: 14,
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: !canConfirm ? 0.5 : 1, fontFamily: FONT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <MessageCircle size={18} />
        {submitting ? 'جارٍ التأكيد...' : 'متابعة الحجز عبر واتساب'}
      </motion.button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
        <div style={{ flex: 1, height: 1, background: T.borderSoft }} />
        <span style={{ fontSize: 11, color: T.textMuted }}>أو</span>
        <div style={{ flex: 1, height: 1, background: T.borderSoft }} />
      </div>

      {!showLocalForm ? (
        <>
          <button
            type="button"
            onClick={toggleLocalForm}
            disabled={!canConfirm}
            style={{
              padding: '13px 0', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 14,
              color: T.textPrimary, fontSize: 14, fontWeight: 700, fontFamily: FONT,
              cursor: canConfirm ? 'pointer' : 'not-allowed', opacity: canConfirm ? 1 : 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <UserRound size={16} />
            أكمل الحجز من الموقع
          </button>
          <p style={{ margin: 0, fontSize: 11, color: T.textMuted, textAlign: 'center' }}>سيتم تأكيد الحجز فوراً</p>
        </>
      ) : (
        <form onSubmit={confirmLocally} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            required placeholder="الاسم" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px', boxSizing: 'border-box', borderRadius: 10,
              border: `1px solid ${T.border}`, background: T.pageBg, fontSize: 14, fontFamily: FONT, outline: 'none',
            }}
          />
          <input
            required type="tel" placeholder="رقم الهاتف" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px', boxSizing: 'border-box', borderRadius: 10,
              border: `1px solid ${T.border}`, background: T.pageBg, fontSize: 14, fontFamily: FONT, outline: 'none',
            }}
          />
          <motion.button
            type="submit" disabled={submitting || !customerName || !customerPhone} whileTap={{ scale: 0.97 }}
            style={{
              padding: '13px 0', background: T.textPrimary, border: 'none', borderRadius: 14,
              color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: FONT,
              cursor: submitting ? 'not-allowed' : 'pointer', opacity: (!customerName || !customerPhone) ? 0.5 : 1,
            }}
          >
            تأكيد الحجز من الموقع
          </motion.button>
        </form>
      )}
    </div>
  )
}

function InlineConfirmation({ booking }) {
  const { reservationId, confirmMethod, whatsappUrl } = booking
  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 20, padding: '48px 24px',
      boxShadow: T.shadowLg, textAlign: 'center',
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px', background: T.greenSoft,
        border: `2px solid ${T.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Check size={26} color={T.green} strokeWidth={3} />
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 800, color: T.textPrimary }}>تم إنشاء حجزك</h2>
      <p style={{ margin: 0, fontSize: 14, color: T.textSecond, maxWidth: 380, marginInline: 'auto' }}>
        {confirmMethod === 'whatsapp'
          ? 'فتحنا لك واتساب برسالة جاهزة — أرسلها لصاحب المحل لتأكيد الحجز نهائياً.'
          : 'تم تسجيل حجزك — سيتواصل معك صاحب المحل لتأكيد الموعد.'}
        {' '}رقم الحجز: <span style={{ color: T.green, fontWeight: 700 }}>{reservationId.slice(0, 8)}</span>
      </p>
      {confirmMethod === 'whatsapp' && whatsappUrl && (
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 16, fontSize: 13, color: T.whatsapp, fontWeight: 700, fontFamily: FONT }}>
          لم تفتح صفحة واتساب؟ اضغط هنا
        </a>
      )}
    </div>
  )
}

// ── Booking page (light theme) ───────────────────────────────────────────────────────────────────

function BookingPage({ booking, config }) {
  const {
    services, servicesLoading, selectedServiceId, chooseService,
    barbers, barbersLoading, selectedBarberId, chooseBarber,
    reservationId,
  } = booking

  const whatsappNumber = config?.whatsapp_number
  const workingHours = config?.config?.working_hours
  const hoursText = workingHours?.open_time && workingHours?.close_time
    ? `يومياً ${workingHours.open_time} - ${workingHours.close_time}`
    : null

  return (
    <div style={{ minHeight: '100vh', background: T.pageBg }}>
      <TenantModuleNav />

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '96px 20px 60px', direction: 'rtl' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 30, fontWeight: 900, color: T.textPrimary, fontFamily: FONT }}>
            احجز موعدك
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: T.textSecond, fontFamily: FONT }}>
            اختر الخدمة والحلاق والوقت المناسب لك
          </p>
        </div>

        {reservationId ? (
          <InlineConfirmation booking={booking} />
        ) : (
          <>
            <div style={{
              background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 22, boxShadow: T.shadowLg,
              padding: '28px 26px', display: 'flex', flexDirection: 'column', gap: 26,
            }}>
              <NumberedSection index={1} title="اختر الخدمة">
                {servicesLoading ? <LightLoadingDot /> : (
                  <>
                    <ServicesScrollStyle />
                    <div
                      className="rw-services-scroll"
                      style={{
                        display: 'flex', gap: 18, overflowX: 'auto',
                        scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch',
                        paddingBottom: 4, paddingInlineEnd: 8, scrollbarWidth: 'none',
                        WebkitMaskImage: 'linear-gradient(to left, transparent 0, #000 20px, #000 calc(100% - 20px), transparent 100%)',
                        maskImage: 'linear-gradient(to left, transparent 0, #000 20px, #000 calc(100% - 20px), transparent 100%)',
                      }}
                    >
                      {services.map((s) => (
                        <ServiceCircle key={s.id} item={s} selected={selectedServiceId === s.id} onClick={() => chooseService(s.id)} />
                      ))}
                    </div>
                  </>
                )}
              </NumberedSection>

              <div style={{ borderTop: `1px solid ${T.borderSoft}` }} />

              {/* key={selectedServiceId} on StaffCarousel below -- Phase 3.7C (2026-08-08):
                  `barbers` now legitimately changes at runtime (re-filtered by selected service,
                  useReservationBooking.js), not just once on mount. Found via real Browser
                  Verification: without a remount, StaffCarousel's local pagination `offset` stayed
                  at a stale index after switching from a longer filtered list to a shorter one,
                  silently rendering nothing (barbers[staleOffset] === undefined), no error anywhere.
                  Forcing a fresh mount per service is the idiomatic React fix for "reset local state
                  when an external input changes" (react.dev/learn/you-might-not-need-an-effect),
                  not a manual useEffect(() => setOffset(0), [barbers]). */}
              <NumberedSection index={2} title="اختر الحلاق">
                {barbersLoading ? <LightLoadingDot /> : (
                  <StaffCarousel key={selectedServiceId} barbers={barbers} selectedBarberId={selectedBarberId} onChoose={chooseBarber} />
                )}
              </NumberedSection>

              <div style={{ borderTop: `1px solid ${T.borderSoft}` }} />

              <NumberedSection index={3} title="اختر اليوم والوقت">
                <CalendarPanel booking={booking} />
              </NumberedSection>
            </div>

            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              <ConfirmPanel booking={booking} />
              <SummaryCard booking={booking} />
            </div>
          </>
        )}

        {(whatsappNumber || hoursText) && (
          <div style={{
            marginTop: 40, paddingTop: 24, borderTop: `1px solid ${T.borderSoft}`,
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 32,
          }}>
            {whatsappNumber && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textSecond, fontSize: 13 }}>
                <Phone size={15} />
                <span>دعم العملاء +{whatsappNumber}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textSecond, fontSize: 13 }}>
              <MapPin size={15} />
              <span>موقعنا لبنان</span>
            </div>
            {hoursText && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textSecond, fontSize: 13 }}>
                <Clock size={15} />
                <span>ساعات العمل {hoursText}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Legacy generic form — unchanged, dark theme, kept for every generic tenant with no Barber
// rows (restaurant table reservations, generic services without staff, etc.) -- not this Pilot's
// scope, and never rendered in the same page as the light booking-mode UI above.

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
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 18,
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
          padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 13,
        }}>
          {error}
        </div>
      )}
      <motion.button
        type="submit" disabled={submitting || !form.customer_name || !form.customer_phone} whileTap={{ scale: 0.97 }}
        style={{
          marginTop: 4, padding: '14px 0', background: submitting ? 'rgba(255,255,255,0.1)' : accent,
          border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: (!form.customer_name || !form.customer_phone) ? 0.5 : 1,
          transition: 'all 0.2s', fontFamily: FONT,
        }}
      >
        {submitting ? 'جارٍ الإرسال...' : 'تأكيد الحجز'}
      </motion.button>
    </form>
  )
}

function LegacyPage({ config, slug, base, navigate }) {
  const accent = config?.primary_color ?? '#d4a853'
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl' }}>
      <TenantModuleNav />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '88px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 20,
            }}
          >
            ←
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>احجز موعد</h1>
            {config?.name_ar && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{config.name_ar}</p>}
          </div>
        </div>
        <LegacyReserveForm config={config} slug={slug} accent={accent} base={base} navigate={navigate} />
      </div>
    </div>
  )
}

// ── ReservePage ───────────────────────────────────────────────────────────────

export default function ReservePage() {
  const slug     = useTenantSlug()
  const base     = useTenantBase()
  const navigate = useNavigate()
  const booking  = useReservationBooking()
  const { config, configLoading, mode } = booking

  // Loading must be checked BEFORE the "unavailable" branch below -- config is undefined while
  // the fetch is in flight, so active_services defaults to [] and hasReservations reads false
  // for any tenant, including ones that DO have it active. Checking loading first was the real
  // bug: on a cold load (no cached config yet), every reservations-enabled tenant would flash a
  // permanent-looking "service not available" dead end instead of a loading state -- found via
  // real device-emulated Browser Verification hitting it reliably on a fresh, uncached session.
  if (configLoading || mode === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: T.pageBg }}>
        <TenantModuleNav />
        <div style={{ paddingTop: 160 }}><LightLoadingDot /></div>
      </div>
    )
  }

  const activeServices = config?.active_services ?? []
  const hasReservations = activeServices.includes('reservations')

  if (!hasReservations) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', direction: 'rtl' }}>
        <TenantModuleNav />
        <div style={{
          maxWidth: 480, margin: '160px auto 0', padding: '0 20px',
          textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: FONT, fontSize: 16,
        }}>
          خدمة الحجز غير متاحة حالياً.
        </div>
      </div>
    )
  }

  if (mode === 'booking') {
    return <BookingPage booking={booking} config={config} />
  }

  return <LegacyPage config={config} slug={slug} base={base} navigate={navigate} />
}
