import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import publicApi from '../utils/publicApi';

// ─────────────────────────────────────────────
// GS MAR Design Tokens
// ─────────────────────────────────────────────
const GOLD     = '#d4a853';
const GOLD_DIM = 'rgba(212,168,83,0.12)';
const GLASS_BG = 'rgba(10,10,15,0.85)';
const GLASS_BORDER = '1px solid rgba(255,255,255,0.08)';
const PANEL_BG = 'rgba(255,255,255,0.04)';

const premiumSpring = { type: 'spring', stiffness: 70, damping: 20, mass: 1.5 };
const snappySpring  = { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 };

// ─────────────────────────────────────────────
// Business type options
// ─────────────────────────────────────────────
const BUSINESS_TYPES = [
  { value: 'restaurant', icon: '🍽️', label: 'مطعم' },
  { value: 'store',      icon: '🛍️', label: 'متجر' },
  { value: 'booking',    icon: '🏠', label: 'حجز'  },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function Spinner() {
  return (
    <span
      style={{
        display:      'inline-block',
        width:        '16px',
        height:       '16px',
        border:       `2px solid rgba(255,255,255,0.2)`,
        borderTop:    `2px solid ${GOLD}`,
        borderRadius: '50%',
        animation:    'demo-spin 0.7s linear infinite',
        flexShrink:   0,
      }}
    />
  );
}

function BusinessTypeSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      {BUSINESS_TYPES.map((type) => {
        const active = value === type.value;
        return (
          <motion.button
            key={type.value}
            onClick={() => onChange(type.value)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={snappySpring}
            style={{
              flex:            1,
              padding:         '14px 8px',
              background:      active ? GOLD_DIM : 'rgba(255,255,255,0.03)',
              border:          active
                ? `1px solid ${GOLD}`
                : '1px solid rgba(255,255,255,0.07)',
              borderRadius:    '12px',
              cursor:          'pointer',
              color:           active ? GOLD : 'rgba(255,255,255,0.65)',
              fontSize:        '12px',
              fontFamily:      "'Cairo', sans-serif",
              fontWeight:      active ? 700 : 400,
              textAlign:       'center',
              transition:      'background 0.2s, color 0.2s, border-color 0.2s',
              outline:         'none',
              display:         'flex',
              flexDirection:   'column',
              alignItems:      'center',
              gap:             '6px',
            }}
          >
            <span style={{ fontSize: '22px' }}>{type.icon}</span>
            <span>{type.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function TextInput({ placeholder, value, onChange, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {label && (
        <label style={{
          color:      'rgba(255,255,255,0.45)',
          fontSize:   '11px',
          fontFamily: "'Cairo', sans-serif",
          letterSpacing: '0.04em',
        }}>
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="rtl"
        style={{
          background:   'rgba(255,255,255,0.04)',
          border:       '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding:      '12px 16px',
          color:        '#fff',
          fontSize:     '14px',
          fontFamily:   "'Cairo', sans-serif",
          outline:      'none',
          width:        '100%',
          boxSizing:    'box-sizing',
          transition:   'border-color 0.2s',
        }}
        onFocus={(e) => { e.target.style.borderColor = GOLD; }}
        onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />
    </div>
  );
}

function SuccessCard({ slug, tempPassword, onClose }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={premiumSpring}
      style={{
        textAlign: 'center',
        display:   'flex',
        flexDirection: 'column',
        gap:       '20px',
        alignItems: 'center',
      }}
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...snappySpring, delay: 0.1 }}
        style={{
          width:        '64px',
          height:       '64px',
          borderRadius: '50%',
          background:   `radial-gradient(circle, ${GOLD_DIM}, transparent)`,
          border:       `1px solid ${GOLD}44`,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     '28px',
        }}
      >
        ✅
      </motion.div>

      <div>
        <h3 style={{
          color:      '#fff',
          fontFamily: "'Cairo', sans-serif",
          fontSize:   '18px',
          fontWeight: 700,
          margin:     0,
        }}>
          تم إنشاء متجرك!
        </h3>
        <p style={{
          color:      'rgba(255,255,255,0.5)',
          fontSize:   '13px',
          fontFamily: "'Cairo', sans-serif",
          margin:     '6px 0 0',
        }}>
          متجرك التجريبي جاهز للاستخدام
        </p>
      </div>

      {/* Slug badge */}
      <div style={{
        background:   GOLD_DIM,
        border:       `1px solid ${GOLD}44`,
        borderRadius: '10px',
        padding:      '10px 20px',
        width:        '100%',
        boxSizing:    'border-box',
      }}>
        <p style={{
          color:      'rgba(255,255,255,0.4)',
          fontSize:   '11px',
          fontFamily: "'Cairo', sans-serif",
          margin:     '0 0 4px',
          letterSpacing: '0.05em',
        }}>
          معرّف متجرك
        </p>
        <code style={{
          color:      GOLD,
          fontSize:   '14px',
          fontFamily: 'monospace',
          fontWeight: 600,
          direction:  'ltr',
          display:    'block',
        }}>
          {slug}
        </code>
      </div>

      {/* Temp password */}
      <div style={{
        background:   'rgba(255,255,255,0.03)',
        border:       GLASS_BORDER,
        borderRadius: '10px',
        padding:      '12px 16px',
        width:        '100%',
        boxSizing:    'border-box',
      }}>
        <div style={{
          display:       'flex',
          alignItems:    'center',
          justifyContent: 'space-between',
          marginBottom:  '8px',
        }}>
          <span style={{
            color:      'rgba(255,255,255,0.4)',
            fontSize:   '11px',
            fontFamily: "'Cairo', sans-serif",
            letterSpacing: '0.05em',
          }}>
            كلمة المرور المؤقتة
          </span>
          <button
            onClick={() => setVisible(!visible)}
            style={{
              background: 'transparent',
              border:     'none',
              cursor:     'pointer',
              color:      GOLD,
              fontSize:   '12px',
              fontFamily: "'Cairo', sans-serif",
              padding:    0,
            }}
          >
            {visible ? 'إخفاء' : 'إظهار'}
          </button>
        </div>
        <code style={{
          color:      visible ? '#fff' : 'rgba(255,255,255,0.12)',
          fontSize:   '14px',
          fontFamily: 'monospace',
          direction:  'ltr',
          display:    'block',
          filter:     visible ? 'none' : 'blur(6px)',
          transition: 'filter 0.2s',
          userSelect: visible ? 'text' : 'none',
        }}>
          {tempPassword}
        </code>
      </div>

      {/* Warning note */}
      <p style={{
        color:      `${GOLD}cc`,
        fontSize:   '12px',
        fontFamily: "'Cairo', sans-serif",
        margin:     0,
        textAlign:  'center',
        lineHeight: 1.6,
      }}>
        كلمة المرور المؤقتة لوحة تحكمك — احفظها
      </p>

      {/* CTA */}
      <motion.button
        onClick={() => { onClose(); navigate(`/${slug}/home`); }}
        whileHover={{ scale: 1.02, boxShadow: `0 0 28px ${GOLD}55` }}
        whileTap={{ scale: 0.97 }}
        transition={snappySpring}
        style={{
          width:        '100%',
          padding:      '14px',
          background:   GOLD,
          border:       'none',
          borderRadius: '12px',
          color:        '#0a0a0f',
          fontSize:     '15px',
          fontFamily:   "'Cairo', sans-serif",
          fontWeight:   700,
          cursor:       'pointer',
          letterSpacing: '0.02em',
        }}
      >
        افتح متجري
      </motion.button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Main DemoLauncher
// ─────────────────────────────────────────────
export default function DemoLauncher() {
  const [open,         setOpen]         = useState(false);
  const [businessType, setBusinessType] = useState('restaurant');
  const [nameAr,       setNameAr]       = useState('');
  const [nameEn,       setNameEn]       = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [result,       setResult]       = useState(null); // { slug, temp_password }

  function handleClose() {
    setOpen(false);
    // Reset form after animation completes
    setTimeout(() => {
      setError(null);
      setResult(null);
      setNameAr('');
      setNameEn('');
      setBusinessType('restaurant');
      setLoading(false);
    }, 300);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nameAr.trim() || !nameEn.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await publicApi.post('/demo/create', {
        business_type: businessType,
        name_ar:       nameAr.trim(),
        name_en:       nameEn.trim(),
      });
      const data = res.data?.data ?? res.data;
      setResult(data);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        'حدث خطأ، يرجى المحاولة مجدداً';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Inject keyframe animation ── */}
      <style>{`
        @keyframes demo-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes demo-glow-pulse {
          0%, 100% { box-shadow: 0 0 18px ${GOLD}44, 0 4px 24px rgba(0,0,0,0.5); }
          50%       { box-shadow: 0 0 32px ${GOLD}77, 0 4px 24px rgba(0,0,0,0.5); }
        }
      `}</style>

      {/* ── Floating trigger button ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher-btn"
            initial={{ opacity: 0, y: 20, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.85 }}
            transition={premiumSpring}
            onClick={() => setOpen(true)}
            style={{
              position:     'fixed',
              bottom:       '28px',
              right:        '28px',
              zIndex:       9998,
              padding:      '14px 22px',
              background:   GOLD,
              border:       'none',
              borderRadius: '50px',
              cursor:       'pointer',
              color:        '#0a0a0f',
              fontFamily:   "'Cairo', sans-serif",
              fontWeight:   700,
              fontSize:     '14px',
              letterSpacing: '0.03em',
              display:      'flex',
              alignItems:   'center',
              gap:          '8px',
              animation:    'demo-glow-pulse 2.8s ease-in-out infinite',
              userSelect:   'none',
            }}
          >
            <span style={{ fontSize: '16px' }}>🚀</span>
            جرّب مجاناً
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Modal overlay ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={handleClose}
              style={{
                position:   'fixed',
                inset:      0,
                zIndex:     9998,
                background: 'rgba(0,0,0,0.72)',
                backdropFilter: 'blur(4px)',
              }}
            />

            {/* Modal panel */}
            <motion.div
              key="modal"
              role="dialog"
              aria-modal="true"
              dir="rtl"
              initial={{ opacity: 0, scale: 0.88, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 40 }}
              transition={premiumSpring}
              style={{
                position:      'fixed',
                top:           '50%',
                left:          '50%',
                transform:     'translate(-50%, -50%)',
                zIndex:        9999,
                width:         'min(480px, calc(100vw - 32px))',
                maxHeight:     'calc(100vh - 40px)',
                overflowY:     'auto',
                background:    GLASS_BG,
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border:        GLASS_BORDER,
                borderRadius:  '20px',
                padding:       '28px',
                boxShadow:     '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              {/* ── Header ── */}
              <div style={{
                display:       'flex',
                alignItems:    'flex-start',
                justifyContent: 'space-between',
                marginBottom:  '24px',
              }}>
                <div>
                  <h2 style={{
                    color:      '#fff',
                    fontFamily: "'Cairo', sans-serif",
                    fontSize:   '20px',
                    fontWeight: 700,
                    margin:     0,
                  }}>
                    أنشئ متجرك التجريبي
                  </h2>
                  <p style={{
                    color:      'rgba(255,255,255,0.4)',
                    fontSize:   '13px',
                    fontFamily: "'Cairo', sans-serif",
                    margin:     '5px 0 0',
                  }}>
                    مجاناً — جاهز خلال ثوانٍ
                  </p>
                </div>

                {/* Close button */}
                <motion.button
                  onClick={handleClose}
                  whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.9 }}
                  transition={snappySpring}
                  style={{
                    background:   'rgba(255,255,255,0.05)',
                    border:       GLASS_BORDER,
                    borderRadius: '50%',
                    width:        '36px',
                    height:       '36px',
                    cursor:       'pointer',
                    color:        'rgba(255,255,255,0.6)',
                    fontSize:     '16px',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    flexShrink:   0,
                    marginRight:  '4px',
                    outline:      'none',
                  }}
                >
                  ✕
                </motion.button>
              </div>

              {/* ── Body ── */}
              <AnimatePresence mode="wait">
                {result ? (
                  <SuccessCard
                    key="success"
                    slug={result.slug}
                    tempPassword={result.temp_password}
                    onClose={handleClose}
                  />
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                  >
                    {/* Business type */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{
                        color:      'rgba(255,255,255,0.45)',
                        fontSize:   '12px',
                        fontFamily: "'Cairo', sans-serif",
                        letterSpacing: '0.04em',
                      }}>
                        نوع النشاط
                      </span>
                      <BusinessTypeSelector
                        value={businessType}
                        onChange={setBusinessType}
                      />
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                    {/* Name inputs */}
                    <TextInput
                      label="اسم المشروع بالعربية"
                      placeholder="اسم المشروع بالعربية"
                      value={nameAr}
                      onChange={setNameAr}
                    />
                    <TextInput
                      label="Business name in English"
                      placeholder="Business name in English"
                      value={nameEn}
                      onChange={setNameEn}
                    />

                    {/* Error message */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            background:   'rgba(239,68,68,0.08)',
                            border:       '1px solid rgba(239,68,68,0.25)',
                            borderRadius: '10px',
                            padding:      '12px 16px',
                            color:        '#fca5a5',
                            fontSize:     '13px',
                            fontFamily:   "'Cairo', sans-serif",
                            textAlign:    'center',
                          }}
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit button */}
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={!loading ? { scale: 1.01, boxShadow: `0 0 24px ${GOLD}44` } : {}}
                      whileTap={!loading ? { scale: 0.98 } : {}}
                      transition={snappySpring}
                      style={{
                        width:        '100%',
                        padding:      '15px',
                        background:   loading ? 'rgba(212,168,83,0.55)' : GOLD,
                        border:       'none',
                        borderRadius: '12px',
                        color:        '#0a0a0f',
                        fontSize:     '15px',
                        fontFamily:   "'Cairo', sans-serif",
                        fontWeight:   700,
                        cursor:       loading ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.02em',
                        display:      'flex',
                        alignItems:   'center',
                        justifyContent: 'center',
                        gap:          '10px',
                        transition:   'background 0.2s',
                      }}
                    >
                      {loading && <Spinner />}
                      {loading ? 'جارٍ الإنشاء...' : 'إنشاء متجري التجريبي'}
                    </motion.button>

                    {/* Privacy note */}
                    <p style={{
                      color:      'rgba(255,255,255,0.25)',
                      fontSize:   '11px',
                      fontFamily: "'Cairo', sans-serif",
                      textAlign:  'center',
                      margin:     0,
                      lineHeight: 1.6,
                    }}>
                      لا حاجة لبطاقة ائتمانية · تجربة مجانية كاملة
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
