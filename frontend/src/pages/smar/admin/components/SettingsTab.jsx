/**
 * SettingsTab.jsx — Admin Platform Settings
 *
 * Lets the manager update branding + config without touching Prisma Studio.
 * Fetches current values on mount, PATCHes on save.
 *
 * Auth: adminApi automatically injects Bearer token from localStorage.
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import adminApi from '../../../../utils/admin.config';

// ── Shared palette (matches SmarAdminDashboard) ───────────────────────────────
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
};

const PAYMENT_OPTIONS = [
  { id: 'cash',      label: 'نقداً',     labelEn: 'Cash'     },
  { id: 'card',      label: 'بطاقة',     labelEn: 'Card'     },
  { id: 'whatsapp',  label: 'واتساب',    labelEn: 'WhatsApp' },
  { id: 'whish',     label: 'Whish',     labelEn: 'Whish'    },
  { id: 'omt',       label: 'OMT',       labelEn: 'OMT'      },
];

const FEATURE_FLAGS = [
  { id: 'spatial',  label: 'التجربة المكانية',   labelEn: 'Spatial Experience' },
  { id: 'listings', label: 'قائمة الوحدات',       labelEn: 'Listings Page'      },
  { id: 'booking',  label: 'نظام الحجز',          labelEn: 'Booking System'     },
  { id: 'payment',  label: 'بوابة الدفع',          labelEn: 'Payment Gateway'    },
];

// ── Shared input style ────────────────────────────────────────────────────────
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
const sectionStyle = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '28px 28px',
  marginBottom: 24,
};


export default function SettingsTab() {
  const [form,    setForm]    = useState(null);   // null = loading
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);   // { ok, msg }

  // ── Fetch current settings ────────────────────────────────────────────────
  useEffect(() => {
    adminApi.get('/settings')
      .then(r => {
        const d = r.data;
        setForm({
          name_ar:         d.name_ar         ?? '',
          name_en:         d.name_en         ?? '',
          primary_color:   d.primary_color   ?? '#d4a853',
          hero_video_url:  d.hero_video_url  ?? '',
          whatsapp_number: d.whatsapp_number ?? '',
          currency:        d.currency        ?? 'USD',
          payment_methods: d.payment_methods ?? [],
          features:        d.features        ?? {},
        });
      })
      .catch(() => showToast('فشل تحميل الإعدادات', false));
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const togglePayment = (id) => {
    set('payment_methods',
      form.payment_methods.includes(id)
        ? form.payment_methods.filter(p => p !== id)
        : [...form.payment_methods, id]
    );
  };

  const toggleFeature = (id) => {
    set('features', { ...form.features, [id]: !form.features[id] });
  };

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg, ok) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.patch('/settings', form);
      showToast('تم الحفظ بنجاح ✓', true);
    } catch {
      showToast('فشل الحفظ — حاول مجدداً', false);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!form) {
    return (
      <div style={{ color: C.textMuted, padding: 60, textAlign: 'center', fontSize: 14 }}>
        جاري تحميل الإعدادات…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780, position: 'relative' }}>

      {/* ── Section: Branding ────────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h3 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          🎨 الهوية البصرية
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>الاسم بالعربي</label>
            <input style={inputStyle} value={form.name_ar}
              onChange={e => set('name_ar', e.target.value)} placeholder="بيت سمار" dir="rtl" />
          </div>
          <div>
            <label style={labelStyle}>الاسم بالإنجليزي</label>
            <input style={inputStyle} value={form.name_en}
              onChange={e => set('name_en', e.target.value)} placeholder="Beit Smar" dir="ltr" />
          </div>
        </div>

        {/* Color picker row */}
        <div>
          <label style={labelStyle}>لون الموقع الرئيسي</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Native color swatch */}
            <div style={{ position: 'relative', width: 44, height: 44, borderRadius: 10,
              border: `1px solid ${C.borderHi}`, overflow: 'hidden', flexShrink: 0 }}>
              <input
                type="color"
                value={form.primary_color}
                onChange={e => set('primary_color', e.target.value)}
                style={{ position: 'absolute', inset: '-8px', width: '200%', height: '200%',
                  cursor: 'pointer', border: 'none', padding: 0 }}
              />
            </div>
            {/* Hex text input */}
            <input
              style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.08em', maxWidth: 140 }}
              value={form.primary_color}
              onChange={e => set('primary_color', e.target.value)}
              placeholder="#d4a853"
              dir="ltr"
            />
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: form.primary_color,
              border: `1px solid ${C.borderHi}`,
              boxShadow: `0 0 16px ${form.primary_color}55`,
              transition: 'background 0.2s, box-shadow 0.2s',
            }} />
          </div>
        </div>
      </div>

      {/* ── Section: Contact & Media ──────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h3 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          📡 التواصل والوسائط
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>رقم واتساب</label>
            <input style={{ ...inputStyle, fontFamily: 'monospace' }}
              value={form.whatsapp_number}
              onChange={e => set('whatsapp_number', e.target.value)}
              placeholder="96178727986" dir="ltr" />
          </div>
          <div>
            <label style={labelStyle}>رابط فيديو الواجهة (Supabase URL)</label>
            <input style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }}
              value={form.hero_video_url}
              onChange={e => set('hero_video_url', e.target.value)}
              placeholder="https://…supabase.co/storage/v1/…/video.mp4" dir="ltr" />
          </div>
          <div>
            <label style={labelStyle}>عملة الأسعار</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.currency}
              onChange={e => set('currency', e.target.value)}>
              {['USD', 'LBP', 'SAR', 'AED', 'EUR'].map(c => (
                <option key={c} value={c} style={{ background: C.bg }}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Section: Payment Methods ──────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h3 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          💳 طرق الدفع المقبولة
        </h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {PAYMENT_OPTIONS.map(opt => {
            const active = form.payment_methods.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => togglePayment(opt.id)}
                style={{
                  padding:      '9px 20px',
                  borderRadius: 40,
                  border:       `1px solid ${active ? C.gold + '66' : C.border}`,
                  background:   active ? C.goldDim : 'transparent',
                  color:        active ? C.gold : C.textMuted,
                  fontSize:     13,
                  fontWeight:   active ? 600 : 400,
                  cursor:       'pointer',
                  transition:   'all 0.15s',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          6,
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: active ? C.gold : C.textMuted,
                  transition: 'background 0.15s',
                }} />
                {opt.label}
                <span style={{ color: C.textMuted, fontSize: 11 }}>{opt.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section: Feature Flags ────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h3 style={{ color: C.gold, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚡ الميزات المفعّلة
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FEATURE_FLAGS.map(flag => {
            const active = !!form.features[flag.id];
            return (
              <div key={flag.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 10,
                background: active ? 'rgba(212,168,83,0.05)' : 'transparent',
                border: `1px solid ${active ? C.gold + '22' : C.border}`,
                transition: 'all 0.2s',
              }}>
                <div>
                  <span style={{ color: C.textPri, fontSize: 13, fontWeight: 500 }}>{flag.label}</span>
                  <span style={{ color: C.textMuted, fontSize: 11, marginRight: 8 }}> / {flag.labelEn}</span>
                </div>
                {/* Toggle pill */}
                <button
                  type="button"
                  onClick={() => toggleFeature(flag.id)}
                  style={{
                    position: 'relative', width: 44, height: 24, borderRadius: 12,
                    border: 'none', flexShrink: 0, cursor: 'pointer',
                    background: active ? 'rgba(62,207,142,0.35)' : 'rgba(107,107,128,0.25)',
                    transition: 'background 0.2s', outline: 'none', padding: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 4,
                    left: active ? 23 : 4,
                    width: 16, height: 16, borderRadius: '50%',
                    background: active ? C.green : C.textMuted,
                    transition: 'left 0.2s, background 0.2s', display: 'block',
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Save Button ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding:    '13px 40px',
            borderRadius: 10,
            border:     'none',
            fontSize:   14,
            fontWeight: 700,
            letterSpacing: '0.02em',
            background: saving ? 'rgba(212,168,83,0.4)' : 'linear-gradient(135deg,#d4a853,#b8892a)',
            color:      '#000',
            cursor:     saving ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            boxShadow:  saving ? 'none' : '0 4px 20px rgba(212,168,83,0.35)',
          }}
        >
          {saving ? 'جاري الحفظ…' : '💾 حفظ الإعدادات'}
        </button>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
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
