import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable, closestCorners,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  fmtTimeUTC, isoAtQuarter, quarterIndexFromIso, fakeNowIso, VISIBLE_STATUSES,
  ReservationPopover, CreatePopover,
} from './reservationInteractions'
import { parseHourLoose } from '../tabs/ReservationsTab'
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

// ── Draggable reservation card (Phase 3.4 Item 4, 2026-08-06) ──────────────────────────────────
// Same split Today uses (ReservationCard/ReservationCardBody): the outer node carries
// useDraggable's positioning/listeners, the inner button is pure presentation, reused unstyled by
// DragOverlay's floating copy. Extracted into real components (not inlined in a .map()) because
// hooks -- useDraggable here, useDroppable on WeekDayColumn below -- cannot be called inside a
// render-time loop callback.
function WeekReservationCardBody({ item, serviceName, color, pending, onOpen, isOverlay, compact }) {
  const meta = item.metadata || {}
  const label = serviceName || meta.service_name
  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!pending) onOpen?.(item, e) }}
      style={{
        width: '100%', height: '100%', boxSizing: 'border-box',
        borderRadius: 7, padding: compact ? '3px 6px' : '4px 7px', textAlign: 'right',
        display: 'flex', flexDirection: 'column', gap: 1,
        // Colored left-edge stripe instead of a full uniform border (Alzabt Master Product Plan,
        // Section D/H -- the Setmore/Trafft reference pattern, confirmed twice independently
        // across the 7 reference images). borderInlineStart, not borderLeft, so the accent edge
        // stays on the correct (reading-start) side in this RTL app.
        background: `${color}14`, border: `1px solid ${T.borderSoft}`,
        borderInlineStart: `3px solid ${color}`,
        color: T.textPrimary, fontSize: 11, overflow: 'hidden', fontFamily: FONT,
        cursor: isOverlay ? 'grabbing' : (pending ? 'wait' : 'grab'),
        boxShadow: isOverlay ? T.shadowLg : 'none',
        opacity: pending ? 0.5 : 1,
      }}
      title={`${item.customer_name} — ${fmtTimeUTC(item.reserved_at)}${label ? ` — ${label}` : ''}`}
    >
      <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.customer_name}
      </div>
      {/* Service name -- parity with Today's own ReservationCardBody, which already shows this.
          Only rendered when there's real vertical room for it (compact=false), so short/15-min
          blocks don't clip a 3rd line of text. */}
      {label && !compact && (
        <div style={{ color: T.textSecond, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 10 }}>
          {label}
        </div>
      )}
      <div style={{ color: T.textSecond, whiteSpace: 'nowrap', fontSize: 10, marginTop: 'auto' }}>{fmtTimeUTC(item.reserved_at)}</div>
    </button>
  )
}

function WeekReservationCard({ item, top, height, color, serviceName, pending, onOpen }) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({ id: item.id, disabled: pending })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute', top, height, left: 4, right: 4,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 5 : 1,
        pointerEvents: isDragging ? 'none' : 'auto',
        touchAction: 'none',
      }}
    >
      <WeekReservationCardBody item={item} serviceName={serviceName} color={color} pending={pending} onOpen={onOpen} compact={height < 40} />
    </div>
  )
}

// One droppable per day column -- 7 real droppables, unlike Today's single-visible-column case
// (Today's `over.id` is never actually read since only one column ever renders at a time; this is
// the first real exercise of dnd-kit's collision resolution in this feature).
//
// `nowIndex` (Phase 3.4 Item 5) is only ever passed non-null for the ONE column where isToday is
// true (see the parent's render loop) -- same gating Today's own StaffColumn already proves
// correct, applied here per-column instead of per-page since Week can show today alongside six
// other days that must never get a line or an auto-scroll.
function WeekDayColumn({
  day, dayKey, dayReservations, gridHeight, hours, startHour, color, isToday,
  pendingIds, onEmptySlotClick, onOpen, nowIndex, serviceNameFor,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey })
  const nowLineRef = useRef(null)

  // Bring "now" into the initial viewport once per mount -- same one-time-effect pattern as
  // Today's StaffColumn (`[]` deps on purpose, must NOT re-fire on the once-a-minute nowIndex
  // tick, or the view would yank back to "now" out from under a scrolled-away user).
  useEffect(() => {
    if (nowIndex != null) nowLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => onEmptySlotClick(day, e)}
      style={{
        position: 'relative', height: gridHeight, cursor: 'copy',
        borderRight: `1px solid ${T.borderSoft}`,
        background: isOver ? `${color}12` : (isToday ? `${color}08` : 'transparent'),
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

      {nowIndex != null && (
        <div
          ref={nowLineRef}
          style={{
            position: 'absolute', top: nowIndex * WEEK_QUARTER_PX, left: 0, right: 0,
            borderTop: `2px solid ${T.danger}`, zIndex: 3, pointerEvents: 'none',
          }}
        >
          <span style={{
            position: 'absolute', right: 4, top: -9, fontSize: 9, fontWeight: 700,
            color: '#fff', background: T.danger, padding: '1px 6px', borderRadius: 4,
            fontFamily: FONT, whiteSpace: 'nowrap',
          }}>
            الآن
          </span>
        </div>
      )}

      {dayReservations.map(r => {
        const top = Math.max(0, Math.min(topPx(r.reserved_at, startHour), gridHeight - 22))
        const height = Math.min(heightPx(r.duration_min), gridHeight - top)
        return (
          <WeekReservationCard
            key={r.id} item={r} top={top} height={height} color={color}
            serviceName={serviceNameFor(r)}
            pending={pendingIds.has(r.id)} onOpen={onOpen}
          />
        )
      })}
    </div>
  )
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
 *   barbers/services — lifted to ReservationsTab.jsx (Phase 3.4, useBarbers()/useServices()
 *     in reservationInteractions.jsx) -- this view no longer self-fetches catalog items.
 *   weekVisibleBarberId/onWeekBarberChange — A4.1 (Week View Planning Selector, 2026-08-22):
 *     which ONE barber Week is narrowed to, or `null` for the pooled/"الكل" default. Owned by
 *     ReservationsTab.jsx for the same reason Day's own visible-barber state is.
 */
export default function ReservationsWeekCalendar({
  reservations, weekStart, onWeekChange, color, onStatusChange, onCreate, onEdit, onReschedule, hourRange,
  barbers, services, weekVisibleBarberId, onWeekBarberChange,
}) {
  const [direction, setDirection] = useState(0)
  const [popover, setPopover] = useState(null) // { item, anchor } -- Phase 3.4 Item 3
  const [createSlot, setCreateSlot] = useState(null) // { reservedAt, barberId?, anchor } -- Phase 3.4 Item 2
  const weekVisibleBarber = weekVisibleBarberId ? barbers.find((b) => b.id === weekVisibleBarberId) ?? null : null

  // A4.1 -- A2.2's own registered gap, resolved: when narrowed to ONE barber (weekVisibleBarberId
  // set), the grid boundary is THAT barber's own real hours -- unambiguous now, the exact same
  // real-hours source (barber.working_hours, A2.2) `ReservationsTodayView.jsx` already resolves,
  // just applied here now that Week has a real single-barber selection to resolve it from. Pooled
  // "الكل" mode (weekVisibleBarberId === null, the default -- unchanged from before A4.1) still has
  // no single barber to narrow to (every barber's reservations pool into one day column, see
  // `byDay` below) and correctly stays on the tenant-wide `hourRange` -- a real, accepted, named
  // limitation of pooled mode specifically, not a gap in the barber-selected case anymore.
  const weekBarberOpen  = parseHourLoose(weekVisibleBarber?.working_hours?.open_time)
  const weekBarberClose = parseHourLoose(weekVisibleBarber?.working_hours?.close_time)
  const [startHour, endHour] = (weekBarberOpen != null && weekBarberClose != null && weekBarberClose > weekBarberOpen)
    ? [weekBarberOpen, weekBarberClose]
    : hourRange

  // Local, optimistically-updated copy of `reservations` (Phase 3.4 Item 4) -- same pattern
  // ReservationsTodayView.jsx already uses for its own drag path: the parent's `reservations`
  // prop is the source of truth, `items` lets a drag show the new position instantly while the
  // PATCH is in flight, then either the parent's next real fetch confirms it or a 409 reverts it.
  const [items, setItems] = useState(reservations)
  useEffect(() => { setItems(reservations) }, [reservations])
  const [activeId, setActiveId] = useState(null)
  const [conflictMsg, setConflictMsg] = useState(null)
  const snapshotRef = useRef(items)

  // In-flight-mutation guard, same pattern ReservationsTodayView.jsx already uses locally -- a
  // Set of reservation ids currently mid-mutation via the popover OR a drag, so neither can race
  // the other on the same row. Small local UI state, not business logic, so it's written fresh
  // here rather than extracted (Phase 3.4 Step 0's own evaluation of what's worth sharing).
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const markPending = useCallback((id) => {
    setPendingIds((prev) => new Set(prev).add(id))
  }, [])
  const clearPending = useCallback((id) => {
    setPendingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
  }, [])

  const serviceNameFor = (item) => {
    const id = item?.service_id ?? item?.metadata?.service_id
    return services.find((c) => c.id === id)?.name_ar ?? null
  }

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const byDay = useMemo(() => {
    const map = new Map(days.map(d => [isoDateKey(d), []]))
    for (const r of items) {
      if (!r.reserved_at) continue
      if (!VISIBLE_STATUSES.includes(r.status)) continue
      // A4.1 -- when narrowed to one barber, only THEIR reservations populate the planning grid;
      // pooled "الكل" mode (weekVisibleBarberId === null) keeps every barber, unchanged.
      if (weekVisibleBarberId && r.barber_id !== weekVisibleBarberId) continue
      const key = isoDateKey(new Date(r.reserved_at))
      if (map.has(key)) map.get(key).push(r)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.reserved_at) - new Date(b.reserved_at))
    }
    return map
  }, [days, items, weekVisibleBarberId])

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour]
  )
  const gridHeight = hours.length * ROW_HEIGHT_PX

  // Real bug fixed here (Phase 3.4 Item 5, found during this item's own investigation, 2026-08-06):
  // `new Date()` read TRUE UTC calendar fields to decide "is this column today", but every other
  // "now" in this feature (todayISODate()/fakeNowIso() in reservationInteractions.jsx) deliberately
  // maps the browser's LOCAL wall-clock into fake-UTC fields, since reserved_at values themselves
  // are naive-local-labeled-UTC. A real Date's true UTC date disagrees with the tenant's local
  // calendar date for a 2-4 hour window around local midnight (e.g. Beirut, UTC+3: local 01:00
  // Aug 6 = UTC 22:00 Aug 5) -- this silently mis-highlighted "today" during that window every
  // single day. Re-ticks once a minute so a long-open tab stays roughly accurate, same as Today's
  // own current-time indicator; does NOT drive the one-time auto-scroll in WeekDayColumn (mount-only).
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])
  const today = useMemo(() => new Date(fakeNowIso()), [nowTick])
  const nowIndex = useMemo(() => {
    const idx = quarterIndexFromIso(fakeNowIso(), startHour)
    const maxIndex = hours.length * 4
    return (idx >= 0 && idx <= maxIndex) ? idx : null
  }, [startHour, hours.length, nowTick])
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
    // A4.1 -- when Week is narrowed to one barber, an empty-slot click pre-fills THEM (there is
    // exactly one real candidate to default to, same reasoning Day's own click handler already
    // uses); pooled "الكل" mode leaves it unset, same as before A4.1.
    setCreateSlot({ reservedAt, barberId: weekVisibleBarberId ?? undefined, anchor: { x: e.clientX, y: e.clientY } })
  }, [hours.length, startHour, weekVisibleBarberId])

  // Drag-and-drop (Phase 3.4 Item 4) -- same technique Today's own handleDragEnd uses (origin
  // quarter-index + delta.y, not a fine-grained per-cell droppable), extended with one real new
  // piece: `over.id` now identifies which DAY column the card was dropped into, since Week's grid
  // is genuinely 2D (day x time) where Today's is 1D (a single visible staff column, time only).
  // Day columns are all vertically aligned siblings at the same baseline, so `delta.y` (raw pointer
  // movement) is valid for the time computation regardless of which column it lands in
  // horizontally -- this is geometry translation, not new business logic; the actual conflict/
  // working-hours validation still happens entirely server-side, same PATCH .../reschedule route
  // Today's own drag already calls.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 6 } }),
  )
  const activeItem = activeId ? items.find((i) => i.id === activeId) : null

  const handleDragStart = useCallback(({ active }) => {
    setActiveId(active.id)
    snapshotRef.current = items
  }, [items])

  const handleDragEnd = useCallback(async ({ active, over, delta }) => {
    setActiveId(null)
    if (!over) return

    const current = items.find((i) => i.id === active.id)
    if (!current) return

    const targetDayKey = over.id // WeekDayColumn's droppable id -- the isoDateKey() string of the day dropped into
    const originIndex = quarterIndexFromIso(current.reserved_at, startHour)
    const originTop = originIndex * WEEK_QUARTER_PX
    const newTop = originTop + delta.y
    const maxIndex = hours.length * 4 - Math.round(current.duration_min / 15)
    const newIndex = Math.max(0, Math.min(Math.round(newTop / WEEK_QUARTER_PX), maxIndex))
    const newReservedAt = isoAtQuarter(targetDayKey, startHour, newIndex)

    // Same instant-comparison guard Today uses -- .getTime(), not string comparison (the API
    // returns a "+00:00"-suffixed ISO string, isoAtQuarter()/toISOString() produce a "Z"-suffixed
    // one; those never string-match for the same instant).
    const sameTime = new Date(current.reserved_at).getTime() === new Date(newReservedAt).getTime()
    if (sameTime) return

    const snapshot = items
    markPending(active.id)
    setItems((prev) => prev.map((i) => (
      i.id === active.id ? { ...i, reserved_at: newReservedAt } : i
    )))

    try {
      await onReschedule(active.id, { reserved_at: newReservedAt })
    } catch (err) {
      setItems(snapshot)
      setConflictMsg(err?.response?.data?.error?.message || 'تعذر نقل الحجز إلى هذا الموعد.')
      setTimeout(() => setConflictMsg(null), 4000)
    } finally {
      clearPending(active.id)
    }
  }, [items, startHour, hours.length, onReschedule, markPending, clearPending])

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <NavBtn label="اليوم" onClick={goToday} color={color} />
          <NavBtn label="التالي ›" onClick={() => goWeek(1)} color={color} />
        </div>

        {/* Header-level Add Appointment (Calendar Visual Redesign, 2026-08-12) -- Week previously
            had no explicit add button, only an empty-slot click. Reuses the exact same CreatePopover
            already wired below, just triggered without a pre-filled slot (defaultReservedAt stays
            undefined, matching List's own "+ حجز جديد" button precedent) -- no new mutation path. */}
        <button
          onClick={(e) => setCreateSlot({ reservedAt: undefined, barberId: weekVisibleBarberId ?? undefined, anchor: { x: e.clientX, y: e.clientY } })}
          style={{
            padding: '7px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: FONT, border: 'none',
            background: color, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: `0 4px 14px ${color}40`,
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          حجز جديد
        </button>
      </div>

      {/* A4.1 (Week View Planning Selector, 2026-08-22) -- single-select: "الكل" (pooled, the
          default) or exactly one barber. Reuses the same chip visual language Day's own multi-
          select picker uses -- one shared design vocabulary, not two -- but the click behavior is
          single-select here, matching the approved study's own point: Week is a planning view, not
          a booking view, so it only ever narrows to one barber at a time. Renders only when there's
          an actual choice to make, same gate as Day's picker. */}
      {barbers.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: T.textMuted, marginInlineEnd: 2 }}>عرض جدول:</span>
          <button
            onClick={() => onWeekBarberChange(null)}
            style={{
              padding: '5px 14px', borderRadius: 18, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap',
              background: weekVisibleBarberId === null ? `${color}18` : T.pageBg,
              border: `1px solid ${weekVisibleBarberId === null ? `${color}55` : T.border}`,
              color: weekVisibleBarberId === null ? color : T.textSecond,
            }}
          >
            الكل (مجمّع)
          </button>
          {barbers.map((b) => {
            const active = weekVisibleBarberId === b.id
            return (
              <button
                key={b.id}
                onClick={() => onWeekBarberChange(b.id)}
                style={{
                  padding: '5px 14px', borderRadius: 18, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap',
                  background: active ? color : T.pageBg,
                  border: `1px solid ${active ? color : T.border}`,
                  color: active ? '#0a0a0f' : T.textSecond,
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                {b.name}
              </button>
            )
          })}
        </div>
      )}

      {conflictMsg && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 10,
          background: T.dangerSoft, border: '1px solid rgba(220,38,38,0.25)',
          color: T.danger, fontSize: 13,
        }}>
          {conflictMsg}
        </div>
      )}

      {/* Week grid — horizontally scrollable on narrow screens */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 12, background: T.cardBg, boxShadow: T.shadow }}>
          <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(7, minmax(120px, 1fr))`, minWidth: 900 }}>

            {/* Header row */}
            <div style={{ borderBottom: `1px solid ${T.border}` }} />
            {days.map(d => {
              const isToday = isSameDay(d, today)
              // Real count already computed for this exact column below (byDay) -- not a second
              // fetch, not an invented metric, same data the day column itself renders.
              const dayCount = byDay.get(isoDateKey(d))?.length ?? 0
              return (
                <div
                  key={isoDateKey(d)}
                  style={{
                    padding: '12px 6px 10px', textAlign: 'center',
                    borderBottom: `1px solid ${T.border}`,
                    borderRight: `1px solid ${T.borderSoft}`,
                    background: isToday ? `${color}12` : 'transparent',
                  }}
                >
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>{DAYS_AR[dayOfWeekUTC(d)]}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: isToday ? color : T.textPrimary, letterSpacing: '-0.01em' }}>
                    {fmtDayLabel(d)}
                  </div>
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>
                    {dayCount > 0 ? `${dayCount} حجز` : '—'}
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
              const isToday = isSameDay(d, today)
              return (
                <WeekDayColumn
                  key={key}
                  day={d}
                  dayKey={key}
                  dayReservations={byDay.get(key) ?? []}
                  gridHeight={gridHeight}
                  hours={hours}
                  startHour={startHour}
                  color={color}
                  isToday={isToday}
                  pendingIds={pendingIds}
                  onEmptySlotClick={handleEmptySlotClick}
                  onOpen={(item, e) => setPopover({ item, anchor: { x: e.clientX, y: e.clientY } })}
                  nowIndex={isToday ? nowIndex : null}
                  serviceNameFor={serviceNameFor}
                />
              )
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeItem ? (
            <div style={{ width: 140, height: heightPx(activeItem.duration_min) }}>
              <WeekReservationCardBody item={activeItem} color={color} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
          services={services}
          isPending={pendingIds.has(popover.item.id)}
          markPending={markPending}
          clearPending={clearPending}
        />
      )}

      {/* Quick Create (Phase 3.4 Item 2) -- same shared CreatePopover Today uses */}
      {createSlot && (
        <CreatePopover
          barbers={barbers}
          services={services}
          defaultBarberId={createSlot.barberId}
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
