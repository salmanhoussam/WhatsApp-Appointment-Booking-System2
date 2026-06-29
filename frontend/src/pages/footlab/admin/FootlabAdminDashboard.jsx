import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import adminApi  from '../../../utils/admin.config';
import GlassCard from '../../../design-system/atoms/GlassCard';
import Button    from '../../../design-system/atoms/Button';
import Badge     from '../../../design-system/atoms/Badge';
import { spring, typography } from '../../../design-system/tokens';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:        '#0a0a0f',
  surface:   '#12121a',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.14)',
  textPri:   '#e8e8f0',
  textMuted: '#6b6b80',
  accent:    '#6c63ff',
  accentDim: 'rgba(108,99,255,0.12)',
  green:     '#3ecf8e',
  greenDim:  'rgba(62,207,142,0.12)',
  amber:     '#fbbf24',
  amberDim:  'rgba(251,191,36,0.10)',
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.12)',
};

const ORDER_STATUS_STYLE = {
  pending:    { fg: C.amber,    bg: C.amberDim  },
  processing: { fg: '#60a5fa',  bg: 'rgba(96,165,250,0.10)' },
  shipped:    { fg: '#a78bfa',  bg: 'rgba(167,139,250,0.10)' },
  delivered:  { fg: C.green,    bg: C.greenDim  },
  cancelled:  { fg: C.red,      bg: C.redDim    },
  refunded:   { fg: C.textMuted, bg: 'rgba(107,107,128,0.10)' },
};

const TABS = [
  { key: 'orders',   label: 'الطلبات'  },
  { key: 'products', label: 'المنتجات' },
  { key: 'stats',    label: 'الإحصائيات' },
];

function getName(field) {
  if (!field) return '';
  if (typeof field === 'object') return field.ar || field.en || '';
  return String(field);
}

export default function FootlabAdminDashboard() {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="min-h-screen p-6" style={{ background: C.bg, color: C.textPri }}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p style={{ ...typography.eyebrow, color: C.accent }}>لوحة التحكم</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Footlab Store</h1>
        </div>
        <div className="h-8 w-8 rounded-full" style={{ background: C.accent, boxShadow: `0 0 18px ${C.accentDim}` }} />
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-2">
        {TABS.map(({ key, label }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}
            onClick={() => setActiveTab(key)}
            className="rounded-lg px-5 py-2.5 text-xs font-semibold tracking-widest uppercase transition-all"
            style={{
              background:  activeTab === key ? C.accent : 'rgba(255,255,255,0.04)',
              border:      `1px solid ${activeTab === key ? C.accent : C.border}`,
              color:       activeTab === key ? '#fff' : C.textMuted,
            }}
          >
            {label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.smooth}>
          {activeTab === 'orders'   && <OrdersTab C={C} statusStyle={ORDER_STATUS_STYLE} />}
          {activeTab === 'products' && <ProductsTab C={C} />}
          {activeTab === 'stats'    && <StatsTab C={C} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Orders tab ─────────────────────────────────────────────────────────────────
function OrdersTab({ C, statusStyle }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  function load() {
    setLoading(true);
    adminApi.get('/store/orders')
      .then(({ data }) => { if (data.success) setOrders(data.data); })
      .finally(() => { setLoading(false); setLoaded(true); });
  }

  async function updateStatus(orderId, status) {
    await adminApi.patch(`/store/orders/${orderId}/status`, { status });
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
  }

  const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

  return (
    <div>
      {!loaded && (
        <Button variant="ghost" onClick={load} style={{ borderColor: C.accent, color: C.accent }}>
          {loading ? 'جاري التحميل...' : 'تحميل الطلبات'}
        </Button>
      )}
      <div className="mt-4 flex flex-col gap-3">
        {orders.map((order) => {
          const s = statusStyle[order.status] || { fg: C.textMuted, bg: 'rgba(255,255,255,0.05)' };
          return (
            <GlassCard key={order.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: C.textPri }}>{order.customer_name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: C.textMuted }}>{order.customer_phone || order.customer_email}</p>
                  <p className="mt-1 text-sm font-black" style={{ color: C.accent }}>${order.total_price}</p>
                </div>
                <span className="shrink-0 rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: s.bg, borderColor: s.fg, color: s.fg }}>
                  {order.status}
                </span>
              </div>
              <p className="mt-1 text-[10px]" style={{ color: C.textMuted }}>
                {new Date(order.created_at).toLocaleString('ar')}
              </p>
              {/* Status actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUSES.filter((st) => st !== order.status).map((st) => (
                  <button key={st} onClick={() => updateStatus(order.id, st)}
                    className="rounded px-3 py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.textMuted }}>
                    {st}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ── Products tab ───────────────────────────────────────────────────────────────
function ProductsTab({ C }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    adminApi.get('/store/products')
      .then(({ data }) => { if (data.success) setProducts(data.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm" style={{ color: C.textMuted }}>جاري التحميل...</div>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <GlassCard key={p.id} className="overflow-hidden p-0">
          {p.image_url ? (
            <img src={p.image_url} alt={getName(p.name)} className="h-28 w-full object-cover" />
          ) : (
            <div className="flex h-28 items-center justify-center text-3xl" style={{ background: C.accentDim }}>⚽</div>
          )}
          <div className="p-3">
            <p className="truncate text-xs font-bold" style={{ color: C.textPri }}>{getName(p.name)}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-black" style={{ color: C.accent }}>${p.price}</span>
              <Badge variant={p.is_active ? 'available' : 'booked'}>
                {p.is_active ? 'نشط' : 'مخفي'}
              </Badge>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ── Stats tab ──────────────────────────────────────────────────────────────────
function StatsTab({ C }) {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    adminApi.get('/store/orders/stats')
      .then(({ data }) => { if (data.success) setStats(data.data); })
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <Button variant="ghost" onClick={load} style={{ borderColor: C.accent, color: C.accent }}>
        {loading ? 'جاري...' : 'تحديث'}
      </Button>

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="طلبات اليوم" value={stats.today_total_orders}                     C={C} />
          <StatCard label="الإيرادات"   value={`$${stats.today_revenue?.toFixed(2)}`}        C={C} accent />
          {Object.entries(stats.by_status || {}).map(([s, v]) => (
            <StatCard key={s} label={s} value={`${v.count} طلب`} C={C} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, C, accent }) {
  return (
    <GlassCard className="p-5" goldAccent={!!accent}>
      <p className="text-2xl font-black" style={{ color: accent ? C.accent : C.textPri }}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest" style={{ color: C.textMuted }}>{label}</p>
    </GlassCard>
  );
}
