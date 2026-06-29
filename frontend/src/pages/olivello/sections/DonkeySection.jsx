/**
 * DonkeySection.jsx — Olivello Showcase, Section 4 — رحلة زيتونة
 *
 * "الحجر الدوّار والحمار الأعمى"
 * A millstone turns endlessly — its speed rises and falls with scroll velocity.
 *
 * Scroll map (250vh sticky):
 *   0 → 0.3   stone accelerates (slower CSS duration → faster spin)
 *   0.3 → 0.7 peak speed
 *   0.7 → 1.0 stone decelerates again
 *   0.35       text fades in at centre
 *   0.88 → 0.98 full section fades out
 */

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'framer-motion';

// Circular text repeated to fill the arc
const CIRCULAR_TEXT = 'دار · ودار · ودار · الحمار المعصوب العينين · يحفظ الطريق · ';

export default function DonkeySection() {
  const ref = useRef(null);
  const stoneRef = useRef(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 55, damping: 20, mass: 1.1 });

  // Rotation duration: lower number = faster spin — update CSS var directly, no re-render
  const speedDur = useTransform(p, [0, 0.3, 0.7, 1.0], [6, 2, 2, 8]);

  useMotionValueEvent(speedDur, 'change', (v) => {
    if (stoneRef.current) {
      stoneRef.current.style.setProperty('--stone-dur', `${v.toFixed(3)}s`);
    }
  });

  // Text entrance
  const textOpacity = useTransform(p, [0.30, 0.52], [0, 1]);
  const textY       = useTransform(p, [0.30, 0.52], ['18px', '0px']);

  // Outer ring parallax
  const ringScale = useTransform(p, [0, 1], [0.94, 1.06]);

  // Section exit
  const exitOpacity = useTransform(p, [0.88, 0.98], [1, 0]);

  return (
    <div ref={ref} style={{ height: '250vh', position: 'relative' }}>
      <motion.div style={{
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
        background: 'oklch(18% 0.04 90)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: exitOpacity,
      }}>

        {/* ── Ambient glow ─────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, oklch(28% 0.07 90) 0%, oklch(18% 0.04 90) 100%)',
          zIndex: 0,
        }} />

        {/* Grain */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, opacity: 0.03, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        {/* ── Millstone assembly ────────────────────────────────────────────── */}
        <motion.div
          ref={stoneRef}
          style={{
            position: 'relative',
            width: 'clamp(200px, 32vw, 320px)',
            height: 'clamp(200px, 32vw, 320px)',
            scale: ringScale,
            zIndex: 3,
            '--stone-dur': '6s',
          }}
        >
          {/* Rotating stone ring */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: '2px solid oklch(52% 0.08 85)',
            animation: 'millstone-turn var(--stone-dur, 6s) linear infinite',
          }}>
            {/* Spoke lines */}
            {[0, 30, 60, 90, 120, 150].map((angle) => (
              <div key={angle} style={{
                position: 'absolute',
                top: '50%', left: 0, right: 0,
                height: 1,
                background: 'rgba(200,168,75,0.22)',
                transform: `translateY(-50%) rotate(${angle}deg)`,
                transformOrigin: 'center',
              }} />
            ))}

            {/* Stone texture — concentric rings */}
            {[0.72, 0.52, 0.34].map((scale, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: `translate(-50%, -50%)`,
                width: `${scale * 100}%`, height: `${scale * 100}%`,
                borderRadius: '50%',
                border: '1px solid rgba(200,168,75,0.12)',
              }} />
            ))}
          </div>

          {/* Circular text SVG — counter-rotates slowly */}
          <div style={{
            position: 'absolute', inset: '-28%',
            animation: 'millstone-turn-reverse 28s linear infinite',
            pointerEvents: 'none',
          }}>
            <svg viewBox="-120 -120 240 240" style={{ width: '100%', height: '100%' }}>
              <defs>
                <path id="textCircle" d="M 0,-95 A 95,95 0 1,1 0,95 A 95,95 0 1,1 0,-95" />
              </defs>
              <text
                style={{
                  fontSize: 7.8,
                  fill: 'rgba(200,168,75,0.55)',
                  fontFamily: "'Tajawal', system-ui, sans-serif",
                  letterSpacing: '0.12em',
                }}
              >
                <textPath href="#textCircle" startOffset="0%">
                  {CIRCULAR_TEXT.repeat(2)}
                </textPath>
              </text>
            </svg>
          </div>

          {/* Centre hub */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 36, height: 36,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,168,75,0.55) 0%, rgba(200,168,75,0.05) 100%)',
            border: '1.5px solid rgba(200,168,75,0.4)',
            boxShadow: '0 0 28px 8px rgba(200,168,75,0.18)',
            zIndex: 2,
          }} />

          {/* Ground shadow */}
          <div style={{
            position: 'absolute', bottom: '-14%', left: '50%',
            transform: 'translateX(-50%)',
            width: '70%', height: 22,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)',
            filter: 'blur(8px)',
          }} />
        </motion.div>

        {/* ── Centre text ───────────────────────────────────────────────────── */}
        <motion.div style={{
          position: 'absolute', zIndex: 5,
          bottom: '14vh', left: 0, right: 0,
          textAlign: 'center', padding: '0 24px',
          opacity: textOpacity, y: textY,
        }}>
          <p style={{
            fontSize: 9, letterSpacing: '0.34em', color: 'rgba(200,168,75,0.45)',
            textTransform: 'uppercase', marginBottom: 12,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            Stone-Ground · Traditional Method
          </p>
          <h2 style={{
            fontSize: 'clamp(22px, 3.5vw, 44px)',
            fontWeight: 700, color: '#f0ede6',
            fontFamily: "'Tajawal', system-ui, sans-serif",
            direction: 'rtl', marginBottom: 10, lineHeight: 1.3,
          }}>
            الحمار المعصوب العينين
          </h2>
          <p style={{
            fontSize: 'clamp(12px, 1.2vw, 14px)',
            color: 'rgba(240,237,230,0.32)',
            fontFamily: "'Tajawal', system-ui, sans-serif",
            direction: 'rtl', lineHeight: 1.8,
            maxWidth: 420, margin: '0 auto',
          }}>
            يحفظ الطريق لأنه يحفظ الإيقاع — دوائر لا تنتهي، وإخلاص لا يتزعزع
          </p>
        </motion.div>

      </motion.div>

      {/* CSS keyframes injected inline */}
      <style>{`
        @keyframes millstone-turn {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes millstone-turn-reverse {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}
