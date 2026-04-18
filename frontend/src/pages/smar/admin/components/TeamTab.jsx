/**
 * TeamTab.jsx — Team Management
 *
 * Lists all staff/managers for this tenant and allows adding new ones.
 * DELETE does a soft-deactivation (is_active = false).
 *
 * Auth: adminApi injects Bearer token automatically.
 */

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import adminApi from '../../../../utils/admin.config';

// ── Palette (matches SmarAdminDashboard) ─────────────────────────────────────
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
  blue:      '#7c9eff',
  blueDim:   'rgba(124,158,255,0.12)',
};

const ROLE_CONFIG = {
  admin:   { label: 'مدير',    labelEn: 'Admin',   color: C.gold,  bg: C.goldDim  },
  manager: { label: 'موظف',   labelEn: 'Manager', color: C.blue,  bg: C.blueDim  },
};

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 8,
  background: C.bg, border: `1px solid ${C.border}`,
  color: C.textPri, fontSize: 13, outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};
const labelStyle = {
  display: 'block', color: C.textMuted, fontSize: 11,
  marginBottom: 6, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-LB', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({ onClose, onCreated }) {
  const EMPTY = { full_name: '', email: '', password: '', role: 'manager' };
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { setError('الاسم الكامل مطلوب'); return; }
    if (!form.email.trim())     { setError('البريد الإلكتروني مطلوب'); return; }
    if (form.password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

    setSaving(true);
    setError('');
    try {
      const { data } = await adminApi.post('/team', form);
      onCreated(data);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail;
      setError(msg || 'فشل إنشاء العضو — حاول مجدداً');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
        onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          style={{
            width: '100%', maxWidth: 480,
            background: C.surface,
            border: `1px solid ${C.borderHi}`,
            borderRadius: 18,
            padding: '32px 32px 28px',
            position: 'relative',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Top gold line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,168,83,0.5), transparent)',
            borderRadius: '18px 18px 0 0',
          }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h2 style={{ color: C.textPri, fontSize: 18, fontWeight: 700, margin: 0 }}>
                إضافة عضو جديد
              </h2>
              <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>
                Add New Team Member
              </p>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
              color: C.textMuted, fontSize: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = C.textPri; e.currentTarget.style.borderColor = C.borderHi; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}
            >×</button>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>الاسم الكامل *</label>
              <input style={inputStyle} value={form.full_name}
                onChange={e => set('full_name', e.target.value)} placeholder="سلمان حسام" dir="rtl" />
            </div>
            <div>
              <label style={labelStyle}>البريد الإلكتروني *</label>
              <input style={{ ...inputStyle, fontFamily: 'monospace' }}
                type="email" value={form.email} dir="ltr"
                onChange={e => set('email', e.target.value)} placeholder="staff@beitsmar.com" />
            </div>
            <div>
              <label style={labelStyle}>كلمة المرور *</label>
              <input style={inputStyle} type="password" value={form.password}
                onChange={e => set('password', e.target.value)} placeholder="6+ أحرف" />
            </div>
            <div>
              <label style={labelStyle}>الصلاحية</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { id: 'manager', ar: 'موظف', en: 'Manager', desc: 'إدارة الحجوزات' },
                  { id: 'admin',   ar: 'مدير',  en: 'Admin',   desc: 'صلاحيات كاملة' },
                ].map(r => (
                  <button
                    key={r.id} type="button"
                    onClick={() => set('role', r.id)}
                    style={{
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      textAlign: 'right', border: `1px solid ${form.role === r.id ? ROLE_CONFIG[r.id].color + '55' : C.border}`,
                      background: form.role === r.id ? ROLE_CONFIG[r.id].bg : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ color: form.role === r.id ? ROLE_CONFIG[r.id].color : C.textPri, fontWeight: 600, fontSize: 13 }}>
                      {r.ar} <span style={{ color: C.textMuted, fontWeight: 400 }}>/ {r.en}</span>
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

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
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: 'transparent', color: C.textMuted, fontSize: 13, cursor: 'pointer',
            }}>
              إلغاء
            </button>
            <button onClick={handleSubmit} disabled={saving} style={{
              padding: '10px 28px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700,
              background: saving ? 'rgba(212,168,83,0.4)' : 'linear-gradient(135deg,#d4a853,#b8892a)',
              color: '#000', cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s',
            }}>
              {saving ? 'جاري الإنشاء…' : '+ إضافة العضو'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main TeamTab ──────────────────────────────────────────────────────────────
export default function TeamTab() {
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [removing,   setRemoving]   = useState(null);  // user id being deactivated
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, ok) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadMembers = useCallback(() => {
    setLoading(true);
    adminApi.get('/team')
      .then(r => setMembers(r.data || []))
      .catch(() => showToast('فشل تحميل أعضاء الفريق', false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleCreated = (member) => {
    setMembers(prev => [...prev, member]);
    showToast(`تمت إضافة "${member.full_name}" بنجاح`, true);
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`هل تريد إلغاء تفعيل "${name}"؟`)) return;
    setRemoving(id);
    try {
      await adminApi.delete(`/team/${id}`);
      setMembers(prev => prev.map(m => m.id === id ? { ...m, is_active: false } : m));
      showToast(`تم إلغاء تفعيل "${name}"`, true);
    } catch {
      showToast('فشل إلغاء التفعيل', false);
    } finally {
      setRemoving(null);
    }
  };

  const activeMembers   = members.filter(m => m.is_active);
  const inactiveMembers = members.filter(m => !m.is_active);

  const thStyle = {
    padding: '10px 16px', textAlign: 'right', color: C.textMuted,
    fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: '0.05em', whiteSpace: 'nowrap',
    borderBottom: `1px solid ${C.borderHi}`,
  };
  const tdStyle = {
    padding: '14px 16px', color: C.textPri, fontSize: 13,
    borderBottom: `1px solid ${C.border}`,
  };

  return (
    <div style={{ maxWidth: 860, position: 'relative' }}>

      {/* ── Header row ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ color: C.textPri, fontSize: 20, fontWeight: 700, margin: 0 }}>
            الفريق
            <span style={{ color: C.textMuted, fontSize: 14, fontWeight: 400, marginRight: 10 }}>
              {activeMembers.length} عضو نشط
            </span>
          </h2>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '6px 0 0' }}>
            Manage staff and admin accounts for this tenant.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg,#d4a853,#b8892a)', color: '#000',
            fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 16px rgba(212,168,83,0.3)',
          }}
        >
          + إضافة عضو جديد
        </button>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ color: C.textMuted, padding: '60px 0', textAlign: 'center', fontSize: 13 }}>
          جاري التحميل…
        </div>
      )}

      {/* ── Active members table ──────────────────────────────────────── */}
      {!loading && activeMembers.length === 0 && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: '60px 0', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
          <p style={{ color: C.textMuted, fontSize: 14 }}>لا يوجد أعضاء بعد — أضف أول عضو في فريقك.</p>
        </div>
      )}

      {!loading && activeMembers.length > 0 && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 14, overflow: 'hidden', marginBottom: 24,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['العضو', 'البريد الإلكتروني', 'الصلاحية', 'تاريخ الإضافة', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeMembers.map(m => {
                const role = ROLE_CONFIG[m.role] || ROLE_CONFIG.manager;
                return (
                  <tr key={m.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Avatar + name */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: `${role.color}22`,
                          border: `1px solid ${role.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, color: role.color, flexShrink: 0,
                        }}>
                          {m.full_name?.[0] ?? '?'}
                        </div>
                        <span style={{ fontWeight: 500 }}>{m.full_name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: C.textMuted }}>
                      {m.email}
                    </td>

                    {/* Role badge */}
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: role.bg, color: role.color,
                        border: `1px solid ${role.color}22`,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: role.color }} />
                        {role.label} / {role.labelEn}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ ...tdStyle, color: C.textMuted, fontSize: 12 }}>
                      {fmtDate(m.created_at)}
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeactivate(m.id, m.full_name)}
                        disabled={removing === m.id}
                        style={{
                          padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${C.red}33`, background: 'transparent',
                          color: C.red, cursor: removing === m.id ? 'wait' : 'pointer',
                          opacity: removing === m.id ? 0.4 : 1, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = C.redDim}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {removing === m.id ? '…' : 'إلغاء التفعيل'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Inactive members (collapsed section) ─────────────────────── */}
      {!loading && inactiveMembers.length > 0 && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: '16px 20px',
        }}>
          <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>
            {inactiveMembers.length} عضو غير نشط (مُلغى التفعيل)
            {inactiveMembers.map(m => (
              <span key={m.id} style={{ marginRight: 8, color: C.textMuted }}>
                · {m.full_name}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {showModal && (
        <AddMemberModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 28, right: 28,
              padding: '12px 20px', borderRadius: 10,
              zIndex: 9999, backdropFilter: 'blur(12px)',
              background: toast.ok ? C.greenDim : C.redDim,
              border: `1px solid ${toast.ok ? C.green : C.red}44`,
              color:  toast.ok ? C.green : C.red,
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
