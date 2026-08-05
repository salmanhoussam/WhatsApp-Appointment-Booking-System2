import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react'
import adminApi from '../../../utils/admin.config'
import { hasCapability } from '../../../utils/capabilities'
import { T, FONT } from '../theme'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Dropdown from '../components/Dropdown'

// ── Design tokens (Dashboard Design System Completion, 2026-08-05 -- re-themed
// off the same T/FONT tokens shared with Calendar/Reservations/Overview/Catalog) ──
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
  whiteSpace: 'nowrap', userSelect: 'none',
}
const tdStyle = {
  padding: '12px 14px', fontSize: 13,
  borderBottom: `1px solid ${T.borderSoft}`,
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
  const m = STATUS_META[status] ?? { label: status, bg: T.pageBg, color: T.textSecond }
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-block', fontSize: 11, fontWeight: 600,
        padding: '3px 10px', borderRadius: 20,
        background: m.bg, color: m.color,
        cursor: clickable ? 'pointer' : 'default',
        border: `1px solid ${m.color}44`,
        whiteSpace: 'nowrap', fontFamily: FONT,
        transition: 'opacity 0.15s',
      }}
    >
      {m.label}
    </span>
  )
}

// ── StatusCell — badge that turns into a Dropdown on click (custom listbox, not
// a native <select> -- same fix already applied to Calendar/Reservations, kept
// consistent here rather than leaving a second native select behind) ───────────
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

  const options = [order.status, ...next].map(s => ({
    value: s, label: STATUS_META[s]?.label ?? s,
  }))

  return (
    <div style={{ minWidth: 130 }} onBlur={() => setEditing(false)}>
      <Dropdown
        value={order.status}
        disabled={saving}
        options={options}
        onChange={async (s) => {
          if (s === order.status) { setEditing(false); return }
          setSaving(true)
          try { await onUpdate(order.id, s) } finally { setSaving(false); setEditing(false) }
        }}
      />
    </div>
  )
}

// ── SortHeader ────────────────────────────────────────────────────────────────
function SortHeader({ col, label, sortCol, sortDir, onSort }) {
  const active = sortCol === col
  const arrow  = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ⇅'
  return (
    <th
      style={{ ...thStyle, cursor: 'pointer', color: active ? T.textPrimary : T.textMuted }}
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
          background: T.pageBg,
          borderBottom: `1px solid ${T.borderSoft}`,
          direction: 'rtl', fontFamily: FONT,
        }}>
          {/* Items list */}
          {order.items?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, letterSpacing: '0.05em' }}>العناصر المطلوبة</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.textPrimary }}>
                    <span>× {item.quantity} عنصر</span>
                    <span style={{ color: T.textSecond }}>{fmtPrice(item.unit_price, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra fields */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {order.table_number   && <span style={{ fontSize: 12, color: T.textSecond }}>طاولة: {order.table_number}</span>}
            {order.payment_method && <span style={{ fontSize: 12, color: T.textSecond }}>الدفع: {order.payment_method}</span>}
            {order.customer_email && <span style={{ fontSize: 12, color: T.textSecond }}>البريد: {order.customer_email}</span>}
            {order.notes          && <span style={{ fontSize: 12, color: T.textSecond }}>ملاحظة: {order.notes}</span>}
            {order.shipping_address && (
              <span style={{ fontSize: 12, color: T.textSecond }}>
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
      marginTop: 16, direction: 'rtl', fontFamily: FONT,
    }}>
      <span style={{ fontSize: 12, color: T.textMuted }}>
        عرض {from}–{to} من {total} نتيجة
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Button variant="secondary" size="sm" disabled={page === 1}          onClick={() => onPage(page - 1)}>السابق</Button>
        <span style={{ fontSize: 12, padding: '6px 12px', color: T.textSecond, fontFamily: 'monospace' }}>
          {page} / {totalPages}
        </span>
        <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => onPage(page + 1)}>التالي</Button>
      </div>
    </div>
  )
}

// ── Mobile skeleton ───────────────────────────────────────────────────────────
function MobileCardSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} padding="14px 16px" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 14, width: 120, borderRadius: 4, background: T.borderSoft, animation: `sk-pulse 1.5s ease-in-out ${i * 0.07}s infinite` }} />
              <div style={{ height: 11, width: 90,  borderRadius: 4, background: T.borderSoft, animation: `sk-pulse 1.5s ease-in-out ${i * 0.07}s infinite` }} />
            </div>
            <div style={{ height: 22, width: 72, borderRadius: 20, background: T.borderSoft, animation: `sk-pulse 1.5s ease-in-out ${i * 0.07}s infinite` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ height: 12, width: 100, borderRadius: 4, background: T.borderSoft, animation: `sk-pulse 1.5s ease-in-out ${i * 0.07}s infinite` }} />
            <div style={{ height: 14, width: 60,  borderRadius: 4, background: T.borderSoft, animation: `sk-pulse 1.5s ease-in-out ${i * 0.07}s infinite` }} />
          </div>
        </Card>
      ))}
    </>
  )
}

// ── Mobile order card ─────────────────────────────────────────────────────────
function MobileOrderCard({ order, expanded, onExpand, moduleKey, onUpdate, color, currency }) {
  return (
    <Card padding="14px 16px" style={{ marginBottom: 10 }}>
      {/* Top: customer + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>
            {order.customer_name || '—'}
          </div>
          {order.customer_phone && (
            <div style={{ fontSize: 11, color: T.textMuted, direction: 'ltr', marginTop: 2 }}>
              {order.customer_phone}
            </div>
          )}
        </div>
        <StatusCell order={order} moduleKey={moduleKey} onUpdate={onUpdate} />
      </div>

      {/* Bottom: date + total + expand */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: T.textMuted }}>
          {fmtDate(order.created_at)}{order.created_at ? ` · ${fmtTime(order.created_at)}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, color, fontSize: 14, whiteSpace: 'nowrap' }}>
            {fmtPrice(order.total_price, currency)}
          </span>
          <button
            onClick={onExpand}
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: expanded ? `${color}22` : T.pageBg,
              border: `1px solid ${expanded ? `${color}44` : T.border}`,
              color: expanded ? color : T.textMuted,
              cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Expanded: items + extra fields */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
          {order.items?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textSecond, marginBottom: 4 }}>
                  <span>× {item.quantity} عنصر</span>
                  <span>{fmtPrice(item.unit_price, currency)}</span>
                </div>
              ))}
            </div>
          )}
          {order.table_number    && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>طاولة: {order.table_number}</div>}
          {order.payment_method  && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>الدفع: {order.payment_method}</div>}
          {order.notes           && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>ملاحظة: {order.notes}</div>}
          {order.shipping_address && (
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
              الشحن: {typeof order.shipping_address === 'object'
                ? Object.values(order.shipping_address).filter(Boolean).join('، ')
                : order.shipping_address}
            </div>
          )}
        </div>
      )}
    </Card>
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
              <div style={{ height: 14, width: w, borderRadius: 4, background: T.borderSoft, animation: 'sk-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
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
 *   activeServices  string[]  — the tenant's real active service keys (TOS-004, Capability
 *                               Resolution Layer) — not a collapsed single moduleKey
 *   color           tenant primary_color
 *   currency        e.g. 'USD'
 */
export default function OrdersTab({ activeServices, color, currency = 'USD' }) {
  // Which single order-bearing capability this tenant has, if any -- no real tenant has both
  // Restaurant and Store/Catalog active at once today (Module Resolution Review, 2026-07-28);
  // see CAPABILITY_RESOLUTION_PLAN.md's explicit Non-Goal on inventing merge behavior with zero
  // real examples to design against. `orderEndpoint` below is passed to StatusCell/MobileOrderCard
  // as their own `moduleKey` prop unchanged -- those describe which type is currently being
  // rendered in this one tab instance, a legitimate local concept, not the tenant-wide collapse
  // this migration retires.
  const orderEndpoint = hasCapability(activeServices, 'restaurant') ? 'restaurant'
    : hasCapability(activeServices, 'store') ? 'store'
    : null
  const [orders,       setOrders]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search,       setSearch]       = useState('')
  const [sortCol,      setSortCol]      = useState('date')
  const [sortDir,      setSortDir]      = useState('desc')
  const [page,         setPage]         = useState(1)
  const [expandedId,   setExpandedId]   = useState(null)
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth < 768)
  const mountedRef = useRef(true)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // mountedRef must be reset to true in the effect's setup, not just useRef(true)'s
  // initializer -- see useCatalog.js / .claude/memory.md (2026-07-21) for the real
  // StrictMode double-invoke bug this guards against.
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (!orderEndpoint) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await adminApi.get(`/${orderEndpoint}/orders`)
      const raw = res?.data?.data ?? res?.data ?? []
      if (mountedRef.current) setOrders(Array.isArray(raw) ? raw : [])
    } catch {
      if (mountedRef.current) setOrders([])
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [orderEndpoint])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (orderId, newStatus) => {
    await adminApi.patch(`/${orderEndpoint}/orders/${orderId}/status`, { status: newStatus })
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }, [orderEndpoint])

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
  const statuses     = MODULE_STATUSES[orderEndpoint] ?? []

  // reset page when filter changes
  useEffect(() => { setPage(1) }, [statusFilter, search])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ direction: 'rtl', fontFamily: FONT }}>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: isMobile ? 'nowrap' : 'wrap', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* Search + Refresh row on mobile */}
        <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            style={{ ...inputStyle, flex: 1, minWidth: 0, maxWidth: isMobile ? '100%' : 280 }}
          />
          <Button variant="secondary" color={color} onClick={loadOrders} style={{ flexShrink: 0 }}>↻</Button>
        </div>

        {/* Status pills — scrollable on mobile */}
        <div style={{
          display: 'flex', gap: 6,
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          overflowX: isMobile ? 'auto' : 'visible',
          width: isMobile ? '100%' : 'auto',
          paddingBottom: isMobile ? 4 : 0,
          scrollbarWidth: 'none',
        }}>
          {['all', ...statuses].map(s => {
            const active = statusFilter === s
            const m = STATUS_META[s]
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT,
                  flexShrink: 0,
                  background: active ? (m?.bg ?? `${color}22`) : T.cardBg,
                  color:      active ? (m?.color ?? color)     : T.textSecond,
                  border: `1px solid ${active ? (m?.color ?? color) + '55' : T.border}`,
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
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

        {/* Refresh on desktop */}
        {!isMobile && (
          <Button variant="secondary" color={color} onClick={loadOrders} style={{ marginRight: 'auto' }}>تحديث</Button>
        )}
      </div>

      {/* ── Results count ──────────────────────────────────────────── */}
      {!loading && (
        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 12 }}>
          {filteredOrders.length} طلب{search || statusFilter !== 'all' ? ' (بعد الفلترة)' : ''}
        </div>
      )}

      {/* ── Orders list — cards on mobile, table on desktop ──────── */}
      {isMobile ? (
        /* Mobile: card list */
        <div>
          {loading ? (
            <MobileCardSkeleton rows={5} />
          ) : pagedOrders.length === 0 ? (
            <Card>
              <EmptyState message={orders.length === 0 ? 'لا توجد طلبات بعد' : 'لا توجد نتائج تطابق الفلتر'} style={{ padding: 0 }} />
            </Card>
          ) : (
            pagedOrders.map(order => (
              <MobileOrderCard
                key={order.id}
                order={order}
                expanded={expandedId === order.id}
                onExpand={() => setExpandedId(expandedId === order.id ? null : order.id)}
                moduleKey={orderEndpoint}
                onUpdate={handleStatusChange}
                color={color}
                currency={currency}
              />
            ))
          )}
        </div>
      ) : (
        /* Desktop: table */
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
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
                    <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
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
                      <Fragment key={order.id}>
                        <tr
                          style={{
                            background: expanded ? T.pageBg : 'transparent',
                            transition: 'background 0.15s',
                          }}
                        >
                          <td style={{ ...tdStyle, color: T.textMuted, fontSize: 11, width: 36 }}>{rowNum}</td>

                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: T.textPrimary }}>{order.customer_name || '—'}</div>
                            {order.customer_phone && (
                              <div style={{ fontSize: 11, color: T.textMuted, direction: 'ltr', textAlign: 'right' }}>
                                {order.customer_phone}
                              </div>
                            )}
                          </td>

                          <td style={tdStyle}>
                            <div style={{ fontSize: 12, color: T.textSecond }}>{fmtDate(order.created_at)}</div>
                            <div style={{ fontSize: 10, color: T.textMuted }}>{fmtTime(order.created_at)}</div>
                          </td>

                          <td style={tdStyle}>
                            <StatusCell order={order} moduleKey={orderEndpoint} onUpdate={handleStatusChange} />
                          </td>

                          <td style={{ ...tdStyle, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
                            {fmtPrice(order.total_price, currency)}
                          </td>

                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            {order.items?.length > 0 && (
                              <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 10,
                                background: T.pageBg,
                                color: T.textSecond,
                              }}>
                                {order.items.length}
                              </span>
                            )}
                          </td>

                          <td style={{ ...tdStyle, textAlign: 'center', width: 32 }}>
                            <button
                              onClick={() => setExpandedId(expanded ? null : order.id)}
                              style={{
                                width: 26, height: 26, borderRadius: 6,
                                background: expanded ? `${color}22` : T.pageBg,
                                border: `1px solid ${expanded ? `${color}44` : T.border}`,
                                color: expanded ? color : T.textMuted,
                                cursor: 'pointer', fontSize: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              {expanded ? '▲' : '▼'}
                            </button>
                          </td>
                        </tr>

                        {expanded && (
                          <ExpandedRow order={order} colSpan={7} currency={currency} />
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              )}
            </table>
          </div>
        </Card>
      )}

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
