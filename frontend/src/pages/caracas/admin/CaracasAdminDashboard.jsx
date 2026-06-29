import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import adminApi from '../../../utils/admin.config';
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
  textPri:   '#f0ebe3',
  textMuted: '#6b6b80',
  accent:    '#c0392b',
  accentDim: 'rgba(192,57,43,0.12)',
  gold:      '#e8b86d',
  green:     '#3ecf8e',
  greenDim:  'rgba(62,207,142,0.12)',
  amber:     '#fbbf24',
  amberDim:  'rgba(251,191,36,0.10)',
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.12)',
};

const ORDER_STATUS_STYLE = {
  pending:   { fg: C.amber,  bg: C.amberDim  },
  preparing: { fg: '#60a5fa', bg: 'rgba(96,165,250,0.10)' },
  ready:     { fg: C.green,  bg: C.greenDim  },
  delivered: { fg: C.textMuted, bg: 'rgba(107,107,128,0.10)' },
  cancelled: { fg: C.red,    bg: C.redDim    },
};

const TABS = [
  { key: 'orders', label: 'الطلبات' },
  { key: 'menu',   label: 'القائمة' },
  { key: 'stats',  label: 'الإحصائيات' },
];

export default function CaracasAdminDashboard() {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="min-h-screen p-6" style={{ background: C.bg, color: C.textPri }}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p style={{ ...typography.eyebrow, color: C.accent }}>لوحة التحكم</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">كاراكاس</h1>
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
          {activeTab === 'orders' && <OrdersTab C={C} statusStyle={ORDER_STATUS_STYLE} />}
          {activeTab === 'menu'   && <MenuTab C={C} />}
          {activeTab === 'stats'  && <StatsTab C={C} />}
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
    adminApi.get('/restaurant/orders')
      .then(({ data }) => { if (data.success) setOrders(data.data); })
      .finally(() => { setLoading(false); setLoaded(true); });
  }

  async function updateStatus(orderId, status) {
    await adminApi.patch(`/restaurant/orders/${orderId}/status`, { status });
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
  }

  const STATUSES = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];

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
                  <p className="mt-0.5 text-xs" style={{ color: C.textMuted }}>
                    {order.customer_phone}{order.table_number ? ` — طاولة ${order.table_number}` : ''}
                  </p>
                  <p className="mt-1 text-xs font-bold" style={{ color: C.gold }}>
                    {Number(order.total_price).toLocaleString()} {order.currency}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: s.bg, borderColor: s.fg, color: s.fg }}>
                  {order.status}
                </span>
              </div>
              {/* Status actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUSES.filter((s) => s !== order.status).map((s) => (
                  <button key={s} onClick={() => updateStatus(order.id, s)}
                    className="rounded px-3 py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.textMuted }}>
                    {s}
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

// ── Menu tab ───────────────────────────────────────────────────────────────────
function MenuTab({ C }) {
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);

  function load() {
    adminApi.get('/restaurant/menu/categories')
      .then(({ data }) => { if (data.success) { setCategories(data.data); setLoaded(true); } });
  }

  return (
    <div>
      {!loaded && (
        <Button variant="ghost" onClick={load} style={{ borderColor: C.accent, color: C.accent }}>
          تحميل القائمة
        </Button>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((cat) => (
          <GlassCard key={cat.id} className="p-4">
            <p className="font-bold text-sm" style={{ color: C.textPri }}>{cat.name_ar || cat.nameAr}</p>
            {cat.name_en && <p className="mt-0.5 text-xs" style={{ color: C.textMuted }}>{cat.name_en}</p>}
            <Badge variant={cat.is_active ? 'available' : 'booked'} className="mt-2">
              {cat.is_active ? 'نشط' : 'مخفي'}
            </Badge>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ── Stats tab ──────────────────────────────────────────────────────────────────
function StatsTab({ C }) {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    adminApi.get('/restaurant/orders/stats')
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
          <StatCard label="طلبات اليوم" value={stats.today_total_orders}                  C={C} />
          <StatCard label="الإيرادات"   value={`${stats.today_revenue?.toFixed(0)} ${stats.currency}`} C={C} accent />
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
      <p className="text-2xl font-black" style={{ color: accent ? C.gold : C.textPri }}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest" style={{ color: C.textMuted }}>{label}</p>
    </GlassCard>
  );
}
