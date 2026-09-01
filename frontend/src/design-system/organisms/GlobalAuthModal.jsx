/**
 * GlobalAuthModal.jsx — Organism
 *
 * Unified auth entry point for the tenant frontend.
 *
 * Guest form — toggles between Sign In / Create Account.
 * Calls POST /{slug}/auth/login or /register — real customer-scoped routes
 * (app/api/v1/public/__init__.py, added 2026-09-01; this modal called them since it was built,
 * but no route ever answered until then — real, confirmed 404, fixed).
 *
 * No admin/dashboard link anywhere in this modal (removed 2026-09-01, Salman's explicit
 * instruction) -- dashboard access is exclusive via a direct link/QR code sent to the tenant, never
 * discoverable from a public customer-facing surface.
 *
 * Brand color: reads config.primary_color via useTenantConfig(), same CSS-var approach as
 * TenantHeader.jsx (accent* below) -- was hardcoded to smar's own gold `#d4a853` everywhere in this
 * file before 2026-09-01, unrelated to and untouched by that same day's TenantHeader.jsx fix (this
 * is a separate component).
 *
 * FM12 / React 19 safety:
 *   Only animate=, whileHover, whileTap, AnimatePresence — no MotionValues.
 *
 * Props:
 *   isOpen  {boolean}
 *   onClose {function}
 */

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Phone, Lock, User, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import publicApi from '../../utils/publicApi';
import useTenantSlug from '../../hooks/useTenantSlug';
import useTenantConfig from '../../hooks/useTenantConfig';

const FALLBACK_ACCENT = '#d4a853';

function hexToRgba(hex, alpha) {
  const h = typeof hex === 'string' ? hex.replace('#', '') : '';
  if (h.length !== 6) return `rgba(212, 168, 83, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenHex(hex, amount) {
  const h = typeof hex === 'string' ? hex.replace('#', '') : '';
  if (h.length !== 6) return '#b8892e';
  const chan = (i) => Math.max(0, Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - amount)));
  return `rgb(${chan(0)}, ${chan(2)}, ${chan(4)})`;
}

// ── Animation variants ────────────────────────────────────────────────────────

const BACKDROP = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
};

const CARD = {
  initial: { opacity: 0, y: 28, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 290, damping: 26, mass: 0.8 } },
  exit:    { opacity: 0, y: 20, scale: 0.97, transition: { duration: 0.16 } },
};

const FORM_SLIDE = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
  exit:    { opacity: 0, x: -16, transition: { duration: 0.14 } },
};

// ── Input field component ─────────────────────────────────────────────────────

function Field({ icon: Icon, type = 'text', placeholder, value, onChange, action, accentSoft, accentBorder }) {
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    }}>
      <Icon
        size={15}
        strokeWidth={1.7}
        style={{
          position: 'absolute',
          right: 14,
          color: accentSoft,
          pointerEvents: 'none',
          flexShrink: 0,
        }}
      />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        dir="rtl"
        style={{
          width: '100%',
          padding: '12px 42px 12px 42px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12,
          color: '#f0ebe3',
          fontSize: 14,
          outline: 'none',
          transition: 'border-color 0.2s',
          fontFamily: 'inherit',
        }}
        onFocus={e => { e.target.style.borderColor = accentBorder; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
      />
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          tabIndex={-1}
          style={{
            position: 'absolute',
            left: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          {action.icon}
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GlobalAuthModal({ isOpen, onClose }) {
  const slug = useTenantSlug();
  const { config } = useTenantConfig();

  const accent = config?.primary_color || FALLBACK_ACCENT;
  const accentDeep  = useMemo(() => darkenHex(accent, 0.15), [accent]);
  const accentSoft  = useMemo(() => hexToRgba(accent, 0.5), [accent]);
  const accentBorder = useMemo(() => hexToRgba(accent, 0.45), [accent]);
  const accentBorderThin = useMemo(() => hexToRgba(accent, 0.14), [accent]);
  const accentLine = useMemo(() => `linear-gradient(90deg, transparent, ${hexToRgba(accent, 0.7)} 50%, transparent)`, [accent]);

  const [mode,        setMode]        = useState('signin'); // 'signin' | 'register'
  const [phone,       setPhone]       = useState('');
  const [password,    setPassword]    = useState('');
  const [name,        setName]        = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [successMsg,  setSuccessMsg]  = useState('');

  function resetForm() {
    setPhone(''); setPassword(''); setName('');
    setError(''); setSuccessMsg(''); setShowPass(false);
  }

  function switchMode(next) {
    resetForm();
    setMode(next);
  }

  function handleClose() {
    resetForm();
    setMode('signin');
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccessMsg('');

    if (!phone.trim()) { setError('يرجى إدخال رقم الهاتف أو البريد الإلكتروني'); return; }
    if (!password.trim()) { setError('يرجى إدخال كلمة المرور'); return; }
    if (mode === 'register' && !name.trim()) { setError('يرجى إدخال الاسم الكامل'); return; }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { data } = await publicApi.post(`/${slug}/auth/login`, { identifier: phone, password });
        if (data?.token) {
          localStorage.setItem('guest_token', data.token);
          // Persisted so a real reservation confirm form (ReservePage.jsx's ConfirmPanel, via
          // useReservationBooking.js) can auto-fill name/phone for a logged-in customer instead of
          // asking again for data we already have (2026-09-01, Salman's explicit request).
          if (data.name) localStorage.setItem('guest_name', data.name);
          if (data.phone) localStorage.setItem('guest_phone', data.phone);
          setSuccessMsg('تم تسجيل الدخول بنجاح');
          setTimeout(handleClose, 1200);
        }
      } else {
        await publicApi.post(`/${slug}/auth/register`, { full_name: name, phone, password });
        setSuccessMsg('تم إنشاء الحساب. يمكنك الآن تسجيل الدخول.');
        setTimeout(() => switchMode('signin'), 1500);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error;
      setError(msg || 'حدث خطأ. يرجى المحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === 'register';

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="global-auth-backdrop"
          variants={BACKDROP}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            background: 'rgba(10,10,15,0.72)',
            backdropFilter: 'blur(18px)',
          }}
          onMouseDown={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            key="global-auth-card"
            variants={CARD}
            initial="initial"
            animate="animate"
            exit="exit"
            dir="rtl"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 400,
              background: 'hsl(240 8% 7% / 0.95)',
              backdropFilter: 'blur(40px) brightness(1.08)',
              border: `1px solid ${accentBorderThin}`,
              borderRadius: 24,
              boxShadow: `0 32px 80px rgba(0,0,0,0.75), inset 0 1px 0 ${hexToRgba(accent, 0.08)}`,
              overflow: 'hidden',
            }}
          >
            {/* Top accent line — tenant color */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: accentLine,
            }} />

            {/* ── Header ───────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 22px 0' }}>
              <div>
                <h2 style={{ color: '#f0ebe3', fontWeight: 700, fontSize: 19, margin: 0, letterSpacing: '-0.02em' }}>
                  مرحباً بك
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '3px 0 0', letterSpacing: '0.01em' }}>
                  {isRegister ? 'أنشئ حسابك للوصول إلى حجوزاتك' : 'سجّل الدخول للوصول إلى حجوزاتك'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="إغلاق"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 32, width: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', flexShrink: 0,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            {/* ── Mode toggle pills ─────────────────────────────────────── */}
            <div style={{
              display: 'flex', gap: 4, margin: '18px 22px 0',
              padding: 4, background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
            }}>
              {[
                { key: 'signin',   label: 'تسجيل الدخول', icon: LogIn   },
                { key: 'register', label: 'إنشاء حساب',   icon: UserPlus },
              ].map(({ key, label, icon: Icon }) => {
                const active = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchMode(key)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: 9,
                      background: active ? `linear-gradient(135deg, ${accent}, ${accentDeep})` : 'transparent',
                      border: 'none',
                      color: active ? '#0a0a0f' : 'rgba(255,255,255,0.45)',
                      fontWeight: active ? 700 : 500,
                      fontSize: 13, cursor: 'pointer',
                      transition: 'all 0.22s',
                      letterSpacing: '0.01em',
                    }}
                  >
                    <Icon size={13} strokeWidth={2} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── Form ─────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                variants={FORM_SLIDE}
                initial="initial"
                animate="animate"
                exit="exit"
                onSubmit={handleSubmit}
                style={{ padding: '18px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {isRegister && (
                  <Field
                    icon={User}
                    placeholder="الاسم الكامل"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    accentSoft={accentSoft}
                    accentBorder={accentBorder}
                  />
                )}

                <Field
                  icon={Phone}
                  type="tel"
                  placeholder="رقم الهاتف أو البريد الإلكتروني"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  accentSoft={accentSoft}
                  accentBorder={accentBorder}
                />

                <Field
                  icon={Lock}
                  type={showPass ? 'text' : 'password'}
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  accentSoft={accentSoft}
                  accentBorder={accentBorder}
                  action={{
                    onClick: () => setShowPass(s => !s),
                    icon: showPass
                      ? <EyeOff size={14} strokeWidth={1.7} />
                      : <Eye    size={14} strokeWidth={1.7} />,
                  }}
                />

                {/* Error / success message */}
                <AnimatePresence>
                  {(error || successMsg) && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        fontSize: 12, textAlign: 'center', margin: 0, padding: '6px 10px', borderRadius: 8,
                        background: error ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                        border: `1px solid ${error ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                        color: error ? '#f87171' : '#4ade80',
                      }}
                    >
                      {error || successMsg}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : { scale: 1.02 }}
                  whileTap={loading  ? {} : { scale: 0.98 }}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                    background: loading ? hexToRgba(accent, 0.4) : `linear-gradient(135deg, ${accent} 0%, ${accentDeep} 100%)`,
                    color: '#0a0a0f', fontWeight: 700, fontSize: 14,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.04em',
                    boxShadow: loading ? 'none' : `0 4px 20px ${hexToRgba(accent, 0.28)}`,
                    transition: 'background 0.2s, box-shadow 0.2s',
                    marginTop: 2,
                  }}
                >
                  {loading ? '...' : isRegister ? 'إنشاء الحساب' : 'تسجيل الدخول'}
                </motion.button>
              </motion.form>
            </AnimatePresence>

            <div style={{ height: 20 }} />

            {/* Bottom accent line */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)',
            }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
