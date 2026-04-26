/**
 * ClientsManager.jsx — Super Admin Control Room
 * Route: /super/clients (localhost) | auth.salmansaas.com/super/clients (prod)
 * Access: SUPER_ADMIN role only (enforced backend + frontend)
 *
 * Calls:
 *   GET  /api/v1/super/clients
 *   PATCH /api/v1/super/clients/{id}/status
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAdminRole } from '../../utils/useAdminRole';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Palette (matches SmarAdminDashboard) ──────────────────────────────────────
const C = {
  bg:        '#0a0a0f',
  surface:   '#12121a',
  surfaceHi: '#1a1a28',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.14)',
  textPri:   '#f0f0f5',
  textMuted: '#6b6b80',
  gold:      '#d4a853',
  goldDim:   'rgba(212,168,83,0.10)',
  green:     '#3ecf8e',
  greenDim:  'rgba(62,207,142,0.10)',
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.10)',
  amber:     '#fbbf24',
  amberDim:  'rgba(251,191,36,0.08)',
  purple:    '#a78bfa',
  purpleDim: 'rgba(167,139,250,0.10)',
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  trial:     { label: 'Trial',     fg: C.amber,  bg: C.amberDim  },
  active:    { label: 'Active',    fg: C.green,  bg: C.greenDim  },
  demo:      { label: 'Demo',      fg: C.purple, bg: C.purpleDim },
  suspended: { label: 'Suspended', fg: C.red,    bg: C.redDim    },
  expired:   { label: 'Expired',   fg: C.red,    bg: C.redDim    },
};

const SERVICE_LABELS = {
  real_estate: '🏠 عقارات',
  restaurant:  '🍽️ مطعم',
  hotel:       '🏨 فندق',
  sports:      '⚽ رياضة',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.trial;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg,
      color: cfg.fg,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ── Action menu ───────────────────────────────────────────────────────────────
const ACTION_ITEMS = [
  { action: 'active',    label: '✅ تفعيل',          color: C.green },
  { action: 'suspended', label: '🛑 إيقاف',           color: C.red   },
  { action: 'trial',     label: '🔄 إعادة تجربة',     color: C.amber },
  { action: 'demo',      label: '🎭 تحويل لـ Demo',   color: C.purple },
];

function ActionMenu({ clientId, current, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function apply(status) {
    if (status === current || busy) return;
    setBusy(true);
    setOpen(false);
    await onUpdate(clientId, status);
    setBusy(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={busy}
        style={{
          padding: '5px 14px', borderRadius: 8,
          background: busy ? 'rgba(255,255,255,0.03)' : C.goldDim,
          border: `1px solid ${busy ? C.border : 'rgba(212,168,83,0.3)'}`,
          color: busy ? C.textMuted : C.gold,
          fontSize: 12, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {busy ? '...' : 'إجراء ▾'}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 49 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                zIndex: 50, minWidth: 160,
                background: C.surfaceHi,
                border: `1px solid ${C.borderHi}`,
                borderRadius: 10, padding: 6,
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              }}
            >
              {ACTION_ITEMS.map(item => (
                <button
                  key={item.action}
                  onClick={() => apply(item.action)}
                  disabled={item.action === current}
                  style={{
                    display: 'block', width: '100%',
                    padding: '8px 12px', borderRadius: 7,
                    background: item.action === current ? 'rgba(255,255,255,0.03)' : 'transparent',
                    border: 'none', cursor: item.action === current ? 'default' : 'pointer',
                    color: item.action === current ? C.textMuted : item.color,
                    fontSize: 12, fontWeight: 600, textAlign: 'right',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (item.action !== current) e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { e.target.style.background = item.action === current ? 'rgba(255,255,255,0.03)' : 'transparent'; }}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ClientsManager() {
  const navigate = useNavigate();
  const role = useAdminRole();

  const [clients,   setClients]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [filter,    setFilter]    = useState('all');  // all | trial | active | suspended
  const [toastMsg,  setToastMsg]  = useState('');

  // Redirect non-super-admins immediately
  useEffect(() => {
    if (role !== null && role !== 'SUPER_ADMIN') {
      navigate('/login', { replace: true });
    }
  }, [role, navigate]);

  function getToken() {
    return localStorage.getItem('admin_access_token') || '';
  }

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`${API_BASE}/api/v1/super/clients`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setClients(data.data ?? []);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate('/login', { replace: true });
      } else if (err?.response?.status === 403) {
        setError('ليس لديك صلاحية الوصول إلى هذه الصفحة.');
      } else {
        setError('فشل تحميل البيانات. تحقق من الاتصال.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function handleStatusUpdate(clientId, newStatus) {
    // Optimistic update
    setClients(prev =>
      prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c)
    );
    try {
      await axios.patch(
        `${API_BASE}/api/v1/super/clients/${clientId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      showToast(`✅ تم تحديث الحالة إلى "${newStatus}"`);
    } catch {
      // Revert on failure
      fetchClients();
      showToast('❌ فشل التحديث — تم الإلغاء');
    }
  }

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  const filtered = filter === 'all'
    ? clients
    : clients.filter(c => c.status === filter);

  // ── KPI counts ──────────────────────────────────────────────────────────────
  const kpis = {
    total:     clients.length,
    trial:     clients.filter(c => c.status === 'trial').length,
    active:    clients.filter(c => c.status === 'active').length,
    suspended: clients.filter(c => c.status === 'suspended' || c.status === 'expired').length,
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: C.textPri, padding: '40px 48px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', color: C.textMuted, marginBottom: 6 }}>
          SALMANSAAS · SUPER ADMIN
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          👑 Control Room — Tenant Management
        </h1>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        {[
          { label: 'إجمالي المنشآت', value: kpis.total,     color: C.gold  },
          { label: 'قيد التجربة',    value: kpis.trial,     color: C.amber },
          { label: 'مفعّلة',         value: kpis.active,    color: C.green },
          { label: 'موقوفة / منتهية', value: kpis.suspended, color: C.red   },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '20px 24px',
          }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'trial', 'active', 'suspended'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px', borderRadius: 20,
              background: filter === f ? C.goldDim : 'transparent',
              border: `1px solid ${filter === f ? 'rgba(212,168,83,0.35)' : C.border}`,
              color: filter === f ? C.gold : C.textMuted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f === 'all' ? 'الكل' : f === 'trial' ? 'تجربة' : f === 'active' ? 'مفعّل' : 'موقوف'}
          </button>
        ))}
        <button
          onClick={fetchClients}
          style={{
            marginRight: 'auto', padding: '6px 14px', borderRadius: 20,
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.textMuted, fontSize: 12, cursor: 'pointer',
          }}
        >
          ↻ تحديث
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: C.redDim, border: `1px solid rgba(248,113,113,0.2)`,
          color: C.red, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr 1fr 1fr 0.8fr 0.9fr',
          padding: '12px 20px',
          borderBottom: `1px solid ${C.border}`,
          background: 'rgba(255,255,255,0.02)',
        }}>
          {['اسم المنشأة', 'الرابط (Slug)', 'نوع الخدمة', 'الحالة', 'الأيام المتبقية', 'إجراء'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.08em' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
            جاري التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
            لا توجد نتائج
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1fr 1fr 0.8fr 0.9fr',
                  padding: '14px 20px',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                  alignItems: 'center',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Name */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.textPri }}>
                    {c.name_ar || c.name}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {c.name}
                  </div>
                </div>

                {/* Slug */}
                <div style={{
                  fontFamily: 'monospace', fontSize: 12,
                  color: C.gold, opacity: 0.85,
                }}>
                  {c.slug}.salmansaas.com
                </div>

                {/* Service type */}
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  {SERVICE_LABELS[c.service_type] || c.service_type || '—'}
                </div>

                {/* Status badge */}
                <div><StatusBadge status={c.status} /></div>

                {/* Days left */}
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: c.days_left === 0 ? C.red
                    : c.days_left <= 3 ? C.red
                    : c.days_left <= 7 ? C.amber
                    : C.textMuted,
                }}>
                  {c.status === 'active' || c.status === 'demo'
                    ? <span style={{ color: C.green }}>∞</span>
                    : c.days_left !== null ? `${c.days_left}d` : '—'}
                </div>

                {/* Actions */}
                <div>
                  <ActionMenu
                    clientId={c.id}
                    current={c.status}
                    onUpdate={handleStatusUpdate}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 32, left: '50%',
              transform: 'translateX(-50%)',
              background: C.surfaceHi,
              border: `1px solid ${C.borderHi}`,
              borderRadius: 12,
              padding: '10px 20px',
              color: C.textPri, fontSize: 13, fontWeight: 600,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 1000, whiteSpace: 'nowrap',
            }}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
