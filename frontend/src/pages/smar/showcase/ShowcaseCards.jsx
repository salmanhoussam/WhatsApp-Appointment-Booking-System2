/**
 * ShowcaseCards.jsx  —  2.5D Kinetic Parallax Text Overlay
 *
 * 3 text moments locked to the villa's kinetic rise:
 *
 *   s=0.00  HeroBlock       — massive serif title, fades before villa appears
 *   s=0.22  VillaReveal     — "تحفة معمارية" rises in sync with the villa cutout
 *   s=0.72  CTABlock        — grand finale centred reveal + booking button
 *
 * Zero React state re-renders — all driven by the MotionValue from Scene3D.
 */

import { useContext } from 'react';
import { motion, useTransform } from 'framer-motion';
import { ShowcaseContext } from './SmarShowcasePage';

// ─── Glass panel style ────────────────────────────────────────────────────────
const GLASS = {
  backdropFilter:       'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  background:           'rgba(8, 8, 14, 0.62)',
  border:               '1px solid rgba(212,168,83,0.24)',
  boxShadow:            '0 8px 52px rgba(212,168,83,0.10), inset 0 1px 0 rgba(255,255,255,0.07)',
  borderRadius:         20,
  padding:              '24px 30px',
};

// ─── BLOCK 0: Hero  (s 0.00 → 0.18) ─────────────────────────────────────────
// Opening statement — centred, massive serif — fades out as villa rises.
function HeroBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0, 0.03, 0.12, 0.18], [0, 1, 1, 0]);
  const y       = useTransform(scrollProgress, [0, 0.06], ['28px', '0px']);

  return (
    <motion.div
      style={{ opacity, y, pointerEvents: 'none' }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      <p
        style={{
          fontSize:      10,
          letterSpacing: '0.40em',
          color:         '#d4a853',
          textTransform: 'uppercase',
          marginBottom:  22,
          fontWeight:    700,
        }}
      >
        BEIT SMAR · MOUNTAIN ESTATE
      </p>

      {/* Massive serif headline */}
      <h1
        style={{
          fontFamily:    '"Georgia", "Times New Roman", serif',
          fontSize:      'clamp(32px, 7vw, 82px)',
          fontWeight:    700,
          color:         '#ffffff',
          lineHeight:    1.15,
          textShadow:    '0 4px 60px rgba(212,168,83,0.40)',
          direction:     'rtl',
          marginBottom:  '1.5rem',
          letterSpacing: '-0.01em',
        }}
      >
        ملاذك السري بين الجبل والبحر
      </h1>

      <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14, maxWidth: 400, marginBottom: 40 }}>
        Your secret retreat between mountain and sea
      </p>

      {/* Scroll hint */}
      <motion.div
        animate={{ y: [0, 9, 0] }}
        transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
      >
        <span
          style={{
            fontSize:      9,
            letterSpacing: '0.32em',
            color:         'rgba(255,255,255,0.18)',
            textTransform: 'uppercase',
          }}
        >
          مرر للاستكشاف
        </span>
        <div
          style={{
            width:        1,
            height:       36,
            background:   'linear-gradient(to bottom, #d4a853, transparent)',
            borderRadius: '9999px',
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// ─── BLOCK 1: Villa Reveal  (s 0.22 → 0.64) ──────────────────────────────────
// "تحفة معمارية" — rises from below in exact sync with the villa cutout.
// Anchored RIGHT — villa slides up from center, text flanks it on the right side.
function VillaRevealBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.22, 0.30, 0.57, 0.64], [0, 1, 1, 0]);
  const y       = useTransform(scrollProgress, [0.22, 0.32], ['52px', '0px']);

  return (
    <motion.div
      style={{ opacity, y, pointerEvents: 'none' }}
      className="absolute inset-0 flex flex-col items-end justify-center px-8 md:px-20"
    >
      {/* Section label */}
      <p
        style={{
          fontSize:      10,
          letterSpacing: '0.38em',
          color:         '#d4a853',
          textTransform: 'uppercase',
          marginBottom:  20,
          fontWeight:    700,
        }}
      >
        01 — LUXURY VILLAS
      </p>

      {/* The money headline — massive kinetic serif */}
      <h2
        style={{
          fontFamily:    '"Georgia", "Times New Roman", serif',
          fontSize:      'clamp(52px, 10vw, 128px)',
          fontWeight:    700,
          color:         '#ffffff',
          lineHeight:    1.0,
          textShadow:    '0 6px 80px rgba(212,168,83,0.50)',
          direction:     'rtl',
          marginBottom:  '1rem',
          letterSpacing: '-0.02em',
          textAlign:     'right',
        }}
      >
        تحفة
        <br />
        <span style={{ color: '#d4a853' }}>معمارية</span>
      </h2>

      {/* Glassmorphism sub-copy */}
      <div style={{ ...GLASS, maxWidth: 380, textAlign: 'right' }}>
        <p
          style={{
            direction:  'rtl',
            color:      'rgba(255,255,255,0.50)',
            fontSize:   14,
            lineHeight: 1.85,
            margin:     0,
          }}
        >
          فلل ديلوكس عند مدخل المنتجع، تجمع بين الأناقة المعمارية
          وإطلالات البحر المتوسط الخلابة على مدار السنة.
        </p>
      </div>
    </motion.div>
  );
}

// ─── BLOCK 2: Grand CTA  (s 0.72 → 1.00) ────────────────────────────────────
// Centred finale — the sea panorama is fully revealed in the background.
function CTABlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.72, 0.82, 1.00], [0, 1, 1]);
  const y       = useTransform(scrollProgress, [0.72, 0.82], ['40px', '0px']);
  const scale   = useTransform(scrollProgress, [0.72, 0.82], [0.94, 1]);

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      <p
        style={{
          fontSize:      10,
          letterSpacing: '0.40em',
          color:         '#d4a853',
          textTransform: 'uppercase',
          marginBottom:  24,
          fontWeight:    700,
        }}
      >
        الوجهة الحصرية · BEIT SMAR
      </p>

      {/* Finale headline */}
      <h2
        style={{
          fontFamily:    '"Georgia", "Times New Roman", serif',
          fontSize:      'clamp(40px, 8vw, 100px)',
          fontWeight:    700,
          color:         '#ffffff',
          lineHeight:    1.1,
          textShadow:    '0 4px 80px rgba(212,168,83,0.45)',
          direction:     'rtl',
          marginBottom:  '1.5rem',
          letterSpacing: '-0.015em',
        }}
      >
        الأفق الساحر
      </h2>

      <p
        style={{
          color:       'rgba(255,255,255,0.38)',
          fontSize:    14,
          lineHeight:  1.8,
          maxWidth:    460,
          marginBottom: 48,
          direction:   'rtl',
        }}
      >
        حيث ينتهي الجبل ويبدأ البحر — بيت سمار وجهتك الحصرية
        للحجز الخاص في قلب لبنان الجميل.
      </p>

      {/* ── Primary CTA ── */}
      <motion.a
        href="/smar/listings"
        whileHover={{ scale: 1.07, boxShadow: '0 16px 64px rgba(212,168,83,0.60)' }}
        whileTap={{ scale: 0.96 }}
        style={{
          pointerEvents:  'auto',
          background:     'linear-gradient(135deg, #d4a853 0%, #b8893a 100%)',
          boxShadow:      '0 8px 40px rgba(212,168,83,0.35)',
          letterSpacing:  '0.14em',
          textDecoration: 'none',
          display:        'inline-block',
          padding:        '18px 60px',
          borderRadius:   '50px',
          fontWeight:     800,
          fontSize:       15,
          color:          '#fff',
          textTransform:  'uppercase',
        }}
      >
        استكشف وأحجز الآن
      </motion.a>

      {/* ── Secondary ── */}
      <a
        href="/smar/listings"
        style={{
          pointerEvents:  'auto',
          color:          'rgba(212,168,83,0.45)',
          fontSize:       11,
          marginTop:      20,
          letterSpacing:  '0.18em',
          textDecoration: 'none',
          textTransform:  'uppercase',
        }}
      >
        تصفح الوحدات المتاحة ←
      </a>
    </motion.div>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────
export default function ShowcaseCards() {
  return (
    <div className="absolute inset-0">
      <HeroBlock />
      <VillaRevealBlock />
      <CTABlock />
    </div>
  );
}
