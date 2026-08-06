import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  fmtTimeUTC, isoAtQuarter, VISIBLE_STATUSES, ReservationPopover, CreatePopover,
} from './reservationInteractions'
import { T, FONT } from '../theme'

// Sunday-first, matching this codebase's one existing calendar precedent (UnitCalendar.jsx's
// DAYS_AR) and standard Arabic/RTL calendar convention.
const DAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const ROW_HEIGHT_PX = 56
// Pixels per 15-minute quarter at this grid's density -- used with the shared isoAtQuarter()/
// quarterIndexFromIso() (Phase 3.4, 2026-08-06) for slot-click/drag math, same functions Today
// uses at its own QUARTER_PX=22 density. Hour gridlines stay visually hourly; the underlying time
// resolution is still 15 minutes, matching Today's create/drag precision -- a click or drag just
// resolves to the nearest quarter-hour within whichever hour row it lands in.
const WEEK_QUARTER_PX = ROW_HEIGHT_PX / 4

// fmtTimeUTC/isoAtQuarter/quarterIndexFromIso/fakeNowIso now come from reservationInteractions.jsx
// (Phase 3.4, 2026-08-06) -- this file no longer keeps its own duplicate copy of fmtTimeUTC.

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
        fontFamily: FONT, fontSize: 13,
        background: hov ? `${color}18` : T.cardBg,
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
 *   onStatusChange — (id, newStatus) => Promise
 *   onCreate       — async (payload) -- POST /reservations/, Phase 3.4 Item 2
 *   onEdit         — async (id, patch) -- PATCH /reservations/{id}, Phase 3.4 Item 3
 *   onReschedule   — async (id, { reserved_at, barber_id? }) -- throws on 409/error, Phase 3.4 Item 3
 *   hourRange      — [startHour, endHour]
 *   barbers/catalogItems — lifted to ReservationsTab.jsx (Phase 3.4, useBarbers()/useCatalogItems()
 *     in reservationInteractions.jsx) -- this view no longer self-fetches catalog items.
 */
export default function ReservationsWeekCalendar({
  reservations, weekStart, onWeekChange, color, onStatusChange, onCreate, onEdit, onReschedule, hourRange,
  barbers, catalogItems,
}) {
  const [direction, setDirection] = useState(0)
  const [popover, setPopover] = useState(null) // { item, anchor } -- Phase 3.4 Item 3
  const [createSlot, setCreateSlot] = useState(null) // { reservedAt, anchor } -- Phase 3.4 Item 2
  const [startHour, endHour] = hourRange

  // In-flight-mutation guard, same pattern ReservationsTodayView.jsx already uses locally -- a
  // Set of reservation ids currently mid-mutation via the popover, so a second action can't race
  // the first on the same row. Small local UI state, not business logic, so it's written fresh
  // here rather than extracted (Phase 3.4 Step 0's own evaluation of what's worth sharing).
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const markPending = useCallback((id) => {
    setPendingIds((prev) => new Set(prev).add(id))
  }, [])
  const clearPending = useCallback((id) => {
    setPendingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
  }, [])

  const serviceNameFor = (item) => {
    const id = item?.metadata?.service_id
    return catalogItems.find((c) => c.id === id)?.name_ar ?? null
  }
  // Bookable-only subset for the Create/Edit service pickers -- same split ReservationsTodayView.jsx
  // already makes: serviceNameFor above stays on the FULL list (labeling whatever a reservation
  // actually references, including retail/non-bookable items on historical data), while offering
  // NEW bookings only ever lists real services (metadata.requires_booking === true).
  const bookableCatalogItems = useMemo(
    () => catalogItems.filter((item) => item?.metadata?.requires_booking === true),
    [catalogItems]
  )

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const byDay = useMemo(() => {
    const map = new Map(days.map(d => [isoDateKey(d), []]))
    for (const r of reservations) {
      if (!r.reserved_at) continue
      if (!VISIBLE_STATUSES.includes(r.status)) continue
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

  // Empty-slot click -> Quick Create (Phase 3.4 Item 2). Same technique as Today's
  // handleEmptySlotClick: fresh getBoundingClientRect() on every click (never cached, correct
  // under any scroll position), reservation cards call e.stopPropagation() in their own onClick
  // so a card click never reaches this column-level handler underneath it. No barber pre-fill --
  // unlike Today, Week has no per-staff column (a real, structural difference, not an oversight),
  // so CreatePopover's own barber dropdown (already handles no defaultBarberId gracefully) is the
  // answer, same path Today's own floating "+" button already uses.
  const handleEmptySlotClick = useCallback((day, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const maxIndex = hours.length * 4 - 1
    const quarterIndex = Math.max(0, Math.min(Math.round(offsetY / WEEK_QUARTER_PX), maxIndex))
    const reservedAt = isoAtQuarter(isoDateKey(day), startHour, quarterIndex)
    setCreateSlot({ reservedAt, anchor: { x: e.clientX, y: e.clientY } })
  }, [hours.length, startHour])

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
    <div style={{ direction: 'rtl', fontFamily: FONT }}>
      {/* Week nav header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <NavBtn label="‹ السابق" onClick={() => goWeek(-1)} color={color} />
        <AnimatePresence mode="wait" custom={direction}>
          <motion.span
            key={isoDateKey(weekStart)}
            custom={direction} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, minWidth: 140, textAlign: 'center' }}
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
      <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 12, background: T.cardBg, boxShadow: T.shadow }}>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(7, minmax(120px, 1fr))`, minWidth: 900 }}>

          {/* Header row */}
          <div style={{ borderBottom: `1px solid ${T.border}` }} />
          {days.map(d => {
            const isToday = isSameDay(d, today)
            return (
              <div
                key={isoDateKey(d)}
                style={{
                  padding: '10px 6px', textAlign: 'center',
                  borderBottom: `1px solid ${T.border}`,
                  borderRight: `1px solid ${T.borderSoft}`,
                  background: isToday ? `${color}12` : 'transparent',
                }}
              >
                <div style={{ fontSize: 11, color: T.textMuted }}>{DAYS_AR[dayOfWeekUTC(d)]}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? color : T.textPrimary }}>
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
                  fontSize: 10, color: T.textMuted, textAlign: 'left',
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
                onClick={(e) => handleEmptySlotClick(d, e)}
                style={{
                  position: 'relative', height: gridHeight, cursor: 'copy',
                  borderRight: `1px solid ${T.borderSoft}`,
                  background: isToday ? `${color}08` : 'transparent',
                }}
              >
                {/* hour gridlines */}
                {hours.map((h, i) => (
                  <div
                    key={h}
                    style={{
                      position: 'absolute', top: i * ROW_HEIGHT_PX, left: 0, right: 0,
                      borderTop: `1px solid ${T.borderSoft}`, height: ROW_HEIGHT_PX,
                      pointerEvents: 'none',
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
                      onClick={(e) => { e.stopPropagation(); setPopover({ item: r, anchor: { x: e.clientX, y: e.clientY } }) }}
                      style={{
                        position: 'absolute', top, height, left: 4, right: 4,
                        borderRadius: 6, padding: '3px 6px', textAlign: 'right',
                        background: `${color}14`, border: `1px solid ${color}55`,
                        color: T.textPrimary, fontSize: 11, cursor: 'pointer', overflow: 'hidden',
                        fontFamily: FONT, opacity: pendingIds.has(r.id) ? 0.5 : 1,
                      }}
                      title={`${r.customer_name} — ${fmtTimeUTC(r.reserved_at)}${meta.service_name ? ` — ${meta.service_name}` : ''}`}
                    >
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.customer_name}
                      </div>
                      <div style={{ color: T.textSecond, whiteSpace: 'nowrap' }}>{fmtTimeUTC(r.reserved_at)}</div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Reservation popover (Phase 3.4 Item 3) -- replaces the old bespoke read-mostly modal
          with the exact same shared ReservationPopover Today uses: Edit, Cancel, Status Change
          (incl. the one-click quick-confirm button), and the mini-reschedule form, all inherited
          for free from Step 0's extraction -- not rebuilt here. */}
      {popover && (
        <ReservationPopover
          item={popover.item}
          serviceName={serviceNameFor(popover.item)}
          color={color}
          anchor={popover.anchor}
          onClose={() => setPopover(null)}
          onStatusChange={onStatusChange}
          onReschedule={onReschedule}
          onEdit={onEdit}
          barbers={barbers}
          catalogItems={bookableCatalogItems}
          isPending={pendingIds.has(popover.item.id)}
          markPending={markPending}
          clearPending={clearPending}
        />
      )}

      {/* Quick Create (Phase 3.4 Item 2) -- same shared CreatePopover Today uses */}
      {createSlot && (
        <CreatePopover
          barbers={barbers}
          catalogItems={bookableCatalogItems}
          defaultReservedAt={createSlot.reservedAt}
          color={color}
          anchor={createSlot.anchor}
          onClose={() => setCreateSlot(null)}
          onCreate={onCreate}
        />
      )}
    </div>
  )
}

export { startOfWeekSunday }
