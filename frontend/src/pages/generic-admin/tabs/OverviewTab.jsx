import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import adminApi   from '../../../utils/admin.config'
import StatCard   from '../components/StatCard'
import KanbanBoard from '../components/KanbanBoard'

// ── Icons ──────────────────────────────────────────────────────────────────────

function IcBag({ color }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  )
}

function IcCoins({ color }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6"/>
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
      <path d="M7 6h1v4"/>
      <path d="M16.71 13.88 17.7 14.9l-1 1.02"/>
    </svg>
  )
}

function IcClock({ color }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function IcCheck({ color }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

function IcLayers({ color }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  )
}

function IcBox({ color }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function computeOrderStats(orders) {
  const todayStr = new Date().toDateString()
  const todayOrders = orders.filter(o =>
    new Date(o.created_at ?? o.createdAt).toDateString() === todayStr
  )
  return {
    todayCount:   todayOrders.length,
    todayRevenue: todayOrders.reduce((s, o) => s + (Number(o.total_price) || 0), 0),
    pending:      orders.filter(o => o.status === 'pending').length,
    completed:    orders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
  }
}

function fmt(n, currency) {
  if (n == null) return '—'
  const localized = Number(n).toLocaleString('ar-SA')
  return currency ? `${localized} ${currency}` : localized
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'الآن'
  if (mins < 60) return `منذ ${mins} د`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} س`
  return `منذ ${Math.floor(hours / 24)} ي`
}

const STATUS_COLORS = {
  pending:    '#f59e0b',
  preparing:  '#3b82f6',
  processing: '#3b82f6',
  ready:      '#8b5cf6',
  shipped:    '#8b5cf6',
  delivered:  '#10b981',
  completed:  '#10b981',
  refunded:   '#6366f1',
  cancelled:  '#ef4444',
}
const STATUS_LABELS = {
  pending: 'معلّق', preparing: 'قيد التحضير', processing: 'قيد المعالجة',
  ready: 'جاهز', shipped: 'شُحن', delivered: 'مُسلَّم',
  completed: 'مكتمل', refunded: 'مسترد', cancelled: 'ملغي',
}

// ── RecentOrders ───────────────────────────────────────────────────────────────

function RecentOrders({ orders, color, currency }) {
  const recent = [...orders]
    .sort((a, b) => new Date(b.created_at ?? b.createdAt) - new Date(a.created_at ?? a.createdAt))
    .slice(0, 5)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
        آخر الطلبات
      </div>
      {recent.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: '24px 0' }}>
          لا توجد طلبات بعد
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {recent.map(o => {
            const sc = STATUS_COLORS[o.status] ?? '#6366f1'
            return (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px',
                background: 'rgba(255,255,255,0.025)',
                borderRadius: 9,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {o.customer_name ?? `#${o.order_number ?? String(o.id).slice(-6)}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {timeAgo(o.created_at ?? o.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {o.total_price != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>
                      {Number(o.total_price).toFixed(2)} {currency}
                    </span>
                  )}
                  <span style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 20,
                    background: `${sc}18`, color: sc, fontWeight: 600,
                  }}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TopCatalogItems ────────────────────────────────────────────────────────────

function TopCatalogItems({ items, loading, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
        من الكتالوج
      </div>
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, margin: 0 }}>جاري التحميل...</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: '24px 0' }}>
          لا توجد منتجات بعد
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 12px',
              background: 'rgba(255,255,255,0.025)',
              borderRadius: 9,
            }}>
              {item.image_url
                ? <img src={item.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, flexShrink: 0 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name_ar}
                </div>
                {item.category_name && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{item.category_name}</div>
                )}
              </div>
              {item.price != null && (
                <div style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
                  {item.price} {item.currency}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── OverviewTab ────────────────────────────────────────────────────────────────
/**
 * Props:
 *   color           string    — tenant primary_color
 *   moduleKey       string    — 'restaurant' | 'store' | 'catalog'
 *   hasReservations boolean
 *   currency        string
 */
export default function OverviewTab({ color, moduleKey, hasReservations, currency = 'USD' }) {
  const [orders,        setOrders]       = useState([])
  const [resStats,      setResStats]     = useState(null)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [statsLoading,  setStatsLoading]  = useState(true)

  // Catalog data — used for stat cards + bottom panel
  const [catalogCats,    setCatalogCats]    = useState([])
  const [catalogItems,   setCatalogItems]   = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // ── Derived order stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const os = computeOrderStats(orders)
    const byS = resStats?.by_status ?? {}
    return {
      todayCount:   os.todayCount   + (resStats?.today_total ?? 0),
      todayRevenue: os.todayRevenue,
      pending:      os.pending      + (byS.pending   ?? 0),
      completed:    os.completed    + (byS.confirmed ?? 0) + (byS.arrived ?? 0),
    }
  }, [orders, resStats])

  // ── Fetch orders ───────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (moduleKey !== 'restaurant' && moduleKey !== 'store') {
      if (mountedRef.current) { setOrders([]); setOrdersLoading(false) }
      return
    }
    setOrdersLoading(true)
    try {
      const res = await adminApi.get(`/${moduleKey}/orders`)
      const raw = res?.data?.data ?? res?.data ?? []
      if (mountedRef.current) setOrders(Array.isArray(raw) ? raw : [])
    } catch {
      if (mountedRef.current) setOrders([])
    } finally {
      if (mountedRef.current) setOrdersLoading(false)
    }
  }, [moduleKey])

  // ── Fetch reservation stats ────────────────────────────────────────────────
  const loadResStats = useCallback(async () => {
    if (!hasReservations) {
      if (mountedRef.current) { setResStats(null); setStatsLoading(false) }
      return
    }
    setStatsLoading(true)
    try {
      const res = await adminApi.get('/reservations/stats')
      if (mountedRef.current) setResStats(res?.data?.data ?? null)
    } catch {
      if (mountedRef.current) setResStats(null)
    } finally {
      if (mountedRef.current) setStatsLoading(false)
    }
  }, [hasReservations])

  // ── Fetch catalog data ─────────────────────────────────────────────────────
  useEffect(() => {
    setCatalogLoading(true)
    Promise.all([
      adminApi.get('/catalog/categories').then(r => r.data.data ?? []),
      adminApi.get('/catalog/items').then(r => r.data.data ?? []),
    ])
      .then(([cats, items]) => {
        if (mountedRef.current) {
          setCatalogCats(cats)
          setCatalogItems(items)
        }
      })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setCatalogLoading(false) })
  }, [])

  useEffect(() => {
    loadOrders()
    loadResStats()
  }, [loadOrders, loadResStats])

  // ── Status change handler (KanbanBoard) ────────────────────────────────────
  const handleStatusChange = useCallback(async (orderId, newStatus) => {
    await adminApi.patch(`/${moduleKey}/orders/${orderId}/status`, { status: newStatus })
    await loadOrders()
  }, [moduleKey, loadOrders])

  const orderStatsLoading = ordersLoading || statsLoading
  const hasOrders = moduleKey === 'restaurant' || moduleKey === 'store'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
        gap: 14,
      }}>
        {/* Order stats — restaurant / store only */}
        {hasOrders && (
          <>
            <StatCard
              label="طلبات اليوم"
              value={orderStatsLoading ? null : fmt(stats.todayCount)}
              icon={<IcBag color={color} />}
              color={color}
              isLoading={orderStatsLoading}
            />
            <StatCard
              label="الإيرادات اليوم"
              value={orderStatsLoading ? null : fmt(Math.round(stats.todayRevenue), currency)}
              icon={<IcCoins color={color} />}
              color={color}
              isLoading={orderStatsLoading}
            />
            <StatCard
              label="معلّقة"
              value={orderStatsLoading ? null : fmt(stats.pending)}
              icon={<IcClock color={color} />}
              color={color}
              isLoading={orderStatsLoading}
            />
            <StatCard
              label="مكتملة"
              value={orderStatsLoading ? null : fmt(stats.completed)}
              icon={<IcCheck color={color} />}
              color={color}
              isLoading={orderStatsLoading}
            />
          </>
        )}

        {/* Catalog stats — always shown */}
        <StatCard
          label="الأقسام"
          value={catalogLoading ? null : fmt(catalogCats.length)}
          icon={<IcLayers color={color} />}
          color={color}
          isLoading={catalogLoading}
        />
        <StatCard
          label="المنتجات"
          value={catalogLoading ? null : fmt(catalogItems.length)}
          icon={<IcBox color={color} />}
          color={color}
          isLoading={catalogLoading}
        />
      </div>

      {/* ── Kanban board — restaurant / store only ─────────────────────── */}
      {hasOrders && (
        <KanbanBoard
          moduleKey={moduleKey}
          color={color}
          currency={currency}
          orders={orders}
          onStatusChange={handleStatusChange}
          isLoading={ordersLoading}
          onRefresh={loadOrders}
        />
      )}

      {/* ── Bottom panels ──────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: hasOrders ? '1fr 1fr' : '1fr',
        gap: 14,
      }}>
        {hasOrders && (
          <RecentOrders orders={orders} color={color} currency={currency} />
        )}
        <TopCatalogItems
          items={catalogItems.slice(0, 5)}
          loading={catalogLoading}
          color={color}
        />
      </div>
    </div>
  )
}
