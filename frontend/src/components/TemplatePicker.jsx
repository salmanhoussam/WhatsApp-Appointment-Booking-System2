/**
 * TemplatePicker — floating picker for /demo/* pages
 * Lets the customer switch hero style (T1/T2/T3) and catalog layout (C1/C2/C3)
 * instantly without page reload. Persists to localStorage.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HERO_OPTS = [
  {
    key: 'normal',
    label: 'بسيط',
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
        <rect x="1" y="1" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="11" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="7" y="10" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.5"/>
      </svg>
    ),
  },
  {
    key: 'showcase',
    label: 'واجهة',
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
        <rect x="1" y="1" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="11" y1="1" x2="11" y2="15" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
        <rect x="2.5" y="4" width="7" height="2" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="2.5" y="7.5" width="5" height="1.2" rx="0.6" fill="currentColor" opacity="0.35"/>
        <rect x="12.5" y="3" width="8" height="9" rx="1.5" fill="currentColor" opacity="0.12"/>
        <circle cx="16.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      </svg>
    ),
  },
  {
    key: 'landing',
    label: 'هبوط',
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
        <rect x="1" y="1" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <ellipse cx="11" cy="7" rx="5" ry="3" stroke="currentColor" strokeWidth="1" opacity="0.25" strokeDasharray="2 1.5"/>
        <rect x="7" y="5.5" width="8" height="2.5" rx="1.25" fill="currentColor" opacity="0.7"/>
        <rect x="9" y="10" width="4" height="1.5" rx="0.75" fill="currentColor" opacity="0.4"/>
      </svg>
    ),
  },
];

const CATALOG_OPTS = [
  {
    key: 'grid',
    label: 'شبكة',
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
        <rect x="1" y="1" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" opacity="0.8"/>
        <rect x="12" y="1" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" opacity="0.8"/>
        <rect x="1" y="9" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" opacity="0.5"/>
        <rect x="12" y="9" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" opacity="0.5"/>
      </svg>
    ),
  },
  {
    key: 'list',
    label: 'قائمة',
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
        <rect x="1" y="2" width="4" height="4" rx="1" fill="currentColor" opacity="0.6"/>
        <rect x="7" y="3" width="14" height="1.5" rx="0.75" fill="currentColor" opacity="0.7"/>
        <rect x="7" y="5.5" width="9" height="1" rx="0.5" fill="currentColor" opacity="0.3"/>
        <rect x="1" y="8" width="4" height="4" rx="1" fill="currentColor" opacity="0.6"/>
        <rect x="7" y="9" width="14" height="1.5" rx="0.75" fill="currentColor" opacity="0.7"/>
        <rect x="7" y="11.5" width="9" height="1" rx="0.5" fill="currentColor" opacity="0.3"/>
      </svg>
    ),
  },
  {
    key: 'showcase',
    label: 'بطاقات',
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
        <rect x="1" y="1" width="20" height="9" rx="2" stroke="currentColor" strokeWidth="1.3" opacity="0.8"/>
        <rect x="1" y="11" width="9.5" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
        <rect x="11.5" y="11" width="9.5" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
      </svg>
    ),
  },
];

export default function TemplatePicker({ accent = '#6d28d9', heroType, catalogLayout, onHeroChange, onCatalogChange }) {
  const [open, setOpen] = useState(false);

  const btnStyle = (active) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
    border: `1.5px solid ${active ? accent : 'rgba(255,255,255,0.1)'}`,
    background: active ? `${accent}20` : 'rgba(255,255,255,0.04)',
    color: active ? accent : 'rgba(255,255,255,0.5)',
    fontSize: 10, fontWeight: active ? 700 : 400,
    fontFamily: 'inherit', transition: 'all 0.18s',
    minWidth: 58,
  });

  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            style={{
              marginBottom: 10,
              background: 'rgba(10,10,18,0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 18, padding: '16px 20px',
              display: 'flex', flexDirection: 'column', gap: 14,
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              minWidth: 280,
            }}
          >
            {/* Hero section */}
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 8, direction: 'rtl', textTransform: 'uppercase' }}>
                نمط الهيرو
              </div>
              <div style={{ display: 'flex', gap: 8, direction: 'rtl' }}>
                {HERO_OPTS.map(o => (
                  <button key={o.key} style={btnStyle(heroType === o.key)} onClick={() => onHeroChange(o.key)}>
                    {o.icon}
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

            {/* Catalog layout section */}
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 8, direction: 'rtl', textTransform: 'uppercase' }}>
                عرض الكتالوج
              </div>
              <div style={{ display: 'flex', gap: 8, direction: 'rtl' }}>
                {CATALOG_OPTS.map(o => (
                  <button key={o.key} style={btnStyle(catalogLayout === o.key)} onClick={() => onCatalogChange(o.key)}>
                    {o.icon}
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 20px', borderRadius: 999,
            background: 'rgba(10,10,18,0.9)',
            backdropFilter: 'blur(16px)',
            border: `1.5px solid ${open ? accent : 'rgba(255,255,255,0.15)'}`,
            color: open ? accent : 'rgba(255,255,255,0.7)',
            fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer', letterSpacing: '0.04em',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            transition: 'border-color 0.18s, color 0.18s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
          تخصيص التصميم
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ display: 'inline-block', fontSize: 10 }}
          >▲</motion.span>
        </motion.button>
      </div>
    </div>
  );
}
