/**
 * ServicesAddon.jsx
 * Customer-facing selectable add-on service cards.
 * Sunlit Heritage Light Theme — matches SmarBookingDrawer tokens.
 *
 * Props:
 *   services         — array of service objects from API
 *   selectedServices — { [serviceId]: quantity }
 *   onChange         — fn(updated map)
 *   lang             — 'ar' | 'en'
 */

import { motion, AnimatePresence } from 'framer-motion';

const G = {
  bg:         '#faf9f6',
  card:       'rgba(255,255,255,0.85)',
  cardActive: 'rgba(255,255,255,0.95)',
  border:     'rgba(180,158,110,0.22)',
  borderActive:'rgba(184,137,46,0.45)',
  gold:       '#b8892e',
  goldDim:    'rgba(184,137,46,0.10)',
  goldBorder: 'rgba(184,137,46,0.28)',
  text:       '#2d2824',
  textSec:    'rgba(45,40,36,0.60)',
  textMuted:  'rgba(45,40,36,0.38)',
};

// ── Service icons (emoji fallback map) ───────────────────────────────────────
const SERVICE_ICONS = {
  pool:       '🏊',
  breakfast:  '🍳',
  'فطور':     '🍳',
  bed:        '🛏',
  spa:        '💆',
  bbq:        '🔥',
  parking:    '🚗',
  wifi:       '📶',
  cleaning:   '🧹',
  transfer:   '🚐',
  tour:       '🗺️',
  default:    '✨',
};

function getIcon(service) {
  const key = (service.name_en || service.name_ar || '').toLowerCase();
  for (const [k, v] of Object.entries(SERVICE_ICONS)) {
    if (k !== 'default' && key.includes(k)) return v;
  }
  if ((service.name_ar || '').includes('مسبح')) return SERVICE_ICONS.pool;
  if ((service.name_ar || '').includes('فطور')) return SERVICE_ICONS.breakfast;
  return SERVICE_ICONS.default;
}

// ── Quantity stepper ──────────────────────────────────────────────────────────
function Stepper({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <motion.button
        onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, value - 1)); }}
        whileTap={{ scale: 0.88 }}
        style={{
          width: 26, height: 26, borderRadius: '50%',
          background: value > 0 ? G.goldDim : 'rgba(180,158,110,0.06)',
          border: `1px solid ${value > 0 ? G.goldBorder : G.border}`,
          color: value > 0 ? G.gold : G.textMuted,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', fontWeight: 700, lineHeight: 1,
        }}
      >
        −
      </motion.button>
      <span style={{ color: G.text, fontWeight: 700, fontSize: '0.88rem', minWidth: 18, textAlign: 'center' }}>
        {value}
      </span>
      <motion.button
        onClick={(e) => { e.stopPropagation(); onChange(value + 1); }}
        whileTap={{ scale: 0.88 }}
        style={{
          width: 26, height: 26, borderRadius: '50%',
          background: G.goldDim, border: `1px solid ${G.goldBorder}`,
          color: G.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', fontWeight: 700, lineHeight: 1,
        }}
      >
        +
      </motion.button>
    </div>
  );
}

// ── Single card ───────────────────────────────────────────────────────────────
function ServiceCard({ service, quantity, onQuantityChange, lang }) {
  const isSelected = quantity > 0;
  const name       = lang === 'ar' ? (service.name_ar || service.name_en) : (service.name_en || service.name_ar);
  const icon       = getIcon(service);

  const handleCardClick = () => {
    if (!isSelected) onQuantityChange(1);
  };

  return (
    <motion.div
      onClick={handleCardClick}
      whileHover={{ scale: 1.015 }}
      layout
      style={{
        background:   isSelected ? G.cardActive : G.card,
        border:       `1.5px solid ${isSelected ? G.borderActive : G.border}`,
        borderRadius: 14,
        padding:      '14px 16px',
        cursor:       isSelected ? 'default' : 'pointer',
        boxShadow:    isSelected ? `0 4px 20px rgba(184,137,46,0.12)` : 'none',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        transition:   'border-color 0.2s, box-shadow 0.2s, background 0.2s',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: isSelected ? G.goldDim : 'rgba(180,158,110,0.07)',
        border: `1px solid ${isSelected ? G.goldBorder : G.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.15rem',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        {icon}
      </div>

      {/* Name + price */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: G.text, fontWeight: 600, fontSize: '0.85rem', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: G.gold, fontWeight: 700, fontSize: '0.82rem' }}>
            {Number(service.base_price).toLocaleString()} {service.currency || 'SAR'}
          </span>
          {service.duration && (
            <span style={{ color: G.textMuted, fontSize: '0.72rem' }}>
              · {service.duration} {lang === 'ar' ? 'دقيقة' : 'min'}
            </span>
          )}
        </div>
      </div>

      {/* Quantity or add badge */}
      <div style={{ flexShrink: 0 }}>
        <AnimatePresence mode="wait">
          {isSelected ? (
            <motion.div key="stepper" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Stepper value={quantity} onChange={onQuantityChange} />
            </motion.div>
          ) : (
            <motion.div
              key="add"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              style={{
                padding: '5px 12px', borderRadius: 8,
                background: G.goldDim, border: `1px solid ${G.goldBorder}`,
                color: G.gold, fontSize: '0.75rem', fontWeight: 700,
              }}
            >
              {lang === 'ar' ? '+ أضف' : '+ Add'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ServicesAddon({ services, selectedServices, onChange, lang = 'ar' }) {
  if (!services?.length) return null;

  const handleQty = (serviceId, qty) => {
    const next = { ...selectedServices };
    if (qty <= 0) delete next[serviceId];
    else next[serviceId] = qty;
    onChange(next);
  };

  const selectedCount = Object.values(selectedServices).filter(q => q > 0).length;
  const label = lang === 'ar' ? 'خدمات إضافية' : 'Add-on Services';
  const subtitle = lang === 'ar' ? 'اختر ما يناسبك لتجربة أفضل' : 'Enhance your stay';

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(180,158,110,0.18)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.65rem', color: G.gold, letterSpacing: '0.17em', textTransform: 'uppercase', fontWeight: 700 }}>
            {label}
          </span>
          {selectedCount > 0 && (
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: G.gold, color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedCount}
            </span>
          )}
        </div>
        <div style={{ flex: 1, height: 1, background: 'rgba(180,158,110,0.18)' }} />
      </div>

      <p style={{ color: G.textMuted, fontSize: '0.74rem', textAlign: 'center', marginBottom: 14, letterSpacing: '0.04em' }}>
        {subtitle}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {services.map(s => (
          <ServiceCard
            key={s.id}
            service={s}
            quantity={selectedServices[s.id] || 0}
            onQuantityChange={(qty) => handleQty(s.id, qty)}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}
