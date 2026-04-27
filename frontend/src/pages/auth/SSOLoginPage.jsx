/**
 * SSOLoginPage.jsx — auth.salmansaas.com
 *
 * Handles two modes based on pathname:
 *   /login    → existing tenant login (email/phone/slug + password)
 *   /register → new tenant self-onboarding (trial creation)
 *
 * On success both modes redirect to {slug}.salmansaas.com/dashboard
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle,
  User, Phone, Building, Globe,
} from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateSlug(text) {
  return (text || '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function _isSuperAdmin(token) {
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    // Only a User with role SUPER_ADMIN gets the control room.
    // smar client JWTs are regular tenant admins — not super admin.
    return p.type === 'admin' && p.role === 'SUPER_ADMIN';
  } catch { return false; }
}

function resolveRedirect(slug, token, status) {
  if (_isSuperAdmin(token)) {
    return import.meta.env.PROD
      ? 'https://auth.salmansaas.com/super/clients'
      : '/super/clients';
  }
  // Trial tenants → auth subdomain demo path (no new DNS per tenant)
  if (status === 'trial') {
    return import.meta.env.PROD
      ? `https://auth.salmansaas.com/demo/${slug}/units`
      : `http://localhost:5173/demo/${slug}/units`;
  }
  // Active / demo tenants → their own subdomain admin dashboard
  // ProtectedRoute handles the ?token= handoff to that subdomain's localStorage
  return import.meta.env.PROD
    ? `https://${slug}.salmansaas.com/admin?token=${token}`
    : `http://localhost:5173/${slug}/admin?token=${token}`;
}

function storeTrialData(token, status, trial_ends_at) {
  // Always store token on auth subdomain so /super/clients can read it
  localStorage.setItem('admin_access_token', token);
  if (status)        localStorage.setItem('tenant_status',  status);
  if (trial_ends_at) localStorage.setItem('trial_ends_at',  trial_ends_at);
}

// ── Animation variants ────────────────────────────────────────────────────────

const CARD = {
  initial: { opacity: 0, y: 32, scale: 0.97 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 24, mass: 1 },
  },
};

const LOGO_PULSE = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(212,168,83,0)',
      '0 0 0 12px rgba(212,168,83,0.12)',
      '0 0 0 0 rgba(212,168,83,0)',
    ],
  },
  transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
};

// ── Shared sub-components ─────────────────────────────────────────────────────

function Field({ icon: Icon, type, placeholder, value, onChange, rightAction, dir = 'rtl' }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon
        size={15} strokeWidth={1.7}
        style={{
          position: 'absolute', right: 14, top: '50%',
          transform: 'translateY(-50%)',
          color: 'rgba(212,168,83,0.45)', pointerEvents: 'none',
        }}
      />
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange} dir={dir}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '13px 42px 13px 40px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, color: '#f0ebe3', fontSize: 14,
          outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(212,168,83,0.4)'; }}
        onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />
      {rightAction && (
        <button
          type="button" tabIndex={-1} onClick={rightAction.onClick}
          style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex',
          }}
        >
          {rightAction.icon}
        </button>
      )}
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 8,
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.18)',
            color: '#f87171', fontSize: 12,
          }}
        >
          <AlertCircle size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SubmitButton({ loading, label }) {
  return (
    <motion.button
      type="submit" disabled={loading}
      whileHover={loading ? {} : { scale: 1.02 }}
      whileTap={loading  ? {} : { scale: 0.98 }}
      style={{
        marginTop: 4, width: '100%', padding: '13px 0',
        borderRadius: 12, border: 'none',
        background: loading
          ? 'rgba(212,168,83,0.35)'
          : 'linear-gradient(135deg, #d4a853 0%, #b8892e 100%)',
        color: '#0a0a0f', fontWeight: 700, fontSize: 14,
        cursor: loading ? 'not-allowed' : 'pointer',
        letterSpacing: '0.05em',
        boxShadow: loading ? 'none' : '0 4px 22px rgba(212,168,83,0.3)',
        transition: 'background 0.2s, box-shadow 0.2s',
      }}
    >
      {loading ? 'جاري المعالجة...' : label}
    </motion.button>
  );
}

// ── Venue type selector ───────────────────────────────────────────────────────

const VENUE_TYPES = [
  { id: 'real_estate', label: 'عقارات', emoji: '🏠' },
  { id: 'restaurant',  label: 'مطعم',   emoji: '🍽️' },
  { id: 'hotel',       label: 'فندق',   emoji: '🏨' },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function SSOLoginPage() {
  const [mode, setMode] = useState(
    window.location.pathname.endsWith('/register') ? 'register' : 'login'
  );

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [loginPass,  setLoginPass]  = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register state
  const [reg, setReg] = useState({
    owner_name: '', email: '', password: '',
    business_name_ar: '', business_name_en: '',
    whatsapp_number: '', venue_type: 'real_estate',
  });
  const [slug,        setSlug]        = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function switchMode(next) {
    window.history.pushState({}, '', next === 'register' ? '/register' : '/login');
    setMode(next);
    setError('');
  }

  // Auto-generate slug from business_name_en, falling back to owner_name
  useEffect(() => {
    const source = reg.business_name_en || reg.owner_name;
    setSlug(generateSlug(source));
  }, [reg.business_name_en, reg.owner_name]);

  const setR = (key) => (e) => {
    setReg(r => ({ ...r, [key]: e.target.value }));
    setError('');
  };

  // ── Login submit ──────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    if (!identifier.trim() || !loginPass.trim()) {
      setError('يرجى إدخال البيانات كاملة');
      return;
    }
    setError(''); setLoading(true);
    const opts = { withCredentials: true };
    let data = null;
    try {
      // User (staff/admin) login first — so SUPER_ADMIN always gets the right JWT
      ({ data } = await axios.post(
        `${API_BASE}/api/v1/auth/users/login`,
        { email: identifier, password: loginPass },
        opts,
      ));
    } catch {
      try {
        // Fall back to client (tenant root) login for slug/phone/email identifiers
        ({ data } = await axios.post(
          `${API_BASE}/api/v1/auth/login`,
          { identifier, password: loginPass },
          opts,
        ));
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.response?.data?.error;
        setError(msg || 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.');
        setLoading(false);
        return;
      }
    }
    const { token, slug: s, status, trial_ends_at } = data;
    storeTrialData(token, status, trial_ends_at);
    window.location.href = resolveRedirect(s, token, status);
    setLoading(false);
  }

  // ── Register submit ───────────────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault();
    if (!slug || slug.length < 3) {
      setError('أضف اسم المنشأة بالإنجليزية لتوليد رابطك الخاص.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const { data } = await axios.post(
        `${API_BASE}/api/v1/auth/register`,
        { ...reg, slug },
        { withCredentials: true },
      );
      const { token, slug: s, status, trial_ends_at } = data.data;
      storeTrialData(token, status, trial_ends_at);
      window.location.href = resolveRedirect(s, token, status);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.detail;
      setError(msg || 'حدث خطأ ما. يرجى المحاولة لاحقاً.');
      setLoading(false);
    }
  }

  const slugReady = slug.length >= 3;
  const isRegister = mode === 'register';

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh', width: '100%',
        background: '#0a0a0f',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Radial glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(212,168,83,0.06) 0%, transparent 70%)',
      }} />

      <motion.div
        key={mode}
        variants={CARD} initial="initial" animate="animate"
        style={{
          position: 'relative', width: '100%',
          maxWidth: isRegister ? 460 : 420,
          background: 'hsl(240 8% 7% / 0.92)',
          backdropFilter: 'blur(40px) brightness(1.06)',
          border: '1px solid rgba(212,168,83,0.12)',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(212,168,83,0.07)',
          overflow: 'hidden',
        }}
      >
        {/* Top gold line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,168,83,0.65) 50%, transparent)',
        }} />

        <div style={{ padding: isRegister ? '32px 28px 24px' : '36px 28px 28px' }}>

          {/* Brand mark */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <motion.div
              animate={LOGO_PULSE.animate}
              transition={LOGO_PULSE.transition}
              style={{
                width: 52, height: 52, borderRadius: 14, marginBottom: 12,
                background: 'linear-gradient(135deg, rgba(212,168,83,0.18), rgba(212,168,83,0.06))',
                border: '1px solid rgba(212,168,83,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ShieldCheck size={24} color="#d4a853" strokeWidth={1.6} />
            </motion.div>
            <h1 style={{ color: '#f0ebe3', fontSize: 19, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              {isRegister ? 'إنشاء حساب جديد' : 'بوابة الإدارة المركزية'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {isRegister ? 'SalmanSaaS · New Tenant · 14-day trial' : 'SalmanSaaS · Admin Portal'}
            </p>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 22 }} />

          {/* ── LOGIN FORM ── */}
          {!isRegister && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field
                icon={Mail} type="text"
                placeholder="البريد الإلكتروني أو رقم الهاتف أو الرابط المختصر"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setError(''); }}
              />
              <Field
                icon={Lock}
                type={showLoginPass ? 'text' : 'password'}
                placeholder="كلمة المرور"
                value={loginPass}
                onChange={e => { setLoginPass(e.target.value); setError(''); }}
                rightAction={{
                  onClick: () => setShowLoginPass(s => !s),
                  icon: showLoginPass
                    ? <EyeOff size={14} strokeWidth={1.7} />
                    : <Eye    size={14} strokeWidth={1.7} />,
                }}
              />
              <ErrorBanner msg={error} />
              <SubmitButton loading={loading} label="تسجيل الدخول" />
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {isRegister && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field icon={User}  type="text"  placeholder="اسمك الكامل"               value={reg.owner_name}       onChange={setR('owner_name')} />
              <Field icon={Mail}  type="email" placeholder="البريد الإلكتروني"         value={reg.email}            onChange={setR('email')} />
              <Field
                icon={Lock}
                type={showRegPass ? 'text' : 'password'}
                placeholder="كلمة المرور (8 أحرف على الأقل)"
                value={reg.password}
                onChange={setR('password')}
                rightAction={{
                  onClick: () => setShowRegPass(s => !s),
                  icon: showRegPass
                    ? <EyeOff size={14} strokeWidth={1.7} />
                    : <Eye    size={14} strokeWidth={1.7} />,
                }}
              />
              <Field icon={Building} type="text" placeholder="اسم المنشأة بالعربية"           value={reg.business_name_ar} onChange={setR('business_name_ar')} />

              {/* English name + slug preview */}
              <div>
                <Field
                  icon={Globe} type="text" dir="ltr"
                  placeholder="Business name in English (generates your URL)"
                  value={reg.business_name_en}
                  onChange={setR('business_name_en')}
                />
                <div style={{
                  marginTop: 6, padding: '7px 12px', borderRadius: 8,
                  background: slugReady ? 'rgba(212,168,83,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${slugReady ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 11 }}>🔗</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', direction: 'ltr' }}>
                    <span style={{ color: slugReady ? '#d4a853' : 'rgba(255,255,255,0.2)' }}>
                      {slugReady ? slug : 'your-slug'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>.salmansaas.com</span>
                  </span>
                </div>
              </div>

              <Field icon={Phone} type="tel" placeholder="رقم الواتساب (+961 ...)" value={reg.whatsapp_number} onChange={setR('whatsapp_number')} />

              {/* Venue type selector */}
              <div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 8, textAlign: 'right' }}>
                  نوع المنشأة
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {VENUE_TYPES.map(v => (
                    <button
                      key={v.id} type="button"
                      onClick={() => setReg(r => ({ ...r, venue_type: v.id }))}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                        background: reg.venue_type === v.id ? 'rgba(212,168,83,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${reg.venue_type === v.id ? 'rgba(212,168,83,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        color: reg.venue_type === v.id ? '#d4a853' : 'rgba(255,255,255,0.35)',
                        fontSize: 11, fontFamily: 'inherit', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{v.emoji}</span>
                      <span style={{ fontWeight: reg.venue_type === v.id ? 700 : 400 }}>{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <ErrorBanner msg={error} />
              <SubmitButton loading={loading} label="إنشاء الحساب والبدء مجاناً" />
            </form>
          )}
        </div>

        {/* Footer — mode toggle */}
        <div style={{
          padding: '14px 28px 20px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          textAlign: 'center',
        }}>
          {!isRegister ? (
            <button
              onClick={() => switchMode('register')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.2)', fontSize: 12, fontFamily: 'inherit',
              }}
            >
              مستخدم جديد؟{' '}
              <span style={{ color: '#d4a853' }}>إنشاء حساب ←</span>
            </button>
          ) : (
            <button
              onClick={() => switchMode('login')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.2)', fontSize: 12, fontFamily: 'inherit',
              }}
            >
              عندك حساب بالفعل؟{' '}
              <span style={{ color: '#d4a853' }}>تسجيل الدخول ←</span>
            </button>
          )}
        </div>

        {/* Bottom line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)',
        }} />
      </motion.div>

      <p style={{ marginTop: 20, color: 'rgba(255,255,255,0.1)', fontSize: 10, letterSpacing: '0.12em' }}>
        SALMANSAAS ADMIN · v2.0
      </p>
    </div>
  );
}
