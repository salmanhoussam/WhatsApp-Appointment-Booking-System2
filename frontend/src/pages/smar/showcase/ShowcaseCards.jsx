/**
 * ShowcaseCards.jsx  —  Option C: Cinematic Diorama Text Overlay
 *
 * 5 text moments locked to the drone's Z position over each station.
 *
 * Timing math  (camera Z = lerp(+10, -45, s) → 55-unit range):
 *   Villas  z=0:   s_peak = 10/55 ≈ 0.18
 *   Pool    z=−15: s_peak = 25/55 ≈ 0.45
 *   Chalets z=−30: s_peak = 40/55 ≈ 0.73
 *
 *   Each block occupies a ±0.09 window around its peak:
 *   HeroBlock    s  0.00 → 0.14   opening title
 *   VillasBlock  s  0.10 → 0.33   LEFT panel  (station is RIGHT, x:+4)
 *   PoolBlock    s  0.37 → 0.60   RIGHT panel (station is CENTER)
 *   ChaletsBlock s  0.64 → 0.85   LEFT panel  (station is LEFT, x:−4)
 *   FinaleBlock  s  0.87 → 1.00   centred CTA
 *
 * Typography: Serif ("Georgia") at Awwwards scale for hero titles.
 * Zero React state re-renders — all via MotionValue from ShowcaseContext.
 */

import { useContext } from 'react';
import { motion, useTransform } from 'framer-motion';
import { ShowcaseContext } from './SmarShowcasePage';

// ─── GS MAR glass panel ───────────────────────────────────────────────────────
const GLASS = {
  backdropFilter:       'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  background:           'rgba(8, 8, 14, 0.62)',
  border:               '1px solid rgba(212,168,83,0.24)',
  boxShadow:            '0 8px 52px rgba(212,168,83,0.10), inset 0 1px 0 rgba(255,255,255,0.07)',
  borderRadius:         20,
  padding:              '24px 30px',
};

// ─── BLOCK 0: Hero Intro  (s 0.00 → 0.14) ────────────────────────────────────
// Visible as the drone lifts off above the estate entrance.
// Fades out completely before the Villas station is reached.
function HeroBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0, 0.03, 0.09, 0.14], [0, 1, 1, 0]);
  const y       = useTransform(scrollProgress, [0, 0.05], ['28px', '0px']);

  return (
    <motion.div
      style={{ opacity, y, pointerEvents: 'none' }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      <p style={{
        fontSize: 10, letterSpacing: '0.40em', color: '#d4a853',
        textTransform: 'uppercase', marginBottom: 22, fontWeight: 700,
      }}>
        BEIT SMAR · MOUNTAIN ESTATE
      </p>

      <h1 style={{
        fontFamily:    '"Georgia", "Times New Roman", serif',
        fontSize:      'clamp(32px, 7vw, 82px)',
        fontWeight:    700,
        color:         '#ffffff',
        lineHeight:    1.15,
        textShadow:    '0 4px 60px rgba(212,168,83,0.40)',
        direction:     'rtl',
        marginBottom:  '1.5rem',
        letterSpacing: '-0.01em',
      }}>
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
        <span style={{
          fontSize: 9, letterSpacing: '0.32em',
          color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase',
        }}>
          مرر للاستكشاف
        </span>
        <div style={{
          width: 1, height: 36,
          background: 'linear-gradient(to bottom, #d4a853, transparent)',
          borderRadius: '9999px',
        }} />
      </motion.div>
    </motion.div>
  );
}

// ─── BLOCK 1: Villas  (s 0.10 → 0.33) ───────────────────────────────────────
// Station is on the RIGHT (x:+4) — panel anchors LEFT so it doesn't overlap.
// Camera sways right as it approaches, text slides in from the left.
function VillasBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.10, 0.16, 0.26, 0.33], [0, 1, 1, 0]);
  const x       = useTransform(scrollProgress, [0.10, 0.17], ['-56px', '0px']);

  return (
    <motion.div
      style={{ opacity, pointerEvents: 'none' }}
      className="absolute inset-0 flex items-center justify-start px-6 md:px-16"
    >
      <motion.div style={{ x }}>
        {/* Oversized serif headline */}
        <p style={{
          fontSize: 10, letterSpacing: '0.36em', color: '#d4a853',
          textTransform: 'uppercase', marginBottom: 16, fontWeight: 700,
        }}>
          01 — LUXURY VILLAS
        </p>

        <h2 style={{
          fontFamily:    '"Georgia", "Times New Roman", serif',
          fontSize:      'clamp(44px, 9vw, 110px)',
          fontWeight:    700,
          color:         '#ffffff',
          lineHeight:    1.0,
          textShadow:    '0 6px 70px rgba(212,168,83,0.50)',
          direction:     'rtl',
          marginBottom:  '1rem',
          letterSpacing: '-0.02em',
        }}>
          فلل<br />
          <span style={{ color: '#d4a853' }}>ديلوكس</span>
        </h2>

        {/* Glass sub-copy */}
        <div style={{ ...GLASS, maxWidth: 360 }}>
          <p style={{ direction: 'rtl', color: 'rgba(255,255,255,0.50)',
                      fontSize: 14, lineHeight: 1.85, margin: 0 }}>
            فلل فاخرة عند مدخل المنتجع، تجمع بين الأناقة المعمارية
            وإطلالات البحر المتوسط الخلابة على مدار السنة.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── BLOCK 2: Pool & Cafeteria  (s 0.37 → 0.60) ─────────────────────────────
// Station is at CENTER — panel anchors RIGHT for visual balance.
// Camera is centered as it passes through, text slides from the right.
function PoolBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.37, 0.43, 0.53, 0.60], [0, 1, 1, 0]);
  const x       = useTransform(scrollProgress, [0.37, 0.44], ['56px', '0px']);

  return (
    <motion.div
      style={{ opacity, pointerEvents: 'none' }}
      className="absolute inset-0 flex items-center justify-end px-6 md:px-16"
    >
      <motion.div style={{ x }}>
        <p style={{
          fontSize: 10, letterSpacing: '0.36em', color: '#d4a853',
          textTransform: 'uppercase', marginBottom: 16, fontWeight: 700,
          textAlign: 'right',
        }}>
          02 — POOL &amp; CAFETERIA
        </p>

        <h2 style={{
          fontFamily:    '"Georgia", "Times New Roman", serif',
          fontSize:      'clamp(44px, 9vw, 110px)',
          fontWeight:    700,
          color:         '#ffffff',
          lineHeight:    1.0,
          textShadow:    '0 6px 70px rgba(212,168,83,0.50)',
          direction:     'rtl',
          marginBottom:  '1rem',
          letterSpacing: '-0.02em',
          textAlign:     'right',
        }}>
          المسبح<br />
          <span style={{ color: '#d4a853' }}>والمطعم</span>
        </h2>

        <div style={{ ...GLASS, maxWidth: 360 }}>
          <p style={{ direction: 'rtl', color: 'rgba(255,255,255,0.50)',
                      fontSize: 14, lineHeight: 1.85, margin: 0, textAlign: 'right' }}>
            مسبح لا متناهي يندمج مع الأفق البحري، ومطعم يقدم
            أشهى المأكولات اللبنانية مع كل غروب شمس لا يُنسى.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── BLOCK 3: Chalets  (s 0.64 → 0.85) ──────────────────────────────────────
// Station is on the LEFT (x:−4) — panel anchors RIGHT so it doesn't overlap.
// Camera sways left, text slides in from the right.
function ChaletsBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.64, 0.70, 0.79, 0.85], [0, 1, 1, 0]);
  const x       = useTransform(scrollProgress, [0.64, 0.71], ['56px', '0px']);

  return (
    <motion.div
      style={{ opacity, pointerEvents: 'none' }}
      className="absolute inset-0 flex items-center justify-end px-6 md:px-16"
    >
      <motion.div style={{ x }}>
        <p style={{
          fontSize: 10, letterSpacing: '0.36em', color: '#d4a853',
          textTransform: 'uppercase', marginBottom: 16, fontWeight: 700,
          textAlign: 'right',
        }}>
          03 — MOUNTAIN CHALETS
        </p>

        <h2 style={{
          fontFamily:    '"Georgia", "Times New Roman", serif',
          fontSize:      'clamp(44px, 9vw, 110px)',
          fontWeight:    700,
          color:         '#ffffff',
          lineHeight:    1.0,
          textShadow:    '0 6px 70px rgba(212,168,83,0.50)',
          direction:     'rtl',
          marginBottom:  '1rem',
          letterSpacing: '-0.02em',
          textAlign:     'right',
        }}>
          شاليهات<br />
          <span style={{ color: '#d4a853' }}>الجبل</span>
        </h2>

        <div style={{ ...GLASS, maxWidth: 360 }}>
          <p style={{ direction: 'rtl', color: 'rgba(255,255,255,0.50)',
                      fontSize: 14, lineHeight: 1.85, margin: 0, textAlign: 'right' }}>
            شاليهات من الحجر اللبناني الأصيل تتربع على منحدرات الجبل،
            حيث تراث المنطقة يعانق سكينة الطبيعة في مشهد واحد.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── BLOCK 4: Sea Horizon Finale  (s 0.87 → 1.00) ───────────────────────────
// The massive sea panorama fills the background — centred grand CTA reveal.
function SeaFinaleBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.87, 0.93, 1.00], [0, 1, 1]);
  const y       = useTransform(scrollProgress, [0.87, 0.93], ['40px', '0px']);
  const scale   = useTransform(scrollProgress, [0.87, 0.93], [0.94, 1]);

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      <p style={{
        fontSize: 10, letterSpacing: '0.40em', color: '#d4a853',
        textTransform: 'uppercase', marginBottom: 24, fontWeight: 700,
      }}>
        04 — THE MAGICAL HORIZON
      </p>

      <h2 style={{
        fontFamily:    '"Georgia", "Times New Roman", serif',
        fontSize:      'clamp(40px, 8vw, 100px)',
        fontWeight:    700,
        color:         '#ffffff',
        lineHeight:    1.1,
        textShadow:    '0 4px 80px rgba(212,168,83,0.45)',
        direction:     'rtl',
        marginBottom:  '1.5rem',
        letterSpacing: '-0.015em',
      }}>
        الأفق الساحر
      </h2>

      <p style={{
        color: 'rgba(255,255,255,0.38)', fontSize: 14, lineHeight: 1.8,
        maxWidth: 460, marginBottom: 48, direction: 'rtl',
      }}>
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
          pointerEvents: 'auto', color: 'rgba(212,168,83,0.45)',
          fontSize: 11, marginTop: 20, letterSpacing: '0.18em',
          textDecoration: 'none', textTransform: 'uppercase',
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
      <VillasBlock />
      <PoolBlock />
      <ChaletsBlock />
      <SeaFinaleBlock />
    </div>
  );
}
