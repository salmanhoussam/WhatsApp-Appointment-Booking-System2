import { useState, useEffect, useMemo, useCallback, useRef, Component } from 'react'
import { motion }       from 'framer-motion'
import adminApi         from '../../../utils/admin.config'
import { hasCapability, hasOrderCapability } from '../../../utils/capabilities'
import StatCard         from '../components/StatCard'
import ActivityFeed    from '../components/ActivityFeed'
import TopItemsWidget  from '../components/TopItemsWidget'
import { T, FONT } from '../theme'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'

// ── ErrorBoundary ──────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(err) { return { error: err } }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: T.dangerSoft, border: `1px solid ${T.danger}33`,
          borderRadius: 12, padding: '18px 20px',
          color: T.danger, fontSize: 12, textAlign: 'center',
        }}>
          خطأ في تحميل المكوّن
        </div>
      )
    }
    return this.props.children
  }
}
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'

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

// Arabic weekday abbreviations
const AR_DAYS = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت']

function buildRevenueSeries(orders) {
  const map = {}
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toDateString()
    map[key] = { label: AR_DAYS[d.getDay()], revenue: 0, count: 0 }
  }
  orders.forEach(o => {
    const key = new Date(o.created_at ?? o.createdAt).toDateString()
    if (map[key]) {
      map[key].revenue += Number(o.total_price) || 0
      map[key].count   += 1
    }
  })
  return Object.values(map)
}

function buildDonutData(orders) {
  const pending   = orders.filter(o => o.status === 'pending').length
  const completed = orders.filter(o => ['delivered', 'completed', 'confirmed'].includes(o.status)).length
  const cancelled = orders.filter(o => o.status === 'cancelled').length
  const other     = orders.length - pending - completed - cancelled
  const data = []
  if (pending   > 0) data.push({ name: 'معلّقة',   value: pending,   color: '#f59e0b' })
  if (completed > 0) data.push({ name: 'مكتملة',   value: completed, color: '#10b981' })
  if (cancelled > 0) data.push({ name: 'ملغاة',    value: cancelled, color: '#ef4444' })
  if (other     > 0) data.push({ name: 'أخرى',     value: other,     color: '#6366f1' })
  return data
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

// Framer Motion presets
const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0,  transition: { type: 'spring', stiffness: 220, damping: 22 } },
}

// ── Custom Recharts Tooltip ────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: T.cardBg,
      border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '10px 14px',
      fontSize: 12, color: T.textPrimary,
      boxShadow: T.shadowLg,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ color: T.textSecond }}>
        الإيرادات: <span style={{ color: payload[0]?.color, fontWeight: 700 }}>
          {Number(payload[0]?.value || 0).toLocaleString('ar-SA')} {currency}
        </span>
      </div>
      {payload[0]?.payload?.count > 0 && (
        <div style={{ color: T.textMuted, marginTop: 2 }}>
          {payload[0].payload.count} طلب
        </div>
      )}
    </div>
  )
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: T.cardBg,
      border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '9px 13px',
      fontSize: 12, color: T.textPrimary,
      boxShadow: T.shadowLg,
    }}>
      <span style={{ color: payload[0]?.payload?.color, fontWeight: 700 }}>
        {payload[0]?.name}
      </span>
      {' — '}
      <span>{payload[0]?.value} طلب</span>
    </div>
  )
}

// ── RevenueChart ───────────────────────────────────────────────────────────────

function RevenueChart({ orders, color, currency }) {
  const data = useMemo(() => buildRevenueSeries(orders), [orders])
  const hasData = orders.length > 0

  return (
    <motion.div
      variants={CARD_VARIANTS}
      style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        boxShadow: T.shadow,
        borderRadius: 14, padding: '18px 20px',
        minHeight: 200, minWidth: 0,
      }}
    >
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: T.textSecond,
        marginBottom: 16, direction: 'rtl',
      }}>
        الإيرادات — آخر 7 أيام
      </div>

      {!hasData ? (
        <EmptyState message="لا توجد طلبات بعد" style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} />
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id={`lineGrad-${color.replace('#','')}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={1}   />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke={T.borderSoft}
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: T.textMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: T.textMuted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v === 0 ? '0' : `${Number(v).toLocaleString('ar-SA')}`}
            />
            <Tooltip
              content={<RevenueTooltip currency={currency} />}
              cursor={{ stroke: T.border, strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={`url(#lineGrad-${color.replace('#','')})`}
              strokeWidth={2.5}
              dot={{ fill: color, r: 3, strokeWidth: 0 }}
              activeDot={{ fill: color, r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}

// ── StatusDonut ────────────────────────────────────────────────────────────────

function StatusDonut({ orders, color }) {
  const data  = useMemo(() => buildDonutData(orders), [orders])
  const total = orders.length

  return (
    <motion.div
      variants={CARD_VARIANTS}
      style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        boxShadow: T.shadow,
        borderRadius: 14, padding: '18px 20px',
        minHeight: 200, minWidth: 0,
      }}
    >
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: T.textSecond,
        marginBottom: 16, direction: 'rtl',
      }}>
        توزيع الطلبات
      </div>

      {total === 0 ? (
        <EmptyState message="لا توجد طلبات بعد" style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Donut */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={58}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: T.textPrimary, lineHeight: 1 }}>
                {total}
              </span>
              <span style={{ fontSize: 9, color: T.textMuted, marginTop: 2 }}>
                إجمالي
              </span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, direction: 'rtl' }}>
            {data.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: entry.color, flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, color: T.textSecond }}>
                  {entry.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: entry.color }}>
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── RecentOrders ───────────────────────────────────────────────────────────────

function RecentOrders({ orders, color, currency }) {
  const recent = [...orders]
    .sort((a, b) => new Date(b.created_at ?? b.createdAt) - new Date(a.created_at ?? a.createdAt))
    .slice(0, 5)

  return (
    <div style={{
      background: T.cardBg,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadow,
      borderRadius: 14, padding: '18px 20px', minWidth: 0,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.textSecond, marginBottom: 14 }}>
        آخر الطلبات
      </div>
      {recent.length === 0 ? (
        <EmptyState message="لا توجد طلبات بعد" style={{ padding: '24px 0' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {recent.map(o => {
            const sc = STATUS_COLORS[o.status] ?? '#6366f1'
            return (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px',
                background: T.pageBg,
                borderRadius: 9,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                    {o.customer_name ?? `#${o.order_number ?? String(o.id).slice(-6)}`}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
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
      background: T.cardBg,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadow,
      borderRadius: 14, padding: '18px 20px', minWidth: 0,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.textSecond, marginBottom: 14 }}>
        من الكتالوج
      </div>
      {loading ? (
        <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>جاري التحميل...</p>
      ) : items.length === 0 ? (
        <EmptyState message="لا توجد منتجات بعد" style={{ padding: '24px 0' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 12px',
              background: T.pageBg,
              borderRadius: 9,
            }}>
              {item.image_url
                ? <img src={item.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, flexShrink: 0 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name_ar}
                </div>
                {item.category_name && (
                  <div style={{ fontSize: 11, color: T.textMuted }}>{item.category_name}</div>
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
 *   activeServices  string[]  — the tenant's real active service keys (TOS-004, Capability
 *                               Resolution Layer) — not a collapsed single moduleKey
 *   hasReservations boolean
 *   currency        string
 */
export default function OverviewTab({ color, activeServices, hasReservations, currency = 'USD' }) {
  // Which single order-bearing capability this tenant has, if any -- no real tenant has both
  // Restaurant and Store/Catalog active at once today (Module Resolution Review, 2026-07-28), so
  // this resolves to one endpoint rather than merging; see CAPABILITY_RESOLUTION_PLAN.md's
  // explicit Non-Goal on inventing merge behavior with zero real examples to design against.
  const orderEndpoint = hasCapability(activeServices, 'restaurant') ? 'restaurant'
    : hasCapability(activeServices, 'store') ? 'store'
    : null
  const [orders,        setOrders]        = useState([])
  const [resStats,      setResStats]      = useState(null)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [statsLoading,  setStatsLoading]  = useState(true)
  const [isMobile,      setIsMobile]      = useState(() => window.innerWidth < 768)

  // Catalog data — used for stat cards + bottom panel
  const [catalogCats,    setCatalogCats]    = useState([])
  const [catalogItems,   setCatalogItems]   = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  // mountedRef must be reset to true in the effect's setup, not just useRef(true)'s
  // initializer -- see useCatalog.js / .claude/memory.md (2026-07-21) for the real
  // StrictMode double-invoke bug this guards against.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // ── Derived order stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const os  = computeOrderStats(orders)
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
    if (!orderEndpoint) {
      if (mountedRef.current) { setOrders([]); setOrdersLoading(false) }
      return
    }
    setOrdersLoading(true)
    try {
      const res = await adminApi.get(`/${orderEndpoint}/orders`)
      const raw = res?.data?.data ?? res?.data ?? []
      if (mountedRef.current) setOrders(Array.isArray(raw) ? raw : [])
    } catch {
      if (mountedRef.current) setOrders([])
    } finally {
      if (mountedRef.current) setOrdersLoading(false)
    }
  }, [orderEndpoint])

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

  const orderStatsLoading = ordersLoading || statsLoading
  const hasOrders = hasOrderCapability(activeServices)

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

      {/* ── Charts — restaurant / store only ───────────────────────────── */}
      {hasOrders && !ordersLoading && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          <RevenueChart orders={orders} color={color} currency={currency} />
          <StatusDonut  orders={orders} color={color} />
        </motion.div>
      )}

      {/* ── Activity Feed + Top Items ───────────────────────────────────── */}
      {hasOrders && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr',
          gap: 14,
        }}>
          <ErrorBoundary>
            <ActivityFeed
              orders={orders}
              hasReservations={hasReservations}
              color={color}
              onRequestRefresh={loadOrders}
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <TopItemsWidget
              orders={orders}
              loading={ordersLoading}
              color={color}
            />
          </ErrorBoundary>
        </div>
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
