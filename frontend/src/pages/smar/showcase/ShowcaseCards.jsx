/**
 * ShowcaseCards.jsx  —  Phase 30: Cinematic HTML Text Overlay
 *
 * Sits in a fixed z-10 layer above the WebGL canvas.
 * ALL animation is driven by `scrollProgress` (a Framer Motion MotionValue
 * updated every frame by Scene3D's CameraRig — zero React state re-renders).
 *
 * 4 text blocks synced to the Z-axis image corridor:
 *   0.00 → 0.18  TEXT 1 — Hero / Ring portal
 *   0.22 → 0.42  TEXT 2 — Chalets (right-aligned)
 *   0.48 → 0.68  TEXT 3 — Pool (left-aligned)
 *   0.78 → 1.00  TEXT 4 — Grand Finale + CTA
 *
 * Styling: GS MAR Glassmorphism (backdrop-blur + bg-white/5 + gold border)
 */

import { useContext } from 'react';
import { motion, useTransform } from 'framer-motion';
import { ShowcaseContext } from './SmarShowcasePage';

// ─── Shared glass panel style ─────────────────────────────────────────────────
const GLASS = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(212,168,83,0.18)',
  boxShadow:
    '0 8px 48px rgba(212,168,83,0.08), inset 0 1px 0 rgba(255,255,255,0.07)',
  borderRadius: 20,
  padding: '32px 40px',
};

// ─── Text 1: Hero / Ring Portal (scroll 0.00 → 0.18) ─────────────────────────
function HeroBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0, 0.04, 0.12, 0.20], [0, 1, 1, 0]);
  const y       = useTransform(scrollProgress, [0, 0.06], ['24px', '0px']);
  const scale   = useTransform(scrollProgress, [0.12, 0.20], [1, 0.92]);

  return (
    <motion.div
      style={{ opacity, y, scale, pointerEvents: 'none' }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      {/* Eyebrow */}
      <p className="text-[10px] tracking-[0.35em] text-[#d4a853] uppercase mb-5 font-semibold">
        BEIT SMAR · MOUNTAIN RESIDENCE
      </p>

      {/* Main title */}
      <h1
        className="text-[clamp(28px,6vw,72px)] font-black text-white leading-tight tracking-tight mb-6"
        style={{
          textShadow: '0 4px 60px rgba(212,168,83,0.30)',
          direction: 'rtl',
        }}
      >
        ملاذك السري بين الجبل والبحر
      </h1>

      {/* English subtitle */}
      <p className="text-white/40 text-sm md:text-base max-w-md mb-10">
        Your secret retreat between mountain and sea
      </p>

      {/* Scroll hint */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-2"
      >
        <span className="text-[9px] tracking-[0.28em] text-white/25 uppercase">
          مرر للاستكشاف
        </span>
        <div className="w-0.5 h-8 bg-gradient-to-b from-[#d4a853] to-transparent rounded-full" />
      </motion.div>
    </motion.div>
  );
}

// ─── Text 2: Chalets (scroll 0.22 → 0.42, right-aligned) ─────────────────────
function ChaletBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.22, 0.28, 0.36, 0.44], [0, 1, 1, 0]);
  const x       = useTransform(scrollProgress, [0.22, 0.28], ['60px', '0px']);

  return (
    <motion.div
      style={{ opacity, pointerEvents: 'none' }}
      className="absolute inset-0 flex items-center justify-end px-6 md:px-16"
    >
      <motion.div style={{ x, ...GLASS, maxWidth: 420 }}>
        <p className="text-[10px] tracking-[0.32em] text-[#d4a853] uppercase mb-4 font-semibold">
          01 — THE CHALETS
        </p>
        <h2
          className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-5"
          style={{ direction: 'rtl' }}
        >
          فخامة الحجر اللبناني الأصيل
        </h2>
        <p className="text-white/45 text-sm md:text-[15px] leading-relaxed max-w-sm" style={{ direction: 'rtl' }}>
          شاليهات من الحجر الطبيعي تطل على البحر الأبيض المتوسط، حيث تراث الجبل يعانق الحداثة.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Text 3: Pool (scroll 0.48 → 0.68, left-aligned) ─────────────────────────
function PoolBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.48, 0.54, 0.62, 0.70], [0, 1, 1, 0]);
  const x       = useTransform(scrollProgress, [0.48, 0.54], ['-60px', '0px']);

  return (
    <motion.div
      style={{ opacity, pointerEvents: 'none' }}
      className="absolute inset-0 flex items-center justify-start px-6 md:px-16"
    >
      <motion.div style={{ x, ...GLASS, maxWidth: 420 }}>
        <p className="text-[10px] tracking-[0.32em] text-[#d4a853] uppercase mb-4 font-semibold">
          02 — POOL & TERRACE
        </p>
        <h2
          className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-5"
          style={{ direction: 'rtl' }}
        >
          استرخاء بلا حدود
        </h2>
        <p className="text-white/45 text-sm md:text-[15px] leading-relaxed max-w-sm" style={{ direction: 'rtl' }}>
          مسبح لا متناهي يندمج مع الأفق. كل لحظة هنا — قهوة الصباح أو غروب الشمس — لوحة سينمائية خالصة.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Text 4: Grand Finale + CTA (scroll 0.78 → 1.00, centered) ───────────────
function FinaleBlock() {
  const { scrollProgress } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.78, 0.86, 1.0], [0, 1, 1]);
  const y       = useTransform(scrollProgress, [0.78, 0.86], ['32px', '0px']);

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      <p className="text-[10px] tracking-[0.35em] text-[#d4a853] uppercase mb-5 font-semibold">
        BEIT SMAR · EXCLUSIVE
      </p>

      <h2
        className="text-[clamp(36px,7vw,88px)] font-black text-white leading-none tracking-tight mb-6"
        style={{
          textShadow: '0 4px 60px rgba(212,168,83,0.30)',
          direction: 'rtl',
        }}
      >
        وجهتك القادمة بانتظارك
      </h2>

      <p
        className="text-white/40 text-sm md:text-base mb-12 max-w-lg"
        style={{ direction: 'rtl' }}
      >
        حجز خاص، تجربة حصرية، لحظات لا تُنسى في قلب جبل لبنان
      </p>

      {/* ── CTA Button — navigates to /smar/listings ── */}
      <motion.a
        href="/smar/listings"
        whileHover={{ scale: 1.06, boxShadow: '0 14px 60px rgba(212,168,83,0.50)' }}
        whileTap={{ scale: 0.97 }}
        style={{
          pointerEvents: 'auto',
          background: 'linear-gradient(135deg, #d4a853 0%, #b8893a 100%)',
          boxShadow: '0 8px 40px rgba(212,168,83,0.32)',
          letterSpacing: '0.12em',
          textDecoration: 'none',
          display: 'inline-block',
          padding: '18px 56px',
          borderRadius: '50px',
          fontWeight: 700,
          fontSize: 15,
          color: '#fff',
          textTransform: 'uppercase',
        }}
      >
        استكشف الشاليهات
      </motion.a>

      {/* Secondary subtle link */}
      <a
        href="/smar/normal"
        style={{
          pointerEvents: 'auto',
          color: 'rgba(212,168,83,0.5)',
          fontSize: 11,
          marginTop: 20,
          letterSpacing: '0.15em',
          textDecoration: 'none',
          textTransform: 'uppercase',
        }}
      >
        أو احجز مباشرة ←
      </a>
    </motion.div>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────
export default function ShowcaseCards() {
  return (
    <div className="absolute inset-0">
      <HeroBlock />
      <ChaletBlock />
      <PoolBlock />
      <FinaleBlock />
    </div>
  );
}
