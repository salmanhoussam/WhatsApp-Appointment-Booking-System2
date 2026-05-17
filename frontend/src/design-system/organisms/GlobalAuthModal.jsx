/**
 * GlobalAuthModal.jsx — Organism
 *
 * Unified auth entry point for the tenant frontend.
 *
 * Two sections:
 *   1. Guest form — toggles between Sign In / Create Account
 *      Calls POST /public/{slug}/auth/login  or  /register
 *   2. Admin bridge — subtle footer link → hard redirect to
 *      https://demo.salmansaas.com (cross-subdomain, no React Router)
 *
 * FM12 / React 19 safety:
 *   Only animate=, whileHover, whileTap, AnimatePresence — no MotionValues.
 *
 * Props:
 *   isOpen  {boolean}
 *   onClose {function}
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Phone, Lock, User, Eye, EyeOff, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import publicApi from '../../utils/publicApi';
import useTenantSlug from '../../utils/useTenantSlug';

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_PORTAL_URL = 'https://demo.salmansaas.com';

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

function Field({ icon: Icon, type = 'text', placeholder, value, onChange, action }) {
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
          color: 'rgba(212,168,83,0.5)',
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
        onFocus={e => { e.target.style.borderColor = 'rgba(212,168,83,0.45)'; }}
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

  function handleAdminPortal() {
    window.location.href = ADMIN_PORTAL_URL;
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
              border: '1px solid rgba(212,168,83,0.14)',
              borderRadius: 24,
              boxShadow: '0 32px 80px rgba(0,0,0,0.75), inset 0 1px 0 rgba(212,168,83,0.08)',
              overflow: 'hidden',
            }}
          >
            {/* Top gold accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212,168,83,0.7) 50%, transparent)',
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
                      background: active ? 'linear-gradient(135deg, #d4a853, #b8892e)' : 'transparent',
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
                  />
                )}

                <Field
                  icon={Phone}
                  type="tel"
                  placeholder="رقم الهاتف أو البريد الإلكتروني"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />

                <Field
                  icon={Lock}
                  type={showPass ? 'text' : 'password'}
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
                    background: loading ? 'rgba(212,168,83,0.4)' : 'linear-gradient(135deg, #d4a853 0%, #b8892e 100%)',
                    color: '#0a0a0f', fontWeight: 700, fontSize: 14,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.04em',
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(212,168,83,0.28)',
                    transition: 'background 0.2s, box-shadow 0.2s',
                    marginTop: 2,
                  }}
                >
                  {loading ? '...' : isRegister ? 'إنشاء الحساب' : 'تسجيل الدخول'}
                </motion.button>
              </motion.form>
            </AnimatePresence>

            {/* ── Admin bridge ──────────────────────────────────────────── */}
            <div style={{ padding: '16px 22px 20px' }}>
              {/* Divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
              }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  أو
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Admin portal link */}
              <button
                type="button"
                onClick={handleAdminPortal}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(124,158,255,0.05)',
                  border: '1px solid rgba(124,158,255,0.15)',
                  color: 'rgba(124,158,255,0.7)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  letterSpacing: '0.03em',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(124,158,255,0.10)';
                  e.currentTarget.style.borderColor = 'rgba(124,158,255,0.35)';
                  e.currentTarget.style.color = 'rgba(124,158,255,0.95)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(124,158,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(124,158,255,0.15)';
                  e.currentTarget.style.color = 'rgba(124,158,255,0.7)';
                }}
              >
                <ShieldCheck size={13} strokeWidth={2} />
                بوابة الموظفين والإدارة
              </button>
            </div>

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
