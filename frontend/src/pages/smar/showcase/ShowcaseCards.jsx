/**
 * ShowcaseCards.jsx  —  Phase 32: Drone Flight HTML Text Overlay
 *
 * 5 text blocks locked to the drone's position over the estate.
 * Camera travels Z=+10 → Z=-50 (60 units total).
 *
 * scroll-to-frame timing (s = scroll offset 0→1):
 *   s=0.00  Hero intro   — above the entrance gate
 *   s=0.17  Villas       — z=0,  x=+3  (text LEFT, frame right)
 *   s=0.42  Chalets      — z=−15, x=−2 (text RIGHT, frame left)
 *   s=0.67  Pool & Café  — z=−30, x=+1 (text LEFT, frame right-center)
 *   s=0.97  Sea Horizon  — z=−48, x=0  (centred grand finale)
 *
 * Styling: GS MAR Glassmorphism — backdrop-blur + #0a0a0f/55 + gold border
 * Zero React state re-renders — all driven by the MotionValue from Scene3D.
 */

import { useContext } from 'react';
import { motion, useTransform } from 'framer-motion';
import { ShowcaseContext } from './SmarShowcasePage';

// ─── Glass panel ──────────────────────────────────────────────────────────────
const GLASS = {
  backdropFilter:       'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  background:           'rgba(8, 8, 14, 0.60)',
  border:               '1px solid rgba(212,168,83,0.24)',
  boxShadow:            '0 8px 52px rgba(212,168,83,0.10), inset 0 1px 0 rgba(255,255,255,0.07)',
  borderRadius:         20,
  padding:              '32px 40px',
};

// ─── BLOCK 0: Hero Intro  (s 0.00 → 0.10) ────────────────────────────────────
// Visible as the drone lifts off above the estate entrance.
function HeroBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0, 0.03, 0.08, 0.14], [0, 1, 1, 0]);
  const y       = useTransform(scrollProgress, [0, 0.05], ['30px', '0px']);
  const scale   = useTransform(scrollProgress, [0.08, 0.14], [1, 0.93]);

  return (
    <motion.div
      style={{ opacity, y, scale, pointerEvents: 'none' }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      <p className="text-[10px] tracking-[0.40em] text-[#d4a853] uppercase mb-5 font-semibold">
        BEIT SMAR · MOUNTAIN ESTATE
      </p>

      <h1
        className="text-[clamp(28px,6vw,72px)] font-black text-white leading-tight tracking-tight mb-6"
        style={{ textShadow: '0 4px 60px rgba(212,168,83,0.40)', direction: 'rtl' }}
      >
        ملاذك السري بين الجبل والبحر
      </h1>

      <p className="text-white/35 text-sm md:text-base max-w-md mb-10">
        Your secret retreat between mountain and sea
      </p>

      {/* Scroll hint */}
      <motion.div
        animate={{ y: [0, 9, 0] }}
        transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-2"
      >
        <span className="text-[9px] tracking-[0.32em] text-white/20 uppercase">
          مرر للاستكشاف
        </span>
        <div className="w-px h-9 bg-gradient-to-b from-[#d4a853] to-transparent rounded-full" />
      </motion.div>
    </motion.div>
  );
}

// ─── BLOCK 1: Villas  (s 0.08 → 0.30, panel LEFT, frame is RIGHT) ─────────────
// Camera approaches the villa frames on the right — copy anchors left.
function VillasBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.08, 0.14, 0.24, 0.30], [0, 1, 1, 0]);
  const x       = useTransform(scrollProgress, [0.08, 0.15], ['-60px', '0px']);

  return (
    <motion.div
      style={{ opacity, pointerEvents: 'none' }}
      className="absolute inset-0 flex items-center justify-start px-6 md:px-16"
    >
      <motion.div style={{ x, ...GLASS, maxWidth: 440 }}>
        <p className="text-[10px] tracking-[0.34em] text-[#d4a853] uppercase mb-4 font-semibold">
          01 — LUXURY VILLAS
        </p>
        <h2
          className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-5"
          style={{ direction: 'rtl' }}
        >
          فلل ديلوكس
        </h2>
        <p
          className="text-white/45 text-sm md:text-[15px] leading-relaxed"
          style={{ direction: 'rtl' }}
        >
          فلل فاخرة عند مدخل المنتجع، تجمع بين الأناقة المعمارية
          وإطلالات البحر المتوسط الخلابة على مدار السنة.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── BLOCK 2: Chalets  (s 0.30 → 0.55, panel RIGHT, frame is LEFT) ────────────
// Camera passes the chalets on the left — copy anchors right.
function ChaletsBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.30, 0.36, 0.48, 0.55], [0, 1, 1, 0]);
  const x       = useTransform(scrollProgress, [0.30, 0.37], ['64px', '0px']);

  return (
    <motion.div
      style={{ opacity, pointerEvents: 'none' }}
      className="absolute inset-0 flex items-center justify-end px-6 md:px-16"
    >
      <motion.div style={{ x, ...GLASS, maxWidth: 440 }}>
        <p className="text-[10px] tracking-[0.34em] text-[#d4a853] uppercase mb-4 font-semibold">
          02 — MOUNTAIN CHALETS
        </p>
        <h2
          className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-5"
          style={{ direction: 'rtl' }}
        >
          شاليهات الجبل
        </h2>
        <p
          className="text-white/45 text-sm md:text-[15px] leading-relaxed"
          style={{ direction: 'rtl' }}
        >
          شاليهات من الحجر اللبناني الأصيل تتربع على منحدرات الجبل،
          حيث تراث المنطقة يعانق سكينة الطبيعة في مشهد واحد.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── BLOCK 3: Pool & Cafeteria  (s 0.55 → 0.80, panel LEFT) ──────────────────
// Pool frame is at x:+1 (slightly right) — copy anchors left.
function PoolBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.55, 0.61, 0.73, 0.80], [0, 1, 1, 0]);
  const x       = useTransform(scrollProgress, [0.55, 0.62], ['-64px', '0px']);

  return (
    <motion.div
      style={{ opacity, pointerEvents: 'none' }}
      className="absolute inset-0 flex items-center justify-start px-6 md:px-16"
    >
      <motion.div style={{ x, ...GLASS, maxWidth: 440 }}>
        <p className="text-[10px] tracking-[0.34em] text-[#d4a853] uppercase mb-4 font-semibold">
          03 — POOL &amp; CAFETERIA
        </p>
        <h2
          className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-5"
          style={{ direction: 'rtl' }}
        >
          المسبح والمطعم
        </h2>
        <p
          className="text-white/45 text-sm md:text-[15px] leading-relaxed"
          style={{ direction: 'rtl' }}
        >
          مسبح لا متناهي يندمج مع الأفق البحري، ومطعم يقدم
          أشهى المأكولات اللبنانية مع كل غروب شمس لا يُنسى.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── BLOCK 4: Sea Horizon  (s 0.82 → 1.00, centred grand finale) ──────────────
// The massive 24×14 finale frame fills the viewport — centred CTA reveal.
function SeaFinaleBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.82, 0.90, 1.00], [0, 1, 1]);
  const y       = useTransform(scrollProgress, [0.82, 0.90], ['40px', '0px']);
  const scale   = useTransform(scrollProgress, [0.82, 0.90], [0.94, 1]);

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      <p className="text-[10px] tracking-[0.40em] text-[#d4a853] uppercase mb-5 font-semibold">
        04 — THE MAGICAL HORIZON
      </p>

      <h2
        className="text-[clamp(36px,7vw,88px)] font-black text-white leading-none tracking-tight mb-5"
        style={{ textShadow: '0 4px 80px rgba(212,168,83,0.45)', direction: 'rtl' }}
      >
        الأفق الساحر
      </h2>

      <p
        className="text-white/40 text-sm md:text-base mb-12 max-w-lg"
        style={{ direction: 'rtl' }}
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
      <VillasBlock />
      <ChaletsBlock />
      <PoolBlock />
      <SeaFinaleBlock />
    </div>
  );
}
