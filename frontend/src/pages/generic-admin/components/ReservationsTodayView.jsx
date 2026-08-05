import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable, closestCorners,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import adminApi from '../../../utils/admin.config'
import { StatusBadge, StatusCell } from '../tabs/ReservationsTab'
import Dropdown from './Dropdown'
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

const QUARTER_PX = 22
const SERVICE_ICON_FALLBACK = '✂️'
// Mirrors the backend's ACTIVE_STATUSES (reservation_service.py:26-28) -- a cancelled/no_show
// reservation must disappear from the grid immediately (Phase 3.2 Cancel spec) and its slot must
// visually read as free, matching what the backend's own conflict check already treats as free.
const VISIBLE_STATUSES = ['pending', 'confirmed', 'arrived']

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
function addDaysISO(dateISO, n) {
  const d = new Date(`${dateISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function todayISODate() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10)
}
// This grid's own `reserved_at` values, `fmtTimeUTC`, and `todayISODate` all use UTC-field
// accessors to represent the tenant's wall-clock time directly (no real timezone conversion
// anywhere in this file) -- any "now" built for this grid must be built the same way, from the
// browser's LOCAL hour/minute mapped into UTC fields, not `new Date().toISOString()`'s true UTC
// instant, or it silently disagrees with every card on the same grid.
function fakeNowIso() {
  const now = new Date()
  return new Date(Date.UTC(
    now.getFullYear(), now.getMonth(), now.getDate(),
    now.getHours(), now.getMinutes(), now.getSeconds()
  )).toISOString()
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

      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && onDateChange(e.target.value)}
        style={{
          marginRight: 'auto', padding: '6px 10px', borderRadius: 8, fontSize: 12,
          background: T.cardBg, border: `1px solid ${T.border}`,
          color: T.textPrimary, colorScheme: 'light', fontFamily: FONT,
        }}
      />
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
        background: `${color}14`, border: `1px solid ${color}55`,
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

// ── Quick-actions popover ─────────────────────────────────────────────────────────────────────────
//
// Optimistic-vs-pessimistic split (Phase 3.2, 2026-08-05, resolving Reservation Capability Review
// Finding 3 by an explicit, documented choice rather than forcing uniform optimism): the DRAG path
// in the main component below stays optimistic -- a physical gesture needs instant visual feedback.
// Every action in THIS popover (the pre-existing mini-reschedule "نقل الموعد", the new Edit save,
// the new Cancel confirm) is deliberately pessimistic instead -- button disabled + inline spinner
// text while the request is in flight, local state only changes once the server's own response
// comes back. A deliberate click-and-wait interaction doesn't need the same instant-feedback
// affordance a drag gesture does, and staying pessimistic here means these three actions never need
// their own revert/snapshot logic the way the optimistic drag path does.

const popoverInputStyle = {
  flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 10,
  background: T.cardBg, border: `1px solid ${T.border}`,
  color: T.textPrimary, fontSize: 13, colorScheme: 'light', fontFamily: FONT,
}

// ── Shared popover positioning (Phase 3.3.2, 2026-08-05) ─────────────────────────────────────────
// Both popovers below previously clamped independently, always opened downward, and measured
// against raw `window.innerHeight` -- near the last slots of the day this left the action buttons
// rendered off-screen with no way to reach them short of scrolling the whole page (Browser
// Verification: 20:00-21:00 slot, mobile). One shared implementation now: flips above the anchor
// when there's no room below, and falls back to a height-constrained, internally-scrolling body
// when neither direction fully fits -- the page itself never needs to scroll.
//
// Deliberately NOT written against "the mobile bottom nav's height" (Salman's explicit correction,
// 2026-08-05): that would need updating the moment this layout changes. Instead this probes the
// real DOM for whatever is actually occupying the bottom edge of the screen right now -- today's
// bottom nav, tomorrow's browser chrome/safe-area inset, or anything else -- so it keeps working
// unchanged regardless of what that turns out to be.
function getUsableViewportBottom() {
  const probeXs = [window.innerWidth / 2, window.innerWidth * 0.1, window.innerWidth * 0.9]
  let usableBottom = window.innerHeight
  for (const x of probeXs) {
    let node = document.elementFromPoint(x, window.innerHeight - 2)
    while (node && node !== document.body && node !== document.documentElement) {
      if (window.getComputedStyle(node).position === 'fixed') {
        const rect = node.getBoundingClientRect()
        if (rect.bottom >= window.innerHeight - 4) usableBottom = Math.min(usableBottom, rect.top)
        break
      }
      node = node.parentElement
    }
  }
  return usableBottom
}

// Used by both ReservationPopover and CreatePopover -- one positioning implementation, not two
// independently-maintained ones (a fix applied to only one of a pair like this is exactly the kind
// of drift that resurfaces as a bug a few months later). Deliberately domain-agnostic: takes an
// anchor point, a height, and a padding, and knows nothing about reservations, calendars, or any
// specific fixed UI element -- reusable by any future popover in this codebase, not just these two.
//
// `anchor` stays a point ({x, y}, e.g. a click event's clientX/clientY) rather than a full
// getBoundingClientRect()-style rect -- every current call site opens from a click point, not an
// anchored element, so a rect would add a shape this hook doesn't actually need yet.
function usePopoverPosition({ anchor, popupHeight, width = 280, viewportPadding = 12 }) {
  return useMemo(() => {
    const usableBottom = getUsableViewportBottom() - viewportPadding
    const usableTop = viewportPadding
    const spaceBelow = usableBottom - anchor.y
    const spaceAbove = anchor.y - usableTop
    const left = Math.min(Math.max(anchor.x - 260, viewportPadding), window.innerWidth - (width + viewportPadding))

    if (spaceBelow >= popupHeight) {
      return { top: anchor.y, left, maxHeight: popupHeight, scroll: false }
    }
    if (spaceAbove >= popupHeight) {
      return { top: anchor.y - popupHeight, left, maxHeight: popupHeight, scroll: false }
    }
    // Neither direction fully fits -- open on whichever side has more room, constrain height to
    // that room, and let the popover's own body scroll internally (each popover's JSX pins its
    // header and action buttons outside that scrollable region via flex layout). The page itself
    // never needs to scroll to reach the action buttons.
    if (spaceBelow >= spaceAbove) {
      return { top: anchor.y, left, maxHeight: Math.max(spaceBelow, 160), scroll: true }
    }
    return { top: usableTop, left, maxHeight: Math.max(spaceAbove, 160), scroll: true }
  }, [anchor.x, anchor.y, popupHeight, width, viewportPadding])
}

function ReservationPopover({
  item, serviceName, color, anchor, onClose,
  onStatusChange, onReschedule, onEdit,
  barbers, catalogItems, isPending, markPending, clearPending,
}) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'cancel-confirm'

  // -- view mode: mini-reschedule form (pre-existing) + staff selector (new, Phase 3.2 -- closes
  // the gap where the non-drag reschedule path could never move staff, only drag could) ----------
  const [date, setDate] = useState(item.reserved_at.slice(0, 10))
  const [time, setTime] = useState(fmtTimeUTC(item.reserved_at))
  const [moveBarberId, setMoveBarberId] = useState(item.barber_id || '')
  const [moving, setMoving] = useState(false)
  const [moveError, setMoveError] = useState(null)

  const handleMove = async () => {
    setMoveError(null)
    setMoving(true)
    markPending(item.id)
    try {
      const payload = { reserved_at: `${date}T${time}:00Z` }
      if (moveBarberId && moveBarberId !== item.barber_id) payload.barber_id = moveBarberId
      await onReschedule(item.id, payload)
      onClose()
    } catch (err) {
      setMoveError(err?.response?.data?.error?.message || 'تعذر نقل الحجز.')
    } finally {
      setMoving(false)
      clearPending(item.id)
    }
  }

  // -- edit mode: name/phone/service/staff/time/duration, any subset -- backed by the new
  // PATCH /reservations/{id} full-edit route (edit_reservation(), Phase 3.2) ----------------------
  const [editName, setEditName] = useState(item.customer_name || '')
  const [editPhone, setEditPhone] = useState(item.customer_phone || '')
  const [editServiceId, setEditServiceId] = useState(item.metadata?.service_id || '')
  const [editBarberId, setEditBarberId] = useState(item.barber_id || '')
  const [editDate, setEditDate] = useState(item.reserved_at.slice(0, 10))
  const [editTime, setEditTime] = useState(fmtTimeUTC(item.reserved_at))
  const [editDuration, setEditDuration] = useState(item.duration_min)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState(null)

  // Duration auto-fills from the newly selected service's own metadata.duration_min when present
  // (hr's real catalog items all carry this -- scripts/update_hr_barber_and_services.py) -- the
  // manual number input stays an override for services that don't have it, never removed.
  const handleServiceChange = (id) => {
    setEditServiceId(id)
    const svc = catalogItems.find((c) => c.id === id)
    if (svc?.metadata?.duration_min) setEditDuration(svc.metadata.duration_min)
  }

  const handleEditSave = async () => {
    setEditError(null)
    setSaving(true)
    markPending(item.id)
    try {
      const patch = {}
      if (editName !== item.customer_name) patch.customer_name = editName
      if (editPhone !== item.customer_phone) patch.customer_phone = editPhone
      if (editServiceId && editServiceId !== item.metadata?.service_id) patch.service_id = editServiceId
      if (editBarberId && editBarberId !== item.barber_id) patch.barber_id = editBarberId
      if (Number(editDuration) !== item.duration_min) patch.duration_min = Number(editDuration)
      const newReservedAt = `${editDate}T${editTime}:00Z`
      if (new Date(newReservedAt).getTime() !== new Date(item.reserved_at).getTime()) {
        patch.reserved_at = newReservedAt
      }
      if (Object.keys(patch).length === 0) { setMode('view'); return }
      await onEdit(item.id, patch)
      onClose()
    } catch (err) {
      setEditError(err?.response?.data?.error?.message || 'تعذر حفظ التعديل.')
    } finally {
      setSaving(false)
      clearPending(item.id)
    }
  }

  // -- cancel-confirm mode -- reuses the existing generic status-update path (update_status()
  // already supports "cancelled", no new endpoint needed); the card disappears immediately via
  // StaffColumn's VISIBLE_STATUSES filter once the parent's `reservations` state reflects it. ------
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  const handleCancelConfirm = async () => {
    setCancelError(null)
    setCancelling(true)
    markPending(item.id)
    try {
      await onStatusChange(item.id, 'cancelled')
      onClose()
    } catch (err) {
      setCancelError(err?.response?.data?.error?.message || 'تعذر إلغاء الحجز.')
    } finally {
      setCancelling(false)
      clearPending(item.id)
    }
  }

  const popoverHeight = mode === 'edit' ? 460 : mode === 'cancel-confirm' ? 220 : 380
  const pos = usePopoverPosition({ anchor, popupHeight: popoverHeight })
  const barberOptions = (barbers || []).map((b) => ({ value: b.id, label: b.name }))
  const serviceOptions = (catalogItems || []).map((c) => ({ value: c.id, label: c.name_ar }))

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: pos.top, left: pos.left,
          width: 280, maxHeight: pos.maxHeight,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: T.cardBg, border: `1px solid ${T.border}`,
          borderRadius: 14, boxShadow: T.shadowPopover,
          direction: 'rtl', fontFamily: FONT,
        }}
      >
        {/* Header -- pinned, never scrolls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, padding: '16px 16px 10px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{item.customer_name}</div>
          {mode === 'view' && <StatusCell reservation={item} onUpdate={onStatusChange} />}
        </div>

        {/* Body -- the only region that scrolls when the popover is height-constrained */}
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: pos.scroll ? 'auto' : 'visible', padding: '0 16px' }}>
          {mode === 'view' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: T.textSecond, marginBottom: 12 }}>
                <div>📞 {item.customer_phone || '—'}</div>
                <div>✂️ {serviceName || '—'} · {item.duration_min} دقيقة</div>
              </div>

              <div style={{ borderTop: `1px solid ${T.borderSoft}`, paddingTop: 12, paddingBottom: 12 }}>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>إعادة الجدولة</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={popoverInputStyle} />
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...popoverInputStyle, width: 90, flex: 'none' }} />
                </div>
                {barbers?.length > 1 && (
                  <div style={{ marginBottom: 8 }}>
                    <Dropdown value={moveBarberId} onChange={setMoveBarberId} options={barberOptions} />
                  </div>
                )}
                {moveError && (
                  <div style={{ fontSize: 11, color: T.danger, background: T.dangerSoft, border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '6px 8px', marginBottom: 8 }}>
                    {moveError}
                  </div>
                )}
                <button
                  onClick={handleMove} disabled={moving || isPending}
                  style={{ width: '100%', padding: '9px 0', borderRadius: 10, border: `1px solid ${color}55`, background: `${color}18`, color, fontSize: 12, fontWeight: 700, cursor: (moving || isPending) ? 'not-allowed' : 'pointer', fontFamily: FONT }}
                >
                  {moving ? 'جارٍ النقل...' : 'نقل الموعد'}
                </button>
              </div>
            </>
          )}

          {mode === 'edit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12 }}>
              <input placeholder="اسم العميل" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...popoverInputStyle, width: '100%' }} />
              <input placeholder="رقم الهاتف" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={{ ...popoverInputStyle, width: '100%', direction: 'ltr', textAlign: 'right' }} />
              <Dropdown value={editServiceId} onChange={handleServiceChange} options={serviceOptions} placeholder="— اختر الخدمة —" />
              {barbers?.length > 1 && (
                <Dropdown value={editBarberId} onChange={setEditBarberId} options={barberOptions} />
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={popoverInputStyle} />
                <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} style={{ ...popoverInputStyle, width: 90, flex: 'none' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: T.textSecond }}>المدة (دقيقة)</span>
                <input type="number" min={5} step={5} value={editDuration} onChange={(e) => setEditDuration(e.target.value)} style={{ ...popoverInputStyle, width: 70, flex: 'none' }} />
              </div>
              {editError && (
                <div style={{ fontSize: 11, color: T.danger, background: T.dangerSoft, border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '6px 8px' }}>
                  {editError}
                </div>
              )}
            </div>
          )}

          {mode === 'cancel-confirm' && (
            <div style={{ paddingBottom: 12 }}>
              <div style={{ fontSize: 13, color: T.textPrimary, marginBottom: 14, lineHeight: 1.6 }}>
                متأكد من إلغاء هذا الحجز؟ سيختفي من الكالندر فوراً ويصبح الموعد متاحاً من جديد.
              </div>
              {cancelError && (
                <div style={{ fontSize: 11, color: T.danger, background: T.dangerSoft, border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '6px 8px', marginBottom: 10 }}>
                  {cancelError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons -- pinned, always reachable without scrolling the page or the popover */}
        <div style={{ flexShrink: 0, padding: '10px 16px 16px' }}>
          {mode === 'view' && (
            <>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setMode('edit')} disabled={isPending}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: T.pageBg, border: `1px solid ${T.border}`, color: T.textPrimary, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}
                >
                  تعديل
                </button>
                <button
                  onClick={() => setMode('cancel-confirm')} disabled={isPending}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: T.dangerSoft, border: '1px solid rgba(220,38,38,0.25)', color: T.danger, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}
                >
                  إلغاء الحجز
                </button>
              </div>
              <button onClick={onClose} style={{ marginTop: 8, width: '100%', padding: '8px 0', borderRadius: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.textMuted, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>
                إغلاق
              </button>
            </>
          )}

          {mode === 'edit' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setMode('view')} disabled={saving}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: T.pageBg, border: `1px solid ${T.border}`, color: T.textSecond, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}
              >
                رجوع
              </button>
              <button
                onClick={handleEditSave} disabled={saving}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${color}55`, background: `${color}18`, color, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: FONT }}
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
            </div>
          )}

          {mode === 'cancel-confirm' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setMode('view')} disabled={cancelling}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: T.pageBg, border: `1px solid ${T.border}`, color: T.textSecond, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}
              >
                لا، تراجع
              </button>
              <button
                onClick={handleCancelConfirm} disabled={cancelling}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid rgba(220,38,38,0.4)', background: T.dangerSoft, color: T.danger, fontSize: 12, fontWeight: 700, cursor: cancelling ? 'not-allowed' : 'pointer', fontFamily: FONT }}
              >
                {cancelling ? 'جارٍ الإلغاء...' : 'نعم، إلغاء الحجز'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Quick Create popover (Phase 3.2, 2026-08-05) ────────────────────────────────────────────────
// Same anchored-panel, non-modal shell as ReservationPopover -- this feature's established
// "Popover not Modal" rule (Phase 3.1) applies to Create exactly as it does to Quick Actions, not
// a separate pattern. Two entry points render this: an empty-slot click on a StaffColumn (pre-fills
// barber + time) and a floating "+" button (no pre-fill, owner picks everything).
function CreatePopover({ barbers, catalogItems, defaultBarberId, defaultReservedAt, color, anchor, onClose, onCreate }) {
  const [barberId, setBarberId] = useState(defaultBarberId || barbers[0]?.id || '')
  const [serviceId, setServiceId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState((defaultReservedAt || fakeNowIso()).slice(0, 10))
  const [time, setTime] = useState(fmtTimeUTC(defaultReservedAt || fakeNowIso()))
  const [duration, setDuration] = useState(30)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleServiceChange = (id) => {
    setServiceId(id)
    const svc = catalogItems.find((c) => c.id === id)
    if (svc?.metadata?.duration_min) setDuration(svc.metadata.duration_min)
  }

  const handleCreate = async () => {
    setError(null)
    if (!barberId || !serviceId || !name || !phone) {
      setError('يرجى تعبئة كل الحقول.')
      return
    }
    setSaving(true)
    try {
      await onCreate({
        module_key: 'barber',
        customer_name: name,
        customer_phone: phone,
        reserved_at: `${date}T${time}:00Z`,
        duration_min: Number(duration),
        metadata: { barber_id: barberId, service_id: serviceId },
      })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'تعذر إنشاء الحجز.')
    } finally {
      setSaving(false)
    }
  }

  const barberOptions = (barbers || []).map((b) => ({ value: b.id, label: b.name }))
  const serviceOptions = (catalogItems || []).map((c) => ({ value: c.id, label: c.name_ar }))
  const pos = usePopoverPosition({ anchor, popupHeight: 460 })

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: pos.top, left: pos.left,
          width: 280, maxHeight: pos.maxHeight,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: T.cardBg, border: `1px solid ${T.border}`,
          borderRadius: 14, boxShadow: T.shadowPopover,
          direction: 'rtl', fontFamily: FONT,
        }}
      >
        {/* Header -- pinned, never scrolls */}
        <div style={{ flexShrink: 0, padding: '16px 16px 12px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>حجز سريع</div>
        </div>

        {/* Body -- the only region that scrolls when the popover is height-constrained */}
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: pos.scroll ? 'auto' : 'visible', padding: '0 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
            <Dropdown value={barberId} onChange={setBarberId} options={barberOptions} />
            <Dropdown value={serviceId} onChange={handleServiceChange} options={serviceOptions} placeholder="— اختر الخدمة —" />
            <input placeholder="اسم العميل" value={name} onChange={(e) => setName(e.target.value)} style={{ ...popoverInputStyle, width: '100%' }} />
            <input placeholder="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...popoverInputStyle, width: '100%', direction: 'ltr', textAlign: 'right' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={popoverInputStyle} />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...popoverInputStyle, width: 90, flex: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: T.textSecond }}>المدة (دقيقة)</span>
              <input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} style={{ ...popoverInputStyle, width: 70, flex: 'none' }} />
            </div>
            {error && (
              <div style={{ fontSize: 11, color: T.danger, background: T.dangerSoft, border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '6px 8px' }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons -- pinned, always reachable without scrolling the page or the popover */}
        <div style={{ flexShrink: 0, padding: '8px 16px 16px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onClose} disabled={saving}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: T.pageBg, border: `1px solid ${T.border}`, color: T.textSecond, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}
            >
              إلغاء
            </button>
            <button
              onClick={handleCreate} disabled={saving}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${color}55`, background: `${color}18`, color, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: FONT }}
            >
              {saving ? 'جارٍ الحجز...' : 'إنشاء الحجز'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
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
function StaffColumn({ barber, items, quarters, startHour, color, serviceNameFor, onOpen, pendingIds, onEmptySlotClick, nowIndex }) {
  const { setNodeRef, isOver } = useDroppable({ id: barber.id })
  const nowLineRef = useRef(null)

  // Real-Time Calendar Awareness (Phase 3.3.1, 2026-08-05) -- bring "now" into the initial
  // viewport once per mount. This component fully remounts whenever the parent reloads data
  // (day-nav, drag reschedule, etc. -- see ReservationsTodayView's own doc comment), so this
  // intentionally re-fires on those remounts too, matching "Today always opens near now" rather
  // than treating it as a one-shot exception. `[]` on purpose -- must NOT re-fire on the once-a-
  // minute nowIndex tick, or the view would yank back to "now" out from under a scrolled-away user.
  useEffect(() => {
    if (nowIndex != null) nowLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
 */
export default function ReservationsTodayView({ reservations, date, onDateChange, hourRange, color, onStatusChange, onReschedule, onCreate, onEdit, visibleBarberId, onVisibleBarberChange }) {
  const [startHour, endHour] = hourRange
  const [barbers, setBarbers] = useState([])
  const [barbersLoading, setBarbersLoading] = useState(true)
  const [catalogItems, setCatalogItems] = useState([])
  // Which barber's schedule is currently VISIBLE -- owned by ReservationsTab.jsx (props
  // `visibleBarberId`/`onVisibleBarberChange`), not local state here. This component fully
  // unmounts/remounts on every load() in the parent (day-nav, filters, etc.), so local state would
  // silently reset on every such change -- a real bug found via Browser Verification, 2026-08-05.
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

  // Default the visible barber exactly once, the moment barbers first load and nothing is selected
  // yet -- `visibleBarberId === null` (owned by the parent, see the prop comment above) is itself
  // the guard, since that value persists across this component's own remounts; no local ref needed.
  // Never derived via useMemo from barbers[0] -- that would re-fire every time the barbers array
  // identity changes, not just once, silently overriding a real selection.
  useEffect(() => {
    if (!barbersLoading && barbers.length > 0 && visibleBarberId === null) {
      onVisibleBarberChange(barbers[0].id)
    }
  }, [barbersLoading, barbers, visibleBarberId, onVisibleBarberChange])

  const serviceNameFor = useCallback((item) => {
    const id = item.metadata?.service_id
    return catalogItems.find((c) => c.id === id)?.name_ar ?? null
  }, [catalogItems])

  // Bookable-only filter for the two service pickers (Quick Create + Edit) -- catalog items without
  // metadata.requires_booking===true are retail products (hair spray, wax, gel, cologne for hr),
  // never meant to be "booked" as an appointment. serviceNameFor above deliberately stays on the
  // FULL catalogItems list -- a different concern (labeling whatever a reservation actually
  // references, including any historical data) from "what's offered when booking new" (this).
  const bookableCatalogItems = useMemo(
    () => catalogItems.filter((item) => item?.metadata?.requires_booking === true),
    [catalogItems]
  )

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

    // Drag means "change the time," full stop (Phase 3.3, 2026-08-05) -- with a single barber's
    // column visible at a time, there is no second droppable to drop onto, so this gesture can no
    // longer imply a staff reassignment; that's now exclusively a deliberate action taken from the
    // Edit popover's own barber selector. Compare as instants, not raw strings -- the API returns a
    // "+00:00"-suffixed ISO string while isoAtQuarter()/toISOString() produce a "Z"-suffixed one;
    // those never string-match for the same instant, which silently fired a no-op PATCH on every
    // drop back onto the origin slot (found via Browser Verification, 2026-08-03).
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
  }, [items, date, startHour, endHour, onReschedule, markPending, clearPending])

  const visibleBarber = barbers.find((b) => b.id === visibleBarberId) ?? null

  return (
    <div style={{ direction: 'rtl', fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <DayNav date={date} onDateChange={onDateChange} color={color} />
        </div>

        {/* Staff switcher (Phase 3.3, 2026-08-05) -- which barber's schedule is VISIBLE, styled by
            copying ReservationsTab.jsx's own Today/Week pill pattern (no shared toggle component
            exists in this codebase to import). This pill row IS today's concrete control for the
            "one schedule visible at a time" architecture decision -- not the architecture itself; if
            the real barber count ever grows past what a pill row comfortably fits, the fix is
            swapping the control (e.g. `overflowX:'auto'`, same proven fix ReservationsTab.jsx's own
            status-pills row already uses -- or a dropdown), never re-introducing multiple visible
            columns. Renders only when there's an actual choice to make. */}
        {barbers.length > 1 && (
          <div style={{
            display: 'flex', borderRadius: 20, padding: 2, marginBottom: 14,
            background: T.pageBg, border: `1px solid ${T.border}`,
          }}>
            {barbers.map((b) => {
              const active = b.id === visibleBarberId
              return (
                <button
                  key={b.id}
                  onClick={() => onVisibleBarberChange(b.id)}
                  style={{
                    padding: '5px 14px', borderRadius: 18, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: FONT, border: 'none',
                    background: active ? color : 'transparent',
                    color: active ? '#0a0a0f' : T.textSecond,
                    transition: 'background 0.15s ease, color 0.15s ease', whiteSpace: 'nowrap',
                  }}
                >
                  {b.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Floating "+" -- second Quick Create entry point (Phase 3.2), for when hunting the exact
            empty slot isn't the fastest path; defaults to whichever barber's schedule is currently
            visible (Phase 3.3 fix -- previously silently fell back to barbers[0] regardless of what
            was on screen). */}
        <button
          onClick={(e) => setCreateSlot({ barberId: visibleBarberId, anchor: { x: e.clientX, y: e.clientY } })}
          title="حجز سريع"
          style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${color}66`,
            background: `${color}18`, color, cursor: 'pointer', fontSize: 18, fontWeight: 700,
            marginBottom: 14, flexShrink: 0, lineHeight: 1,
          }}
        >
          +
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

          {/* Single visible barber's schedule (Phase 3.3, 2026-08-05) -- the calendar shows one
              barber at a time, switched via the pill control above, never multiple columns
              side-by-side. minWidth:0 kept for the same flex-shrink defect class already
              root-caused dashboard-wide; whether overflowX:auto is still needed at all on a single
              column (vs. the N-column case it was originally written for) is confirmed via the real
              mobile-viewport pass, not assumed here. */}
          <div style={{ flex: 1, minWidth: 0, overflowX: 'auto', background: T.pageBg }}>
            {barbersLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: color,
                  animation: 'today-view-dot 1.4s ease-in-out infinite',
                }} />
                <style>{`@keyframes today-view-dot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
              </div>
            ) : !visibleBarber ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>
                لا يوجد موظفون نشطون
              </div>
            ) : (
              <div style={{ background: T.cardBg }}>
                <StaffColumn
                  barber={visibleBarber}
                  items={items.filter((i) => i.barber_id === visibleBarber.id && VISIBLE_STATUSES.includes(i.status))}
                  quarters={quarters}
                  startHour={startHour}
                  color={color}
                  serviceNameFor={serviceNameFor}
                  onOpen={(item, e) => setPopover({ item, anchor: { x: e.clientX, y: e.clientY } })}
                  pendingIds={pendingIds}
                  onEmptySlotClick={handleEmptySlotClick}
                  nowIndex={nowIndex}
                />
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
          catalogItems={bookableCatalogItems}
          isPending={pendingIds.has(popover.item.id)}
          markPending={markPending}
          clearPending={clearPending}
        />
      )}

      {createSlot && (
        <CreatePopover
          barbers={barbers}
          catalogItems={bookableCatalogItems}
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
