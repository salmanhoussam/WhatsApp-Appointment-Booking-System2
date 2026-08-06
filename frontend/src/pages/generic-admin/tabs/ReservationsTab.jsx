import { useState, useEffect, useCallback, useMemo, useRef, Component } from 'react'
import { motion } from 'framer-motion'
import adminApi from '../../../utils/admin.config'
import useTenantConfig from '../../../hooks/useTenantConfig'
import ReservationsWeekCalendar, { startOfWeekSunday } from '../components/ReservationsWeekCalendar'
import ReservationsTodayView from '../components/ReservationsTodayView'
import { useBarbers, useCatalogItems, ReservationPopover, CreatePopover } from '../components/reservationInteractions'
import Dropdown from '../components/Dropdown'
import { T, FONT } from '../theme'

// ── Design tokens (Phase 3.1 UX Iteration, 2026-08-05 -- light theme, reuses the same `T` tokens
// as the customer-facing ReservePage.jsx, Salman's own already-approved reference) ────────────────
const card = {
  background: T.cardBg,
  border:     `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: T.shadow,
}
const inputStyle = {
  padding: '8px 12px', borderRadius: 8,
  background: T.cardBg,
  border: `1px solid ${T.border}`,
  color: T.textPrimary, fontSize: 13,
  fontFamily: FONT,
  outline: 'none', colorScheme: 'light',
}
const thStyle = {
  padding: '10px 14px', textAlign: 'right',
  fontSize: 12, color: T.textMuted,
  fontWeight: 600, letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '12px 14px', fontSize: 13,
  borderBottom: `1px solid ${T.borderSoft}`,
  verticalAlign: 'middle',
}

// ── Status config ─────────────────────────────────────────────────────────────
// Exported so ReservationsWeekCalendar.jsx can reuse the exact same status vocabulary/colors
// instead of re-implementing a 6th badge variant (see design-system Badge.jsx's fixed variants,
// which don't map onto these 5 real reservation statuses).
export const STATUS_META = {
  pending:   { label: 'معلّق',      bg: 'rgba(245,158,11,.12)', color: '#b45309' },
  confirmed: { label: 'مؤكّد',      bg: 'rgba(16,185,129,.12)', color: '#047857' },
  arrived:   { label: 'وصل',        bg: 'rgba(52,211,153,.14)', color: '#0f766e' },
  cancelled: { label: 'ملغي',       bg: 'rgba(239,68,68,.10)',  color: '#b91c1c' },
  no_show:   { label: 'لم يحضر',   bg: 'rgba(251,146,60,.12)', color: '#c2410c' },
}

// Only valid forward transitions -- exported so the shared ReservationPopover
// (reservationInteractions.jsx) can render one-click quick-status buttons using the same rules
// StatusCell already enforces, not a second copy of this table.
export const TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['arrived',   'cancelled', 'no_show'],
  arrived:   [],
  cancelled: [],
  no_show:   [],
}

const ALL_STATUSES = ['pending', 'confirmed', 'arrived', 'cancelled', 'no_show']
const PAGE_SIZE    = 10

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}
export function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function dateISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDaysLocal(d, n) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}
function parseHourLoose(v) {
  if (v == null) return null
  const [h] = String(v).split(':')
  const n = parseInt(h, 10)
  return Number.isFinite(n) ? n : null
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status, clickable, onClick }) {
  const m = STATUS_META[status] ?? { label: status, bg: T.pageBg, color: T.textSecond }
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-block', fontSize: 11, fontWeight: 600,
        padding: '3px 10px', borderRadius: 20,
        background: m.bg, color: m.color,
        cursor: clickable ? 'pointer' : 'default',
        border: `1px solid ${m.color}33`,
        whiteSpace: 'nowrap', fontFamily: FONT,
      }}
    >
      {m.label}
    </span>
  )
}

// ── StatusCell ────────────────────────────────────────────────────────────────
// Custom Dropdown, not a native <select> (Phase 3.1 UX Iteration, 2026-08-05) -- same class of bug
// Salman flagged for the service selector: a native select's open list is positioned by the OS/
// browser, not by this app's CSS. Used in the table, mobile cards, week-calendar modal, and both
// Today View popovers -- worth fixing once here rather than leaving one native select behind.
//
// stopPropagation on both branches (Phase 3.5, 2026-08-07): List's table row / mobile card now
// opens ReservationPopover on click -- without this, opening or using StatusCell's own dropdown
// would also bubble up and trigger that row-level open, same technique cards already use for empty-
// slot clicks (ReservationCardBody's pattern), applied here in the opposite direction.
export function StatusCell({ reservation, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const next = TRANSITIONS[reservation.status] ?? []

  if (!editing || next.length === 0) {
    return (
      <StatusBadge
        status={reservation.status}
        clickable={next.length > 0}
        onClick={(e) => { e.stopPropagation(); next.length > 0 && setEditing(true) }}
      />
    )
  }

  const options = [reservation.status, ...next].map((s) => ({
    value: s, label: STATUS_META[s]?.label ?? s,
  }))

  return (
    <div style={{ minWidth: 130 }} onClick={(e) => e.stopPropagation()} onBlur={() => setEditing(false)}>
      <Dropdown
        value={reservation.status}
        disabled={saving}
        options={options}
        onChange={async (s) => {
          if (s === reservation.status) { setEditing(false); return }
          setSaving(true)
          try { await onUpdate(reservation.id, s) } finally { setSaving(false); setEditing(false) }
        }}
      />
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, total, totalPages, onPage, color }) {
  if (totalPages <= 1) return null
  const from = (page - 1) * PAGE_SIZE + 1
  const to   = Math.min(page * PAGE_SIZE, total)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, direction: 'rtl', fontFamily: FONT }}>
      <span style={{ fontSize: 12, color: T.textMuted }}>
        عرض {from}–{to} من {total}
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <PagBtn label="السابق" disabled={page === 1}          onClick={() => onPage(page - 1)} color={color} />
        <span style={{ fontSize: 12, padding: '5px 10px', color: T.textSecond, fontFamily: 'monospace' }}>
          {page} / {totalPages}
        </span>
        <PagBtn label="التالي"  disabled={page === totalPages} onClick={() => onPage(page + 1)} color={color} />
      </div>
    </div>
  )
}
function PagBtn({ label, disabled, onClick, color }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 14px', borderRadius: 7, cursor: disabled ? 'default' : 'pointer',
        background: T.cardBg, fontFamily: FONT,
        border: `1px solid ${disabled ? T.border : `${color}44`}`,
        color: disabled ? T.textMuted : color,
        fontSize: 12,
      }}
    >
      {label}
    </button>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function TableSkeleton({ rows = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {[16, 110, 90, 70, 70, 60].map((w, j) => (
            <td key={j} style={tdStyle}>
              <div style={{ height: 14, width: w, borderRadius: 4, background: T.borderSoft, animation: 'res-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
            </td>
          ))}
        </tr>
      ))}
      <style>{`@keyframes res-pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </tbody>
  )
}

function MobileCardSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ ...card, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 14, width: 120, borderRadius: 4, background: T.borderSoft, animation: `res-pulse 1.5s ${i * 0.07}s ease-in-out infinite` }} />
              <div style={{ height: 11, width: 90,  borderRadius: 4, background: T.borderSoft, animation: `res-pulse 1.5s ${i * 0.07}s ease-in-out infinite` }} />
            </div>
            <div style={{ height: 22, width: 64, borderRadius: 20, background: T.borderSoft, animation: `res-pulse 1.5s ${i * 0.07}s ease-in-out infinite` }} />
          </div>
          <div style={{ height: 11, width: 160, borderRadius: 4, background: T.borderSoft, animation: `res-pulse 1.5s ${i * 0.07}s ease-in-out infinite` }} />
        </div>
      ))}
    </>
  )
}

// ── Mobile reservation card ────────────────────────────────────────────────────
// onOpen (Phase 3.5, 2026-08-07) -- clicking anywhere on the card opens the shared
// ReservationPopover, same click-anchored pattern Today/Week's cards already use.
function MobileReservationCard({ reservation, idx, color, onUpdate, onOpen }) {
  const dateAt = reservation.reserved_at ?? reservation.created_at
  return (
    <motion.div
      onClick={(e) => onOpen?.(reservation, e)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
      style={{ ...card, padding: '14px 16px', marginBottom: 10, cursor: onOpen ? 'pointer' : 'default' }}
    >
      {/* Top: customer + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>
            {reservation.customer_name || '—'}
          </div>
          {reservation.customer_phone && (
            <div style={{ fontSize: 11, color: T.textMuted, direction: 'ltr', marginTop: 2 }}>
              {reservation.customer_phone}
            </div>
          )}
        </div>
        <StatusCell reservation={reservation} onUpdate={onUpdate} />
      </div>

      {/* Bottom: date/time + module_key */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: T.textMuted }}>
          {fmtDate(dateAt)}
          {dateAt ? <span style={{ margin: '0 4px', opacity: 0.5 }}>·</span> : ''}
          {fmtTime(dateAt)}
        </div>
        {reservation.module_key && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 8,
            background: T.pageBg,
            color: T.textMuted,
            fontFamily: 'monospace',
          }}>
            {reservation.module_key}
          </span>
        )}
      </div>

      {/* Notes if present */}
      {reservation.notes && (
        <div style={{
          marginTop: 8, paddingTop: 8,
          borderTop: `1px solid ${T.borderSoft}`,
          fontSize: 11, color: T.textMuted,
        }}>
          {reservation.notes}
        </div>
      )}
    </motion.div>
  )
}

// ── ReservationsTab ───────────────────────────────────────────────────────────
/**
 * Props:
 *   color   tenant primary_color
 *
 * Only rendered when 'reservations' service is active (enforced by GenericAdminDashboard).
 * API: GET /reservations/?status=&date=YYYY-MM-DD
 *      PATCH /reservations/{id}/status  { status }
 *
 * `defaultView` ('list' | 'today' | 'week') -- lets GenericAdminDashboard reuse this exact component
 * (unchanged internals, including its own already-verified List/Calendar toggle) for both the new
 * top-level "Calendar" nav item and the "Reservations" nav item, per the Dashboard Navigation
 * Refactor (2026-08-03) -- rather than duplicating this tab's state/loading/request-sequencing
 * logic into a second component.
 */
export default function ReservationsTab({ color, defaultView = 'list' }) {
  const [reservations, setReservations] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter,   setDateFilter]   = useState(todayISO())
  const [showAllDates, setShowAllDates] = useState(false)
  const [search,       setSearch]       = useState('') // Item 3, Phase 3.5 -- List-specific, client-side
  const [page,         setPage]         = useState(1)
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth < 768)
  const [viewMode,     setViewMode]     = useState(defaultView) // 'list' | 'today' | 'week'
  const [weekStart,    setWeekStart]    = useState(() => startOfWeekSunday(new Date()))
  const [todayViewDate, setTodayViewDate] = useState(todayISO()) // Today View's own day nav (Phase 3.1.1)
  // Which barber's schedule is visible in Today View (Phase 3.3) -- owned HERE, not inside
  // ReservationsTodayView, because that component fully unmounts/remounts on every load() (the
  // `loading ? <div/> : <ReservationsTodayView/>` swap below is a real unmount, not just a prop
  // update) -- every day-nav click, filter change, etc. triggers load(). A real bug found via
  // Browser Verification, 2026-08-05: without lifting this, the staff switcher silently reset back
  // to the first barber on every single ▶/◀ day-navigation click. ReservationsTab itself never
  // unmounts across those, so state lives here instead, same reasoning as todayViewDate above.
  const [visibleBarberId, setVisibleBarberId] = useState(null)
  // Barbers/catalog items (Phase 3.4, 2026-08-06) -- fetched once here via the shared hooks and
  // passed down to both Today and Week, instead of each view independently re-fetching the same
  // data on every mount/toggle (a real, confirmed duplicate network call before this). Each view
  // still derives its own bookable-only subset locally (a one-line filter, not worth lifting) --
  // Today also needs the FULL list for serviceNameFor (labeling historical/non-bookable items on
  // existing reservations), a different concern from "what's offered when booking new".
  const { barbers, barbersLoading } = useBarbers()
  const catalogItems = useCatalogItems()

  // List's own ReservationPopover/CreatePopover state (Phase 3.5, 2026-08-07) -- same shape
  // Today/Week already carry locally, not extracted (Abstraction Rule: local UI state stays local
  // until a third real case needs it shared -- List is that third case, and it's small enough to
  // just write fresh here, same call Phase 3.4 made for Week).
  const [popover, setPopover] = useState(null) // { item, anchor } | null
  const openPopover = useCallback((item, e) => {
    setPopover({ item, anchor: { x: e.clientX, y: e.clientY } })
  }, [])
  const closePopover = useCallback(() => setPopover(null), [])
  // Create (Item 2, Phase 3.5) -- List has no empty-slot/grid concept to click, so this is a plain
  // button anchored at its own click point, same anchor shape as every other Create trigger already
  // uses (Today's empty-slot click, Week's empty-slot click).
  const [createAnchor, setCreateAnchor] = useState(null) // { x, y } | null
  const openCreate = useCallback((e) => setCreateAnchor({ x: e.clientX, y: e.clientY }), [])
  const closeCreate = useCallback(() => setCreateAnchor(null), [])
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const markPending = useCallback((id) => {
    setPendingIds((prev) => new Set(prev).add(id))
  }, [])
  const clearPending = useCallback((id) => {
    setPendingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
  }, [])
  // Same split ReservationsWeekCalendar.jsx already makes: serviceNameFor stays on the FULL list
  // (labels whatever a reservation actually references, including non-bookable items on historical
  // data), bookableCatalogItems is the filtered subset offered when picking a NEW/changed service.
  const serviceNameFor = useCallback((item) => {
    const id = item?.metadata?.service_id
    return catalogItems.find((c) => c.id === id)?.name_ar ?? null
  }, [catalogItems])
  const bookableCatalogItems = useMemo(
    () => catalogItems.filter((item) => item?.metadata?.requires_booking === true),
    [catalogItems]
  )

  const mountedRef = useRef(true)

  const { config } = useTenantConfig()
  const hourRange = useMemo(() => {
    const wh = config?.config?.working_hours
    const open  = parseHourLoose(wh?.open_time)
    const close = parseHourLoose(wh?.close_time)
    return (open != null && close != null && close > open) ? [open, close] : [8, 22]
  }, [config])

  // mountedRef must be reset to true in the effect's setup, not just useRef(true)'s
  // initializer -- see useCatalog.js / .claude/memory.md (2026-07-21) for the real
  // StrictMode double-invoke bug this guards against.
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  // One fetch path shared by both views — the calendar is a different render
  // branch over the same `reservations` state, not a parallel data source.
  //
  // requestSeqRef guards against out-of-order responses: switching viewMode/filters fires a
  // new load() before a previous, slower one has resolved. Without this, an older in-flight
  // request landing *after* a newer one can silently overwrite correct data with stale
  // results (real race found while verifying the calendar toggle -- switching list->calendar
  // quickly showed 0 reservations despite the calendar's own fetch having actually returned 3,
  // because the earlier list-mode request's empty result landed second and clobbered it).
  const requestSeqRef = useRef(0)
  const load = useCallback(async () => {
    const mySeq = ++requestSeqRef.current
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)

      if (viewMode === 'week') {
        params.set('date_from', dateISO(weekStart))
        params.set('date_to',   dateISO(addDaysLocal(weekStart, 6)))
        params.set('limit', '500')
      } else if (viewMode === 'today') {
        params.set('date', todayViewDate)
        params.set('limit', '200')
      } else {
        if (!showAllDates && dateFilter) params.set('date', dateFilter)
        params.set('limit', '200')
      }

      const res = await adminApi.get(`/reservations/?${params}`)
      if (mySeq !== requestSeqRef.current) return // a newer request has since started; drop this one
      const raw = res?.data?.data ?? res?.data ?? []
      if (mountedRef.current) setReservations(Array.isArray(raw) ? raw : [])
    } catch {
      if (mySeq !== requestSeqRef.current) return
      if (mountedRef.current) setReservations([])
    } finally {
      if (mySeq === requestSeqRef.current && mountedRef.current) setLoading(false)
    }
  }, [statusFilter, dateFilter, showAllDates, viewMode, weekStart, todayViewDate])

  useEffect(() => { load(); setPage(1) }, [load])

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (id, newStatus) => {
    await adminApi.patch(`/reservations/${id}/status`, { status: newStatus })
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
  }, [])

  // Calendar drag-and-drop / popover reschedule -- thin call to the Phase 3.1 endpoint, which
  // reuses create_reservation()'s own conflict/working-hours checks. This function does not
  // decide anything; it throws on 409/error so the caller (ReservationsTodayView) can revert its
  // own optimistic update, same shape as handleStatusChange above.
  const handleReschedule = useCallback(async (id, patch) => {
    const { data } = await adminApi.patch(`/reservations/${id}/reschedule`, patch)
    const updated = data?.data
    if (updated) setReservations(prev => prev.map(r => r.id === id ? updated : r))
  }, [])

  // Quick Create / full Edit (Phase 3.2) -- same owned-state shape as handleReschedule above:
  // ReservationsTab stays the single owner of `reservations`; children never open their own
  // independent adminApi call site for these mutations (Reservation Capability Review, Finding 1).
  const handleCreate = useCallback(async (payload) => {
    const { data } = await adminApi.post('/reservations/', payload)
    const created = data?.data
    if (created) setReservations(prev => [...prev, created])
    return created
  }, [])

  const handleEdit = useCallback(async (id, patch) => {
    const { data } = await adminApi.patch(`/reservations/${id}`, patch)
    const updated = data?.data
    if (updated) setReservations(prev => prev.map(r => r.id === id ? updated : r))
    return updated
  }, [])

  // ── Search (Item 3, Phase 3.5, 2026-08-07) ──────────────────────────────────
  // List-specific capability, not a Calendar-parity gap -- same client-side pattern OrdersTab.jsx
  // already uses (filters the already-fetched array by name/phone, zero new backend request).
  // Deliberately independent of Items 1-2's popover work -- no shared state, no shared handler.
  const filteredReservations = useMemo(() => {
    if (!search.trim()) return reservations
    const s = search.toLowerCase()
    return reservations.filter(r =>
      (r.customer_name  ?? '').toLowerCase().includes(s) ||
      (r.customer_phone ?? '').toLowerCase().includes(s)
    )
  }, [reservations, search])

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE))
  const paged      = filteredReservations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Status counts (for pills) ────────────────────────────────────────────────
  // Intentionally computed from the raw `reservations`, not `filteredReservations` -- matches
  // OrdersTab.jsx's own precedent (its status pills also count against unsearched `orders`), so
  // search narrows the visible list without making the pill counts lie about the full picture.
  const countByStatus = useMemo(() => {
    const m = {}
    for (const r of reservations) m[r.status] = (m[r.status] ?? 0) + 1
    return m
  }, [reservations])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ direction: 'rtl', fontFamily: FONT }}>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 18,
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
      }}>

        {/* Search (Item 3, Phase 3.5, 2026-08-07) — List-specific, not a Calendar-parity capability,
            same reasoning as the date row below: only meaningful where a flat, scrollable list of
            reservations exists to search through. Client-side only (filteredReservations), same
            pattern OrdersTab.jsx already uses for its own search bar. */}
        {viewMode === 'list' && (
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث بالاسم أو الهاتف..."
            style={{ ...inputStyle, flex: isMobile ? 'none' : 1, minWidth: 0, maxWidth: isMobile ? '100%' : 220 }}
          />
        )}

        {/* Date input row — the date picker / "اليوم" / "الكل" controls only apply to List mode
            (load()'s param-builder only reads dateFilter/showAllDates in the List branch --
            Today/Week already have their own date navigation, DayNav and week-nav respectively).
            Rendering them unconditionally made them look interactive but do nothing while in
            Calendar (Today/Week) view -- a real, confirmed bug (Dashboard filter checkup,
            2026-08-07). "↻" stays unconditional -- it's the only manual refresh affordance for
            Today/Week on both mobile and desktop (the separate "تحديث" button below is List-only). */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
          {viewMode === 'list' && (
            <>
              <input
                type="date"
                value={showAllDates ? '' : dateFilter}
                onChange={e => { setDateFilter(e.target.value); setShowAllDates(false) }}
                disabled={showAllDates}
                style={{
                  ...inputStyle, flex: 1, minWidth: 0, opacity: showAllDates ? 0.5 : 1,
                  // Native date inputs have their own UA-defined content width, which a flex item
                  // won't shrink below without an explicit min-width:0 -- a second, independent real
                  // cause of the same mobile horizontal-overflow bug (this row is flex-wrap:nowrap).
                }}
              />
              <button
                onClick={() => { setDateFilter(todayISO()); setShowAllDates(false) }}
                style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  fontFamily: FONT, flexShrink: 0,
                  background: T.cardBg,
                  border: `1px solid ${T.border}`,
                  color: T.textSecond,
                }}
              >
                اليوم
              </button>
              <button
                onClick={() => { setShowAllDates(p => !p); setPage(1) }}
                style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  fontFamily: FONT, flexShrink: 0,
                  background: showAllDates ? `${color}14` : T.cardBg,
                  border: `1px solid ${showAllDates ? `${color}55` : T.border}`,
                  color: showAllDates ? color : T.textSecond,
                }}
              >
                الكل
              </button>
            </>
          )}
          <button
            onClick={load}
            style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              fontFamily: FONT, flexShrink: 0,
              background: T.cardBg,
              border: `1px solid ${color}44`, color,
            }}
          >
            ↻
          </button>
        </div>

        {/* Status pills — scrollable on mobile */}
        <div style={{
          display: 'flex', gap: 6,
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          overflowX: isMobile ? 'auto' : 'visible',
          scrollbarWidth: 'none',
          paddingBottom: isMobile ? 4 : 0,
        }}>
          {['all', ...ALL_STATUSES].map(s => {
            const active = statusFilter === s
            const m = STATUS_META[s]
            const count = s === 'all' ? reservations.length : (countByStatus[s] ?? 0)
            return (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT,
                  flexShrink: 0, whiteSpace: 'nowrap',
                  background: active ? (m?.bg ?? `${color}14`) : T.cardBg,
                  color:      active ? (m?.color ?? color)     : T.textSecond,
                  border: `1px solid ${active ? (m?.color ?? color) + '44' : T.border}`,
                  transition: 'all 0.15s',
                }}
              >
                {s === 'all' ? 'الكل' : (m?.label ?? s)}
                <span style={{ marginRight: 4, opacity: 0.7, fontSize: 10 }}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* View switcher — List is its own pill; Today/Week is one segmented control (Phase 3.1,
            2026-08-03) so switching feels like moving between two modes of the same calendar, not
            two separate pages, per Salman's explicit note. */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: isMobile ? 0 : 'auto' }}>
          <button
            onClick={() => { setViewMode('list'); setPage(1) }}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: FONT,
              background: viewMode === 'list' ? `${color}14` : T.cardBg,
              color: viewMode === 'list' ? color : T.textSecond,
              border: `1px solid ${viewMode === 'list' ? `${color}55` : T.border}`,
            }}
          >
            قائمة
          </button>

          <div style={{
            display: 'flex', borderRadius: 20, padding: 2,
            background: T.pageBg, border: `1px solid ${T.border}`,
          }}>
            {[['today', 'اليوم'], ['week', 'الأسبوع']].map(([mode, label]) => {
              const active = viewMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); setPage(1) }}
                  style={{
                    padding: '5px 14px', borderRadius: 18, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: FONT, border: 'none',
                    background: active ? color : 'transparent',
                    color: active ? '#0a0a0f' : T.textSecond,
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Create (Item 2, Phase 3.5) — List-only, since Today/Week trigger Create via an
            empty-slot click and List has no grid to click into. Opens the same shared CreatePopover
            anchored at the click point, defaultBarberId omitted (falls back to barbers[0]?.id, the
            exact path Week's own Create button already uses). */}
        {viewMode === 'list' && (
          <button
            onClick={openCreate}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: FONT,
              background: `${color}18`,
              border: `1px solid ${color}55`, color,
            }}
          >
            + حجز جديد
          </button>
        )}

        {/* Refresh — desktop only (mobile has it in date row) */}
        {!isMobile && viewMode === 'list' && (
          <button
            onClick={load}
            style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 12,
              background: T.cardBg, cursor: 'pointer', fontFamily: FONT,
              border: `1px solid ${color}44`, color,
            }}
          >
            تحديث
          </button>
        )}
      </div>

      {/* ── Results count ──────────────────────────────────────────── */}
      {!loading && (
        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 12 }}>
          {viewMode === 'list' ? filteredReservations.length : reservations.length} حجز
          {viewMode === 'list' && search.trim() ? ' (بعد البحث)' : ''}
          {viewMode === 'week'
            ? ` — أسبوع ${dateISO(weekStart)} إلى ${dateISO(addDaysLocal(weekStart, 6))}`
            : viewMode === 'today'
            ? ` — ${fmtDate(todayViewDate + 'T00:00:00')}`
            : (showAllDates ? '' : ` — ${fmtDate(dateFilter + 'T00:00:00')}`)}
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────── */}
      {viewMode === 'week' ? (
        loading ? (
          <div style={{ ...card, padding: '48px 24px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
            جارٍ التحميل...
          </div>
        ) : (
          <ReservationsWeekCalendar
            reservations={reservations}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            color={color}
            onStatusChange={handleStatusChange}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onReschedule={handleReschedule}
            hourRange={hourRange}
            barbers={barbers}
            catalogItems={catalogItems}
          />
        )
      ) : viewMode === 'today' ? (
        loading ? (
          <div style={{ ...card, padding: '48px 24px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
            جارٍ التحميل...
          </div>
        ) : (
          <ReservationsTodayView
            reservations={reservations}
            date={todayViewDate}
            onDateChange={setTodayViewDate}
            hourRange={hourRange}
            color={color}
            onStatusChange={handleStatusChange}
            onReschedule={handleReschedule}
            onCreate={handleCreate}
            onEdit={handleEdit}
            visibleBarberId={visibleBarberId}
            onVisibleBarberChange={setVisibleBarberId}
            barbers={barbers}
            barbersLoading={barbersLoading}
            catalogItems={catalogItems}
          />
        )
      ) : isMobile ? (
        /* Mobile: cards */
        <div>
          {loading ? (
            <MobileCardSkeleton rows={5} />
          ) : paged.length === 0 ? (
            <div style={{
              ...card, padding: '48px 24px',
              textAlign: 'center', color: T.textMuted, fontSize: 13,
            }}>
              {reservations.length === 0
                ? (showAllDates ? 'لا توجد حجوزات بعد' : `لا توجد حجوزات بتاريخ ${fmtDate(dateFilter + 'T00:00:00')}`)
                : 'لا توجد نتائج تطابق الفلتر'}
            </div>
          ) : (
            paged.map((res, idx) => (
              <MobileReservationCard
                key={res.id}
                reservation={res}
                idx={idx}
                color={color}
                onUpdate={handleStatusChange}
                onOpen={openPopover}
              />
            ))
          )}
        </div>
      ) : (
        /* Desktop: table */
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ ...thStyle, width: 36 }}>#</th>
                  <th style={thStyle}>العميل</th>
                  <th style={thStyle}>التاريخ</th>
                  <th style={thStyle}>الوقت</th>
                  <th style={thStyle}>النوع</th>
                  <th style={thStyle}>الحالة</th>
                </tr>
              </thead>

              {loading ? (
                <TableSkeleton rows={6} />
              ) : paged.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                      {reservations.length === 0
                        ? (showAllDates ? 'لا توجد حجوزات بعد' : `لا توجد حجوزات بتاريخ ${fmtDate(dateFilter + 'T00:00:00')}`)
                        : 'لا توجد نتائج تطابق الفلتر'}
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {paged.map((res, idx) => (
                    <tr
                      key={res.id}
                      onClick={(e) => openPopover(res, e)}
                      style={{ transition: 'background 0.1s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = T.pageBg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...tdStyle, color: T.textMuted, fontSize: 11, width: 36 }}>
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>

                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: T.textPrimary }}>{res.customer_name || '—'}</div>
                        {res.customer_phone && (
                          <div style={{ fontSize: 11, color: T.textMuted, direction: 'ltr', textAlign: 'right' }}>
                            {res.customer_phone}
                          </div>
                        )}
                      </td>

                      <td style={{ ...tdStyle, fontSize: 12, color: T.textSecond }}>
                        {fmtDate(res.reserved_at ?? res.created_at)}
                      </td>

                      <td style={{ ...tdStyle, fontSize: 12, color: T.textSecond }}>
                        {fmtTime(res.reserved_at ?? res.created_at)}
                      </td>

                      <td style={tdStyle}>
                        {res.module_key && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 8,
                            background: T.pageBg,
                            color: T.textMuted,
                            fontFamily: 'monospace',
                          }}>
                            {res.module_key}
                          </span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <StatusCell reservation={res} onUpdate={handleStatusChange} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination — list view only, the calendar shows everything at once ── */}
      {viewMode === 'list' && (
        <Pagination
          page={page}
          total={reservations.length}
          totalPages={totalPages}
          onPage={setPage}
          color={color}
        />
      )}

      {/* ── Reservation detail/edit/cancel/reschedule popover (Phase 3.5, 2026-08-07) ──────────
          Same shared component Today/Week already render -- List becomes the third proven case of
          this exact extraction, not a new one. */}
      {popover && (
        <ReservationPopover
          item={popover.item}
          serviceName={serviceNameFor(popover.item)}
          color={color}
          anchor={popover.anchor}
          onClose={closePopover}
          onStatusChange={handleStatusChange}
          onReschedule={handleReschedule}
          onEdit={handleEdit}
          barbers={barbers}
          catalogItems={bookableCatalogItems}
          isPending={pendingIds.has(popover.item.id)}
          markPending={markPending}
          clearPending={clearPending}
        />
      )}

      {/* ── Quick Create popover (Item 2, Phase 3.5, 2026-08-07) ── */}
      {createAnchor && (
        <CreatePopover
          barbers={barbers}
          catalogItems={bookableCatalogItems}
          defaultReservedAt={undefined}
          color={color}
          anchor={createAnchor}
          onClose={closeCreate}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
