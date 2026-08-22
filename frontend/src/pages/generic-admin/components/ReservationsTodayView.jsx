import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable, closestCorners,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { StatusBadge, parseHourLoose } from '../tabs/ReservationsTab'
import {
  fmtTimeUTC, quarterIndexFromIso, isoAtQuarter, todayISODate, fakeNowIso, VISIBLE_STATUSES,
  ReservationPopover, CreatePopover,
} from './reservationInteractions'
import DatePicker from './DatePicker'
import { T, FONT } from '../theme'

// ── Today View — Phase 3.1 Calendar UX Redesign (2026-08-03) ─────────────────────────────────────
// Staff-column, quarter-hour, drag-and-drop day view. Reuses the exact same optimistic-update +
// snapshot-rollback pattern already proven in KanbanBoard.jsx (dnd-kit PointerSensor/TouchSensor,
// DragOverlay) -- not a new drag-and-drop implementation invented from scratch. All conflict/
// working-hours logic stays server-side (PATCH /admin/reservations/{id}/reschedule, reusing
// create_reservation()'s own validators) -- this component only ever reacts to success/409, it
// never decides whether a slot is free.
//
// Light visual theme (Phase 3.1 UX Iteration, 2026-08-05, Salman's own explicit request) -- reuses
// the same `T` tokens as the customer-facing booking page (ReservePage.jsx), his own already-approved
// reference. Purely visual: no reservation/drag/conflict logic in this file changed for this pass.
//
// Shared popovers/positioning/date-math/data-hooks moved to reservationInteractions.jsx (Phase 3.4,
// 2026-08-06) so ReservationsWeekCalendar.jsx can reuse the exact same components instead of a
// second, standalone implementation -- see that file for ReservationPopover/CreatePopover/
// usePopoverPosition/useBarbers/useServices.

const QUARTER_PX = 22
const SERVICE_ICON_FALLBACK = '✂️'
// VISIBLE_STATUSES now comes from reservationInteractions.jsx (Phase 3.4, 2026-08-06) -- shared
// with ReservationsWeekCalendar.jsx so a cancelled/no_show reservation disappears from both grids
// the same way, not two independently-maintained filters.

function fmtHourLabel(h) {
  return `${String(h).padStart(2, '0')}:00`
}
function addDaysISO(dateISO, n) {
  const d = new Date(`${dateISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const AR_WEEKDAYS_FULL = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
function fmtDayNav(dateISO) {
  const d = new Date(`${dateISO}T00:00:00Z`)
  return `${AR_WEEKDAYS_FULL[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`
}

// ── Day navigation header (Phase 3.1.1, 2026-08-03) ──────────────────────────────────────────────

function DayNav({ date, onDateChange, color }) {
  const isToday = date === todayISODate()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      <button
        onClick={() => onDateChange(addDaysISO(date, -1))}
        style={{
          width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`,
          background: T.cardBg, color, cursor: 'pointer', fontSize: 15, boxShadow: T.shadow,
        }}
      >
        ◀
      </button>
      <div style={{ minWidth: 130, textAlign: 'center', fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: FONT }}>
        {fmtDayNav(date)}
      </div>
      <button
        onClick={() => onDateChange(addDaysISO(date, 1))}
        style={{
          width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`,
          background: T.cardBg, color, cursor: 'pointer', fontSize: 15, boxShadow: T.shadow,
        }}
      >
        ▶
      </button>

      {!isToday && (
        <button
          onClick={() => onDateChange(todayISODate())}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: `${color}18`, border: `1px solid ${color}44`, color, fontFamily: FONT,
          }}
        >
          اليوم
        </button>
      )}

      {/* Custom DatePicker, not native <input type="date"> (Calendar Visual Redesign, 2026-08-12) --
          same component Dashboard UX Corrections #3 already established for the List view's date
          filter; Today's own day-nav was the one remaining native date input in this file. Wire
          format unchanged (ISO 'YYYY-MM-DD'), only the picker chrome changes. Wrapped so its own
          `flex:1` doesn't stretch across all remaining header width. */}
      <div style={{ marginRight: 'auto', maxWidth: 150 }}>
        <DatePicker value={date} onChange={(iso) => onDateChange(iso)} />
      </div>
    </div>
  )
}

// ── Reservation card (draggable) ─────────────────────────────────────────────────────────────────

// Pure presentation, no hooks -- shared by the draggable in-column card and the DragOverlay's
// floating copy. Kept hook-free deliberately so the overlay never needs its own useDraggable
// call (dnd-kit's DragOverlay renders a detached copy, not the original draggable node).
// Fills 100% of whatever sized box its caller wraps it in -- it does NOT position itself; see
// the real bug this fixes in ReservationCard below.
function ReservationCardBody({ item, serviceName, color, onOpen, isOverlay, isDragging, pending }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); if (!isDragging && !pending) onOpen?.(item, e) }}
      style={{
        width: '100%', height: '100%', boxSizing: 'border-box',
        borderRadius: 8, padding: '4px 7px', overflow: 'hidden',
        cursor: isOverlay ? 'grabbing' : (pending ? 'wait' : 'grab'),
        // Colored left-edge stripe instead of a full uniform border -- same treatment as
        // WeekReservationCardBody, kept consistent between Today and Week (Alzabt Master Product
        // Plan, Section D/H). borderInlineStart, not borderLeft, for correct RTL edge placement.
        background: `${color}14`, border: `1px solid ${T.borderSoft}`,
        borderInlineStart: `3px solid ${color}`,
        fontFamily: FONT, textAlign: 'right',
        boxShadow: isOverlay ? T.shadowLg : 'none',
        opacity: pending ? 0.5 : 1,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.customer_name}
        </span>
        <StatusBadge status={item.status} />
      </div>
      <div style={{ fontSize: 10, color: T.textSecond, marginTop: 2 }}>
        {SERVICE_ICON_FALLBACK} {serviceName || '—'}
      </div>
      <div style={{ fontSize: 10, color: T.textMuted }}>
        {fmtTimeUTC(item.reserved_at)} · {item.duration_min} د
      </div>
      {pending && (
        <div style={{
          position: 'absolute', top: 3, left: 3, width: 6, height: 6, borderRadius: '50%',
          background: color, animation: 'today-view-dot 1.2s ease-in-out infinite',
        }} />
      )}
    </div>
  )
}

// REAL BUG FIXED HERE (2026-08-03, found via Salman's own hands-on test, not automated tooling):
// the positioning styles (position:absolute, top, height...) were previously applied to
// ReservationCardBody's inner div, while `setNodeRef`/`listeners` (the actual draggable hit area)
// were on THIS component's plain, unstyled wrapper div. An absolutely-positioned child does not
// contribute size to a statically-flowed parent, so that wrapper collapsed to a zero-height box at
// whatever position normal flow put it -- NOT overlapping the visible card at all. Every click/drag
// was landing on an invisible, misplaced hit area. Fixed by moving position/top/height/transform
// onto the wrapper itself, which is the element dnd-kit actually listens on.
function ReservationCard({ item, top, height, color, serviceName, onOpen, pending }) {
  // disabled when pending -- in-flight-mutation guard (Phase 3.2): a card already mid-save (via
  // the popover's Edit/Cancel/reschedule, tracked in the shared pendingIds set one level up) must
  // not also be draggable, closing the race where a second concurrent PATCH could fire on the same
  // reservation. useDraggable's own `disabled` option is used rather than a ref-based short-circuit
  // in handleDragStart -- disabled must be known at render time so dnd-kit never attaches its
  // listeners in the first place.
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({ id: item.id, disabled: pending })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute', top, height, left: 3, right: 3,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 5 : 1,
        // Second real bug fixed here (2026-08-03): while dragging, this original in-place node
        // still follows the pointer via `transform` and was still receiving pointer events --
        // it sat directly under the cursor at drop time and swallowed the pointerup/mouseup meant
        // for the DropCell underneath, so drops never completed (confirmed via Browser
        // Verification: hit-area size was already fixed, but a real drop attempt timed out with
        // "subtree intercepts pointer events", zero reschedule calls fired). pointer-events:none
        // during the drag lets everything pass straight through to the real drop target.
        pointerEvents: isDragging ? 'none' : 'auto',
        touchAction: 'none', // required by TouchSensor -- without this, the browser's own
                              // touch-scroll gesture wins the race before the sensor's
                              // delay/tolerance activation constraint can ever engage.
      }}
    >
      <ReservationCardBody item={item} serviceName={serviceName} color={color} onOpen={onOpen} isDragging={isDragging} pending={pending} />
    </div>
  )
}

// ── Quarter-hour gridline (purely visual -- no longer a droppable, see StaffColumn below) ────────

function GridLine() {
  return <div style={{ height: QUARTER_PX, borderTop: `1px solid ${T.borderSoft}` }} />
}

// ── Staff column ──────────────────────────────────────────────────────────────────────────────────

// ONE droppable for the whole column (2026-08-03 redesign) -- not 48 tiny per-quarter-hour
// droppables. The earlier fine-grained-cell design made collision detection resolve to the
// dragged item's own origin slot regardless of where it was actually dropped (confirmed via
// Browser Verification: two different drop targets both resolved to the same origin index) --
// consistent with dnd-kit needing real, reasonably-sized droppable targets, exactly like
// KanbanBoard.jsx's own proven one-droppable-per-column pattern. The exact quarter-hour is now
// computed directly from the drag's pixel delta in handleDragEnd, not from which tiny cell was
// hit -- same verified-correct isoAtQuarter()/quarterIndexFromIso() math as before, just fed a
// coordinate computed a more robust way.
// A3.1 (Day View Resource Columns, 2026-08-22) -- `startHour` here is the SHARED grid's own
// boundary (the union of every visible barber's real hours, computed once in
// ReservationsTodayView), not this one barber's own hours -- that's what makes the shared hour
// gutter and the single cross-column "now" line correct. `barberOpenHour`/`barberCloseHour` are
// THIS barber's own real boundary, used only to hatch the portion of the shared grid outside their
// own hours -- same per-barber real-hours source A2.2 already resolved (barber.working_hours,
// falling back to the tenant-wide default), just applied per-column now that Day can show more than
// one column. `onEmptySlotClick` itself (owned by the parent) is what actually refuses a click
// inside the hatched region -- the hatch here is the visual half of that guarantee, not the
// enforcement.
function StaffColumn({ barber, items, quarters, startHour, barberOpenHour, barberCloseHour, color, serviceNameFor, onOpen, pendingIds, onEmptySlotClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: barber.id })

  const gridHeight = quarters.length * QUARTER_PX
  const topHatchQuarters = barberOpenHour != null ? Math.max(0, Math.min(quarters.length, (barberOpenHour - startHour) * 4)) : 0
  const bottomHatchFromQuarter = barberCloseHour != null ? Math.max(0, Math.min(quarters.length, (barberCloseHour - startHour) * 4)) : quarters.length
  const hatchStyle = {
    position: 'absolute', left: 0, right: 0,
    background: 'repeating-linear-gradient(45deg, rgba(15,23,42,0.05) 0 6px, transparent 6px 13px)',
    pointerEvents: 'none',
  }

  return (
    <div style={{ flex: 1, minWidth: 150 }}>
      <div style={{
        textAlign: 'center', padding: '8px 0', fontSize: 13, fontWeight: 700, color: T.textPrimary,
        borderBottom: `2px solid ${color}55`, marginBottom: 2, fontFamily: FONT,
      }}>
        {barber.name}
      </div>
      <div
        ref={setNodeRef}
        onClick={(e) => onEmptySlotClick?.(barber, e)}
        style={{ position: 'relative', background: isOver ? `${color}0d` : 'transparent', cursor: 'copy' }}
      >
        {quarters.map((q) => <GridLine key={q} />)}

        {/* Closed -- outside this barber's own real hours but inside the shared grid's union range
            (e.g. a colleague who works later). Same real-hours source A2.2 resolved, just rendered
            per column now. */}
        {topHatchQuarters > 0 && (
          <div style={{ ...hatchStyle, top: 0, height: topHatchQuarters * QUARTER_PX }}>
            <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 9.5, color: T.textMuted, fontWeight: 700 }}>مغلق</div>
          </div>
        )}
        {bottomHatchFromQuarter < quarters.length && (
          <div style={{ ...hatchStyle, top: bottomHatchFromQuarter * QUARTER_PX, height: gridHeight - bottomHatchFromQuarter * QUARTER_PX }}>
            <div style={{ position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center', fontSize: 9.5, color: T.textMuted, fontWeight: 700 }}>مغلق</div>
          </div>
        )}

        {items.map((item) => {
          const qIndex = quarterIndexFromIso(item.reserved_at, startHour)
          const top = qIndex * QUARTER_PX
          const height = Math.max((item.duration_min / 15) * QUARTER_PX, QUARTER_PX - 2)
          return (
            <ReservationCard
              key={item.id} item={item} top={top} height={height} color={color}
              serviceName={serviceNameFor(item)} onOpen={onOpen} pending={pendingIds?.has(item.id)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── ReservationsTodayView ────────────────────────────────────────────────────────────────────────
/**
 * Props:
 *   reservations   real reservations already scoped to `date` (owned/fetched by ReservationsTab)
 *   date           'YYYY-MM-DD' -- today
 *   hourRange      [startHour, endHour]
 *   color          tenant primary_color
 *   onStatusChange async (id, newStatus) -- reused from ReservationsTab, unchanged
 *   onReschedule   async (id, { reserved_at, barber_id? }) -- throws on 409/error
 *   onCreate       async (payload) -- POST /reservations/, Phase 3.2 Quick Create
 *   onEdit         async (id, patch) -- PATCH /reservations/{id}, Phase 3.2 full Edit
 *   barbers/barbersLoading/services -- lifted to ReservationsTab.jsx (Phase 3.4, 2026-08-06)
 *     via useBarbers()/useServices() in reservationInteractions.jsx, passed down so this view
 *     and ReservationsWeekCalendar.jsx share one fetch each instead of two independent ones.
 *   visibleBarberIds/onToggleBarber/onSelectAllBarbers -- A3.1 (2026-08-22): which barbers'
 *     schedules are VISIBLE as columns, owned by ReservationsTab.jsx for the same reason the old
 *     single visibleBarberId was -- this component fully unmounts/remounts on every load().
 */
export default function ReservationsTodayView({ reservations, date, onDateChange, hourRange, color, onStatusChange, onReschedule, onCreate, onEdit, visibleBarberIds, onToggleBarber, onSelectAllBarbers, barbers, barbersLoading, services, hideBarberPicker = false }) {
  // A3.1 (Day View Resource Columns, 2026-08-22) -- Day now renders every VISIBLE barber as its own
  // column (the UX proposal Salman reviewed and approved,
  // `.claudedocs/work/calendar-uxui-study/2026-08-22/`), instead of one barber switched via pills.
  // `visibleBarbers` preserves `barbers`' own order (filtering over `barbers`, not over
  // `visibleBarberIds`), so column order stays stable regardless of selection order.
  const visibleBarbers = barbers.filter((b) => visibleBarberIds.includes(b.id))

  // A2.2 (2026-08-21) -- the grid's own hour boundaries must match what the backend will actually
  // accept, resolved from reservation_service.py's own real priority (barber.workingHours, falling
  // back to the tenant-wide Client.config.working_hours only when a barber has none set). A3.1
  // extends this from "the one visible barber's hours" to a SHARED grid boundary spanning every
  // visible barber (the widest open-to-close range across them, so no one's real hours are ever
  // clipped by the shared gutter) -- each StaffColumn then hatches its own portion outside ITS own
  // real hours (see that component's own comment), so the per-barber guarantee A2.2 established is
  // preserved per column, not lost by sharing one axis. `hourRange` (the tenant-wide default
  // ReservationsTab.jsx computes) is the fallback for any barber with no real hours set, same as
  // before.
  const perBarberHours = visibleBarbers.map((b) => {
    const o = parseHourLoose(b?.working_hours?.open_time)
    const c = parseHourLoose(b?.working_hours?.close_time)
    return (o != null && c != null && c > o) ? [o, c] : hourRange
  })
  const [startHour, endHour] = perBarberHours.length
    ? [Math.min(...perBarberHours.map((r) => r[0])), Math.max(...perBarberHours.map((r) => r[1]))]
    : hourRange
  const [items, setItems] = useState(reservations)
  const [activeId, setActiveId] = useState(null)
  const [popover, setPopover] = useState(null) // { item, anchor }
  const [createSlot, setCreateSlot] = useState(null) // { barberId?, reservedAt?, anchor }
  const [conflictMsg, setConflictMsg] = useState(null)
  const snapshotRef = useRef(items)

  // In-flight-mutation guard (Phase 3.2, Reservation Capability Review Finding 4) -- a Set of
  // reservation ids currently mid-mutation (drag OR a popover action), shared across both surfaces
  // so neither can race the other on the same row. Real React state, not a bare ref -- ReservationCard
  // needs it readable at render time to pass useDraggable's own `disabled` option.
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const markPending = useCallback((id) => {
    setPendingIds((prev) => new Set(prev).add(id))
  }, [])
  const clearPending = useCallback((id) => {
    setPendingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
  }, [])

  useEffect(() => { setItems(reservations) }, [reservations])

  // barbers/barbersLoading/services now come from ReservationsTab.jsx via useBarbers()/
  // useServices() (reservationInteractions.jsx) -- no self-fetch here anymore (Phase 3.4,
  // 2026-08-06). The real 307-redirect/401 bug the old fetch's own comment documented lives in
  // useBarbers() now, fixed once, not per-view.

  // Default-selection (all active barbers, once) now lives in ReservationsTab.jsx, which owns
  // visibleBarberIds -- see that file's own effect, same reasoning this effect used to state here.

  const serviceNameFor = useCallback((item) => {
    const id = item.service_id ?? item.metadata?.service_id
    return services.find((c) => c.id === id)?.name_ar ?? null
  }, [services])

  const quarters = useMemo(
    () => Array.from({ length: (endHour - startHour) * 4 }, (_, i) => i),
    [startHour, endHour]
  )
  const hourMarks = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour]
  )

  // Real-Time Calendar Awareness (Phase 3.3.1, 2026-08-05) -- current-time indicator position.
  // Re-ticks once a minute so a long-open tab stays roughly accurate; does NOT drive the one-time
  // auto-scroll in StaffColumn (that only runs on mount, see its own comment).
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])
  const isToday = date === todayISODate()
  const nowIndex = useMemo(() => {
    if (!isToday) return null
    const idx = quarterIndexFromIso(fakeNowIso(), startHour)
    const maxIndex = (endHour - startHour) * 4
    return (idx >= 0 && idx <= maxIndex) ? idx : null
  }, [isToday, startHour, endHour, nowTick])

  // A3.1 -- the "now" line moved up from per-StaffColumn (Phase 3.3.1) to here, spanning every
  // visible column at once, since they now all share one real time axis. Same bring-into-view-once
  // behavior as before: this component remounts on every parent load() (day-nav, filters, drag
  // reschedule), so `[]` re-fires on those remounts too, matching "Today always opens near now" --
  // must NOT depend on the once-a-minute nowTick, or the view would yank back out from under a
  // scrolled-away user.
  const nowLineRef = useRef(null)
  useEffect(() => {
    if (nowIndex != null) nowLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Empty-slot click -> Quick Create (Phase 3.2). Reuses the exact isoAtQuarter()/QUARTER_PX math
  // handleDragEnd already uses -- not reinvented. getBoundingClientRect() is measured fresh on
  // every click (never cached), so it's automatically correct under any scroll position -- no
  // separate scroll-offset accounting needed, since a live rect is already viewport-relative for
  // the current scroll state. ReservationCardBody's own onClick calls stopPropagation(), so a card
  // click never reaches this column-level handler underneath it.
  const handleEmptySlotClick = useCallback((barber, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const maxIndex = (endHour - startHour) * 4 - 1
    const quarterIndex = Math.max(0, Math.min(Math.round(offsetY / QUARTER_PX), maxIndex))

    // A3.1 -- the shared grid can now render quarter-hours outside THIS barber's own real hours
    // (hatched -- e.g. a colleague who works later). Refuse the click there instead of opening a
    // Create popover the backend would just 409 on -- same "never offer what the backend would
    // reject" guarantee A2.2 established for the single-column case, applied per column now.
    const bOpen  = parseHourLoose(barber?.working_hours?.open_time)
    const bClose = parseHourLoose(barber?.working_hours?.close_time)
    if (bOpen != null && bClose != null && bClose > bOpen) {
      const openQ  = (bOpen  - startHour) * 4
      const closeQ = (bClose - startHour) * 4
      if (quarterIndex < openQ || quarterIndex >= closeQ) return
    }

    const reservedAt = isoAtQuarter(date, startHour, quarterIndex)
    setCreateSlot({ barberId: barber.id, reservedAt, anchor: { x: e.clientX, y: e.clientY } })
  }, [date, startHour, endHour])

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

    // New time computed directly from the drag's pixel delta against the item's own known
    // origin position -- not from matching a fine-grained per-quarter-hour droppable cell (that
    // design made collision detection resolve to the origin slot regardless of drop target,
    // confirmed via Browser Verification, 2026-08-03). `quarterIndexFromIso`/`isoAtQuarter` are
    // the same verified-correct math as before; only the input coordinate changed.
    const originIndex = quarterIndexFromIso(current.reserved_at, startHour)
    const originTop = originIndex * QUARTER_PX
    const newTop = originTop + delta.y
    const maxIndex = (endHour - startHour) * 4 - Math.round(current.duration_min / 15)
    const newIndex = Math.max(0, Math.min(Math.round(newTop / QUARTER_PX), maxIndex))
    const newReservedAt = isoAtQuarter(date, startHour, newIndex)

    // A3.1 (2026-08-22) -- supersedes Phase 3.3's "drag means change the time, full stop": that
    // was correct only because a single barber's column was visible at a time, so there was no
    // second droppable to drop onto. Day now has a real droppable per barber column
    // (`useDroppable({ id: barber.id })`, StaffColumn), the exact same mechanism
    // ReservationsWeekCalendar.jsx already proves correct for its own day-columns -- `over.id`
    // identifies which barber's column the card was dropped into. Reassignment is a real,
    // already-secured backend capability (reservation_service.edit_reservation()'s new_barber_id
    // path -- checks the TARGET barber's own working hours/conflicts, and a STAFF caller is already
    // blocked server-side from reassigning away from themselves), already exercised by Week's own
    // drag -- this just wires the same existing capability into Day now that it has columns to
    // drop between. Compare as instants, not raw strings, for the time half of the check (the API
    // returns a "+00:00"-suffixed ISO string while isoAtQuarter()/toISOString() produce a
    // "Z"-suffixed one; those never string-match for the same instant, which silently fired a
    // no-op PATCH on every drop back onto the origin slot, found via Browser Verification,
    // 2026-08-03) -- a drop that changes ONLY the column (same time, different barber) must still
    // fire, so the no-op guard checks both, not time alone.
    const targetBarberId = over.id
    const sameTime = new Date(current.reserved_at).getTime() === new Date(newReservedAt).getTime()
    if (sameTime && targetBarberId === current.barber_id) return

    const snapshot = items
    markPending(active.id)
    setItems((prev) => prev.map((i) => (
      i.id === active.id ? { ...i, reserved_at: newReservedAt, barber_id: targetBarberId } : i
    )))

    try {
      const payload = { reserved_at: newReservedAt }
      if (targetBarberId !== current.barber_id) payload.barber_id = targetBarberId
      await onReschedule(active.id, payload)
    } catch (err) {
      setItems(snapshot)
      setConflictMsg(err?.response?.data?.error?.message || 'تعذر نقل الحجز إلى هذا الموعد.')
      setTimeout(() => setConflictMsg(null), 4000)
    } finally {
      clearPending(active.id)
    }
  }, [items, date, startHour, endHour, onReschedule, markPending, clearPending])

  return (
    <div style={{ direction: 'rtl', fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <DayNav date={date} onDateChange={onDateChange} color={color} />
        </div>

        {/* A3.1 (Day View Resource Columns, 2026-08-22) -- multi-select barber filter, replacing
            Phase 3.3's single-select switcher now that Day renders every VISIBLE barber as its own
            column instead of one at a time. "الكل" is a shortcut action (select every barber), not
            a fourth independent state -- its own active styling is just whether the current
            selection happens to already equal every barber, same as the UX proposal's chip row.
            `overflowX:'auto'`/wrap is the named scaling answer if the real barber count grows past
            what a row of chips comfortably fits (same proven fix ReservationsTab.jsx's own
            status-pills row already uses) -- not re-introducing a single-visible-column mode.
            Renders only when there's an actual choice to make.

            Staff Scoped Access Phase D (2026-08-09) -- hidden entirely for STAFF (hideBarberPicker):
            the backend already scopes every reservation to their own barberId regardless of
            selection, so showing this picker to a STAFF user would be actively misleading, not just
            unnecessary. */}
        {!hideBarberPicker && barbers.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
            <button
              onClick={onSelectAllBarbers}
              style={{
                padding: '5px 14px', borderRadius: 18, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap',
                background: visibleBarberIds.length === barbers.length ? `${color}18` : T.pageBg,
                border: `1px solid ${visibleBarberIds.length === barbers.length ? `${color}55` : T.border}`,
                color: visibleBarberIds.length === barbers.length ? color : T.textSecond,
              }}
            >
              الكل
            </button>
            {barbers.map((b) => {
              const active = visibleBarberIds.includes(b.id)
              return (
                <button
                  key={b.id}
                  onClick={() => onToggleBarber(b.id)}
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

        {/* Quick Create entry point (Phase 3.2), for when hunting the exact empty slot isn't the
            fastest path. A3.1 -- with N columns now visible instead of one, defaults to the FIRST
            visible barber (preserves `barbers`' own order, same as `visibleBarbers` itself);
            CreatePopover already handles an undefined default gracefully (the same path Week's own
            header button already uses when no column context exists to default from).
            Upgraded from an icon-only square to a labeled button (Calendar Visual Redesign,
            2026-08-12) -- same header-level prominence as Week's own new "+ حجز جديد" button,
            same click behavior/handler, no new mutation path. */}
        <button
          onClick={(e) => setCreateSlot({ barberId: visibleBarbers[0]?.id, anchor: { x: e.clientX, y: e.clientY } })}
          style={{
            padding: '7px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: FONT, border: 'none',
            background: color, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: `0 4px 14px ${color}40`,
            marginBottom: 14, flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          حجز جديد
        </button>
      </div>

      {conflictMsg && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 10,
          background: T.dangerSoft, border: '1px solid rgba(220,38,38,0.25)',
          color: T.danger, fontSize: 13,
        }}>
          {conflictMsg}
        </div>
      )}

      {/* closestCorners, not pointerWithin (2026-08-03 fix): pointerWithin requires the pointer to
          be literally inside a droppable's rect at drop time -- with 22px-tall quarter-hour
          cells, any small imprecision made `over` resolve to null, silently doing nothing (no
          error, no API call, no move -- confirmed via Browser Verification after the pointer-
          events fix). closestCorners (KanbanBoard.jsx's own proven choice) picks the nearest
          droppable by center distance instead, tolerating exactly this kind of imprecision. */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', background: T.cardBg, boxShadow: T.shadow }}>
          {/* Time gutter */}
          <div style={{ width: 44, flexShrink: 0, position: 'relative', paddingTop: 34 }}>
            {hourMarks.map((h) => (
              <div key={h} style={{ height: QUARTER_PX * 4, fontSize: 10, color: T.textMuted, paddingRight: 4, boxSizing: 'border-box', borderTop: `1px solid ${T.borderSoft}` }}>
                {fmtHourLabel(h)}
              </div>
            ))}
          </div>

          {/* A3.1 (Day View Resource Columns, 2026-08-22) -- every VISIBLE barber renders as its
              own column side-by-side (the UX proposal Salman reviewed and approved), replacing
              Phase 3.3's single-column-at-a-time design. minWidth:0 kept for the same flex-shrink
              defect class already root-caused dashboard-wide; overflowX:auto is now genuinely load-
              bearing again once more than a handful of barbers are visible at once (the scaling
              answer the picker's own comment names), not the "confirm via mobile pass" open
              question it was for the single-column case. */}
          <div style={{ flex: 1, minWidth: 0, overflowX: 'auto', background: T.pageBg }}>
            {barbersLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: color,
                  animation: 'today-view-dot 1.4s ease-in-out infinite',
                }} />
                <style>{`@keyframes today-view-dot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
              </div>
            ) : barbers.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>
                لا يوجد موظفون نشطون
              </div>
            ) : visibleBarbers.length === 0 ? (
              // Real, legitimate state now that selection is a set the user can empty deliberately
              // (see barberSelectionInitRef's own comment in ReservationsTab.jsx) -- distinct from
              // "no staff exist at all" above, so it gets its own message rather than reusing that one.
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>
                اختر حلاقاً واحداً على الأقل لعرض الجدول
              </div>
            ) : (
              <div style={{ background: T.cardBg, position: 'relative', display: 'flex' }}>
                {visibleBarbers.map((barber) => {
                  const bOpen  = parseHourLoose(barber?.working_hours?.open_time)
                  const bClose = parseHourLoose(barber?.working_hours?.close_time)
                  const hasOwnHours = bOpen != null && bClose != null && bClose > bOpen
                  return (
                    <StaffColumn
                      key={barber.id}
                      barber={barber}
                      items={items.filter((i) => i.barber_id === barber.id && VISIBLE_STATUSES.includes(i.status))}
                      quarters={quarters}
                      startHour={startHour}
                      barberOpenHour={hasOwnHours ? bOpen : null}
                      barberCloseHour={hasOwnHours ? bClose : null}
                      color={color}
                      serviceNameFor={serviceNameFor}
                      onOpen={(item, e) => setPopover({ item, anchor: { x: e.clientX, y: e.clientY } })}
                      pendingIds={pendingIds}
                      onEmptySlotClick={handleEmptySlotClick}
                    />
                  )
                })}

                {/* One shared "now" line spanning every column -- see the ref/effect's own comment
                    above for why this moved up from per-StaffColumn. */}
                {nowIndex != null && (
                  <div
                    ref={nowLineRef}
                    style={{
                      position: 'absolute', top: nowIndex * QUARTER_PX, left: 0, right: 0,
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
              </div>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeItem ? (
            <div style={{ width: 200, height: QUARTER_PX * Math.max(activeItem.duration_min / 15, 1) }}>
              <ReservationCardBody item={activeItem} serviceName={serviceNameFor(activeItem)} color={color} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
