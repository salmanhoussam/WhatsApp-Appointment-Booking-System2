/**
 * BookingDrawer.jsx — Organism (Phase 33.2)
 *
 * Premium glass drawer for WhatsApp-first booking inquiry.
 *   Mobile  : slides up from bottom (bottom sheet, max 92vh)
 *   Desktop : slides in from the right (420px sidebar, full height)
 *
 * Props:
 *   isOpen   — boolean — controls AnimatePresence mount/unmount
 *   unit     — Unit object ({ name_ar, name_en, price, type, ... })
 *   onClose  — () => void
 *
 * WhatsApp phone reads from useTenantConfig().
 * Constructs a formatted Arabic message and opens wa.me deep link.
 *
 * FM12 / React 19 safety:
 *   animate/exit use plain literals — no MotionValues, no useScroll.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence }      from 'framer-motion';
import useTenantConfig                  from '../../hooks/useTenantConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function nightsBetween(a, b) {
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
}

// ── Design tokens — glass3d reference (dark, #d4a853 accent, blur 30px) ──────
const GLASS = {
  background:           'hsl(40 50% 8% / 0.78)',
  backdropFilter:       'blur(30px) brightness(1.08)',
  WebkitBackdropFilter: 'blur(30px) brightness(1.08)',
  boxShadow:            '0 8px 32px hsl(38 60% 20% / 0.30), inset 0 1px 0 hsl(38 80% 70% / 0.08)',
};

const INPUT_STYLE = {
  background:   'rgba(255,255,255,0.05)',
  border:       '1px solid rgba(255,255,255,0.11)',
  borderRadius: 10,
  color:        '#fff',
  fontSize:     13,
  padding:      '9px 12px',
  outline:      'none',
  width:        '100%',
  boxSizing:    'border-box',
  colorScheme:  'dark',
};

const COUNTER_BTN_BASE = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  width:          32,
  height:         32,
  borderRadius:   8,
  background:     'rgba(255,255,255,0.06)',
  border:         '1px solid rgba(255,255,255,0.11)',
  color:          '#fff',
  fontSize:       19,
  cursor:         'pointer',
  userSelect:     'none',
  lineHeight:     1,
};

// ── Counter row ───────────────────────────────────────────────────────────────

function Counter({ label, sublabel, value, min, max, onDecrement, onIncrement }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, fontWeight: 500 }}>{label}</span>
        {sublabel && (
          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11 }}>{sublabel}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          type="button"
          style={{ ...COUNTER_BTN_BASE, opacity: value <= min ? 0.35 : 1 }}
          onClick={onDecrement}
          disabled={value <= min}
          aria-label={`تقليل ${label}`}
        >
          −
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, minWidth: 22, textAlign: 'center' }}>
          {value}
        </span>
        <button
          type="button"
          style={{ ...COUNTER_BTN_BASE, opacity: value >= max ? 0.35 : 1 }}
          onClick={onIncrement}
          disabled={value >= max}
          aria-label={`زيادة ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BookingDrawer({ isOpen, unit, onClose }) {
  const { config }  = useTenantConfig();
  const adminPhone  = config?.whatsapp_number ?? '96170000000';

  // Detect screen size once on mount — used to pick slide direction
  const isDesktop = useRef(typeof window !== 'undefined' && window.innerWidth >= 768).current;

  const [checkIn,  setCheckIn]  = useState(today());
  const [checkOut, setCheckOut] = useState(addDays(today(), 2));
  const [adults,   setAdults]   = useState(2);
  const [children, setChildren] = useState(0);

  const nights   = nightsBetween(checkIn, checkOut);
  const total    = nights * (unit?.price ?? 0);
  const unitName = unit?.name_ar || unit?.name_en || 'الوحدة';
  const typeLabel = unit?.type === 'villa' ? 'فيلا' : 'شاليه';

  // ESC — register once, always active while drawer is in the tree
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reset form whenever a new unit is opened
  useEffect(() => {
    if (isOpen) {
      setCheckIn(today());
      setCheckOut(addDays(today(), 2));
      setAdults(2);
      setChildren(0);
    }
  }, [isOpen, unit?.id]);

  const handleWhatsApp = () => {
    const guestLine = children > 0
      ? `${adults + children} أشخاص (${adults} بالغ، ${children} أطفال)`
      : `${adults} ${adults === 1 ? 'شخص' : 'أشخاص'}`;

    const msg =
      `مرحباً، أود الاستفسار عن حجز ${unitName} ` +
      `من ${formatDate(checkIn)} إلى ${formatDate(checkOut)} ` +
      `لـ ${guestLine}.`;

    window.open(
      `https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  // Slide direction based on viewport
  const drawerVariants = {
    initial: isDesktop ? { x: '100%' } : { y: '100%' },
    animate: isDesktop ? { x: 0      } : { y: 0      },
    exit:    isDesktop ? { x: '100%' } : { y: '100%' },
  };
  const spring = { type: 'spring', stiffness: 340, damping: 38, mass: 0.85 };

  const drawerStyle = {
    ...(isDesktop
      ? { position: 'fixed', top: 0, right: 0, bottom: 0, width: 420 }
      : { position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '92dvh', borderRadius: '20px 20px 0 0' }
    ),
    zIndex:    110,
    overflowY: 'auto',
    ...GLASS,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            aria-hidden="true"
            style={{
              position:             'fixed',
              inset:                0,
              zIndex:               109,
              background:           'rgba(5,5,8,0.70)',
              backdropFilter:       'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* ── Drawer panel ── */}
          <motion.div
            key="drawer"
            variants={drawerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={spring}
            style={drawerStyle}
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label={`حجز ${unitName}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            {!isDesktop && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 2px' }}>
                <div style={{ width: 44, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.16)' }} />
              </div>
            )}

            <div style={{ padding: '22px 24px 36px' }}>

              {/* ── Header ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', margin: '0 0 5px' }}>
                    {typeLabel}
                  </p>
                  <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 20, margin: '0 0 5px', lineHeight: 1.2 }}>
                    {unitName}
                  </h2>
                  {unit?.price && (
                    <p style={{ color: '#d4a853', fontSize: 13, fontWeight: 600, margin: 0 }}>
                      يبدأ من {unit.price} $ / ليلة
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق"
                  style={{
                    background:   'rgba(255,255,255,0.05)',
                    border:       '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '50%',
                    width:        34,
                    height:       34,
                    color:        'rgba(255,255,255,0.40)',
                    cursor:       'pointer',
                    fontSize:     14,
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    flexShrink:   0,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Gold hairline */}
              <div style={{ height: 1, background: 'linear-gradient(to left, transparent, rgba(212,168,83,0.35), transparent)', marginBottom: 22 }} />

              {/* ── Dates ── */}
              <div style={{ marginBottom: 22 }}>
                <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  مدة الإقامة
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[
                    { label: 'تاريخ الدخول',  val: checkIn,  onChange: setCheckIn,  min: today() },
                    { label: 'تاريخ الخروج', val: checkOut, onChange: setCheckOut, min: addDays(checkIn, 1) },
                  ].map(({ label, val, onChange, min }) => (
                    <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, letterSpacing: '0.05em' }}>
                        {label}
                      </span>
                      <input
                        type="date"
                        value={val}
                        min={min}
                        onChange={e => onChange(e.target.value)}
                        style={INPUT_STYLE}
                      />
                    </label>
                  ))}
                </div>

                {/* Nights badge */}
                {nights > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{
                      color:        'rgba(212,168,83,0.75)',
                      fontSize:     11,
                      fontWeight:   700,
                      padding:      '3px 14px',
                      border:       '1px solid rgba(212,168,83,0.20)',
                      borderRadius: 100,
                      background:   'rgba(212,168,83,0.06)',
                    }}>
                      {nights} {nights === 1 ? 'ليلة' : 'ليالٍ'}
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                )}
              </div>

              {/* ── Guests ── */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  الضيوف
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Counter
                    label="بالغون"
                    sublabel="+13 سنة"
                    value={adults}
                    min={1}
                    max={16}
                    onDecrement={() => setAdults(v => Math.max(1, v - 1))}
                    onIncrement={() => setAdults(v => Math.min(16, v + 1))}
                  />
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                  <Counter
                    label="أطفال"
                    sublabel="أقل من 13 سنة"
                    value={children}
                    min={0}
                    max={8}
                    onDecrement={() => setChildren(v => Math.max(0, v - 1))}
                    onIncrement={() => setChildren(v => Math.min(8, v + 1))}
                  />
                </div>
              </div>

              {/* ── Price summary ── */}
              {total > 0 && (
                <div style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'center',
                  padding:        '12px 16px',
                  borderRadius:   12,
                  background:     'rgba(212,168,83,0.06)',
                  border:         '1px solid rgba(212,168,83,0.15)',
                  marginBottom:   20,
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12 }}>
                    الإجمالي التقريبي
                  </span>
                  <span style={{ color: '#d4a853', fontWeight: 800, fontSize: 18 }}>
                    {total.toLocaleString('ar')} $
                  </span>
                </div>
              )}

              {/* ── WhatsApp CTA ── */}
              <button
                type="button"
                onClick={handleWhatsApp}
                style={{
                  width:          '100%',
                  padding:        '15px 0',
                  borderRadius:   14,
                  background:     'linear-gradient(135deg, #25d366 0%, #128c46 100%)',
                  border:         'none',
                  color:          '#fff',
                  fontSize:       15,
                  fontWeight:     800,
                  letterSpacing:  '0.03em',
                  cursor:         'pointer',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            10,
                  boxShadow:      '0 4px 24px rgba(37,211,102,0.25)',
                  transition:     'opacity 0.18s, box-shadow 0.18s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity    = '0.91';
                  e.currentTarget.style.boxShadow  = '0 6px 32px rgba(37,211,102,0.38)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity    = '1';
                  e.currentTarget.style.boxShadow  = '0 4px 24px rgba(37,211,102,0.25)';
                }}
              >
                {/* WhatsApp logo */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                تأكيد الحجز عبر واتساب
              </button>

              <p style={{ color: 'rgba(255,255,255,0.20)', fontSize: 10, textAlign: 'center', letterSpacing: '0.08em', marginTop: 10, lineHeight: 1.5 }}>
                سنتواصل معك لتأكيد التفاصيل والسعر النهائي
              </p>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
