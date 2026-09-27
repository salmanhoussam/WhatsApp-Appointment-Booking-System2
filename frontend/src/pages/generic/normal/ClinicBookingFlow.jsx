/**
 * ClinicBookingFlow — the clinic's six-step booking journey (P5-E).
 *
 * Rendered ONLY from ReservePage's `mode === 'clinic'` branch. It is NOT a second page: no route, no
 * registry entry, no own data fetching, and it consumes the same `useReservationBooking` hook the
 * barber branch does. ق-٥-ب forbade a twin `ClinicReservePage`, and this is not one — it is a
 * component under the existing page's own mode switch, exactly as `BookingPage` is.
 *
 * 🔴 IT READS THE NEUTRAL SURFACE ONLY -- `staff`, `selectedStaff`, `chooseStaff`, `staffLoading`,
 * `staffError`, `retryStaff`. Not one barber-named key appears in this file, and
 * scripts/test_p5e_clinic_ui.py asserts that by enumerating them. A file about doctors that reads a
 * key called `barbers` teaches the next reader that the two paths are one thing, which is what
 * rules/text-context-rule.md's "اسمُ المفتاح جزءٌ من العقد" exists to prevent.
 *
 * EVERY patient-facing string comes from ./clinicStrings.js, which is byte-compared against
 * CLINIC_WEB_UX_CONTRACT §6. Nothing is worded here.
 *
 * Contract: .claudedocs/architecture/CLINIC_WEB_UX_CONTRACT.md
 *   §2 six steps, one decision each, with the back-cascade   §3 the patient screen
 *   §4 calendar and times (🔴 no timezone conversion)        §5 states  §6 strings  §7 mobile  §8 theme
 */
import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, UserRound, CalendarDays, Clock, Stethoscope } from 'lucide-react'
import {
  CLINIC_TEXT, CLINIC_PICK_ANOTHER_SERVICE, CLINIC_SUCCESS, CLINIC_STEPS,
  resolveClinicError, invalidationOnReturnTo,
} from './clinicStrings'

const FONT = "'IBM Plex Sans Arabic', system-ui, sans-serif"

// §8: light by default for a clinic -- "عيادةٌ داكنةٌ تقرأ كصالون". The accent is NEVER hard-coded;
// it comes from Client.primary_color like any tenant's.
const CT = {
  pageBg:     '#F7F8FA',
  surface:    '#FFFFFF',
  line:       '#E3E6EB',
  textPrimary:'#14181F',
  textSecond: '#5A6472',
  textMuted:  '#8A94A3',
}

// §7: the existing threshold, reused rather than re-invented (BARBER_ROW_THRESHOLD = 4).
const STAFF_ROW_THRESHOLD = 4
// §7: "منطقةُ اللمس ≥ 44px" -- time buttons are the most-tapped and smallest-drawn thing here.
const TOUCH = 44

/* ── shared atoms, clinic-themed ─────────────────────────────────────────────────────────────── */

function StepHeading({ index, children }) {
  // §8: "عنوانُ الخطوةِ أوضحُ عنصرٍ في الشاشة".
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <span style={{
        width: 26, height: 26, borderRadius: '50%', background: CT.line, color: CT.textSecond,
        fontSize: 13, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>{index}</span>
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: CT.textPrimary, lineHeight: 1.35 }}>
        {children}
      </h2>
    </div>
  )
}

/** §5: "Skeleton بشكلِ المحتوى القادم — لا دوّارةٌ عامّة". */
function Skeleton({ rows = 3, height = 64 }) {
  return (
    <div style={{ display: 'grid', gap: 10 }} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height, borderRadius: 14, background: CT.line, opacity: 0.55,
          animation: 'clinicPulse 1.4s ease-in-out infinite',
        }} />
      ))}
      <style>{'@keyframes clinicPulse{0%,100%{opacity:.4}50%{opacity:.7}}'
        + '@media (prefers-reduced-motion: reduce){*{animation:none!important}}'}</style>
    </div>
  )
}

/** §5: a fetch failure is never the same as a real empty result -- the 2026-08-10 fix, preserved. */
function FetchError({ accent, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 4px' }}>
      <p style={{ margin: '0 0 14px', fontSize: 14, color: CT.textSecond }}>{CLINIC_TEXT.n14}</p>
      <button onClick={onRetry} style={{
        minHeight: TOUCH, padding: '0 24px', borderRadius: 999, border: 'none',
        background: accent, color: '#fff', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', fontFamily: FONT,
      }}>{CLINIC_TEXT.n14_retry}</button>
    </div>
  )
}

function Card({ selected, accent, onClick, children, style }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        textAlign: 'start', width: '100%', minHeight: TOUCH, padding: '14px 16px',
        borderRadius: 14, cursor: 'pointer', fontFamily: FONT,
        background: selected ? `${accent}12` : CT.surface,
        border: `1.5px solid ${selected ? accent : CT.line}`,
        transition: 'border-color .15s ease, background .15s ease',
        ...style,
      }}
    >{children}</button>
  )
}

function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: TOUCH,
      background: 'none', border: 'none', padding: '0 4px', cursor: 'pointer',
      color: CT.textSecond, fontSize: 14, fontFamily: FONT,
    }}>
      <ChevronRight size={16} />{CLINIC_TEXT.n16}
    </button>
  )
}

/* ── the flow ────────────────────────────────────────────────────────────────────────────────── */

export default function ClinicBookingFlow({ booking, config, accent, onHome }) {
  const {
    // ①
    services, servicesLoading, selectedServiceId, selectedService, chooseService,
    // ② -- the NEUTRAL surface, exclusively
    staff, staffLoading, staffError, retryStaff, selectedStaffId, selectedStaff, chooseStaff,
    // ③④
    monthGrid, goPrevMonth, goNextMonth, weekdaysShort, selectedDate, chooseDate, formatDate,
    slots, slotsLoading, slotsError, retrySlots, selectedSlot, chooseSlot,
    // ⑤⑥
    customerName, setCustomerName, customerPhone, setCustomerPhone,
    submitting, reservationId, confirmClinic,
  } = booking

  const [step, setStep] = useState('service')
  // §3 / C1.1 §9: the question is asked on EVERY booking. There is no "remember me" and no
  // skipping -- "تخطّيه ممنوعٌ بنصِّ العقد". So it starts unanswered, deliberately.
  const [relation, setRelation] = useState(null)
  const [patientName, setPatientName] = useState('')
  const [errorText, setErrorText] = useState(null)

  const goTo = useCallback((target) => {
    // §2's cascade: changing the service kills the doctor AND the time (eligibility and duration
    // both changed); changing the doctor or day kills the time only; returning to ⑤ kills nothing,
    // and the patient's typed details are never cleared by anything here.
    const kill = invalidationOnReturnTo(target)
    if (kill.doctor) chooseStaff(null)
    if (kill.time) chooseSlot(null)
    setErrorText(null)
    setStep(target)
  }, [chooseStaff, chooseSlot])

  const onConfirm = useCallback(async () => {
    const isSelf = relation === 'self'
    // §3: two fields, never three. For «إلي» the patient IS the contact. For «لشخص تاني» we hold
    // the patient's name and the BOOKER's phone -- "الـphone هنا هو رقم الشخص الذي يحجز".
    const patient = {
      name: isSelf ? customerName.trim() : patientName.trim(),
      relation: isSelf ? 'self' : 'other',
    }
    // 🟡 DECLARED, NOT INVENTED: `customer_name` is required by the API, and §3 forbids a third
    // field, so for «لشخص تاني» the only name we hold is the patient's and it goes here too. The
    // consequence is bounded and worth stating: Customer is find-or-create BY PHONE and an existing
    // row is NEVER renamed (reservation_service.py:716-722), so this only ever affects a FIRST-time
    // booker, whose contact row would carry the patient's name. Awaiting Salman's word; either fix
    // (a third field, or a placeholder) is a one-line change here.
    const result = await confirmClinic({
      name: patient.name, phone: customerPhone.trim(), patient,
    })
    if (result.ok) return
    // §6: branch on error.code, never on the server's prose, and never on the status alone --
    // three different causes arrive as one 409.
    const r = resolveClinicError(result.code)
    setErrorText(r.text)
    if (r.refreshSlots) retrySlots()
    setStep(r.backTo)
  }, [relation, customerName, patientName, customerPhone, confirmClinic, retrySlots])

  const canConfirm = useMemo(() => {
    if (!selectedService || !selectedStaff || !selectedSlot || !relation) return false
    if (!customerPhone.trim()) return false
    return relation === 'self' ? !!customerName.trim() : !!patientName.trim()
  }, [selectedService, selectedStaff, selectedSlot, relation, customerName, patientName, customerPhone])

  /* success -- §5/§6: the existing screen's own strings, unchanged */
  if (reservationId) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '64px 0', display: 'grid', gap: 18, justifyItems: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: `${accent}18`,
            border: `2px solid ${accent}`, display: 'grid', placeItems: 'center',
            fontSize: 32, color: accent,
          }}>✓</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: CT.textPrimary }}>
            {CLINIC_SUCCESS.title}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: CT.textMuted }}>
            {CLINIC_SUCCESS.refLabel}{' '}
            <span style={{ color: accent, fontWeight: 700 }}>{String(reservationId).slice(0, 8)}</span>
          </p>
          <p style={{ margin: 0, fontSize: 14, color: CT.textSecond, maxWidth: 300 }}>
            {CLINIC_SUCCESS.note}
          </p>
          <button onClick={onHome} style={{
            marginTop: 8, minHeight: TOUCH, padding: '0 28px', borderRadius: 999,
            border: `1.5px solid ${accent}`, background: 'transparent', color: accent,
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
          }}>{CLINIC_SUCCESS.home}</button>
        </div>
      </Shell>
    )
  }

  const stepIndex = CLINIC_STEPS.indexOf(step) + 1

  return (
    <Shell>
      {/* ن-١ */}
      <h1 style={{
        margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: CT.textPrimary, letterSpacing: '-0.01em',
      }}>{CLINIC_TEXT.n1}</h1>
      <p style={{ margin: '0 0 22px', fontSize: 13, color: CT.textMuted }}>
        {config?.name_ar || config?.name_en || ''}
      </p>

      {step !== 'service' && <div style={{ marginBottom: 6 }}><BackButton onClick={() => goTo(prevOf(step))} /></div>}

      {errorText && (
        <div role="alert" style={{
          margin: '0 0 16px', padding: '12px 14px', borderRadius: 12,
          background: '#FFF4F4', border: '1px solid #F3C9C9', color: '#8E2A2A',
          fontSize: 13.5, lineHeight: 1.6,
        }}>{errorText}</div>
      )}

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        {step === 'service' && (
          <>
            <StepHeading index={stepIndex}>{CLINIC_TEXT.n2}</StepHeading>
            {servicesLoading ? <Skeleton rows={3} /> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {services.map((s) => (
                  <Card key={s.id} accent={accent} selected={selectedServiceId === s.id}
                        onClick={() => { chooseService(s.id); chooseStaff(null); chooseSlot(null); setStep('doctor') }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: CT.textPrimary }}>
                        {s.name_ar || s.name_en}
                      </span>
                      <span style={{ fontSize: 12.5, color: CT.textMuted, whiteSpace: 'nowrap' }}>
                        {s.duration_min ? `${s.duration_min} د` : ''}
                        {s.price ? ` · ${s.price}` : ''}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {step === 'doctor' && (
          <>
            <StepHeading index={stepIndex}>{CLINIC_TEXT.n3}</StepHeading>
            {staffLoading ? <Skeleton rows={2} height={78} />
              : staffError ? <FetchError accent={accent} onRetry={retryStaff} />
              : staff.length === 0 ? (
                /* §5: NOT an error -- the correct result of the hard eligibility filter (ق-٤-ز). */
                <div style={{ textAlign: 'center', padding: '24px 4px' }}>
                  <p style={{ margin: '0 0 14px', fontSize: 14, color: CT.textSecond }}>{CLINIC_TEXT.n8}</p>
                  <button onClick={() => goTo('service')} style={{
                    minHeight: TOUCH, padding: '0 22px', borderRadius: 999,
                    border: `1.5px solid ${accent}`, background: 'transparent', color: accent,
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                  }}>{CLINIC_PICK_ANOTHER_SERVICE}</button>
                </div>
              ) : (
                /* §7: a row up to 4, a scroller beyond -- the existing threshold. */
                <div style={{
                  display: staff.length <= STAFF_ROW_THRESHOLD ? 'grid' : 'flex',
                  gridTemplateColumns: staff.length <= STAFF_ROW_THRESHOLD
                    ? `repeat(${Math.min(staff.length, 2)}, minmax(0,1fr))` : undefined,
                  gap: 10, overflowX: staff.length > STAFF_ROW_THRESHOLD ? 'auto' : undefined,
                  paddingBottom: staff.length > STAFF_ROW_THRESHOLD ? 6 : 0,
                }}>
                  {staff.map((d) => (
                    <Card key={d.id} accent={accent} selected={selectedStaffId === d.id}
                          onClick={() => { chooseStaff(d.id); chooseSlot(null); setStep('day') }}
                          style={{ minWidth: staff.length > STAFF_ROW_THRESHOLD ? 150 : undefined }}>
                      <div style={{ display: 'grid', gap: 3 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: CT.textPrimary }}>
                          <Stethoscope size={15} style={{ color: accent }} />{d.name}
                        </span>
                        {d.specialty && (
                          <span style={{ fontSize: 12.5, color: CT.textMuted }}>{d.specialty}</span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
          </>
        )}

        {step === 'day' && (
          <>
            <StepHeading index={stepIndex}>{CLINIC_TEXT.n4}</StepHeading>
            <div style={{
              background: CT.surface, border: `1px solid ${CT.line}`, borderRadius: 16, padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <button onClick={goNextMonth} style={navBtn}>‹</button>
                <span style={{ fontSize: 14, fontWeight: 700, color: CT.textPrimary }}>{monthGrid.label}</span>
                <button onClick={goPrevMonth} style={navBtn}>›</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                {weekdaysShort.map((w) => (
                  <span key={w} style={{ textAlign: 'center', fontSize: 11, color: CT.textMuted, padding: '4px 0' }}>{w}</span>
                ))}
                {monthGrid.cells.map((c, i) => c === null
                  ? <span key={`e${i}`} />
                  : (
                    /* §4: past and closed days stay VISIBLE and unclickable, never hidden. */
                    <button
                      key={c.iso} disabled={c.isPast}
                      onClick={() => { chooseDate(c.iso); chooseSlot(null); setStep('time') }}
                      style={{
                        minHeight: 40, borderRadius: 10, fontFamily: FONT, fontSize: 13.5,
                        cursor: c.isPast ? 'not-allowed' : 'pointer',
                        border: `1px solid ${selectedDate === c.iso ? accent : 'transparent'}`,
                        background: selectedDate === c.iso ? `${accent}14` : 'transparent',
                        color: c.isPast ? CT.line : (c.isToday ? accent : CT.textPrimary),
                        fontWeight: c.isToday || selectedDate === c.iso ? 700 : 500,
                      }}
                    >{c.dayNum}</button>
                  ))}
              </div>
            </div>
          </>
        )}

        {step === 'time' && (
          <>
            <StepHeading index={stepIndex}>{CLINIC_TEXT.n5}</StepHeading>
            <p style={{ margin: '-8px 0 14px', fontSize: 13, color: CT.textMuted }}>
              {formatDate(selectedDate)}
            </p>
            {slotsLoading ? <Skeleton rows={2} height={46} />
              : slotsError ? <FetchError accent={accent} onRetry={retrySlots} />
              : slots.length === 0 ? (
                /* §4: the empty message sits where the grid would be; the calendar stays reachable. */
                <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
                  <p style={{ margin: 0, fontSize: 14, color: CT.textSecond }}>{CLINIC_TEXT.n9}</p>
                  <BackButton onClick={() => goTo('day')} />
                </div>
              ) : (
                /* §7: a WRAPPING grid, never a horizontal strip -- a strip hides half the options. */
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map((s) => (
                    <button
                      key={s.datetime} onClick={() => { chooseSlot(s); setStep('patient') }}
                      style={{
                        minHeight: TOUCH, minWidth: 82, padding: '0 14px', borderRadius: 12,
                        fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        background: selectedSlot?.datetime === s.datetime ? accent : CT.surface,
                        color: selectedSlot?.datetime === s.datetime ? '#fff' : CT.textPrimary,
                        border: `1.5px solid ${selectedSlot?.datetime === s.datetime ? accent : CT.line}`,
                      }}
                    >{/* 🔴 §4: displayed EXACTLY as the server sent it. No toLocaleString, no offset --
                          the server returns local wall clock labelled UTC (F-TZ-1), and converting
                          here is the live defect closed in 044aafe. */}
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
          </>
        )}

        {step === 'patient' && (
          <>
            {/* §3: the QUESTION first, then the fields, and the labels change with the answer. */}
            <StepHeading index={stepIndex}>{CLINIC_TEXT.n6}</StepHeading>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[['self', CLINIC_TEXT.n7_self], ['other', CLINIC_TEXT.n7_other]].map(([v, label]) => (
                <Card key={v} accent={accent} selected={relation === v}
                      onClick={() => setRelation(v)} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: CT.textPrimary }}>{label}</span>
                </Card>
              ))}
            </div>

            {relation && (
              <div style={{ display: 'grid', gap: 12 }}>
                <Field
                  label={relation === 'self' ? CLINIC_TEXT.n10_name : CLINIC_TEXT.n11_name}
                  value={relation === 'self' ? customerName : patientName}
                  onChange={relation === 'self' ? setCustomerName : setPatientName}
                />
                <Field
                  label={relation === 'self' ? CLINIC_TEXT.n10_phone : CLINIC_TEXT.n11_phone}
                  value={customerPhone} onChange={setCustomerPhone} type="tel"
                />
                {/* 🟡 §6 ratifies NO label for the ⑤ -> ⑥ affordance (§7 only says a next-step
                    button exists). So a glyph is used rather than inventing Arabic copy, which this
                    phase is explicitly forbidden from doing. One approved word (e.g. «متابعة»)
                    replaces it; until then the glyph carries no claim. Flagged in the report. */}
                <button
                  type="button" disabled={!canConfirm} onClick={() => setStep('confirm')}
                  style={primaryBtn(accent, !canConfirm)}
                >←</button>
              </div>
            )}
          </>
        )}

        {step === 'confirm' && (
          <>
            <StepHeading index={stepIndex}>{CLINIC_TEXT.n15}</StepHeading>
            <div style={{
              background: CT.surface, border: `1px solid ${CT.line}`, borderRadius: 16,
              padding: 16, display: 'grid', gap: 12, marginBottom: 16,
            }}>
              <Row icon={Stethoscope} value={selectedService?.name_ar || selectedService?.name_en} accent={accent} />
              <Row icon={UserRound} value={selectedStaff?.name} accent={accent} />
              <Row icon={CalendarDays} value={formatDate(selectedDate)} accent={accent} />
              <Row icon={Clock} value={selectedSlot?.time} accent={accent} />
              <Row icon={UserRound}
                   value={relation === 'self' ? customerName : patientName} accent={accent} />
            </div>
            {/* ن-١٧ */}
            <p style={{ margin: '0 0 16px', fontSize: 13, color: CT.textSecond, lineHeight: 1.7 }}>
              {CLINIC_TEXT.n17}
            </p>
            <button
              type="button" disabled={submitting || !canConfirm} onClick={onConfirm}
              style={primaryBtn(accent, submitting || !canConfirm)}
            >{submitting ? CLINIC_TEXT.n15_sending : CLINIC_TEXT.n15}</button>
          </>
        )}
      </motion.div>
    </Shell>
  )
}

/* ── small helpers ───────────────────────────────────────────────────────────────────────────── */

function prevOf(step) {
  const i = CLINIC_STEPS.indexOf(step)
  return CLINIC_STEPS[Math.max(0, i - 1)]
}

const navBtn = {
  minHeight: 36, minWidth: 36, borderRadius: 10, border: `1px solid ${CT.line}`,
  background: CT.surface, color: CT.textSecond, fontSize: 16, cursor: 'pointer', fontFamily: FONT,
}

function primaryBtn(accent, disabled) {
  return {
    minHeight: TOUCH, width: '100%', borderRadius: 999, border: 'none',
    background: disabled ? CT.line : accent, color: disabled ? CT.textMuted : '#fff',
    fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: FONT,
  }
}

function Row({ icon: Icon, value, accent }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={16} style={{ color: accent, flexShrink: 0 }} />
      <span style={{ fontSize: 14, color: CT.textPrimary }}>{value}</span>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: CT.textSecond }}>{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          minHeight: TOUCH, borderRadius: 12, border: `1.5px solid ${CT.line}`,
          background: CT.surface, padding: '0 14px', fontSize: 15, fontFamily: FONT,
          color: CT.textPrimary,
        }}
      />
    </label>
  )
}

/** §7: 16px gutter, no horizontal page scroll, svh not vh. */
function Shell({ children }) {
  return (
    <div style={{ minHeight: '100svh', background: CT.pageBg, fontFamily: FONT, direction: 'rtl' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 16px 64px' }}>{children}</div>
    </div>
  )
}
