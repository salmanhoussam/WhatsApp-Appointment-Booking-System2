/**
 * SmarUnitModal.jsx
 * Full-screen slide-up unit detail modal — GS MAR dark aesthetic.
 * Shows 5-image gallery + unit specs + "Book this Unit" CTA.
 *
 * Props:
 *   unit     — unit object from API
 *   onClose  — fn: close the modal
 *   onBook   — fn: proceed to SmarBookingDrawer
 *   lang     — 'ar' | 'en'
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect }     from 'react';
import DynamicContentRenderer from '../../../components/ui/DynamicContentRenderer';
import { useTenantConfigContext } from '../../../context/TenantConfigContext';

// ── Design tokens — Sunlit Heritage Light Theme ──────────────────────────────
const G = {
  bg:          '#faf9f6',
  card:        'rgba(255,255,255,0.75)',
  border:      'rgba(180,158,110,0.22)',
  gold:        '#b8892e',
  goldDim:     'rgba(184,137,46,0.12)',
  text:        '#2d2824',
  textSec:     'rgba(45,40,36,0.60)',
  textMuted:   'rgba(45,40,36,0.38)',
  shadow:      '0 2px 24px rgba(120,90,40,0.10)',
  spring:      { type: 'spring', stiffness: 60, damping: 20, mass: 1 },
  snappy:      { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 },
};

// ── Spec chip ────────────────────────────────────────────────────────────────
function Chip({ icon, label }) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            10,
      background:     G.card,
      border:         `1px solid ${G.border}`,
      borderRadius:   12,
      padding:        '11px 14px',
      color:          G.textSec,
      fontSize:       '0.82rem',
      letterSpacing:  '0.02em',
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      {label}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SmarUnitModal({ unit, onClose, onBook, lang = 'ar' }) {
  const { config } = useTenantConfigContext();
  const waPhone = config.whatsapp_number || '96178727986';
  const [activeImg, setActiveImg] = useState(0);

  // Reset active image when unit changes
  useEffect(() => { setActiveImg(0); }, [unit?.id]);

  // Keyboard close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!unit) return null;

  // Build image array — use unit.images[] (current schema) with image_url fallback
  const rawImages = unit.images?.length > 0
    ? unit.images
    : (unit.image_url ? [unit.image_url] : []);

  const images = rawImages.length > 0
    ? rawImages
    : Array.from({ length: 3 }, (_, i) =>
        `https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/interiors/${unit.id}_${i + 1}.jpg`
      );

  const name      = lang === 'ar' ? (unit.name_ar || unit.name_en) : (unit.name_en || unit.name_ar);
  const typeLabel = unit.unit_type || unit.type || 'Chalet';
  const price     = unit.price || unit.price_per_night || unit.base_price;
  const capacity  = unit.capacity || '—';

  // Prefer bilingual description fields, fall back to single description field
  const description =
    (lang === 'ar' ? unit.description_ar : unit.description_en)
    || unit.description
    || (lang === 'ar'
      ? 'استمتع بالهدوء والفخامة في هذه الوحدة المميزة بإطلالات طبيعية لا تُنسى وتصميم تراثي أصيل.'
      : 'Experience tranquility and luxury in this distinctive unit with unforgettable natural views and authentic heritage design.');

  // Fallback spec chips — shown only when no amenities JSON data
  const hasDynamicContent = unit.amenities?.length > 0 || unit.content_blocks?.length > 0;
  const specs = [
    { icon: '👥', label: lang === 'ar' ? `يتسع لـ ${capacity} أشخاص` : `${capacity} guests` },
    { icon: '🛏', label: lang === 'ar' ? `${unit.bedrooms || 1} غرفة نوم` : `${unit.bedrooms || 1} bedroom` },
    { icon: '🚿', label: lang === 'ar' ? `${unit.bathrooms || 1} حمام` : `${unit.bathrooms || 1} bath` },
    { icon: '🌲', label: lang === 'ar' ? 'إطلالة طبيعية' : 'Nature view' },
  ];

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          zIndex:     100,
          background: 'rgba(200,185,160,0.45)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Panel — slides up from bottom */}
      <motion.div
        key="modal-panel"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={G.spring}
        onClick={(e) => e.stopPropagation()}
        style={{
          position:     'fixed',
          bottom:       0,
          left:         0,
          right:        0,
          zIndex:       101,
          height:       '92vh',
          background:   G.bg,
          borderRadius: '22px 22px 0 0',
          border:       `1px solid ${G.border}`,
          borderBottom: 'none',
          boxShadow:    '0 -8px 48px rgba(120,90,40,0.12)',
          display:      'flex',
          overflow:     'hidden',
        }}
      >
        {/* ── LEFT: Image Gallery ─────────────────────────────────────── */}
        <div style={{
          width:      '60%',
          position:   'relative',
          background: '#d8cfc0',
          flexShrink: 0,
        }}>
          {/* Main image */}
          <motion.img
            key={activeImg}
            src={images[activeImg]}
            alt={name}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://placehold.co/800x600/0a0a10/444444?text=Beit+Smar';
            }}
            style={{
              width:      '100%',
              height:     '100%',
              objectFit:  'cover',
              display:    'block',
            }}
          />

          {/* Vignette */}
          <div style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(to top, rgba(250,249,246,0.92) 0%, rgba(250,249,246,0.08) 42%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* Thumbnail strip */}
          <div style={{
            position:       'absolute',
            bottom:         22,
            left:           0,
            right:          0,
            display:        'flex',
            justifyContent: 'center',
            gap:            8,
            padding:        '0 24px',
          }}>
            {images.map((src, i) => (
              <motion.div
                key={i}
                onClick={() => setActiveImg(i)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  width:        58,
                  height:       44,
                  borderRadius: 8,
                  overflow:     'hidden',
                  cursor:       'pointer',
                  border:       `2px solid ${i === activeImg ? G.gold : 'rgba(255,255,255,0.5)'}`,
                  opacity:      i === activeImg ? 1 : 0.55,
                  transition:   'opacity 0.2s, border-color 0.2s',
                  flexShrink:   0,
                }}
              >
                <img
                  src={src}
                  alt={`thumb-${i}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://placehold.co/100x80/0a0a10/444?text=${i + 1}`;
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Details Panel ────────────────────────────────────── */}
        <div
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          style={{
            flex:           1,
            padding:        '44px 40px',
            overflowY:      'auto',
            display:        'flex',
            flexDirection:  'column',
            gap:            0,
          }}
        >
          {/* Category badge */}
          <div style={{
            display:         'inline-flex',
            alignSelf:       lang === 'ar' ? 'flex-end' : 'flex-start',
            alignItems:      'center',
            gap:             6,
            background:      G.goldDim,
            border:          `1px solid rgba(212,168,83,0.3)`,
            borderRadius:    20,
            padding:         '4px 12px',
            marginBottom:    16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: G.gold }} />
            <span style={{ color: G.gold, fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
              {typeLabel}
            </span>
          </div>

          {/* Unit name */}
          <h2 style={{
            fontSize:   '2.2rem',
            color:      G.text,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: price ? 12 : 20,
          }}>
            {name}
          </h2>

          {/* Price */}
          {price && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 22 }}>
              <span style={{ color: G.gold, fontSize: '1.3rem', fontWeight: 700 }}>
                {Number(price).toLocaleString()} SAR
              </span>
              <span style={{ color: G.textMuted, fontSize: '0.8rem' }}>
                {lang === 'ar' ? '/ ليلة' : '/ night'}
              </span>
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: G.border, marginBottom: 22 }} />

          {/* Description */}
          <p style={{
            color:        G.textSec,
            fontSize:     '0.9rem',
            lineHeight:   1.75,
            marginBottom: 28,
          }}>
            {description}
          </p>

          {/* Dynamic content — amenities, content blocks, rules */}
          {hasDynamicContent
            ? <DynamicContentRenderer unit={unit} lang={lang} theme="light" />
            : (
              <div style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr',
                gap:                 10,
                marginBottom:        28,
              }}>
                {specs.map((s) => <Chip key={s.label} {...s} />)}
              </div>
            )
          }

          {/* Book CTA */}
          <motion.button
            onClick={onBook}
            whileHover={{ scale: 1.02, boxShadow: '0 12px 40px rgba(212,168,83,0.3)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop:     'auto',
              background:    'linear-gradient(135deg, #d4a853 0%, #b8892a 100%)',
              border:        'none',
              borderRadius:  14,
              padding:       '17px 24px',
              color:         '#050508',
              fontWeight:    700,
              fontSize:      '0.95rem',
              cursor:        'pointer',
              letterSpacing: '0.04em',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
              gap:           8,
            }}
          >
            {lang === 'ar' ? 'احجز هذه الوحدة' : 'Book this Unit'}
            <span style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }}>→</span>
          </motion.button>

          {/* WhatsApp fallback */}
          <motion.a
            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(lang === 'ar' ? `مرحباً، أريد الاستفسار عن وحدة: ${name}` : `Hello, I'd like to inquire about: ${name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ opacity: 0.8 }}
            style={{
              marginTop:      12,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            8,
              color:          G.textMuted,
              fontSize:       '0.8rem',
              textDecoration: 'none',
              letterSpacing:  '0.04em',
              padding:        '10px 0',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#25D366" viewBox="0 0 16 16">
              <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
            </svg>
            {lang === 'ar' ? 'أو تواصل عبر واتساب' : 'or contact via WhatsApp'}
          </motion.a>
        </div>

        {/* ── Close Button ────────────────────────────────────────────── */}
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.12)' }}
          whileTap={{ scale: 0.92 }}
          style={{
            position:       'absolute',
            top:            18,
            right:          18,
            width:          40,
            height:         40,
            borderRadius:   '50%',
            background:     'rgba(255,255,255,0.80)',
            border:         `1px solid ${G.border}`,
            backdropFilter: 'blur(10px)',
            color:          G.textSec,
            fontSize:       '1rem',
            cursor:         'pointer',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            transition:     'background 0.2s',
            zIndex:         10,
          }}
        >
          ✕
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
