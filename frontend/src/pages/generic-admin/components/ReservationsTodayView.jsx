import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable, pointerWithin,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import adminApi from '../../../utils/admin.config'
import { StatusBadge, StatusCell } from '../tabs/ReservationsTab'

// ── Today View — Phase 3.1 Calendar UX Redesign (2026-08-03) ─────────────────────────────────────
// Staff-column, quarter-hour, drag-and-drop day view. Reuses the exact same optimistic-update +
// snapshot-rollback pattern already proven in KanbanBoard.jsx (dnd-kit PointerSensor/TouchSensor,
// DragOverlay) -- not a new drag-and-drop implementation invented from scratch. All conflict/
// working-hours logic stays server-side (PATCH /admin/reservations/{id}/reschedule, reusing
// create_reservation()'s own validators) -- this component only ever reacts to success/409, it
// never decides whether a slot is free.

const QUARTER_PX = 22
const SERVICE_ICON_FALLBACK = '✂️'

function fmtTimeUTC(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}
function quarterIndexFromIso(iso, startHour) {
  const d = new Date(iso)
  const mins = (d.getUTCHours() * 60 + d.getUTCMinutes()) - startHour * 60
  return Math.round(mins / 15)
}
function isoAtQuarter(dateISO, startHour, quarterIndex) {
  const d = new Date(`${dateISO}T00:00:00Z`)
  const totalMin = startHour * 60 + quarterIndex * 15
  d.setUTCMinutes(d.getUTCMinutes() + totalMin)
  return d.toISOString()
}
function fmtHourLabel(h) {
  return `${String(h).padStart(2, '0')}:00`
}

// ── Reservation card (draggable) ─────────────────────────────────────────────────────────────────

// Pure presentation, no hooks -- shared by the draggable in-column card and the DragOverlay's
// floating copy. Kept hook-free deliberately so the overlay never needs its own useDraggable
// call (dnd-kit's DragOverlay renders a detached copy, not the original draggable node).
function ReservationCardBody({ item, style, serviceName, color, onOpen, isOverlay, isDragging }) {
  return (
    <div
      onClick={(e) => { if (!isDragging) onOpen?.(item, e) }}
      style={{
        ...style,
        borderRadius: 8, padding: '4px 7px', overflow: 'hidden', cursor: isOverlay ? 'grabbing' : 'grab',
        background: `${color}2a`, border: `1px solid ${color}66`,
        fontFamily: "'Cairo', sans-serif", textAlign: 'right',
        boxShadow: isOverlay ? '0 14px 34px rgba(0,0,0,0.5)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.customer_name}
        </span>
        <StatusBadge status={item.status} />
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
        {SERVICE_ICON_FALLBACK} {serviceName || '—'}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
        {fmtTimeUTC(item.reserved_at)} · {item.duration_min} د
      </div>
    </div>
  )
}

function ReservationCard({ item, top, height, color, serviceName, onOpen }) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({ id: item.id })
  const style = {
    position: 'absolute', top, height, left: 3, right: 3,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.15 : 1,
    zIndex: isDragging ? 0 : 1,
  }
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <ReservationCardBody item={item} style={style} serviceName={serviceName} color={color} onOpen={onOpen} isDragging={isDragging} />
    </div>
  )
}

// ── Droppable quarter-hour cell ───────────────────────────────────────────────────────────────────

function DropCell({ id, color, isActiveDrag }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        height: QUARTER_PX,
        borderTop: '1px solid rgba(255,255,255,0.04)',
        background: isOver && isActiveDrag ? `${color}22` : 'transparent',
        transition: 'background 0.1s ease',
      }}
    />
  )
}

// ── Quick-actions popover ─────────────────────────────────────────────────────────────────────────

function ReservationPopover({ item, serviceName, color, anchor, onClose, onStatusChange, onReschedule }) {
  const [date, setDate] = useState(item.reserved_at.slice(0, 10))
  const [time, setTime] = useState(fmtTimeUTC(item.reserved_at))
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState(null)

  const handleMove = async () => {
    setError(null)
    setMoving(true)
    try {
      await onReschedule(item.id, { reserved_at: `${date}T${time}:00Z` })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'تعذر نقل الحجز.')
    } finally {
      setMoving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: Math.min(anchor.y, window.innerHeight - 340),
          left: Math.min(Math.max(anchor.x - 260, 12), window.innerWidth - 292),
          width: 280, background: '#16181d', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14, padding: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          direction: 'rtl', fontFamily: "'Cairo', sans-serif",
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{item.customer_name}</div>
          <StatusCell reservation={item} onUpdate={onStatusChange} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>
          <div>📞 {item.customer_phone || '—'}</div>
          <div>✂️ {serviceName || '—'} · {item.duration_min} دقيقة</div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>إعادة الجدولة</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, colorScheme: 'dark' }} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              style={{ width: 90, minWidth: 0, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, colorScheme: 'dark' }} />
          </div>
          {error && (
            <div style={{ fontSize: 11, color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '6px 8px', marginBottom: 8 }}>
              {error}
            </div>
          )}
          <button
            onClick={handleMove} disabled={moving}
            style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: `1px solid ${color}55`, background: `${color}18`, color, fontSize: 12, fontWeight: 700, cursor: moving ? 'not-allowed' : 'pointer', fontFamily: "'Cairo', sans-serif" }}
          >
            {moving ? 'جارٍ النقل...' : 'نقل الموعد'}
          </button>
        </div>

        <button onClick={onClose} style={{ marginTop: 10, width: '100%', padding: '7px 0', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
          إغلاق
        </button>
      </div>
    </div>
  )
}

// ── Staff column ──────────────────────────────────────────────────────────────────────────────────

function StaffColumn({ barber, items, quarters, startHour, color, serviceNameFor, onOpen, activeId }) {
  return (
    <div style={{ flex: 1, minWidth: 150 }}>
      <div style={{
        textAlign: 'center', padding: '8px 0', fontSize: 13, fontWeight: 700, color: '#fff',
        borderBottom: `2px solid ${color}55`, marginBottom: 2, fontFamily: "'Cairo', sans-serif",
      }}>
        {barber.name}
      </div>
      <div style={{ position: 'relative' }}>
        {quarters.map((q) => (
          <DropCell key={q} id={`${barber.id}__${q}`} color={color} isActiveDrag={!!activeId} />
        ))}
        {items.map((item) => {
          const qIndex = quarterIndexFromIso(item.reserved_at, startHour)
          const top = qIndex * QUARTER_PX
          const height = Math.max((item.duration_min / 15) * QUARTER_PX, QUARTER_PX - 2)
          return (
            <ReservationCard
              key={item.id} item={item} top={top} height={height} color={color}
              serviceName={serviceNameFor(item)} onOpen={onOpen}
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
 */
export default function ReservationsTodayView({ reservations, date, hourRange, color, onStatusChange, onReschedule }) {
  const [startHour, endHour] = hourRange
  const [barbers, setBarbers] = useState([])
  const [barbersLoading, setBarbersLoading] = useState(true)
  const [catalogItems, setCatalogItems] = useState([])
  const [items, setItems] = useState(reservations)
  const [activeId, setActiveId] = useState(null)
  const [popover, setPopover] = useState(null) // { item, anchor }
  const [conflictMsg, setConflictMsg] = useState(null)
  const snapshotRef = useRef(items)

  // mountedRef reset in the effect body itself, not just useRef(true)'s initializer -- same
  // StrictMode double-invoke guard used throughout this codebase (see useCatalog.js's own
  // writeup). Also fixes a real bug found via Browser Verification, 2026-08-03: this view had no
  // `barbersLoading` state at all, so "لا يوجد موظفون نشطون" (no active staff) and "still
  // fetching" rendered identically -- a real Week->Today round-trip looked permanently broken
  // (empty staff column) when it was actually still loading, with no visual difference between
  // the two states to tell them apart.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => { setItems(reservations) }, [reservations])

  useEffect(() => {
    // Trailing slash required -- the real route is `/barbers/` (@router.get("/") under
    // prefix="/barbers"). Omitting it triggers a 307 redirect that the Vite dev proxy resolves
    // cross-origin (127.0.0.1:8000), which strips the Authorization header per fetch/XHR redirect
    // semantics -> a real 401 that force-logs-out the whole session. Confirmed via Browser
    // Verification, 2026-08-03 -- a real, reproducible bug, not a hypothetical.
    setBarbersLoading(true)
    adminApi.get('/barbers/')
      .then((r) => { if (mountedRef.current) setBarbers(r.data?.data ?? []) })
      .catch(() => { if (mountedRef.current) setBarbers([]) })
      .finally(() => { if (mountedRef.current) setBarbersLoading(false) })
    adminApi.get('/catalog/items')
      .then((r) => { if (mountedRef.current) setCatalogItems(r.data?.data ?? []) })
      .catch(() => { if (mountedRef.current) setCatalogItems([]) })
  }, [])

  const serviceNameFor = useCallback((item) => {
    const id = item.metadata?.service_id
    return catalogItems.find((c) => c.id === id)?.name_ar ?? null
  }, [catalogItems])

  const quarters = useMemo(
    () => Array.from({ length: (endHour - startHour) * 4 }, (_, i) => i),
    [startHour, endHour]
  )
  const hourMarks = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour]
  )

  const barberById = useCallback((id) => barbers.find((b) => b.id === id), [barbers])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null

  const handleDragStart = useCallback(({ active }) => {
    setActiveId(active.id)
    snapshotRef.current = items
  }, [items])

  const handleDragEnd = useCallback(async ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const [targetBarberId, qStr] = String(over.id).split('__')
    const qIndex = Number(qStr)
    const newReservedAt = isoAtQuarter(date, startHour, qIndex)

    const current = items.find((i) => i.id === active.id)
    if (!current) return
    const barberChanged = current.barber_id !== targetBarberId
    // Compare as instants, not raw strings -- the API returns a "+00:00"-suffixed ISO string
    // while isoAtQuarter()/toISOString() produce a "Z"-suffixed one; those never string-match
    // for the same instant, which silently fired a no-op PATCH on every drop back onto the
    // origin slot (found via Browser Verification, 2026-08-03).
    const sameTime = new Date(current.reserved_at).getTime() === new Date(newReservedAt).getTime()
    if (sameTime && !barberChanged) return

    const snapshot = items
    setItems((prev) => prev.map((i) => (
      i.id === active.id ? { ...i, reserved_at: newReservedAt, barber_id: targetBarberId } : i
    )))

    try {
      await onReschedule(active.id, { reserved_at: newReservedAt, barber_id: barberChanged ? targetBarberId : undefined })
    } catch (err) {
      setItems(snapshot)
      setConflictMsg(err?.response?.data?.error?.message || 'تعذر نقل الحجز إلى هذا الموعد.')
      setTimeout(() => setConflictMsg(null), 4000)
    }
  }, [items, date, startHour, onReschedule])

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      {conflictMsg && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5', fontSize: 13,
        }}>
          {conflictMsg}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Time gutter */}
          <div style={{ width: 44, flexShrink: 0, position: 'relative', paddingTop: 34 }}>
            {hourMarks.map((h) => (
              <div key={h} style={{ height: QUARTER_PX * 4, fontSize: 10, color: 'rgba(255,255,255,0.35)', paddingRight: 4, boxSizing: 'border-box', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                {fmtHourLabel(h)}
              </div>
            ))}
          </div>

          {/* Staff columns -- minWidth:0 + its own overflowX:auto so N staff columns scroll
              locally on a narrow/mobile viewport instead of forcing the whole page wider (same
              flex-shrink defect class already root-caused and fixed dashboard-wide today). */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 1, overflowX: 'auto', background: 'rgba(255,255,255,0.05)' }}>
            {barbers.map((b) => (
              <div key={b.id} style={{ background: '#0d0d14', flex: '1 0 150px' }}>
                <StaffColumn
                  barber={b}
                  items={items.filter((i) => i.barber_id === b.id)}
                  quarters={quarters}
                  startHour={startHour}
                  color={color}
                  serviceNameFor={serviceNameFor}
                  onOpen={(item, e) => setPopover({ item, anchor: { x: e.clientX, y: e.clientY } })}
                  activeId={activeId}
                />
              </div>
            ))}
            {barbersLoading && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: color,
                  animation: 'today-view-dot 1.4s ease-in-out infinite',
                }} />
                <style>{`@keyframes today-view-dot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
              </div>
            )}
            {!barbersLoading && barbers.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                لا يوجد موظفون نشطون
              </div>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeItem ? (
            <ReservationCardBody
              item={activeItem} style={{ position: 'relative', width: 200 }}
              serviceName={serviceNameFor(activeItem)} color={color} isOverlay
            />
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
        />
      )}
    </div>
  )
}
