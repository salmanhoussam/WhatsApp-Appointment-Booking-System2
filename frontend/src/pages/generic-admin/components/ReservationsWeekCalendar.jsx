import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StatusBadge, StatusCell } from '../tabs/ReservationsTab'

// Sunday-first, matching this codebase's one existing calendar precedent (UnitCalendar.jsx's
// DAYS_AR) and standard Arabic/RTL calendar convention.
const DAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const ROW_HEIGHT_PX = 56

// A UTC-aware time label, deliberately NOT the shared fmtTime() from ReservationsTab.jsx --
// that one formats in the browser's local timezone, which would visually contradict this
// calendar's UTC-based card positioning (see the comment on the date helpers below). The
// List view keeps using the shared fmtTime as-is; that's a separate, pre-existing display
// choice this feature doesn't change.
function fmtTimeUTC(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = String(d.getUTCHours()).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// Every helper below reads/writes UTC fields consistently -- matching this feature's own
// stated convention (reservation_service.py's working-hours check reads reserved_at's UTC
// hour directly, with no timezone conversion anywhere in the reservation path). Using the
// browser's LOCAL timezone here instead would silently disagree with the backend's own
// 09:00-21:00 semantics and could misplace a reservation into the wrong day column entirely
// for a viewer whose local timezone crosses a UTC day boundary. Real bug found and fixed via
// a real headless-Chrome screenshot during this feature's own verification: an 11:00 UTC
// booking rendered at ~14:00 (EEST, UTC+3) before this fix.
function startOfWeekSunday(d) {
  const copy = new Date(d)
  const utcDay = copy.getUTCDay()
  copy.setUTCHours(0, 0, 0, 0)
  copy.setUTCDate(copy.getUTCDate() - utcDay)
  return copy
}
function addDays(d, n) {
  const copy = new Date(d)
  copy.setUTCDate(copy.getUTCDate() + n)
  return copy
}
function isoDateKey(d) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function isSameDay(a, b) {
  return isoDateKey(a) === isoDateKey(b)
}
function fmtDayLabel(d) {
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
}
function dayOfWeekUTC(d) {
  return d.getUTCDay()
}

function topPx(reservedAtIso, startHour) {
  const d = new Date(reservedAtIso)
  const minsFromStart = (d.getUTCHours() * 60 + d.getUTCMinutes()) - startHour * 60
  return (minsFromStart / 60) * ROW_HEIGHT_PX
}
function heightPx(durationMin) {
  return Math.max((durationMin / 60) * ROW_HEIGHT_PX, 22)
}

const slideVariants = {
  enter: d => ({ x: d * 30, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: d => ({ x: d * -30, opacity: 0 }),
}

function NavBtn({ onClick, label, color }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 14px', borderRadius: 7, cursor: 'pointer',
        fontFamily: "'Cairo', sans-serif", fontSize: 13,
        background: hov ? `${color}22` : 'transparent',
        border: `1px solid ${color}44`, color,
        transition: 'background 0.15s',
      }}
    >
      {label}
    </button>
  )
}

/**
 * ReservationsWeekCalendar — a real week-grid view over the same reservations
 * data ReservationsTab.jsx's table already fetches. No parallel data path:
 * reservations/weekStart/onWeekChange are all owned by the parent tab.
 *
 * Props:
 *   reservations   — array already scoped to [weekStart, weekStart+7)
 *   weekStart      — Date, normalized to a Sunday
 *   onWeekChange   — (nextWeekStart: Date) => void
 *   color          — tenant primary_color
 *   onStatusChange — (id, newStatus) => Promise, reused for the detail modal
 *   hourRange      — [startHour, endHour]
 */
export default function ReservationsWeekCalendar({
  reservations, weekStart, onWeekChange, color, onStatusChange, hourRange,
}) {
  const [direction, setDirection] = useState(0)
  const [selected, setSelected] = useState(null)
  const [startHour, endHour] = hourRange

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const byDay = useMemo(() => {
    const map = new Map(days.map(d => [isoDateKey(d), []]))
    for (const r of reservations) {
      if (!r.reserved_at) continue
      const key = isoDateKey(new Date(r.reserved_at))
      if (map.has(key)) map.get(key).push(r)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.reserved_at) - new Date(b.reserved_at))
    }
    return map
  }, [days, reservations])

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour]
  )
  const gridHeight = hours.length * ROW_HEIGHT_PX

  const today = new Date()
  const weekLabel = `${fmtDayLabel(days[0])} – ${fmtDayLabel(days[6])}`

  const goWeek = (delta) => {
    setDirection(delta)
    onWeekChange(addDays(weekStart, delta * 7))
  }
  const goToday = () => {
    const now = startOfWeekSunday(new Date())
    setDirection(now < weekStart ? -1 : 1)
    onWeekChange(now)
  }

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      {/* Week nav header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <NavBtn label="‹ السابق" onClick={() => goWeek(-1)} color={color} />
        <AnimatePresence mode="wait" custom={direction}>
          <motion.span
            key={isoDateKey(weekStart)}
            custom={direction} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ fontSize: 13, fontWeight: 700, color: '#fff', minWidth: 140, textAlign: 'center' }}
          >
            {weekLabel}
          </motion.span>
        </AnimatePresence>
        <div style={{ display: 'flex', gap: 6 }}>
          <NavBtn label="اليوم" onClick={goToday} color={color} />
          <NavBtn label="التالي ›" onClick={() => goWeek(1)} color={color} />
        </div>
      </div>

      {/* Week grid — horizontally scrollable on narrow screens */}
      <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(7, minmax(120px, 1fr))`, minWidth: 900 }}>

          {/* Header row */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }} />
          {days.map(d => {
            const isToday = isSameDay(d, today)
            return (
              <div
                key={isoDateKey(d)}
                style={{
                  padding: '10px 6px', textAlign: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  background: isToday ? `${color}1a` : 'transparent',
                }}
              >
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{DAYS_AR[dayOfWeekUTC(d)]}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? color : '#fff' }}>
                  {fmtDayLabel(d)}
                </div>
              </div>
            )
          })}

          {/* Time gutter */}
          <div style={{ position: 'relative', height: gridHeight }}>
            {hours.map((h, i) => (
              <div
                key={h}
                style={{
                  position: 'absolute', top: i * ROW_HEIGHT_PX - 7, left: 0, right: 4,
                  fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'left',
                }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(d => {
            const key = isoDateKey(d)
            const dayReservations = byDay.get(key) ?? []
            const isToday = isSameDay(d, today)
            return (
              <div
                key={key}
                style={{
                  position: 'relative', height: gridHeight,
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  background: isToday ? `${color}0d` : 'transparent',
                }}
              >
                {/* hour gridlines */}
                {hours.map((h, i) => (
                  <div
                    key={h}
                    style={{
                      position: 'absolute', top: i * ROW_HEIGHT_PX, left: 0, right: 0,
                      borderTop: '1px solid rgba(255,255,255,0.04)', height: ROW_HEIGHT_PX,
                    }}
                  />
                ))}

                {dayReservations.map(r => {
                  const top = Math.max(0, Math.min(topPx(r.reserved_at, startHour), gridHeight - 22))
                  const height = Math.min(heightPx(r.duration_min), gridHeight - top)
                  const meta = r.metadata || {}
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      style={{
                        position: 'absolute', top, height, left: 4, right: 4,
                        borderRadius: 6, padding: '3px 6px', textAlign: 'right',
                        background: `${color}26`, border: `1px solid ${color}55`,
                        color: '#fff', fontSize: 11, cursor: 'pointer', overflow: 'hidden',
                        fontFamily: "'Cairo', sans-serif",
                      }}
                      title={`${r.customer_name} — ${fmtTimeUTC(r.reserved_at)}${meta.service_name ? ` — ${meta.service_name}` : ''}`}
                    >
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.customer_name}
                      </div>
                      <div style={{ opacity: 0.75, whiteSpace: 'nowrap' }}>{fmtTimeUTC(r.reserved_at)}</div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#16181d', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: 22, minWidth: 300, maxWidth: 420,
              direction: 'rtl', fontFamily: "'Cairo', sans-serif",
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{selected.customer_name}</div>
              <StatusCell reservation={selected} onUpdate={onStatusChange} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              <div>📞 {selected.customer_phone || '—'}</div>
              {selected.customer_email && <div>✉️ {selected.customer_email}</div>}
              <div>🕐 {fmtTimeUTC(selected.reserved_at)} — {selected.duration_min} دقيقة</div>
              {selected.module_key && <div>🏷️ {selected.module_key}</div>}
              {selected.metadata?.service_name && <div>✂️ {selected.metadata.service_name}</div>}
              {selected.notes && (
                <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
                  {selected.notes}
                </div>
              )}
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <pre style={{
                  marginTop: 6, padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                  fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'auto', direction: 'ltr',
                }}>
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{
                marginTop: 16, width: '100%', padding: '8px 0', borderRadius: 8,
                background: 'transparent', border: `1px solid ${color}44`, color,
                cursor: 'pointer', fontFamily: "'Cairo', sans-serif", fontSize: 13,
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export { startOfWeekSunday }
