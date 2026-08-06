import { useState, useMemo, useEffect, useRef } from 'react'
import adminApi from '../../../utils/admin.config'
import { StatusCell, TRANSITIONS } from '../tabs/ReservationsTab'
import Dropdown from './Dropdown'
import { T, FONT } from '../theme'

// ── Reservation Interactions (Phase 3.4, 2026-08-06) ────────────────────────────────────────────
// Extracted out of ReservationsTodayView.jsx (moved, not copied) so ReservationsWeekCalendar.jsx
// can reuse the exact same popovers, positioning, and data hooks instead of maintaining its own
// standalone implementation. This is the single place any future reservation-card action (e.g. a
// WhatsApp-send button, Print, Mark No-Show) gets added -- both Today and Week render the same
// ReservationPopover/CreatePopover, so a new action added here appears in both views automatically,
// with no second file to remember to update.

// ── Pure date helpers ─────────────────────────────────────────────────────────────────────────────
// All UTC-field accessors, deliberately -- `reserved_at` values represent the tenant's wall-clock
// time directly with no real timezone conversion anywhere in this feature (documented once in
// reservation_service.py's _check_working_hours()). Any "now" built here must map the browser's
// LOCAL hour/minute into UTC fields the same way, never `new Date().toISOString()`'s true UTC
// instant, or it silently disagrees with every reservation on the same grid.
export function fmtTimeUTC(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}
export function quarterIndexFromIso(iso, startHour) {
  const d = new Date(iso)
  const mins = (d.getUTCHours() * 60 + d.getUTCMinutes()) - startHour * 60
  return Math.round(mins / 15)
}
export function isoAtQuarter(dateISO, startHour, quarterIndex) {
  const d = new Date(`${dateISO}T00:00:00Z`)
  const totalMin = startHour * 60 + quarterIndex * 15
  d.setUTCMinutes(d.getUTCMinutes() + totalMin)
  return d.toISOString()
}
export function todayISODate() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10)
}
export function fakeNowIso() {
  const now = new Date()
  return new Date(Date.UTC(
    now.getFullYear(), now.getMonth(), now.getDate(),
    now.getHours(), now.getMinutes(), now.getSeconds()
  )).toISOString()
}

// ── Shared data hooks ────────────────────────────────────────────────────────────────────────────
// Both Today and Week previously fetched `/barbers/` and `/catalog/items` independently on mount --
// two real, duplicate network calls for the same data every time a user toggled between the two
// views. Called once in ReservationsTab.jsx now, passed down as props to both.
export function useBarbers() {
  const [barbers, setBarbers] = useState([])
  const [barbersLoading, setBarbersLoading] = useState(true)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  useEffect(() => {
    // Trailing slash required -- the real route is `/barbers/` (@router.get("/") under
    // prefix="/barbers"). Omitting it triggers a 307 redirect that the Vite dev proxy resolves
    // cross-origin, which strips the Authorization header per fetch/XHR redirect semantics -> a
    // real 401 that force-logs-out the whole session. Confirmed via Browser Verification, 2026-08-03.
    // No setBarbersLoading(true) here -- this effect has [] deps (runs exactly once, on mount),
    // and the state already starts `true` via useState(true) above, so setting it again would be
    // a redundant no-op render, not a real state change.
    adminApi.get('/barbers/')
      .then((r) => { if (mountedRef.current) setBarbers(r.data?.data ?? []) })
      .catch(() => { if (mountedRef.current) setBarbers([]) })
      .finally(() => { if (mountedRef.current) setBarbersLoading(false) })
  }, [])
  return { barbers, barbersLoading }
}

export function useCatalogItems() {
  const [catalogItems, setCatalogItems] = useState([])
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  useEffect(() => {
    adminApi.get('/catalog/items')
      .then((r) => { if (mountedRef.current) setCatalogItems(r.data?.data ?? []) })
      .catch(() => { if (mountedRef.current) setCatalogItems([]) })
  }, [])
  return catalogItems
}

// ── Shared input style ───────────────────────────────────────────────────────────────────────────
export const popoverInputStyle = {
  flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 10,
  background: T.cardBg, border: `1px solid ${T.border}`,
  color: T.textPrimary, fontSize: 13, colorScheme: 'light', fontFamily: FONT,
}

// ── Shared popover positioning (Phase 3.3.2, 2026-08-05) ─────────────────────────────────────────
// Flips above the anchor when there's no room below, and falls back to a height-constrained,
// internally-scrolling body when neither direction fully fits -- the page itself never needs to
// scroll. Deliberately NOT written against any specific fixed element (e.g. a mobile bottom nav):
// probes the real DOM for whatever is actually occupying the bottom edge of the screen right now,
// so it keeps working unchanged regardless of what that turns out to be.
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
// independently-maintained ones. Deliberately domain-agnostic: takes an anchor point, a height, and
// a padding, and knows nothing about reservations, calendars, or any specific fixed UI element.
//
// `anchor` stays a point ({x, y}, e.g. a click event's clientX/clientY) rather than a full
// getBoundingClientRect()-style rect -- every current call site opens from a click point, not an
// anchored element, so a rect would add a shape this hook doesn't actually need yet.
export function usePopoverPosition({ anchor, popupHeight, width = 280, viewportPadding = 12 }) {
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
    if (spaceBelow >= spaceAbove) {
      return { top: anchor.y, left, maxHeight: Math.max(spaceBelow, 160), scroll: true }
    }
    return { top: usableTop, left, maxHeight: Math.max(spaceAbove, 160), scroll: true }
  }, [anchor.x, anchor.y, popupHeight, width, viewportPadding])
}

// ── ReservationPopover ───────────────────────────────────────────────────────────────────────────
// Optimistic-vs-pessimistic split (Phase 3.2): the DRAG path in each calendar view stays optimistic
// -- a physical gesture needs instant visual feedback. Every action in THIS popover (mini-reschedule,
// Edit save, Cancel confirm, quick-confirm) is deliberately pessimistic instead -- button disabled +
// inline spinner text while the request is in flight, local state only changes once the server's own
// response comes back.
export function ReservationPopover({
  item, serviceName, color, anchor, onClose,
  onStatusChange, onReschedule, onEdit,
  barbers, catalogItems, isPending, markPending, clearPending,
}) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'cancel-confirm'

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

  // Quick-confirm (Phase 3.4, 2026-08-06, Salman's explicit addition) -- confirming a pending
  // reservation is likely the single highest-frequency action taken from this popover, but cost 2
  // clicks (open StatusCell's dropdown -> pick "مؤكد") even though it never requires opening Edit
  // mode. One-click alternative for this specific transition; StatusCell stays as-is for every other
  // transition (arrived/no_show/cancelled) that doesn't warrant a dedicated always-visible button.
  // Deliberately NOT adding a matching one-click "❌ إلغاء" button here -- the view-mode action row
  // below already has a prominent, one-click-to-the-confirm-step "إلغاء الحجز" button; a second one
  // would duplicate it, not add real capability.
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState(null)
  const nextStatuses = TRANSITIONS[item.status] ?? []
  const canQuickConfirm = nextStatuses.includes('confirmed')
  const handleQuickConfirm = async () => {
    setConfirmError(null)
    setConfirming(true)
    markPending(item.id)
    try {
      await onStatusChange(item.id, 'confirmed')
      onClose()
    } catch (err) {
      setConfirmError(err?.response?.data?.error?.message || 'تعذر تأكيد الحجز.')
    } finally {
      setConfirming(false)
      clearPending(item.id)
    }
  }

  const [editName, setEditName] = useState(item.customer_name || '')
  const [editPhone, setEditPhone] = useState(item.customer_phone || '')
  const [editServiceId, setEditServiceId] = useState(item.metadata?.service_id || '')
  const [editBarberId, setEditBarberId] = useState(item.barber_id || '')
  const [editDate, setEditDate] = useState(item.reserved_at.slice(0, 10))
  const [editTime, setEditTime] = useState(fmtTimeUTC(item.reserved_at))
  const [editDuration, setEditDuration] = useState(item.duration_min)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState(null)

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
              {canQuickConfirm && (
                <div style={{ marginBottom: 12 }}>
                  <button
                    onClick={handleQuickConfirm} disabled={confirming || isPending}
                    style={{
                      width: '100%', padding: '9px 0', borderRadius: 10,
                      border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.12)',
                      color: '#047857', fontSize: 12, fontWeight: 700,
                      cursor: (confirming || isPending) ? 'not-allowed' : 'pointer', fontFamily: FONT,
                    }}
                  >
                    {confirming ? 'جارٍ التأكيد...' : '✅ تأكيد الحجز'}
                  </button>
                  {confirmError && (
                    <div style={{ fontSize: 11, color: T.danger, background: T.dangerSoft, border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '6px 8px', marginTop: 6 }}>
                      {confirmError}
                    </div>
                  )}
                </div>
              )}

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

// ── CreatePopover ────────────────────────────────────────────────────────────────────────────────
// Same anchored-panel, non-modal shell as ReservationPopover -- "Popover not Modal" (Phase 3.1)
// applies to Create exactly as it does to Quick Actions. Entry points: an empty-slot click (pre-fills
// time, and barber where the calling view has a staff dimension) or a floating "+" button (no
// pre-fill, owner picks everything).
export function CreatePopover({ barbers, catalogItems, defaultBarberId, defaultReservedAt, color, anchor, onClose, onCreate }) {
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
