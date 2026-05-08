import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import adminApi from '../../../utils/admin.config'

// ── Design tokens (shared with CatalogTab pattern) ────────────────────────────
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
  whiteSpace: 'nowrap', userSelect: 'none',
}
const tdStyle = {
  padding: '12px 14px', fontSize: 13,
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:    { label: 'معلّق',          bg: 'rgba(245,158,11,.15)', color: '#f59e0b' },
  preparing:  { label: 'قيد التحضير',   bg: 'rgba(59,130,246,.15)', color: '#3b82f6' },
  ready:      { label: 'جاهز',           bg: 'rgba(139,92,246,.15)', color: '#8b5cf6' },
  processing: { label: 'قيد المعالجة',  bg: 'rgba(59,130,246,.15)', color: '#3b82f6' },
  shipped:    { label: 'تم الشحن',      bg: 'rgba(139,92,246,.15)', color: '#8b5cf6' },
  delivered:  { label: 'تم التسليم',    bg: 'rgba(16,185,129,.15)', color: '#10b981' },
  refunded:   { label: 'مسترد',         bg: 'rgba(99,102,241,.15)', color: '#6366f1' },
  cancelled:  { label: 'ملغي',          bg: 'rgba(239,68,68,.15)',  color: '#ef4444' },
}

const TRANSITIONS = {
  restaurant: { pending: ['preparing','cancelled'], preparing: ['ready','cancelled'], ready: ['delivered','cancelled'], delivered: [], cancelled: [] },
  store:      { pending: ['processing','cancelled'], processing: ['shipped','cancelled'], shipped: ['delivered'], delivered: ['refunded'], refunded: [], cancelled: [] },
}

const MODULE_STATUSES = {
  restaurant: ['pending','preparing','ready','delivered','cancelled'],
  store:      ['pending','processing','shipped','delivered','refunded','cancelled'],
}

const PAGE_SIZE = 10

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}
function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}
function fmtPrice(val, currency) {
  if (val == null) return '—'
  return `${Number(val).toLocaleString('ar-SA')} ${currency ?? ''}`
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
        transition: 'opacity 0.15s',
      }}
    >
      {m.label}
    </span>
  )
}

// ── StatusCell — badge that turns into a select on click ──────────────────────
function StatusCell({ order, moduleKey, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const transitions = TRANSITIONS[moduleKey] ?? {}
  const next = transitions[order.status] ?? []

  if (!editing || next.length === 0) {
    return (
      <StatusBadge
        status={order.status}
        clickable={next.length > 0}
        onClick={() => next.length > 0 && setEditing(true)}
      />
    )
  }

  return (
    <select
      autoFocus
      defaultValue={order.status}
      disabled={saving}
      style={{ ...inputStyle, minWidth: 120 }}
      onChange={async e => {
        const s = e.target.value
        if (s === order.status) { setEditing(false); return }
        setSaving(true)
        try { await onUpdate(order.id, s) } finally { setSaving(false); setEditing(false) }
      }}
      onBlur={() => setEditing(false)}
    >
      <option value={order.status}>{STATUS_META[order.status]?.label ?? order.status}</option>
      {next.map(s => (
        <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
      ))}
    </select>
  )
}

// ── SortHeader ────────────────────────────────────────────────────────────────
function SortHeader({ col, label, sortCol, sortDir, onSort }) {
  const active = sortCol === col
  const arrow  = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ⇅'
  return (
    <th
      style={{ ...thStyle, cursor: 'pointer', color: active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)' }}
      onClick={() => onSort(col)}
    >
      {label}<span style={{ opacity: 0.5, fontSize: 10 }}>{arrow}</span>
    </th>
  )
}

// ── ExpandedRow ───────────────────────────────────────────────────────────────
function ExpandedRow({ order, colSpan, currency }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <div style={{
          padding: '14px 24px 18px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          direction: 'rtl', fontFamily: "'Cairo', sans-serif",
        }}>
          {/* Items list */}
          {order.items?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, letterSpacing: '0.05em' }}>العناصر المطلوبة</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                    <span>× {item.quantity} عنصر</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{fmtPrice(item.unit_price, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra fields */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {order.table_number   && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>طاولة: {order.table_number}</span>}
            {order.payment_method && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>الدفع: {order.payment_method}</span>}
            {order.customer_email && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>البريد: {order.customer_email}</span>}
            {order.notes          && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>ملاحظة: {order.notes}</span>}
            {order.shipping_address && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                الشحن: {typeof order.shipping_address === 'object'
                  ? Object.values(order.shipping_address).filter(Boolean).join('، ')
                  : order.shipping_address}
              </span>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, total, totalPages, onPage, color }) {
  if (totalPages <= 1) return null
  const from = (page - 1) * PAGE_SIZE + 1
  const to   = Math.min(page * PAGE_SIZE, total)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 16, direction: 'rtl', fontFamily: "'Cairo', sans-serif",
    }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
        عرض {from}–{to} من {total} نتيجة
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <PagBtn label="السابق" disabled={page === 1}          onClick={() => onPage(page - 1)} color={color} />
        <span style={{ fontSize: 12, padding: '6px 12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
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
        padding: '6px 14px', borderRadius: 7, cursor: disabled ? 'default' : 'pointer',
        background: 'transparent', fontFamily: "'Cairo', sans-serif",
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : `${color}44`}`,
        color: disabled ? 'rgba(255,255,255,0.2)' : color,
        fontSize: 12, transition: 'background 0.15s',
      }}
    >
      {label}
    </button>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function TableSkeleton({ rows = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {[16, 120, 90, 70, 60, 30, 28].map((w, j) => (
            <td key={j} style={tdStyle}>
              <div style={{ height: 14, width: w, borderRadius: 4, background: 'rgba(255,255,255,0.06)', animation: 'sk-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

// ── OrdersTab ─────────────────────────────────────────────────────────────────
/**
 * Props:
 *   moduleKey   'restaurant' | 'store'
 *   color       tenant primary_color
 *   currency    e.g. 'USD'
 */
export default function OrdersTab({ moduleKey, color, currency = 'USD' }) {
  const [orders,       setOrders]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search,       setSearch]       = useState('')
  const [sortCol,      setSortCol]      = useState('date')
  const [sortDir,      setSortDir]      = useState('desc')
  const [page,         setPage]         = useState(1)
  const [expandedId,   setExpandedId]   = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => () => { mountedRef.current = false }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (moduleKey !== 'restaurant' && moduleKey !== 'store') { setLoading(false); return }
    setLoading(true)
    try {
      const res = await adminApi.get(`/${moduleKey}/orders`)
      const raw = res?.data?.data ?? res?.data ?? []
      if (mountedRef.current) setOrders(Array.isArray(raw) ? raw : [])
    } catch {
      if (mountedRef.current) setOrders([])
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [moduleKey])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (orderId, newStatus) => {
    await adminApi.patch(`/${moduleKey}/orders/${orderId}/status`, { status: newStatus })
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }, [moduleKey])

  // ── Sort toggle ────────────────────────────────────────────────────────────
  const handleSort = useCallback((col) => {
    setSortCol(prev => {
      if (prev === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
      else { setSortDir('desc') }
      return col
    })
    setPage(1)
  }, [])

  // ── Derived data ───────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let r = orders
    if (statusFilter !== 'all') r = r.filter(o => o.status === statusFilter)
    if (search.trim()) {
      const s = search.toLowerCase()
      r = r.filter(o =>
        (o.customer_name  ?? '').toLowerCase().includes(s) ||
        (o.customer_phone ?? '').toLowerCase().includes(s) ||
        (o.customer_email ?? '').toLowerCase().includes(s)
      )
    }
    return r
  }, [orders, statusFilter, search])

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const valA = sortCol === 'date' ? new Date(a.created_at).getTime() : (Number(a.total_price) || 0)
      const valB = sortCol === 'date' ? new Date(b.created_at).getTime() : (Number(b.total_price) || 0)
      return sortDir === 'asc' ? valA - valB : valB - valA
    })
  }, [filteredOrders, sortCol, sortDir])

  const totalPages   = Math.max(1, Math.ceil(sortedOrders.length / PAGE_SIZE))
  const pagedOrders  = sortedOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const statuses     = MODULE_STATUSES[moduleKey] ?? []

  // reset page when filter changes
  useEffect(() => { setPage(1) }, [statusFilter, search])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف..."
          style={{ ...inputStyle, flex: '1 1 180px', maxWidth: 280 }}
        />

        {/* Status pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', ...statuses].map(s => {
            const active = statusFilter === s
            const m = STATUS_META[s]
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                  background: active ? (m?.bg ?? `${color}22`) : 'rgba(255,255,255,0.04)',
                  color:      active ? (m?.color ?? color)     : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${active ? (m?.color ?? color) + '55' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.15s',
                }}
              >
                {s === 'all' ? 'الكل' : (m?.label ?? s)}
                {s !== 'all' && (
                  <span style={{ marginRight: 5, opacity: 0.7, fontSize: 10 }}>
                    ({orders.filter(o => o.status === s).length})
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Refresh */}
        <button
          onClick={loadOrders}
          style={{
            marginRight: 'auto', padding: '6px 16px', borderRadius: 8, fontSize: 12,
            background: 'transparent', cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
            border: `1px solid ${color}44`, color,
          }}
        >
          تحديث
        </button>
      </div>

      {/* ── Results count ──────────────────────────────────────────── */}
      {!loading && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>
          {filteredOrders.length} طلب{search || statusFilter !== 'all' ? ' (بعد الفلترة)' : ''}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div style={{ ...glass, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th style={{ ...thStyle, width: 36 }}>#</th>
                <th style={thStyle}>العميل</th>
                <SortHeader col="date"  label="التاريخ"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th style={thStyle}>الحالة</th>
                <SortHeader col="total" label="الإجمالي" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th style={{ ...thStyle, textAlign: 'center' }}>العناصر</th>
                <th style={{ ...thStyle, width: 32 }}></th>
              </tr>
            </thead>

            {loading ? (
              <TableSkeleton rows={6} />
            ) : pagedOrders.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                    {orders.length === 0 ? 'لا توجد طلبات بعد' : 'لا توجد نتائج تطابق الفلتر'}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {pagedOrders.map((order, idx) => {
                  const expanded = expandedId === order.id
                  const rowNum   = (page - 1) * PAGE_SIZE + idx + 1
                  return (
                    <>
                      <tr
                        key={order.id}
                        style={{
                          background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 36 }}>{rowNum}</td>

                        {/* Customer */}
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {order.customer_name || '—'}
                          </div>
                          {order.customer_phone && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', direction: 'ltr', textAlign: 'right' }}>
                              {order.customer_phone}
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td style={tdStyle}>
                          <div style={{ fontSize: 12 }}>{fmtDate(order.created_at)}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{fmtTime(order.created_at)}</div>
                        </td>

                        {/* Status */}
                        <td style={tdStyle}>
                          <StatusCell order={order} moduleKey={moduleKey} onUpdate={handleStatusChange} />
                        </td>

                        {/* Total */}
                        <td style={{ ...tdStyle, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
                          {fmtPrice(order.total_price, currency)}
                        </td>

                        {/* Items count */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {order.items?.length > 0 && (
                            <span style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 10,
                              background: 'rgba(255,255,255,0.07)',
                              color: 'rgba(255,255,255,0.5)',
                            }}>
                              {order.items.length}
                            </span>
                          )}
                        </td>

                        {/* Expand */}
                        <td style={{ ...tdStyle, textAlign: 'center', width: 32 }}>
                          <button
                            onClick={() => setExpandedId(expanded ? null : order.id)}
                            style={{
                              width: 26, height: 26, borderRadius: 6,
                              background: expanded ? `${color}22` : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${expanded ? `${color}44` : 'rgba(255,255,255,0.08)'}`,
                              color: expanded ? color : 'rgba(255,255,255,0.4)',
                              cursor: 'pointer', fontSize: 12,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {expanded ? '▲' : '▼'}
                          </button>
                        </td>
                      </tr>

                      {expanded && (
                        <ExpandedRow key={`${order.id}-exp`} order={order} colSpan={7} currency={currency} />
                      )}
                    </>
                  )
                })}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────── */}
      <Pagination
        page={page}
        total={sortedOrders.length}
        totalPages={totalPages}
        onPage={setPage}
        color={color}
      />
    </div>
  )
}
