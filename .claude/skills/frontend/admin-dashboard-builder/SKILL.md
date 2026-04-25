---
name: admin-dashboard-builder
description: Activate when building any tab, modal, or component inside SmarAdminDashboard. Enforces the GS MAR dark theme, data table patterns, KPI cards, and modal architecture used in this project.
user-invocable: true
---

# Admin Dashboard Builder
**Stack:** React 18 + Framer Motion + inline styles (no Tailwind in admin) + adminApi (axios)

Activate when the user says "build a tab", "add a dashboard feature", "create a modal", or "admin UI".

---

## 1. Design Palette (Copy Exactly — Don't Invent Colors)

```js
const C = {
  bg:        '#0a0a0f',      // page background
  surface:   '#12121a',      // cards, tables, modals
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.14)',  // hover/active border
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
```

---

## 2. Tab Structure Pattern

Every tab is a self-contained component. Follow this structure:

```jsx
export default function MyNewTab({ slug }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    adminApi.get(`/my-endpoint/?client_slug=${slug}`)
      .then(r => setData(r.data.data || r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorState message={error} />;

  return (
    <div style={{ padding: '24px 0' }}>
      <TabHeader title="اسم التاب" subtitle="Tab Name" action={<ActionButton />} />
      <DataTable data={data} columns={COLUMNS} />
    </div>
  );
}
```

---

## 3. KPI Strip Pattern

```jsx
function KpiStrip({ stats }) {
  const kpis = [
    { label: 'إجمالي الحجوزات', labelEn: 'Total Bookings', value: stats.total,   color: C.gold  },
    { label: 'قيد الانتظار',     labelEn: 'Pending',        value: stats.pending, color: C.amber },
    { label: 'مؤكدة',            labelEn: 'Confirmed',      value: stats.confirmed, color: C.green },
    { label: 'الإيراد الشهري',   labelEn: 'Monthly Revenue', value: `$${stats.revenue}`, color: C.gold },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
      {kpis.map(k => (
        <div key={k.labelEn} style={{
          background: C.surface,
          border:     `1px solid ${C.border}`,
          borderRadius: 12,
          padding:    '16px 20px',
        }}>
          <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            {k.label}
          </div>
          <div style={{ color: k.color, fontSize: 28, fontWeight: 700 }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}
```

---

## 4. Data Table Pattern

```jsx
function DataTable({ data, onAction }) {
  return (
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: GRID_TEMPLATE,
        padding: '12px 20px',
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(255,255,255,0.02)',
      }}>
        {COLUMNS.map(col => (
          <span key={col.key} style={{ color: C.textMuted, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {col.label}
          </span>
        ))}
      </div>

      {/* Rows */}
      <AnimatePresence>
        {data.map((row, i) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            style={{
              display: 'grid', gridTemplateColumns: GRID_TEMPLATE,
              padding: '14px 20px',
              borderBottom: `1px solid ${C.border}`,
              alignItems: 'center',
            }}
          >
            {/* cells */}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

---

## 5. Modal Pattern (GS MAR Dark)

```jsx
function AdminModal({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000,
                     backdropFilter:'blur(4px)' }}
          />
          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity:0, scale:0.95, y:20 }}
            animate={{ opacity:1, scale:1,    y:0  }}
            exit={{    opacity:0, scale:0.95, y:20 }}
            transition={{ type:'spring', stiffness:300, damping:25 }}
            style={{
              position:'fixed', top:'50%', left:'50%',
              transform:'translate(-50%,-50%)',
              zIndex:1001,
              background:    C.surface,
              border:        `1px solid ${C.borderHi}`,
              borderRadius:  16,
              padding:       '28px 32px',
              width:         '90vw', maxWidth: 560,
              maxHeight:     '85vh', overflowY: 'auto',
              boxShadow:     '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ color:C.textPri, fontSize:18, fontWeight:700, margin:0 }}>{title}</h2>
              <button onClick={onClose}
                style={{ background:'none', border:'none', color:C.textMuted, fontSize:20, cursor:'pointer' }}>
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 6. Form Input Pattern

```jsx
function AdminInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display:'block', color:C.textMuted, fontSize:11,
                      letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:'100%', boxSizing:'border-box',
          background:'rgba(255,255,255,0.04)',
          border:`1px solid ${C.border}`,
          borderRadius:8,
          padding:'10px 14px',
          color:C.textPri,
          fontSize:14,
          outline:'none',
          colorScheme:'dark',
          transition:'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = C.gold}
        onBlur={e  => e.target.style.borderColor = C.border}
      />
    </div>
  );
}
```

---

## 7. Action Button Pattern

```jsx
// Primary gold button
function GoldButton({ children, onClick, loading, disabled }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading || disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type:'spring', stiffness:300, damping:25 }}
      style={{
        background:    loading ? C.goldDim : C.gold,
        color:         '#0a0a0f',
        border:        'none',
        borderRadius:  8,
        padding:       '10px 22px',
        fontSize:      14,
        fontWeight:    700,
        cursor:        loading ? 'not-allowed' : 'pointer',
        letterSpacing: '0.04em',
      }}
    >
      {loading ? '...' : children}
    </motion.button>
  );
}

// Ghost / secondary button
function GhostButton({ children, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        background:   'transparent',
        color:        C.textMuted,
        border:       `1px solid ${C.border}`,
        borderRadius: 8,
        padding:      '10px 20px',
        fontSize:     14,
        cursor:       'pointer',
      }}
    >
      {children}
    </motion.button>
  );
}
```

---

## 8. API Pattern (adminApi)

```js
import adminApi from '../../../utils/admin.config';

// Always pass client_slug as query param
const fetchBookings = async (slug, filters = {}) => {
  const params = new URLSearchParams({ client_slug: slug, ...filters });
  const { data } = await adminApi.get(`/bookings/?${params}`);
  return data;
};

// PATCH status
const updateStatus = async (bookingId, status) => {
  await adminApi.patch(`/bookings/${bookingId}/status`, { status });
};

// POST create
const createUnit = async (slug, unitData) => {
  const { data } = await adminApi.post(`/units/?client_slug=${slug}`, unitData);
  return data;
};
```

---

## 9. Tab Registration

To add a new tab to `SmarAdminDashboard`, follow this checklist:

```js
// 1. Add to TABS array in SmarAdminDashboard.jsx:
{ id: 'my-tab', labelAr: 'التاب', labelEn: 'My Tab', icon: '📋',
  roles: ['SUPER_ADMIN', 'TENANT_ADMIN'] }

// 2. Add to renderTab() switch:
case 'my-tab':
  return <MyNewTab slug={slug} />;

// 3. Add to ROLE_TABS in useAdminRole.js:
MANAGER_RESERVATIONS: ['overview', 'reservations', 'action-inbox', 'my-tab'],
```

---

## 10. Loading & Error States

```jsx
function LoadingSpinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width:32, height:32, borderRadius:'50%',
                 border:`2px solid ${C.border}`,
                 borderTopColor: C.gold }}
      />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 0' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
      <p style={{ color:C.red, fontSize:14 }}>{message}</p>
      {onRetry && <GhostButton onClick={onRetry}>إعادة المحاولة</GhostButton>}
    </div>
  );
}
```

---

## 11. Which Tab to Build Next (Priority Order)

Based on `roadmap_audit_april.md` gaps:

| Tab | Status | Priority |
|-----|--------|----------|
| Gallery Tab | 🔴 Missing | Build next |
| Unit image upload | 🔴 Missing | Add to UnitFormModal |
| Settings Tab (verify) | 🟡 Exists but verify | Check SettingsTab.jsx |
| Housekeeping Tab | 🟢 Post-launch | ComingSoonTab for now |
| CSV Export button | 🟡 Medium | Add to Reservations header |
