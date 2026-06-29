import { useState, useEffect, useCallback, useMemo, useRef, Component } from 'react'
import { motion } from 'framer-motion'
import adminApi from '../../../utils/admin.config'

// ── Design tokens ─────────────────────────────────────────────────────────────
const glass = {
  background: 'rgba(255,255,255,0.04)',
  border:     '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
}
const inputStyle = {
  padding: '8px 12px', borderRadius: 8,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 13,
  fontFamily: "'Cairo', sans-serif",
  outline: 'none',
}
const thStyle = {
  padding: '10px 14px', textAlign: 'right',
  fontSize: 12, color: 'rgba(255,255,255,0.4)',
  fontWeight: 600, letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '12px 14px', fontSize: 13,
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:   { label: 'معلّق',      bg: 'rgba(245,158,11,.15)', color: '#f59e0b' },
  confirmed: { label: 'مؤكّد',      bg: 'rgba(16,185,129,.15)', color: '#10b981' },
  arrived:   { label: 'وصل',        bg: 'rgba(52,211,153,.15)', color: '#34d399' },
  cancelled: { label: 'ملغي',       bg: 'rgba(239,68,68,.15)',  color: '#ef4444' },
  no_show:   { label: 'لم يحضر',   bg: 'rgba(251,146,60,.15)', color: '#fb923c' },
}

// Only valid forward transitions
const TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['arrived',   'cancelled', 'no_show'],
  arrived:   [],
  cancelled: [],
  no_show:   [],
}

const ALL_STATUSES = ['pending', 'confirmed', 'arrived', 'cancelled', 'no_show']
const PAGE_SIZE    = 10

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}
function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status, clickable, onClick }) {
  const m = STATUS_META[status] ?? { label: status, bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-block', fontSize: 11, fontWeight: 600,
        padding: '3px 10px', borderRadius: 20,
        background: m.bg, color: m.color,
        cursor: clickable ? 'pointer' : 'default',
        border: `1px solid ${m.color}44`,
        whiteSpace: 'nowrap', fontFamily: "'Cairo', sans-serif",
      }}
    >
      {m.label}
    </span>
  )
}

// ── StatusCell ────────────────────────────────────────────────────────────────
function StatusCell({ reservation, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const next = TRANSITIONS[reservation.status] ?? []

  if (!editing || next.length === 0) {
    return (
      <StatusBadge
        status={reservation.status}
        clickable={next.length > 0}
        onClick={() => next.length > 0 && setEditing(true)}
      />
    )
  }

  return (
    <select
      autoFocus
      defaultValue={reservation.status}
      disabled={saving}
      style={{ ...inputStyle, minWidth: 120 }}
      onChange={async e => {
        const s = e.target.value
        if (s === reservation.status) { setEditing(false); return }
        setSaving(true)
        try { await onUpdate(reservation.id, s) } finally { setSaving(false); setEditing(false) }
      }}
      onBlur={() => setEditing(false)}
    >
      <option value={reservation.status}>{STATUS_META[reservation.status]?.label ?? reservation.status}</option>
      {next.map(s => <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>)}
    </select>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, total, totalPages, onPage, color }) {
  if (totalPages <= 1) return null
  const from = (page - 1) * PAGE_SIZE + 1
  const to   = Math.min(page * PAGE_SIZE, total)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
        عرض {from}–{to} من {total}
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <PagBtn label="السابق" disabled={page === 1}          onClick={() => onPage(page - 1)} color={color} />
        <span style={{ fontSize: 12, padding: '5px 10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
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
        background: 'transparent', fontFamily: "'Cairo', sans-serif",
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : `${color}44`}`,
        color: disabled ? 'rgba(255,255,255,0.2)' : color,
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
              <div style={{ height: 14, width: w, borderRadius: 4, background: 'rgba(255,255,255,0.06)', animation: 'res-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
            </td>
          ))}
        </tr>
      ))}
      <style>{`@keyframes res-pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </tbody>
  )
}

function MobileCardSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ ...glass, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 14, width: 120, borderRadius: 4, background: 'rgba(255,255,255,0.06)', animation: `res-pulse 1.5s ${i * 0.07}s ease-in-out infinite` }} />
              <div style={{ height: 11, width: 90,  borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: `res-pulse 1.5s ${i * 0.07}s ease-in-out infinite` }} />
            </div>
            <div style={{ height: 22, width: 64, borderRadius: 20, background: 'rgba(255,255,255,0.06)', animation: `res-pulse 1.5s ${i * 0.07}s ease-in-out infinite` }} />
          </div>
          <div style={{ height: 11, width: 160, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: `res-pulse 1.5s ${i * 0.07}s ease-in-out infinite` }} />
        </div>
      ))}
    </>
  )
}

// ── Mobile reservation card ────────────────────────────────────────────────────
function MobileReservationCard({ reservation, idx, color, onUpdate }) {
  const dateAt = reservation.scheduled_at ?? reservation.created_at
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
      style={{ ...glass, padding: '14px 16px', marginBottom: 10 }}
    >
      {/* Top: customer + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
            {reservation.customer_name || '—'}
          </div>
          {reservation.customer_phone && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', direction: 'ltr', marginTop: 2 }}>
              {reservation.customer_phone}
            </div>
          )}
        </div>
        <StatusCell reservation={reservation} onUpdate={onUpdate} />
      </div>

      {/* Bottom: date/time + module_key */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          {fmtDate(dateAt)}
          {dateAt ? <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span> : ''}
          {fmtTime(dateAt)}
        </div>
        {reservation.module_key && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.35)',
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
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: 11, color: 'rgba(255,255,255,0.3)',
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
 */
export default function ReservationsTab({ color }) {
  const [reservations, setReservations] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter,   setDateFilter]   = useState(todayISO())
  const [showAllDates, setShowAllDates] = useState(false)
  const [page,         setPage]         = useState(1)
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth < 768)
  const mountedRef = useRef(true)

  useEffect(() => () => { mountedRef.current = false }, [])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (!showAllDates && dateFilter)  params.set('date',   dateFilter)
      params.set('limit', '200')

      const res = await adminApi.get(`/reservations/?${params}`)
      const raw = res?.data?.data ?? res?.data ?? []
      if (mountedRef.current) setReservations(Array.isArray(raw) ? raw : [])
    } catch {
      if (mountedRef.current) setReservations([])
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [statusFilter, dateFilter, showAllDates])

  useEffect(() => { load(); setPage(1) }, [load])

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (id, newStatus) => {
    await adminApi.patch(`/reservations/${id}/status`, { status: newStatus })
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
  }, [])

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(reservations.length / PAGE_SIZE))
  const paged      = reservations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Status counts (for pills) ─────────────────────────────────────────────
  const countByStatus = useMemo(() => {
    const m = {}
    for (const r of reservations) m[r.status] = (m[r.status] ?? 0) + 1
    return m
  }, [reservations])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 18,
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
      }}>

        {/* Date input row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
          <input
            type="date"
            value={showAllDates ? '' : dateFilter}
            onChange={e => { setDateFilter(e.target.value); setShowAllDates(false) }}
            disabled={showAllDates}
            style={{ ...inputStyle, flex: 1, colorScheme: 'dark', opacity: showAllDates ? 0.4 : 1 }}
          />
          <button
            onClick={() => { setDateFilter(todayISO()); setShowAllDates(false) }}
            style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif", flexShrink: 0,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            اليوم
          </button>
          <button
            onClick={() => { setShowAllDates(p => !p); setPage(1) }}
            style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif", flexShrink: 0,
              background: showAllDates ? `${color}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showAllDates ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
              color: showAllDates ? color : 'rgba(255,255,255,0.5)',
            }}
          >
            الكل
          </button>
          <button
            onClick={load}
            style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif", flexShrink: 0,
              background: 'transparent',
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
                  cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                  flexShrink: 0, whiteSpace: 'nowrap',
                  background: active ? (m?.bg ?? `${color}22`) : 'rgba(255,255,255,0.04)',
                  color:      active ? (m?.color ?? color)     : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${active ? (m?.color ?? color) + '55' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.15s',
                }}
              >
                {s === 'all' ? 'الكل' : (m?.label ?? s)}
                <span style={{ marginRight: 4, opacity: 0.65, fontSize: 10 }}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Refresh — desktop only (mobile has it in date row) */}
        {!isMobile && (
          <button
            onClick={load}
            style={{
              marginRight: 'auto', padding: '6px 16px', borderRadius: 8, fontSize: 12,
              background: 'transparent', cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
              border: `1px solid ${color}44`, color,
            }}
          >
            تحديث
          </button>
        )}
      </div>

      {/* ── Results count ──────────────────────────────────────────── */}
      {!loading && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>
          {reservations.length} حجز{showAllDates ? '' : ` — ${fmtDate(dateFilter + 'T00:00:00')}`}
        </div>
      )}

      {/* ── Content — cards on mobile, table on desktop ────────────── */}
      {isMobile ? (
        /* Mobile: cards */
        <div>
          {loading ? (
            <MobileCardSkeleton rows={5} />
          ) : paged.length === 0 ? (
            <div style={{
              ...glass, padding: '48px 24px',
              textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13,
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
              />
            ))
          )}
        </div>
      ) : (
        /* Desktop: table */
        <div style={{ ...glass, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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
                    <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
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
                      style={{ transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 36 }}>
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>

                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{res.customer_name || '—'}</div>
                        {res.customer_phone && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', direction: 'ltr', textAlign: 'right' }}>
                            {res.customer_phone}
                          </div>
                        )}
                      </td>

                      <td style={{ ...tdStyle, fontSize: 12 }}>
                        {fmtDate(res.scheduled_at ?? res.created_at)}
                      </td>

                      <td style={{ ...tdStyle, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                        {fmtTime(res.scheduled_at ?? res.created_at)}
                      </td>

                      <td style={tdStyle}>
                        {res.module_key && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.4)',
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

      {/* ── Pagination ─────────────────────────────────────────────── */}
      <Pagination
        page={page}
        total={reservations.length}
        totalPages={totalPages}
        onPage={setPage}
        color={color}
      />
    </div>
  )
}
