/**
 * ServicesTab.jsx
 * Admin CRUD for Add-on Services — GS MAR dark theme.
 * Mounted inside SmarAdminDashboard under the "services" tab.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }           from 'framer-motion';
import adminApi                              from '../../../../utils/admin.config';

const C = {
  bg:       '#0a0a0f',
  surface:  '#12121a',
  card:     '#1a1a26',
  border:   'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.14)',
  text:     '#f0f0f5',
  textSec:  'rgba(240,240,245,0.60)',
  textMuted:'rgba(240,240,245,0.35)',
  gold:     '#d4a853',
  goldDim:  'rgba(212,168,83,0.12)',
  goldBorder:'rgba(212,168,83,0.30)',
  green:    '#3ecf8e',
  greenDim: 'rgba(62,207,142,0.10)',
  red:      '#f87171',
  redDim:   'rgba(248,113,113,0.10)',
};

// ── Service Form Modal ────────────────────────────────────────────────────────
function ServiceModal({ service, onClose, onSaved }) {
  const isEdit = !!service?.id;
  const [form, setForm] = useState({
    name_ar:     service?.name_ar     ?? '',
    name_en:     service?.name_en     ?? '',
    description: service?.description ?? '',
    base_price:  service?.base_price  ?? '',
    duration:    service?.duration    ?? '',
    sort_order:  service?.sort_order  ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.name_ar.trim() || !form.name_en.trim() || form.base_price === '') {
      setErr('الاسم بالعربي، الاسم بالإنجليزي، والسعر إلزامية.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const payload = {
        ...form,
        base_price: parseFloat(form.base_price),
        duration:   form.duration ? parseInt(form.duration) : null,
        sort_order: parseInt(form.sort_order) || 0,
      };
      if (isEdit) {
        const { data } = await adminApi.patch(`/services/${service.id}`, payload);
        onSaved(data, 'edit');
      } else {
        const { data } = await adminApi.post('/services/', payload);
        onSaved(data, 'create');
      }
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'حدث خطأ. حاول مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.border}`, borderRadius: 10,
    padding: '11px 14px', color: C.text, fontSize: '0.88rem',
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: '0.68rem', color: C.textMuted, letterSpacing: '0.13em', textTransform: 'uppercase', marginBottom: 7 };

  return (
    <motion.div
      key="service-modal-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={e => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.borderHi}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        <h3 style={{ color: C.text, fontSize: '1.15rem', fontWeight: 700, margin: '0 0 24px' }}>
          {isEdit ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>الاسم بالعربية *</label>
            <input name="name_ar" value={form.name_ar} onChange={handle} placeholder="مثال: دخول المسبح" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>الاسم بالإنجليزية *</label>
            <input name="name_en" value={form.name_en} onChange={handle} placeholder="e.g. Pool Access" style={inputStyle} dir="ltr" />
          </div>
          <div>
            <label style={labelStyle}>الوصف (اختياري)</label>
            <textarea name="description" value={form.description} onChange={handle} rows={2}
              placeholder="وصف مختصر للخدمة..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>السعر (SAR) *</label>
              <input name="base_price" type="number" min="0" step="0.01" value={form.base_price} onChange={handle} placeholder="50" style={inputStyle} dir="ltr" />
            </div>
            <div>
              <label style={labelStyle}>المدة (دقيقة)</label>
              <input name="duration" type="number" min="0" value={form.duration} onChange={handle} placeholder="60" style={inputStyle} dir="ltr" />
            </div>
            <div>
              <label style={labelStyle}>الترتيب</label>
              <input name="sort_order" type="number" min="0" value={form.sort_order} onChange={handle} placeholder="0" style={inputStyle} dir="ltr" />
            </div>
          </div>
        </div>

        {err && (
          <p style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: C.redDim, border: `1px solid ${C.red}33`, color: C.red, fontSize: '0.82rem' }}>
            {err}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSec, cursor: 'pointer', fontSize: '0.88rem' }}>
            إلغاء
          </button>
          <motion.button
            onClick={handleSave} disabled={saving}
            whileHover={!saving ? { scale: 1.02 } : {}} whileTap={!saving ? { scale: 0.97 } : {}}
            style={{ padding: '10px 24px', borderRadius: 10, background: saving ? 'rgba(212,168,83,0.4)' : 'linear-gradient(135deg, #d4a853, #b8892a)', border: 'none', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.88rem' }}
          >
            {saving ? '...' : isEdit ? 'حفظ التعديلات' : 'إضافة الخدمة'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Service Card ──────────────────────────────────────────────────────────────
function ServiceCard({ service, onEdit, onToggle, onDelete }) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const { data } = await adminApi.patch(`/services/${service.id}`, { is_active: !service.is_active });
      onToggle(data);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`حذف "${service.name_ar}"؟ لا يمكن التراجع.`)) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/services/${service.id}`);
      onDelete(service.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background:   C.card,
        border:       `1px solid ${service.is_active ? C.border : 'rgba(255,255,255,0.04)'}`,
        borderRadius: 14,
        padding:      '20px 22px',
        display:      'flex',
        alignItems:   'center',
        gap:          16,
        opacity:      service.is_active ? 1 : 0.5,
        transition:   'opacity 0.25s',
      }}
    >
      {/* Icon placeholder */}
      <div style={{ width: 44, height: 44, borderRadius: 12, background: C.goldDim, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
        ✨
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ color: C.text, fontWeight: 600, fontSize: '0.92rem' }}>{service.name_ar}</span>
          <span style={{ color: C.textMuted, fontSize: '0.75rem' }}>/ {service.name_en}</span>
        </div>
        {service.description && (
          <p style={{ color: C.textMuted, fontSize: '0.78rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {service.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <span style={{ color: C.gold, fontSize: '0.88rem', fontWeight: 700 }}>
            {Number(service.base_price).toLocaleString()} {service.currency}
          </span>
          {service.duration && (
            <span style={{ color: C.textMuted, fontSize: '0.75rem' }}>⏱ {service.duration} دقيقة</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Toggle active */}
        <motion.button
          onClick={handleToggle} disabled={toggling}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          title={service.is_active ? 'إيقاف' : 'تفعيل'}
          style={{
            padding: '6px 12px', borderRadius: 8,
            background: service.is_active ? C.greenDim : 'rgba(255,255,255,0.04)',
            border: `1px solid ${service.is_active ? C.green + '44' : C.border}`,
            color: service.is_active ? C.green : C.textMuted,
            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {service.is_active ? 'نشط' : 'متوقف'}
        </motion.button>

        {/* Edit */}
        <motion.button
          onClick={() => onEdit(service)}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          style={{ width: 32, height: 32, borderRadius: 8, background: C.goldDim, border: `1px solid ${C.goldBorder}`, color: C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}
        >
          ✎
        </motion.button>

        {/* Delete */}
        <motion.button
          onClick={handleDelete} disabled={deleting}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          style={{ width: 32, height: 32, borderRadius: 8, background: C.redDim, border: `1px solid ${C.red}33`, color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}
        >
          ✕
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export default function ServicesTab() {
  const [services,  setServices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/services/');
      setServices(data);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (service, mode) => {
    if (mode === 'create') {
      setServices(prev => [...prev, service]);
    } else {
      setServices(prev => prev.map(s => s.id === service.id ? service : s));
    }
  };

  const handleToggle = (updated) => {
    setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDelete = (id) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (s) => { setEditing(s);   setModalOpen(true); };

  const activeCount   = services.filter(s => s.is_active).length;
  const inactiveCount = services.length - activeCount;

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ padding: '8px 18px', borderRadius: 20, background: C.goldDim, border: `1px solid ${C.goldBorder}`, color: C.gold, fontSize: '0.78rem', fontWeight: 600 }}>
            {activeCount} نشط
          </div>
          {inactiveCount > 0 && (
            <div style={{ padding: '8px 18px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.textMuted, fontSize: '0.78rem', fontWeight: 600 }}>
              {inactiveCount} متوقف
            </div>
          )}
        </div>
        <motion.button
          onClick={openCreate}
          whileHover={{ scale: 1.03, boxShadow: '0 8px 28px rgba(212,168,83,0.25)' }}
          whileTap={{ scale: 0.97 }}
          style={{ padding: '11px 22px', borderRadius: 12, background: 'linear-gradient(135deg, #d4a853, #b8892a)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          + إضافة خدمة
        </motion.button>
      </div>

      {/* Info banner */}
      <div style={{ padding: '14px 18px', borderRadius: 12, background: C.goldDim, border: `1px solid ${C.goldBorder}`, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: '1.1rem' }}>💡</span>
        <p style={{ color: C.textSec, fontSize: '0.82rem', lineHeight: 1.65, margin: 0 }}>
          الخدمات الإضافية تظهر للعملاء أثناء الحجز (مسبح، فطور، سرير إضافي...). يمكن للعميل اختيارها وإضافتها لمبلغ الحجز تلقائياً.
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>جاري التحميل...</div>
      ) : services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✨</div>
          <p style={{ color: C.textMuted, fontSize: '0.9rem' }}>لا توجد خدمات إضافية بعد. أضف أولى خدماتك!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {services.map(s => (
              <ServiceCard
                key={s.id}
                service={s}
                onEdit={openEdit}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ServiceModal
            service={editing}
            onClose={() => setModalOpen(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
