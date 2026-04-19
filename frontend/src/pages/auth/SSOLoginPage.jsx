/**
 * SSOLoginPage.jsx — auth.salmansaas.com
 *
 * Centralized SSO login portal for all tenant admins and staff.
 * Rendered by TenantResolver when hostname starts with "auth.".
 *
 * Flow:
 *   1. Staff submits email + password
 *   2. POST /api/v1/auth/login  (supports email/phone/slug identifier)
 *   3. Backend sets HttpOnly cookie on .salmansaas.com + returns { token, slug }
 *   4. Hard redirect → https://{slug}.salmansaas.com/dashboard/{slug}/units?token={jwt}
 *   5. ProtectedRoute on that page reads ?token=, saves to localStorage, strips URL
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Animation variants ────────────────────────────────────────────────────────

const CARD = {
  initial: { opacity: 0, y: 32, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 24, mass: 1 } },
};

const LOGO_PULSE = {
  animate: { boxShadow: ['0 0 0 0 rgba(212,168,83,0)', '0 0 0 12px rgba(212,168,83,0.12)', '0 0 0 0 rgba(212,168,83,0)'] },
  transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
};

// ── Field component ───────────────────────────────────────────────────────────

function Field({ icon: Icon, type, placeholder, value, onChange, rightAction }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon
        size={15} strokeWidth={1.7}
        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(212,168,83,0.45)', pointerEvents: 'none' }}
      />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        dir="rtl"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '13px 42px 13px 40px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, color: '#f0ebe3', fontSize: 14,
          outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
        }}
        onFocus={e  => { e.target.style.borderColor = 'rgba(212,168,83,0.4)'; }}
        onBlur={e   => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />
      {rightAction && (
        <button
          type="button" tabIndex={-1} onClick={rightAction.onClick}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex' }}
        >
          {rightAction.icon}
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SSOLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('يرجى إدخال البيانات كاملة');
      return;
    }
    setError(''); setLoading(true);

    try {
      const { data } = await axios.post(
        `${API_BASE}/api/v1/auth/login`,
        { identifier, password },
        { withCredentials: true }, // sends/receives the HttpOnly cookie
      );

      const { token, slug } = data;
      // Hard redirect — crosses from auth.salmansaas.com to smar.salmansaas.com.
      // ?token= is picked up by ProtectedRoute on the destination, saved to
      // localStorage, then immediately stripped from the URL.
      const dest = import.meta.env.PROD
        ? `https://${slug}.salmansaas.com/dashboard/${slug}/units?token=${token}`
        : `http://localhost:5173/dashboard/${slug}/units?token=${token}`;

      window.location.href = dest;
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error;
      setError(msg || 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

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
      {/* Subtle radial glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(212,168,83,0.06) 0%, transparent 70%)',
      }} />

      <motion.div
        variants={CARD}
        initial="initial"
        animate="animate"
        style={{
          position: 'relative', width: '100%', maxWidth: 420,
          background: 'hsl(240 8% 7% / 0.92)',
          backdropFilter: 'blur(40px) brightness(1.06)',
          border: '1px solid rgba(212,168,83,0.12)',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(212,168,83,0.07)',
          overflow: 'hidden',
        }}
      >
        {/* Top gold line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,168,83,0.65) 50%, transparent)' }} />

        <div style={{ padding: '36px 28px 28px' }}>

          {/* ── Brand mark ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <motion.div
              animate={LOGO_PULSE.animate}
              transition={LOGO_PULSE.transition}
              style={{
                width: 52, height: 52, borderRadius: 14, marginBottom: 14,
                background: 'linear-gradient(135deg, rgba(212,168,83,0.18), rgba(212,168,83,0.06))',
                border: '1px solid rgba(212,168,83,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ShieldCheck size={24} color="#d4a853" strokeWidth={1.6} />
            </motion.div>

            <h1 style={{ color: '#f0ebe3', fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              بوابة الإدارة المركزية
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              SalmanSaaS · Admin Portal
            </p>
          </div>

          {/* ── Divider ── */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 24 }} />

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field
              icon={Mail}
              type="text"
              placeholder="البريد الإلكتروني أو رقم الهاتف أو الرابط المختصر"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />

            <Field
              icon={Lock}
              type={showPass ? 'text' : 'password'}
              placeholder="كلمة المرور"
              value={password}
              onChange={e => setPassword(e.target.value)}
              rightAction={{
                onClick: () => setShowPass(s => !s),
                icon: showPass
                  ? <EyeOff size={14} strokeWidth={1.7} />
                  : <Eye    size={14} strokeWidth={1.7} />,
              }}
            />

            {/* Error */}
            <AnimatePresence>
              {error && (
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
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
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
              {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </motion.button>
          </form>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 28px 20px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          textAlign: 'center',
        }}>
          <a
            href="https://smar.salmansaas.com"
            style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textDecoration: 'none', letterSpacing: '0.08em' }}
          >
            العودة إلى الموقع الرئيسي
          </a>
        </div>

        {/* Bottom line */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)' }} />
      </motion.div>

      {/* Version tag */}
      <p style={{ marginTop: 20, color: 'rgba(255,255,255,0.1)', fontSize: 10, letterSpacing: '0.12em' }}>
        SALMANSAAS ADMIN · v2.0
      </p>
    </div>
  );
}
