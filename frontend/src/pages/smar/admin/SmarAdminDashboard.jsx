/**
 * SmarAdminDashboard.jsx
 *
 * Premium dark-theme admin panel for the smar tenant.
 * Fetches bookings from GET /api/v1/admin/bookings/
 * Updates status via PATCH /api/v1/admin/bookings/{id}/status
 *
 * Auth: Bearer token from localStorage('admin_access_token')
 * Tenant: client_slug=smar (injected by adminApi interceptor)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import adminApi from '../../../utils/admin.config';
import { getTenantSlug } from '../../../utils/tenant.config';
import UnitCalendar from '../../../components/UnitCalendar';
import UnitFormModal from './UnitFormModal';
import ActionInbox  from './components/ActionInbox';
import SettingsTab  from './components/SettingsTab';
import TeamTab      from './components/TeamTab';
import ServicesTab  from './components/ServicesTab';
import GalleryTab   from './components/GalleryTab';
import VisualBuilder from './VisualBuilder';
import { useAdminRole, canAccessTab, ROLE_TABS } from '../../../hooks/useAdminRole';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:        '#0a0a0f',
  surface:   '#12121a',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.14)',
  textPri:   '#f0f0f5',
  textMuted: '#6b6b80',
  gold:      '#d4a853',
  goldDim:   'rgba(212,168,83,0.12)',
  green:     '#3ecf8e',
  greenDim:  'rgba(62,207,142,0.12)',
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.12)',
  amber:     '#fbbf24',
  amberDim:  'rgba(251,191,36,0.10)',
};

// ─── Status badge ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending:   { fg: C.amber,  bg: C.amberDim  },
  confirmed: { fg: C.green,  bg: C.greenDim  },
  cancelled: { fg: C.red,    bg: C.redDim    },
  completed: { fg: C.textMuted, bg: 'rgba(107,107,128,0.10)' },
};

function StatusBadge({ status, createdAt }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (status !== 'pending' || !createdAt) return;
    
    const calculateTimeLeft = () => {
      // Safely parse timezone string if present, fallback standard
      const createdTime = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const diff = now - createdTime;
      const MAX_TIME = 15 * 60 * 1000; // 15 mins
      const remaining = MAX_TIME - diff;
      
      if (remaining <= 0) {
        setTimeLeft('Expired');
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [status, createdAt]);

  const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           6,
      padding:       '3px 10px',
      borderRadius:  20,
      fontSize:      12,
      fontWeight:    600,
      letterSpacing: '0.04em',
      background:    colors.bg,
      color:         colors.fg,
      border:        `1px solid ${colors.fg}22`,
      textTransform: 'uppercase',
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background: colors.fg, display:'inline-block' }} />
      {status} {status === 'pending' && timeLeft && <span style={{ opacity: 0.8, fontSize: 10, letterSpacing: '0px', marginLeft: 2 }}>⏱ {timeLeft}</span>}
    </span>
  );
}

// ─── Placeholder tab shared layout ────────────────────────────────────────────
function ComingSoonTab({ icon, titleAr, titleEn, descAr, descEn, items }) {
  return (
    <div style={{ padding: '60px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>{icon}</div>
      <h2 style={{ color: C.textPri, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        {titleAr} <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 18 }}>/ {titleEn}</span>
      </h2>
      <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
        {descAr}
      </p>

      {/* Planned features list */}
      <div style={{
        display:       'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap:           16,
        maxWidth:      760,
        margin:        '0 auto',
        textAlign:     'left',
      }}>
        {items.map((item, i) => (
          <div key={i} style={{
            background:   C.surface,
            border:       `1px solid ${C.border}`,
            borderRadius: 12,
            padding:      '16px 20px',
            display:      'flex',
            alignItems:   'flex-start',
            gap:          12,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ color: C.textPri, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.ar}</div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>{item.en}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          8,
        marginTop:    40,
        padding:      '8px 20px',
        borderRadius: 20,
        background:   C.goldDim,
        border:       `1px solid ${C.gold}33`,
        color:        C.gold,
        fontSize:     12,
        fontWeight:   600,
        letterSpacing:'0.08em',
      }}>
        ⏳ قيد التطوير — Phase 21
      </div>
    </div>
  );
}

// ─── Housekeeping Tab ─────────────────────────────────────────────────────────
function HousekeepingTab() {
  return (
    <ComingSoonTab
      icon="🧹"
      titleAr="إدارة التنظيف"
      titleEn="Housekeeping"
      descAr="متابعة حالة تنظيف كل شاليه وفيلا — من لحظة المغادرة حتى الاستعداد للضيف القادم."
      items={[
        { icon: '🏠', ar: 'قائمة الوحدات التي تحتاج تنظيف اليوم', en: 'Units due for cleaning today' },
        { icon: '✅', ar: 'تحديث الحالة: تحت التنظيف / جاهزة', en: 'Update status: cleaning / ready' },
        { icon: '👤', ar: 'تعيين موظف تنظيف لكل وحدة', en: 'Assign staff to each unit' },
        { icon: '📸', ar: 'رفع صور ما بعد التنظيف للمراجعة', en: 'Upload post-clean photos' },
        { icon: '⏰', ar: 'تتبع وقت الانتهاء من كل وحدة', en: 'Track completion time per unit' },
        { icon: '🔔', ar: 'تنبيه تلقائي عند استعداد الوحدة', en: 'Auto-notify when unit is ready' },
      ]}
    />
  );
}

// ─── Maintenance Tab ──────────────────────────────────────────────────────────
function MaintenanceTab() {
  return (
    <ComingSoonTab
      icon="🔧"
      titleAr="إدارة الصيانة"
      titleEn="Maintenance"
      descAr="تتبع بلاغات الصيانة وإصلاح الأعطال — من الإبلاغ حتى الإغلاق."
      items={[
        { icon: '🚨', ar: 'استقبال بلاغات الأعطال من الزبائن', en: 'Receive fault reports from guests' },
        { icon: '🔧', ar: 'تعيين فني صيانة لكل بلاغ', en: 'Assign maintenance tech to each report' },
        { icon: '📊', ar: 'تصنيف الأعطال: كهرباء / سباكة / أجهزة', en: 'Classify faults: electrical / plumbing / appliances' },
        { icon: '⚡', ar: 'تحديد الأولوية: عاجل / روتيني', en: 'Set priority: urgent / routine' },
        { icon: '📋', ar: 'سجل تاريخي لكل بلاغ وإصلاح', en: 'Historical log per report and fix' },
        { icon: '🔒', ar: 'إغلاق وحدة تلقائياً عند عطل كبير', en: 'Auto-close unit on major fault' },
      ]}
    />
  );
}

// ─── Gardens Tab ──────────────────────────────────────────────────────────────
function GardensTab() {
  return (
    <ComingSoonTab
      icon="🌿"
      titleAr="إدارة الحدائق والمساحات الخضراء"
      titleEn="Gardens & Landscaping"
      descAr="جدولة أعمال الحديقة والعشب والري — للحفاظ على المنظر الطبيعي الجميل للمنتجع."
      items={[
        { icon: '🌱', ar: 'جدولة قص العشب الأسبوعي', en: 'Schedule weekly lawn mowing' },
        { icon: '💧', ar: 'إدارة نظام الري التلقائي', en: 'Manage automatic irrigation system' },
        { icon: '🌸', ar: 'متابعة زراعة الأزهار والنباتات الموسمية', en: 'Track seasonal flowers & plants' },
        { icon: '🌳', ar: 'صيانة وتشذيب الأشجار', en: 'Tree trimming and maintenance' },
        { icon: '🗓️', ar: 'تقويم أعمال الحديقة الشهري', en: 'Monthly garden work calendar' },
        { icon: '📦', ar: 'طلب مستلزمات: بذور، أسمدة، أدوات', en: 'Order supplies: seeds, fertilizers, tools' },
      ]}
    />
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, onLogout, isExpanded, setIsExpanded, role, slug }) {
  const ALL_NAV = [
    { id: 'inbox',        icon: '🛎️', label: 'Action Inbox'     },
    { id: 'bookings',     icon: '📋', label: 'Reservations'     },
    { id: 'units',        icon: '🏠', label: 'الوحدات'          },
    { id: 'gallery',      icon: '🖼️', label: 'معرض الصور'       },
    { id: 'services',     icon: '✨', label: 'الخدمات الإضافية' },
    { id: 'dashboard',    icon: '📊', label: 'Overview'         },
    { id: 'housekeeping', icon: '🧹', label: 'Housekeeping'     },
    { id: 'maintenance',  icon: '🔧', label: 'Maintenance'      },
    { id: 'gardens',      icon: '🌿', label: 'Gardens'          },
    { id: 'settings',     icon: '⚙️', label: 'إعدادات المنصة'  },
    { id: 'pagebuilder',  icon: '🎨', label: 'Page Builder'      },
    { id: 'team',         icon: '👥', label: 'إدارة الفريق'     },
  ];
  const navItems = ALL_NAV.filter(item => canAccessTab(role, item.id));
  return (
    <div style={{
      width:          isExpanded ? 220 : 80,
      minHeight:      '100vh',
      background:     C.surface,
      borderRight:    `1px solid ${C.border}`,
      display:        'flex',
      flexDirection:  'column',
      padding:        '28px 0',
      flexShrink:     0,
      transition:     'width 0.3s ease-in-out',
      overflow:       'hidden',
    }}>
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer',
          padding: '0 24px', textAlign: isExpanded ? 'right' : 'center', marginBottom: 16, fontSize: 18,
          transition: 'color 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = C.gold}
        onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
      >
        {isExpanded ? '◀' : '▶'}
      </button>

      {/* Logo */}
      <div style={{ padding: '0 24px 32px', whiteSpace: 'nowrap', opacity: isExpanded ? 1 : 0, transition: 'opacity 0.2s', height: 60 }}>
        {isExpanded && (
          <>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: C.textMuted, marginBottom: 4 }}>
              {slug ? slug.toUpperCase() : 'TENANT'} ADMIN
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.gold, letterSpacing: '0.06em' }}>
              {slug || 'Dashboard'}
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            12,
              width:          '100%',
              padding:        '12px 24px',
              background:     activeTab === item.id ? C.goldDim : 'transparent',
              border:         'none',
              borderLeft:     activeTab === item.id ? `2px solid ${C.gold}` : '2px solid transparent',
              color:          activeTab === item.id ? C.gold : C.textMuted,
              fontSize:       14,
              fontWeight:     activeTab === item.id ? 600 : 400,
              cursor:         'pointer',
              textAlign:      'left',
              transition:     'all 0.18s',
            }}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
            {isExpanded && <span style={{ transition: 'opacity 0.2s', opacity: 1 }}>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={onLogout}
        style={{
          margin:       '0 16px',
          padding:      '10px 16px',
          borderRadius: 8,
          background:   'transparent',
          border:       `1px solid ${C.border}`,
          color:        C.textMuted,
          fontSize:     13,
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          transition:   'all 0.18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
      >
        <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>↩</span>
        {isExpanded && <span>Logout</span>}
      </button>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get('/dashboard')
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: C.textMuted, padding: 40 }}>Loading overview…</div>;
  if (!stats)  return <div style={{ color: C.red,      padding: 40 }}>Failed to load dashboard data.</div>;

  const bk = stats.bookings || {};
  const kpis = [
    { label: 'Total Bookings',   value: bk.total ?? '—',           color: C.gold   },
    { label: 'Confirmed Revenue', value: `${bk.confirmed_revenue ?? 0} SAR`, color: C.green  },
    { label: 'Pending',          value: bk.by_status?.pending ?? 0, color: C.amber  },
    { label: 'Cancelled',        value: bk.by_status?.cancelled ?? 0, color: C.red  },
    { label: 'WhatsApp',         value: bk.by_source?.whatsapp ?? 0, color: C.green },
    { label: 'Web Bookings',     value: bk.by_source?.web ?? 0, color: C.textPri  },
  ];

  return (
    <div>
      <h2 style={{ color: C.textPri, fontSize: 20, fontWeight: 700, marginBottom: 28 }}>
        Overview — {stats.period?.month}/{stats.period?.year}
      </h2>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            flex:         '1 1 160px',
            background:   C.surface,
            border:       `1px solid ${C.border}`,
            borderRadius: 12,
            padding:      '20px 24px',
          }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Upcoming check-ins */}
      {stats.upcoming_checkins?.length > 0 && (
        <div>
          <h3 style={{ color: C.textPri, fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
            Upcoming Check-ins (next 7 days)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.upcoming_checkins.map(b => (
              <div key={b.booking_id} style={{
                background:   C.surface,
                border:       `1px solid ${C.border}`,
                borderRadius: 8,
                padding:      '12px 16px',
                display:      'flex',
                gap:          20,
                alignItems:   'center',
              }}>
                <span style={{ color: C.gold, fontSize: 13, minWidth: 120 }}>{b.check_in}</span>
                <span style={{ color: C.textPri, fontSize: 13 }}>{b.customer?.name}</span>
                <span style={{ color: C.textMuted, fontSize: 12 }}>— {b.unit?.name}</span>
                <StatusBadge status={b.status} createdAt={b.created_at ?? b.createdAt} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payment Method Badge ──────────────────────────────────────────────────────
const PAYMENT_META = {
  cash:  { fg: '#3ecf8e', bg: 'rgba(62,207,142,0.12)',   label: '💵 Cash'  },
  whish: { fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)',   label: '📱 Whish' },
  omt:   { fg: '#fb923c', bg: 'rgba(251,146,60,0.12)',   label: '💸 OMT'   },
  card:  { fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)',  label: '💳 Card'  },
};
function PaymentBadge({ method }) {
  const m = PAYMENT_META[method?.toLowerCase()];
  if (!m) return <span style={{ color: C.textMuted, fontSize: 12 }}>{method || '—'}</span>;
  return (
    <span style={{
      display:      'inline-block',
      padding:      '3px 9px',
      borderRadius: 6,
      fontSize:     11,
      fontWeight:   600,
      background:   m.bg,
      color:        m.fg,
      border:       `1px solid ${m.fg}33`,
      whiteSpace:   'nowrap',
    }}>
      {m.label}
    </span>
  );
}

// ─── KPI Strip (top of Bookings tab) ──────────────────────────────────────────
function KpiStrip() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminApi.get('/dashboard/stats')
      .then(r => setStats(r.data))
      .catch(() => {});
  }, []);

  const cards = [
    { labelEn: "Today's Check-ins", labelAr: 'حجوزات اليوم',         value: stats?.today_bookings  ?? '…', color: C.gold,    top: C.gold    },
    { labelEn: 'Pending Approval',  labelAr: 'معلقة — تحتاج تأكيد', value: stats?.pending_count   ?? '…', color: C.amber,   top: C.amber   },
    { labelEn: 'Monthly Revenue',   labelAr: 'إيرادات هذا الشهر',    value: stats ? `${stats.monthly_revenue} SAR` : '…', color: C.green, top: C.green },
    { labelEn: 'Available Units',   labelAr: 'وحدات متاحة الآن',     value: stats?.available_units ?? '…', color: '#60a5fa', top: '#60a5fa' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
      {cards.map(k => (
        <div key={k.labelEn} style={{
          background:   C.surface,
          border:       `1px solid ${C.border}`,
          borderTop:    `2px solid ${k.top}`,
          borderRadius: 12,
          padding:      '18px 20px',
        }}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: '0.04em', marginBottom: 8 }}>
            {k.labelEn}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: k.color, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {k.value}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>{k.labelAr}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Bookings Tab ──────────────────────────────────────────────────────────────
const STATUS_PILLS = [
  { id: 'all',       label: 'All',       color: C.textPri, bg: C.borderHi  },
  { id: 'pending',   label: '🛎 Pending',  color: C.amber,  bg: C.amberDim  },
  { id: 'confirmed', label: '✓ Confirmed',color: C.green,  bg: C.greenDim  },
  { id: 'cancelled', label: '✕ Cancelled',color: C.red,    bg: C.redDim    },
  { id: 'completed', label: '◎ Completed',color: C.textMuted, bg: 'rgba(107,107,128,0.10)' },
];

function BookingsTab() {
  const [bookings,      setBookings]     = useState([]);
  const [total,         setTotal]        = useState(0);
  const [page,          setPage]         = useState(1);
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState(null);
  const [updating,      setUpdating]     = useState(null);
  const [toast,         setToast]        = useState(null);
  const [searchQuery,   setSearchQuery]  = useState('');
  const [statusFilter,  setStatusFilter] = useState('all');
  const [dateFrom,      setDateFrom]     = useState('');
  const [dateTo,        setDateTo]       = useState('');
  const [expandedRow,   setExpandedRow]  = useState(null);
  const [showNewModal,  setShowNewModal] = useState(false);

  const LIMIT = 20;

  const fetchPage = useCallback(async (p, opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: p, limit: LIMIT };
      const sf = opts.statusFilter ?? statusFilter;
      const df = opts.dateFrom     ?? dateFrom;
      const dt = opts.dateTo       ?? dateTo;
      if (sf && sf !== 'all') params.status    = sf;
      if (df)                  params.date_from = df;
      if (dt)                  params.date_to   = dt;
      const { data } = await adminApi.get('/bookings/', { params });
      setBookings(data.data ?? data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to fetch bookings.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const applyStatusFilter = (sf) => {
    setStatusFilter(sf);
    fetchPage(1, { statusFilter: sf });
  };

  const applyDateFilter = () => fetchPage(1);

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
    fetchPage(1, { dateFrom: '', dateTo: '' });
  };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (bookingId, status) => {
    setUpdating(bookingId);
    try {
      await adminApi.patch(`/bookings/${bookingId}/status`, { status });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      showToast(`Booking ${status}.`, true);
    } catch (e) {
      showToast(e.response?.data?.detail || 'Update failed.', false);
    } finally {
      setUpdating(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Client-side search only (status/date are server-side)
  const visibleBookings = bookings.filter(b =>
    !searchQuery ||
    b.customer?.phone?.includes(searchQuery) ||
    b.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputStyle = {
    padding: '8px 12px', borderRadius: 8,
    background: C.surface, border: `1px solid ${C.border}`,
    color: C.textPri, fontSize: 13, outline: 'none',
  };

  return (
    <div>
      {/* ── KPI Strip ─────────────────────────────────────────────── */}
      <KpiStrip />

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ color: C.textPri, fontSize: 20, fontWeight: 700, margin: 0 }}>
          Reservations
          <span style={{ color: C.textMuted, fontSize: 14, fontWeight: 400, marginLeft: 10 }}>
            {total} total
          </span>
        </h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search name or phone…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, minWidth: 200 }}
          />
          {/* Refresh */}
          <button
            onClick={() => fetchPage(page)}
            style={{ ...inputStyle, color: C.gold, border: `1px solid ${C.gold}33`, background: C.goldDim, cursor: 'pointer' }}
          >
            ↻ Refresh
          </button>
          {/* New Booking */}
          <button
            onClick={() => setShowNewModal(true)}
            style={{ ...inputStyle, color: '#0a0a0f', fontWeight: 700, background: C.gold, border: 'none', cursor: 'pointer' }}
          >
            + حجز جديد
          </button>
        </div>
      </div>

      {/* ── Filters row ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status pills */}
        <div style={{ display: 'flex', background: C.surface, borderRadius: 8, padding: 3, border: `1px solid ${C.border}`, gap: 2 }}>
          {STATUS_PILLS.map(p => (
            <button
              key={p.id}
              onClick={() => applyStatusFilter(p.id)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer',
                background: statusFilter === p.id ? p.bg : 'transparent',
                color:      statusFilter === p.id ? p.color : C.textMuted,
                fontWeight: statusFilter === p.id ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: C.textMuted, fontSize: 12 }}>Check-in</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }} />
          <span style={{ color: C.textMuted, fontSize: 12 }}>→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }} />
          <button onClick={applyDateFilter}
            style={{ ...inputStyle, cursor: 'pointer', background: C.goldDim, color: C.gold, border: `1px solid ${C.gold}33` }}>
            Filter
          </button>
          {(dateFrom || dateTo) && (
            <button onClick={clearDates}
              style={{ ...inputStyle, cursor: 'pointer', background: 'transparent', color: C.textMuted }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && (
        <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '12px 16px', color: C.red, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ color: C.textMuted, padding: 40, textAlign: 'center' }}>Loading reservations…</div>
      ) : visibleBookings.length === 0 ? (
        <div style={{ color: C.textMuted, padding: 40, textAlign: 'center' }}>No reservations found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borderHi}` }}>
                {['Customer', 'Phone', 'Unit', 'Check-in', 'Check-out', 'Arrival', 'Payment', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', color: C.textMuted,
                    fontWeight: 600, letterSpacing: '0.05em', fontSize: 11,
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleBookings.map((b, i) => {
                const customerName  = b.customer?.name  || '—';
                const customerPhone = b.customer?.phone || '—';
                const unitName      = b.unit?.name_ar   || b.unit?.unitNumber || b.unit_id || '—';
                const checkIn       = (b.check_in  || b.checkIn  || '').toString().slice(0, 10) || '—';
                const checkOut      = (b.check_out || b.checkOut || '').toString().slice(0, 10) || '—';
                const totalPrice    = b.total_price ?? b.totalPrice ?? '—';
                const currency      = b.currency ?? 'SAR';
                const arrivalTime   = b.arrival_time   ?? b.arrivalTime   ?? '—';
                const paymentMethod = b.payment_method ?? b.paymentMethod ?? null;
                const paymentRef    = b.payment_reference ?? b.paymentReference ?? null;
                const isUpdating    = updating === b.id;
                const rowBg         = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)';
                const isExpanded    = expandedRow === b.id;

                return (
                  <React.Fragment key={b.id}>
                    <tr
                      style={{ background: rowBg, borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,83,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = isExpanded ? 'rgba(212,168,83,0.04)' : rowBg}
                      onClick={() => setExpandedRow(isExpanded ? null : b.id)}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: C.textPri, fontWeight: 500 }}>{customerName}</div>
                        <div style={{ color: C.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>#{b.id?.slice(0, 8)}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: C.textMuted }}>{customerPhone}</td>
                      <td style={{ padding: '12px 14px', color: C.textPri }}>{unitName}</td>
                      <td style={{ padding: '12px 14px', color: C.textMuted, whiteSpace: 'nowrap' }}>{checkIn}</td>
                      <td style={{ padding: '12px 14px', color: C.textMuted, whiteSpace: 'nowrap' }}>{checkOut}</td>
                      <td style={{ padding: '12px 14px', color: C.textMuted, whiteSpace: 'nowrap' }}>{arrivalTime}</td>
                      <td style={{ padding: '12px 14px' }}><PaymentBadge method={paymentMethod} /></td>
                      <td style={{ padding: '12px 14px', color: C.gold, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {totalPrice} {currency}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <StatusBadge status={b.status} createdAt={b.created_at ?? b.createdAt} />
                      </td>
                      <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {b.status !== 'confirmed' && b.status !== 'cancelled' && (
                            <ActionButton label="Confirm" color={C.green} dimColor={C.greenDim}
                              disabled={isUpdating} onClick={() => updateStatus(b.id, 'confirmed')} />
                          )}
                          {b.status !== 'cancelled' && b.status !== 'completed' && (
                            <ActionButton label="Cancel" color={C.red} dimColor={C.redDim}
                              disabled={isUpdating} onClick={() => updateStatus(b.id, 'cancelled')} />
                          )}
                          {isUpdating && <span style={{ color: C.textMuted, fontSize: 11 }}>…</span>}
                        </div>
                      </td>
                    </tr>
                    {/* ── Expanded detail row ── */}
                    {isExpanded && (
                      <tr style={{ background: 'rgba(212,168,83,0.03)', borderBottom: `1px solid ${C.border}` }}>
                        <td colSpan={10} style={{ padding: '12px 24px' }}>
                          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 12 }}>
                            <div>
                              <span style={{ color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Booking ID</span>
                              <div style={{ color: C.textPri, fontFamily: 'monospace', marginTop: 4 }}>{b.id}</div>
                            </div>
                            {paymentRef && (
                              <div>
                                <span style={{ color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Receipt Ref</span>
                                <div style={{ color: C.gold, fontFamily: 'monospace', marginTop: 4 }}>{paymentRef}</div>
                              </div>
                            )}
                            {b.notes && (
                              <div>
                                <span style={{ color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Notes</span>
                                <div style={{ color: C.textPri, marginTop: 4 }}>{b.notes}</div>
                              </div>
                            )}
                            <div>
                              <span style={{ color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Source</span>
                              <div style={{ color: b.source === 'whatsapp' ? C.green : C.textPri, marginTop: 4 }}>
                                {b.source === 'whatsapp' ? '🟢 WhatsApp' : b.source === 'web' ? '🌐 Web' : b.source || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 28 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => fetchPage(p)} style={{
              width: 34, height: 34, borderRadius: 6, fontSize: 13, cursor: 'pointer',
              border:     `1px solid ${p === page ? C.gold : C.border}`,
              background: p === page ? C.goldDim : 'transparent',
              color:      p === page ? C.gold : C.textMuted,
            }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 28, right: 28, padding: '12px 20px',
              borderRadius: 10, zIndex: 9999, backdropFilter: 'blur(12px)',
              background: toast.ok ? C.greenDim : C.redDim,
              border:     `1px solid ${toast.ok ? C.green : C.red}44`,
              color:      toast.ok ? C.green : C.red,
              fontSize: 14, fontWeight: 600,
            }}
          >
            {toast.ok ? '✓' : '✗'} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Booking Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showNewModal && (
          <AdminBookingModal
            onClose={() => setShowNewModal(false)}
            onCreated={() => { setShowNewModal(false); fetchPage(1); showToast('تم إنشاء الحجز بنجاح.', true); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({ label, color, dimColor, disabled, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding:      '5px 12px',
        borderRadius: 6,
        border:       `1px solid ${color}44`,
        background:   hover ? dimColor : 'transparent',
        color,
        fontSize:     12,
        fontWeight:   600,
        cursor:       disabled ? 'not-allowed' : 'pointer',
        opacity:      disabled ? 0.4 : 1,
        transition:   'all 0.15s',
        whiteSpace:   'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      style={{
        position:        'relative',
        width:           42,
        height:          22,
        borderRadius:    11,
        border:          'none',
        background:      on ? 'rgba(62,207,142,0.35)' : 'rgba(107,107,128,0.25)',
        cursor:          disabled ? 'not-allowed' : 'pointer',
        transition:      'background 0.2s',
        flexShrink:      0,
        outline:         'none',
        padding:         0,
      }}
    >
      <span style={{
        position:    'absolute',
        top:         3,
        left:        on ? 22 : 3,
        width:       16,
        height:      16,
        borderRadius:'50%',
        background:  on ? C.green : C.textMuted,
        transition:  'left 0.2s, background 0.2s',
        display:     'block',
      }} />
    </button>
  );
}

// ─── Admin Booking Modal ──────────────────────────────────────────────────────
const EMPTY_BOOKING = {
  unit_id: '', customer_name: '', customer_phone: '',
  guests: 1, total_price: '', currency: 'SAR', notes: '',
};

function AdminBookingModal({ onClose, onCreated }) {
  const { slug } = useParams();
  const tenantSlug = slug || 'smar';

  const [form,     setForm]     = useState(EMPTY_BOOKING);
  const [units,    setUnits]    = useState([]);
  const [dates,    setDates]    = useState({ checkIn: null, checkOut: null });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    adminApi.get('/units/').then(r => setUnits(r.data.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.unit_id)           { setError('اختر الوحدة'); return; }
    if (!form.customer_name.trim()) { setError('اسم العميل مطلوب'); return; }
    if (!form.customer_phone.trim()) { setError('رقم الهاتف مطلوب'); return; }
    if (!dates.checkIn || !dates.checkOut) { setError('اختر تواريخ الحجز'); return; }
    if (!form.total_price)       { setError('السعر الإجمالي مطلوب'); return; }

    const toDateStr = (d) => {
      if (!d) return '';
      if (typeof d === 'string') return d.slice(0, 10);
      return d.toISOString().slice(0, 10);
    };

    setSaving(true);
    setError('');
    try {
      await adminApi.post('/bookings/', {
        unit_id:        form.unit_id,
        customer_name:  form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        check_in:       toDateStr(dates.checkIn),
        check_out:      toDateStr(dates.checkOut),
        guests:         Number(form.guests),
        total_price:    parseFloat(form.total_price).toFixed(2),
        currency:       form.currency,
        notes:          form.notes || null,
      });
      onCreated();
    } catch (e) {
      setError(e.response?.data?.detail || 'فشل إنشاء الحجز.');
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    background: C.bg, border: `1px solid ${C.border}`,
    color: C.textPri, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', color: C.textMuted, fontSize: 11,
    marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: '40px 16px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        style={{
          background: C.surface, borderRadius: 16, border: `1px solid ${C.borderHi}`,
          width: '100%', maxWidth: 780, padding: 32,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: C.textPri, fontSize: 18, fontWeight: 700, margin: 0 }}>
            + حجز جديد
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Top fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>الوحدة</label>
            <select value={form.unit_id} onChange={e => set('unit_id', e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }}>
              <option value="">— اختر الوحدة —</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name_ar || u.name_en || u.unitNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>عدد الضيوف</label>
            <input type="number" min={1} max={30} value={form.guests}
              onChange={e => set('guests', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>اسم العميل</label>
            <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
              placeholder="محمد العلي" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>رقم الهاتف</label>
            <input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)}
              placeholder="+966xxxxxxxxx" style={inputStyle} />
          </div>
        </div>

        {/* Calendar */}
        {form.unit_id && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>تواريخ الحجز</label>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <UnitCalendar
                unitId={form.unit_id}
                slug={tenantSlug}
                adminMode={true}
                value={dates}
                onChange={({ checkIn, checkOut }) => setDates({ checkIn, checkOut })}
              />
            </div>
          </div>
        )}

        {/* Price + currency + notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>السعر الإجمالي</label>
            <input type="number" min={0} step="0.01" value={form.total_price}
              onChange={e => set('total_price', e.target.value)}
              placeholder="0.00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>العملة</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }}>
              <option value="SAR">SAR ريال</option>
              <option value="USD">USD دولار</option>
              <option value="EUR">EUR يورو</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>ملاحظات</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="أي تعليمات خاصة…" style={inputStyle} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: '10px 22px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', fontSize: 14 }}>
            إلغاء
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: C.gold, color: '#0a0a0f', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>
            {saving ? '…' : 'إنشاء الحجز'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Add Unit Modal ────────────────────────────────────────────────────────────
const UNIT_TYPES = [
  { id: 'chalet',     label: 'Chalet شاليه'       },
  { id: 'villa',      label: 'Villa فيلا'          },
  { id: 'restaurant', label: 'Restaurant مطعم'    },
  { id: 'pool',       label: 'Pool مسبح'           },
];

const EMPTY_FORM = {
  name_ar: '', name_en: '', unit_type: 'chalet',
  capacity: 2, bedrooms: 1, bathrooms: 1, price: '', image_url: '',
};

function AddUnitModal({ onClose, onCreated }) {
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    background: C.bg, border: `1px solid ${C.border}`,
    color: C.textPri, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', color: C.textMuted, fontSize: 11,
    marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
  };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.name_ar.trim()) { setError('الاسم بالعربي مطلوب'); return; }
    if (form.capacity < 1)    { setError('السعة يجب أن تكون 1 أو أكثر'); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await adminApi.post('/units/', {
        name_ar:   form.name_ar,
        name_en:   form.name_en || null,
        unit_type: form.unit_type,
        capacity:  Number(form.capacity),
        bedrooms:  form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        price:     form.price !== '' ? parseFloat(form.price) : null,
        image_url: form.image_url || null,
      });
      onCreated(data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'فشل الحفظ، حاول مجدداً');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="modal-bg"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <motion.div
        key="modal-panel"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.96, y: 20  }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 201, width: 520, maxHeight: '90vh', overflowY: 'auto',
          background: C.surface, border: `1px solid ${C.borderHi}`,
          borderRadius: 16, padding: '32px 36px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>ADD UNIT</div>
            <h3 style={{ color: C.textPri, fontSize: 18, fontWeight: 700, margin: 0 }}>إضافة وحدة جديدة</h3>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textMuted, cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>الاسم بالعربي *</label>
              <input style={inputStyle} value={form.name_ar} onChange={e => set('name_ar', e.target.value)}
                placeholder="مثال: شاليه الصنوبر" dir="rtl" />
            </div>
            <div>
              <label style={labelStyle}>Name in English</label>
              <input style={inputStyle} value={form.name_en} onChange={e => set('name_en', e.target.value)}
                placeholder="e.g. Pine Chalet" />
            </div>
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>نوع الوحدة</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {UNIT_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => set('unit_type', t.id)}
                  style={{
                    padding: '8px 4px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                    background: form.unit_type === t.id ? C.goldDim : C.bg,
                    color:      form.unit_type === t.id ? C.gold : C.textMuted,
                    border:     `1px solid ${form.unit_type === t.id ? C.gold + '44' : C.border}`,
                    fontWeight: form.unit_type === t.id ? 600 : 400,
                    transition: 'all 0.15s',
                    textAlign:  'center', lineHeight: 1.4,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Numbers row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>السعة *</label>
              <input type="number" min={1} style={inputStyle} value={form.capacity}
                onChange={e => set('capacity', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>غرف النوم</label>
              <input type="number" min={0} style={inputStyle} value={form.bedrooms}
                onChange={e => set('bedrooms', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>الحمامات</label>
              <input type="number" min={0} style={inputStyle} value={form.bathrooms}
                onChange={e => set('bathrooms', e.target.value)} />
            </div>
          </div>

          {/* Base price */}
          <div>
            <label style={labelStyle}>السعر الليلي الأساسي (USD)</label>
            <input type="number" min={0} step="0.01" style={inputStyle} value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="مثال: 850" />
          </div>

          {/* Image URL */}
          <div>
            <label style={labelStyle}>Image URL (Supabase)</label>
            <input style={inputStyle} value={form.image_url}
              onChange={e => set('image_url', e.target.value)}
              placeholder="https://…supabase.co/storage/…/chalet.jpg" dir="ltr" />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: C.redDim, border: `1px solid ${C.red}44`,
              borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 13,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textMuted, fontSize: 13, cursor: 'pointer',
          }}>
            إلغاء
          </button>
          <button onClick={handleCreate} disabled={saving} style={{
            padding: '10px 28px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700,
            background: saving ? 'rgba(212,168,83,0.4)' : 'linear-gradient(135deg,#d4a853,#b8892a)',
            color: '#000', cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s',
          }}>
            {saving ? 'جاري الحفظ…' : '+ إضافة الوحدة'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Units Tab ─────────────────────────────────────────────────────────────────
const TYPE_ICON = { villa: '🏡', chalet: '🏕️', restaurant: '🍽️', pool: '🏊', };

// ─── CalendarManagerModal (Phase 23) ─────────────────────────────────────────
// Admin drags on the calendar to select a range, then sets price/block status.
// No manual date inputs — the calendar IS the input.
function CalendarManagerModal({ unit, onClose }) {
  const { slug: paramSlug } = useParams();
  const tenantSlug = paramSlug || 'smar';
  const [calKey,       setCalKey]      = useState(0);
  const [selection,    setSelection]   = useState({ checkIn: null, checkOut: null });
  const [customPrice,  setCustomPrice] = useState('');
  const [isBlocked,    setIsBlocked]   = useState(false);
  const [applying,     setApplying]    = useState(false);
  const [result,       setResult]      = useState(null); // { ok, msg }

  const fmtDateStr = d => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const nights = selection.checkIn && selection.checkOut
    ? Math.round((selection.checkOut - selection.checkIn) / 86400000) + 1
    : 0;

  const handleApply = async () => {
    if (!selection.checkIn) {
      setResult({ ok: false, msg: 'اسحب على التقويم لتحديد نطاق أولاً' });
      return;
    }
    setApplying(true);
    setResult(null);
    const startStr = fmtDateStr(selection.checkIn);
    const endStr   = fmtDateStr(selection.checkOut || selection.checkIn);
    try {
      const res = await adminApi.post(`/units/${unit.id}/date-overrides`, {
        start_date:   startStr,
        end_date:     endStr,
        custom_price: customPrice !== '' ? parseFloat(customPrice) : null,
        is_blocked:   isBlocked,
      });
      const days = res.data.days_updated ?? nights;
      setResult({
        ok:  true,
        msg: isBlocked
          ? `تم حجب ${days} يوم بنجاح`
          : `تم تحديث ${days} يوم — السعر: ${customPrice || '—'} SAR`,
      });
      setSelection({ checkIn: null, checkOut: null });
      setCustomPrice('');
      setCalKey(k => k + 1); // re-fetch calendar data
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.detail ?? 'فشل التحديث' });
    } finally {
      setApplying(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.borderHi}`,
    borderRadius: 8, padding: '10px 12px', color: C.textPri, fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <AnimatePresence>
      <motion.div
        key="cal-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(4px)' }}
      />
      <motion.div
        key="cal-panel"
        initial={{ opacity:0, scale:0.94, y:24 }}
        animate={{ opacity:1, scale:1,    y:0  }}
        exit={{    opacity:0, scale:0.94, y:24 }}
        transition={{ type:'spring', stiffness:280, damping:26 }}
        onClick={e => e.stopPropagation()}
        style={{ position:'fixed', inset:0, zIndex:401, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}
      >
        <div style={{
          pointerEvents:'all', background:C.surface, border:`1px solid ${C.borderHi}`,
          borderRadius:20, width:'min(500px,94vw)', maxHeight:'92vh', overflowY:'auto',
          boxShadow:'0 24px 80px rgba(0,0,0,0.6)', padding:28,
          display:'flex', flexDirection:'column', gap:18,
        }}>

          {/* ── Header ── */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <p style={{ color:C.textMuted, fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', margin:0 }}>
                إدارة التقويم — Dynamic Pricing
              </p>
              <h3 style={{ color:C.textPri, fontSize:17, fontWeight:700, margin:'4px 0 0' }}>
                {unit.name_ar || unit.name_en}
              </h3>
            </div>
            <button onClick={onClose} style={{
              width:32, height:32, borderRadius:'50%', border:`1px solid ${C.border}`,
              background:'transparent', color:C.textMuted, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0,
            }}>✕</button>
          </div>

          {/* ── Instruction banner ── */}
          <div style={{
            background: C.goldDim, border:`1px solid ${C.gold}33`, borderRadius:10,
            padding:'10px 14px', fontSize:12, color:C.gold, display:'flex', gap:8, alignItems:'center',
          }}>
            <span>👆</span>
            <span>اسحب فوق الأيام لتحديد نطاق، ثم اضبط السعر أو الحجب أدناه</span>
          </div>

          {/* ── Calendar ── */}
          <div style={{ display:'flex', justifyContent:'center' }}>
            <UnitCalendar
              key={calKey}
              unitId={unit.id}
              slug={tenantSlug}
              adminMode={true}
              onChange={setSelection}
              value={selection}
            />
          </div>

          {/* ── Selected range pill ── */}
          <AnimatePresence>
            {selection.checkIn && (
              <motion.div
                initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                style={{
                  background:'rgba(59,130,246,0.10)', border:'1px solid rgba(59,130,246,0.28)',
                  borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center',
                  justifyContent:'space-between', flexWrap:'wrap', gap:8,
                }}
              >
                <span style={{ color:'#93c5fd', fontSize:13, fontWeight:600 }}>
                  📅 {fmtDateStr(selection.checkIn)}
                  {selection.checkOut && selection.checkOut > selection.checkIn
                    ? ` ← ${fmtDateStr(selection.checkOut)}`
                    : ''}
                </span>
                <span style={{ color:C.textMuted, fontSize:12 }}>
                  {nights > 0 ? `${nights} يوم محدد` : '1 يوم'}
                </span>
                <button
                  onClick={() => setSelection({ checkIn:null, checkOut:null })}
                  style={{ background:'transparent', border:'none', color:C.textMuted, cursor:'pointer', fontSize:13 }}
                >
                  ✕ مسح
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ borderTop:`1px solid ${C.border}` }} />

          {/* ── Controls ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Block / Available toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ color:C.textPri, fontSize:13, fontWeight:600, margin:0 }}>الحالة</p>
                <p style={{ color:C.textMuted, fontSize:11, margin:'3px 0 0' }}>
                  {isBlocked ? 'مغلق — لا يمكن الحجز' : 'متاح — يمكن الحجز'}
                </p>
              </div>
              <div style={{ display:'flex', gap:0, border:`1px solid ${C.borderHi}`, borderRadius:8, overflow:'hidden' }}>
                {[
                  { label:'متاح ✓', val:false, activeColor:C.green,  activeBg:'rgba(62,207,142,0.15)' },
                  { label:'مغلق 🔒', val:true,  activeColor:C.red,   activeBg:'rgba(248,113,113,0.15)' },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    onClick={() => setIsBlocked(opt.val)}
                    style={{
                      padding:'7px 16px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                      background: isBlocked === opt.val ? opt.activeBg : 'transparent',
                      color: isBlocked === opt.val ? opt.activeColor : C.textMuted,
                      transition:'all 0.15s',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Custom price — only shown when not blocked */}
            <AnimatePresence>
              {!isBlocked && (
                <motion.div
                  initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                  style={{ overflow:'hidden' }}
                >
                  <label style={{ display:'block', fontSize:11, color:C.textMuted, marginBottom:6 }}>
                    سعر مخصص بالـ SAR (اتركه فارغاً للإبقاء على السعر الحالي)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder="مثال: 350"
                    style={inputStyle}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.p
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  style={{
                    background: result.ok ? C.greenDim : C.redDim,
                    border:`1px solid ${result.ok ? C.green : C.red}44`,
                    borderRadius:8, padding:'8px 12px',
                    color: result.ok ? C.green : C.red,
                    fontSize:13, margin:0,
                  }}
                >
                  {result.ok ? '✓' : '✗'} {result.msg}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Apply button */}
            <button
              onClick={handleApply}
              disabled={applying || !selection.checkIn}
              style={{
                width:'100%', padding:'12px 20px', borderRadius:8, border:'none',
                background: applying || !selection.checkIn
                  ? 'rgba(212,168,83,0.25)'
                  : isBlocked
                    ? 'linear-gradient(135deg,#ef4444,#b91c1c)'
                    : 'linear-gradient(135deg,#d4a853,#b8892a)',
                color: applying || !selection.checkIn ? C.textMuted : '#fff',
                fontWeight:700, fontSize:13,
                cursor: applying || !selection.checkIn ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                transition:'background 0.2s',
              }}
            >
              {applying ? (
                <>
                  <span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
                  جاري التطبيق...
                </>
              ) : !selection.checkIn ? (
                'حدد نطاقاً من التقويم أعلاه'
              ) : isBlocked ? (
                `🔒 حجب ${nights || 1} يوم`
              ) : (
                `✓ تطبيق على ${nights || 1} يوم${customPrice ? ` — ${customPrice} SAR` : ''}`
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function UnitsTab() {
  const [units,        setUnits]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState(null);
  const [toggling,     setToggling]    = useState(null);
  const [showModal,    setShowModal]   = useState(false);
  const [calendarUnit, setCalendarUnit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // unit pending deletion
  const [deleting,     setDeleting]    = useState(false);
  const [toast,        setToast]       = useState(null);
  
  // Unit Editor Modal (Phase 24)
  const [isModalOpen,    setIsModalOpen] = useState(false);
  const [selectedUnit,   setSelectedUnit] = useState(null);

  const handleSaveUnit = async (data) => {
    try {
      if (selectedUnit && selectedUnit.id) {
        // Edit existing unit
        await adminApi.patch(`/units/${selectedUnit.id}`, data);
      } else {
        // Add new unit (if applicable)
        await adminApi.post('/units/', data);
      }
      setIsModalOpen(false);
      showToast('تم الحفظ بنجاح', true);
      loadUnits();
    } catch (error) {
      console.error("Failed to save unit:", error);
      showToast(error.response?.data?.detail || 'فشل الحفظ', false);
    }
  };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUnits = () => {
    setLoading(true);
    adminApi.get('/units/')
      .then(r => setUnits(r.data || []))
      .catch(() => setError('Failed to load units.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const toggleField = async (unitId, field, newValue) => {
    setToggling(unitId);
    const prev = units.find(u => u.id === unitId);
    // Optimistic update
    setUnits(us => us.map(u => u.id === unitId ? { ...u, [field]: newValue } : u));
    try {
      await adminApi.patch(`/units/${unitId}`, { [field]: newValue });
      showToast(
        field === 'is_available'
          ? (newValue ? 'الوحدة متاحة الآن' : 'الوحدة مغلقة للحجز')
          : (newValue ? 'الوحدة مفعّلة' : 'الوحدة معطّلة'),
        true
      );
    } catch {
      // Revert on failure
      setUnits(us => us.map(u => u.id === unitId ? prev : u));
      showToast('فشل التحديث، حاول مجدداً', false);
    } finally {
      setToggling(null);
    }
  };

  const handleCreated = (newUnit) => {
    setUnits(us => [...us, newUnit]);
    showToast(`تمت إضافة "${newUnit.name_ar}" بنجاح`, true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/units/${deleteTarget.id}`);
      setUnits(us => us.filter(u => u.id !== deleteTarget.id));
      showToast(`تم حذف "${deleteTarget.name_ar}" بنجاح`, true);
      setDeleteTarget(null);
    } catch (e) {
      showToast(e.response?.data?.detail || 'فشل الحذف، حاول مجدداً', false);
    } finally {
      setDeleting(false);
    }
  };

  // Group by type for display
  const grouped = units.reduce((acc, u) => {
    const t = u.unit_type || 'chalet';
    if (!acc[t]) acc[t] = [];
    acc[t].push(u);
    return acc;
  }, {});

  const thStyle = {
    padding: '10px 14px', textAlign: 'left', color: C.textMuted,
    fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: '0.05em', whiteSpace: 'nowrap',
  };
  const tdStyle = { padding: '12px 14px', color: C.textPri, fontSize: 13 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ color: C.textPri, fontSize: 20, fontWeight: 700, margin: 0 }}>
            الوحدات
            <span style={{ color: C.textMuted, fontSize: 14, fontWeight: 400, marginLeft: 10 }}>
              {units.length} total
            </span>
          </h2>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '6px 0 0' }}>
            Toggle availability instantly — changes reflect on /smar/listings in real time.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg,#d4a853,#b8892a)', color: '#000',
            fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          + إضافة وحدة
        </button>
      </div>

      {loading && <div style={{ color: C.textMuted, padding: 40, textAlign: 'center' }}>Loading units…</div>}
      {error   && <div style={{ color: C.red, padding: 20 }}>{error}</div>}

      {!loading && !error && Object.keys(grouped).length === 0 && (
        <div style={{ color: C.textMuted, padding: 40, textAlign: 'center' }}>
          No units yet. Add your first unit above.
        </div>
      )}

      {/* One table per type group */}
      {Object.entries(grouped).map(([type, rows]) => (
        <div key={type} style={{ marginBottom: 36 }}>
          {/* Group heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{TYPE_ICON[type] || '🏠'}</span>
            <span style={{ color: C.gold, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {type}
            </span>
            <span style={{
              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: C.goldDim, color: C.gold, border: `1px solid ${C.gold}33`,
            }}>
              {rows.length}
            </span>
          </div>

          <div style={{ overflowX: 'auto', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.borderHi}` }}>
                  {['Image', 'Name', 'Capacity', 'Beds / Baths', 'Available', 'Active', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((u, i) => {
                  const rowBg  = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)';
                  const isBusy = toggling === u.id;
                  return (
                    <tr
                      key={u.id}
                      onClick={() => { setSelectedUnit(u); setIsModalOpen(true); }}
                      style={{
                        background:   rowBg,
                        borderBottom: `1px solid ${C.border}`,
                        opacity:      u.is_active ? 1 : 0.45,
                        transition:   'opacity 0.2s, background 0.15s',
                        cursor:       'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}
                    >
                      {/* Thumbnail */}
                      <td style={tdStyle}>
                        {u.image_url ? (
                          <img src={u.image_url} alt="" style={{
                            width: 52, height: 40, objectFit: 'cover',
                            borderRadius: 6, border: `1px solid ${C.border}`,
                          }} />
                        ) : (
                          <div style={{
                            width: 52, height: 40, borderRadius: 6,
                            background: C.bg, border: `1px solid ${C.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18,
                          }}>
                            {TYPE_ICON[u.unit_type] || '🏠'}
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{u.name_ar || '—'}</div>
                        {u.name_en && <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{u.name_en}</div>}
                      </td>

                      {/* Capacity */}
                      <td style={{ ...tdStyle, color: C.textMuted }}>
                        👥 {u.capacity}
                      </td>

                      {/* Beds / Baths */}
                      <td style={{ ...tdStyle, color: C.textMuted, whiteSpace: 'nowrap' }}>
                        {u.bedrooms != null ? `🛏 ${u.bedrooms}` : '—'}
                        {u.bathrooms != null ? `  🚿 ${u.bathrooms}` : ''}
                      </td>

                      {/* Available toggle */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Toggle
                            on={u.is_available}
                            disabled={isBusy || !u.is_active}
                            onChange={v => toggleField(u.id, 'is_available', v)}
                          />
                          <span style={{ color: u.is_available ? C.green : C.textMuted, fontSize: 11, fontWeight: 600 }}>
                            {u.is_available ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </td>

                      {/* Active toggle */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Toggle
                            on={u.is_active}
                            disabled={isBusy}
                            onChange={v => toggleField(u.id, 'is_active', v)}
                          />
                          <span style={{ color: u.is_active ? C.textMuted : C.red, fontSize: 11 }}>
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            onClick={() => setCalendarUnit(u)}
                            style={{
                              padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.gold}44`,
                              background: C.goldDim, color: C.gold,
                              fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                            }}
                          >
                            📅 إدارة
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            title="حذف الوحدة"
                            style={{
                              padding: '5px 8px', borderRadius: 6,
                              border: `1px solid ${C.red}44`,
                              background: C.redDim, color: C.red,
                              fontSize: 13, cursor: 'pointer', lineHeight: 1,
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Add unit modal */}
      {showModal && <AddUnitModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: C.surface, borderRadius: 16,
                border: `1px solid ${C.red}55`,
                padding: 32, maxWidth: 440, width: '100%',
                boxShadow: `0 0 40px ${C.red}22`,
              }}
            >
              {/* Icon */}
              <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>🗑️</div>

              {/* Title */}
              <h3 style={{ color: C.textPri, fontSize: 17, fontWeight: 700, margin: '0 0 10px', textAlign: 'center' }}>
                حذف الوحدة
              </h3>

              {/* Unit name */}
              <p style={{ color: C.gold, fontSize: 15, fontWeight: 600, textAlign: 'center', margin: '0 0 16px' }}>
                {deleteTarget.name_ar}
                {deleteTarget.name_en ? ` — ${deleteTarget.name_en}` : ''}
              </p>

              {/* Warning box */}
              <div style={{
                background: C.redDim, border: `1px solid ${C.red}44`,
                borderRadius: 10, padding: '14px 16px', marginBottom: 24,
              }}>
                <p style={{ color: C.red, fontSize: 13, margin: 0, lineHeight: 1.6, fontWeight: 600 }}>
                  ⚠️ تحذير: سيتم حذف جميع الحجوزات المرتبطة بهذه الوحدة بشكل نهائي.
                </p>
                <p style={{ color: C.red, fontSize: 12, margin: '8px 0 0', opacity: 0.75, lineHeight: 1.5 }}>
                  يشمل ذلك سجلات الأسعار والتواريخ المحجوزة. هذا الإجراء لا يمكن التراجع عنه.
                </p>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 8,
                    border: `1px solid ${C.border}`, background: 'transparent',
                    color: C.textMuted, fontSize: 14, cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 8,
                    border: 'none', background: C.red,
                    color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {deleting ? '…جاري الحذف' : 'نعم، احذف الوحدة'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar manager modal */}
      {calendarUnit && <CalendarManagerModal unit={calendarUnit} onClose={() => setCalendarUnit(null)} />}

      {/* Unit Edit Modal (Phase 24) */}
      <UnitFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unit={selectedUnit}
        onSave={handleSaveUnit}
        onImagesChange={(imgs) =>
          setUnits(us => us.map(u =>
            u.id === selectedUnit?.id
              ? { ...u, images: imgs, image_url: imgs[0] ?? null }
              : u
          ))
        }
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 28, right: 28, padding: '12px 20px',
              borderRadius: 10, zIndex: 9999, backdropFilter: 'blur(12px)',
              background: toast.ok ? C.greenDim : C.redDim,
              border: `1px solid ${toast.ok ? C.green : C.red}44`,
              color: toast.ok ? C.green : C.red,
              fontSize: 14, fontWeight: 600,
            }}
          >
            {toast.ok ? '✓' : '✗'} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Trial lifecycle UI ─────────────────────────────────────────────────────────

function TrialBanner() {
  const status  = localStorage.getItem('tenant_status');
  const endsAt  = localStorage.getItem('trial_ends_at');
  if (!status || status === 'active' || status === 'demo') return null;
  const daysLeft = endsAt
    ? Math.max(0, Math.ceil((new Date(endsAt) - Date.now()) / 86_400_000))
    : null;
  if (daysLeft === 0) return null; // shown by ExpiredModal instead
  return (
    <div style={{
      marginBottom: 24,
      padding: '10px 18px',
      borderRadius: 12,
      background: 'rgba(212,168,83,0.07)',
      border: '1px solid rgba(212,168,83,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <span style={{ color: C.gold, fontSize: 13, fontWeight: 600 }}>
        ⏳ تجربتك المجانية تنتهي خلال{' '}
        {daysLeft !== null ? `${daysLeft} يوم` : 'قريباً'}
      </span>
      <a
        href="https://wa.me/96178727986?text=أريد تفعيل حسابي على SalmanSaaS"
        target="_blank" rel="noreferrer"
        style={{
          padding: '6px 14px', borderRadius: 8,
          background: 'rgba(212,168,83,0.15)',
          border: '1px solid rgba(212,168,83,0.3)',
          color: C.gold, fontSize: 12, fontWeight: 700,
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >
        تواصل معنا للتفعيل ←
      </a>
    </div>
  );
}

function ExpiredModal() {
  const status  = localStorage.getItem('tenant_status');
  const endsAt  = localStorage.getItem('trial_ends_at');
  const daysLeft = endsAt
    ? Math.ceil((new Date(endsAt) - Date.now()) / 86_400_000)
    : null;
  const show = status === 'expired' || (daysLeft !== null && daysLeft <= 0);
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backdropFilter: 'blur(16px) brightness(0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10,10,15,0.75)',
    }}>
      <div style={{
        maxWidth: 400, width: '90%',
        background: 'hsl(240 8% 9%)',
        border: '1px solid rgba(212,168,83,0.2)',
        borderRadius: 20, padding: '40px 32px',
        textAlign: 'center', boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: C.textPri, fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>
          انتهت فترة التجربة
        </h2>
        <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, margin: '0 0 28px' }}>
          لقد انتهت تجربتك المجانية. تواصل معنا لتفعيل حسابك والاستمرار في استخدام المنصة.
        </p>
        <a
          href="https://wa.me/96178727986?text=أريد تفعيل حسابي على SalmanSaaS"
          target="_blank" rel="noreferrer"
          style={{
            display: 'block', width: '100%', padding: '13px 0',
            borderRadius: 12, textDecoration: 'none',
            background: 'linear-gradient(135deg, #d4a853 0%, #b8892e 100%)',
            color: '#0a0a0f', fontWeight: 700, fontSize: 14,
            boxShadow: '0 4px 22px rgba(212,168,83,0.3)',
          }}
        >
          تواصل معنا عبر واتساب
        </a>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
function UnauthorizedTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 12 }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <h2 style={{ color: C.textPri, fontSize: 20, fontWeight: 700, margin: 0 }}>غير مصرح لك</h2>
      <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>ليس لديك صلاحية الوصول إلى هذا القسم</p>
    </div>
  );
}

export default function SmarAdminDashboard() {
  const role = useAdminRole();
  const allowedTabs = ROLE_TABS[role] ?? [];
  const defaultTab = allowedTabs[0] ?? 'dashboard';
  const navigate = useNavigate();
  const { slug: paramSlug, '*': urlTab } = useParams();

  // Subdomain mode (/admin/*) has no slug param — fall back to JWT/URL resolution
  const slug = paramSlug || getTenantSlug();

  // Detect route context: /demo/:slug/*, /:slug/admin/*, /admin/*, /dashboard/*
  const _pathParts   = window.location.pathname.split('/').filter(Boolean);
  const _isDemoPath  = _pathParts[0] === 'demo';
  const _isAdminPath = _pathParts[0] === 'admin' || _pathParts[1] === 'admin';
  const dashBase = paramSlug
    ? (_isDemoPath  ? `/demo/${paramSlug}`
       : _isAdminPath ? `/${paramSlug}/admin`
       : `/dashboard/${paramSlug}`)
    : (_isAdminPath ? '/admin' : '/dashboard');

  // Read active tab from URL wildcard segment
  const tabFromUrl = urlTab?.split('/')[0];
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && allowedTabs.includes(tabFromUrl) ? tabFromUrl : defaultTab
  );

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Keep URL in sync when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`${dashBase}/${tab}`, { replace: true });
  };

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token');
    if (!token) { navigate('/login', { replace: true }); return; }
    // SUPER_ADMIN belongs in ClientsManager, not in tenant dashboard
    if (role === 'SUPER_ADMIN') { navigate('/super/clients', { replace: true }); return; }
  }, [navigate, role]);

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    navigate('/login', { replace: true });
  };

  const renderTab = () => {
    if (!canAccessTab(role, activeTab)) return <UnauthorizedTab />;
    if (activeTab === 'inbox')        return <ActionInbox     />;
    if (activeTab === 'bookings')     return <BookingsTab     />;
    if (activeTab === 'units')        return <UnitsTab        />;
    if (activeTab === 'gallery')      return <GalleryTab      />;
    if (activeTab === 'services')     return <ServicesTab     />;
    if (activeTab === 'dashboard')    return <OverviewTab     />;
    if (activeTab === 'housekeeping') return <HousekeepingTab />;
    if (activeTab === 'maintenance')  return <MaintenanceTab  />;
    if (activeTab === 'gardens')      return <GardensTab      />;
    if (activeTab === 'settings')     return <SettingsTab     />;
    if (activeTab === 'pagebuilder')  return <VisualBuilder   />;
    if (activeTab === 'team')         return <TeamTab         />;
    return null;
  };

  return (
    <div style={{
      display:        'flex',
      minHeight:      '100vh',
      background:     C.bg,
      fontFamily:     "'Inter', 'Segoe UI', sans-serif",
      color:          C.textPri,
    }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        role={role}
        slug={slug}
      />

      {/* Main content */}
      <div style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        <TrialBanner />
        {/* Top bar */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   40,
          paddingBottom:  20,
          borderBottom:   `1px solid ${C.border}`,
        }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.14em', color: C.textMuted, marginBottom: 4 }}>
              {slug ? slug.toUpperCase() : 'TENANT'} · ADMIN PORTAL
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.textPri, letterSpacing: '-0.02em' }}>
              {{
                inbox:        '🛎️ Action Inbox',
                bookings:     'Reservations',
                units:        'الوحدات — Unit Management',
                gallery:      '🖼️ معرض الصور — Gallery Manager',
                services:     '✨ الخدمات الإضافية',
                dashboard:    'Overview',
                housekeeping: 'Housekeeping',
                maintenance:  'Maintenance',
                gardens:      'Gardens & Landscaping',
                settings:     'إعدادات المنصة ⚙️',
                pagebuilder:  '🎨 Page Builder',
                team:         'إدارة الفريق 👥',
              }[activeTab] || 'Dashboard'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {role && (
              <div style={{
                padding: '6px 12px', borderRadius: 20,
                background: 'rgba(212,168,83,0.08)',
                border: '1px solid rgba(212,168,83,0.2)',
                color: C.gold, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              }}>
                {role.replace(/_/g, ' ')}
              </div>
            )}
            <div style={{
              padding:      '8px 16px',
              borderRadius: 20,
              background:   C.greenDim,
              border:       `1px solid ${C.green}33`,
              color:        C.green,
              fontSize:     12,
              fontWeight:   600,
            }}>
              ● Live
            </div>
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
      <ExpiredModal />
    </div>
  );
}
