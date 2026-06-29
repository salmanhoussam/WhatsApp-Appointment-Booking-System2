/**
 * GoldenDropSection.jsx — Olivello Showcase, Section 7 — رحلة زيتونة
 *
 * "القطرة الذهبية — خلاصة كل شيء"
 * The climax. A drop of oil fills with gold as the user scrolls.
 * At 100% fill: confetti explosion. Then the CTA appears.
 *
 * Scroll map (300vh sticky):
 *   0 → 0.80   SVG drop fills from bottom (clipRect top: 100% → 0%)
 *   0 → 0.80   text lines inside rise sequentially with the oil level
 *   0.82        confetti explosion triggers (once)
 *   0.85 → 0.95 CTA fades in
 *   Footer always visible at bottom
 */

import { useRef, useState } from 'react';
import {
  motion, useScroll, useTransform, useSpring,
  useMotionValueEvent, AnimatePresence,
} from 'framer-motion';

// Text lines that float inside the drop, revealed as oil rises
const DROP_LINES = [
  { ar: 'رائحة الجبل',   en: 'The mountain\'s breath',   threshold: 0.15 },
  { ar: 'ذاكرة الحجر',   en: 'The memory of stone',     threshold: 0.35 },
  { ar: 'أغاني النساء',   en: 'Songs of the harvest',    threshold: 0.55 },
  { ar: 'دوائر الحمار',   en: 'Circles of the mill',     threshold: 0.72 },
];

// Confetti particle config
function makeParticles(count = 48) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i + Math.random() * 12 - 6,
    distance: 90 + Math.random() * 160,
    size: 3 + Math.random() * 5,
    color: [
      'oklch(78% 0.18 72)',
      'oklch(68% 0.12 75)',
      'oklch(88% 0.08 80)',
      'oklch(62% 0.16 70)',
      'oklch(82% 0.14 78)',
    ][i % 5],
    delay: Math.random() * 0.22,
  }));
}

const PARTICLES = makeParticles(48);

export default function GoldenDropSection() {
  const ref = useRef(null);
  const [confettiFired, setConfettiFired] = useState(false);
  const [ctaVisible,    setCtaVisible]    = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 50, damping: 22, mass: 1.2 });

  // The clipRect "top" controls how much of the drop is filled
  const fillTop   = useTransform(p, [0, 0.80], [280, 0]);
  const bgOpacity = useTransform(p, [0, 0.80], [0, 1]);
  const exitOpacity = useTransform(p, [0.97, 1.0], [1, 0.85]);

  // Scroll-linked opacity per text line — no re-renders
  const lineOpacities = DROP_LINES.map((line) =>
    useTransform(p, [line.threshold, line.threshold + 0.12], [0, 1])
  );
  const lineYs = DROP_LINES.map((line) =>
    useTransform(p, [line.threshold, line.threshold + 0.12], ['10px', '0px'])
  );

  // Threshold triggers: confetti + CTA — only fire state change once
  useMotionValueEvent(p, 'change', (v) => {
    if (v >= 0.82 && !confettiFired) setConfettiFired(true);
    if (v >= 0.85 && !ctaVisible)    setCtaVisible(true);
  });

  return (
    <div ref={ref} style={{ height: '300vh', position: 'relative' }}>
      <motion.div style={{
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: exitOpacity,
      }}>

        {/* ── Gradient background — darkens to gold ────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'oklch(22% 0.05 100)',
        }} />
        <motion.div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 80% 80% at 50% 55%, oklch(36% 0.14 78) 0%, oklch(22% 0.08 90) 55%, oklch(16% 0.04 95) 100%)',
          opacity: bgOpacity,
        }} />

        {/* Grain */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, opacity: 0.025, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        {/* ── SVG Drop — the centrepiece ───────────────────────────────────── */}
        <div style={{
          position: 'relative', zIndex: 4,
          width: 'clamp(140px, 22vw, 260px)',
          height: 'clamp(196px, 30.8vw, 364px)',
          flexShrink: 0,
        }}>
          <svg
            viewBox="0 0 200 280"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            <defs>
              {/* Gold fill gradient */}
              <linearGradient id="goldFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%"   stopColor="oklch(68% 0.16 70)" />
                <stop offset="60%"  stopColor="oklch(78% 0.18 72)" />
                <stop offset="100%" stopColor="oklch(86% 0.14 76)" />
              </linearGradient>

              {/* Clip path — rect whose top moves up with scroll */}
              <clipPath id="oilFill">
                <motion.rect
                  x="0"
                  width="200"
                  height="280"
                  y={fillTop}
                />
              </clipPath>

              {/* Drop shape used twice (outline + fill) */}
              <path
                id="dropShape"
                d="M100,18 C148,18 182,72 182,136 C182,196 148,262 100,266 C52,262 18,196 18,136 C18,72 52,18 100,18 Z"
              />
            </defs>

            {/* Drop outline */}
            <use
              href="#dropShape"
              fill="none"
              stroke="oklch(72% 0.12 72)"
              strokeWidth="1.5"
              opacity="0.45"
            />

            {/* Dark fill base — always present */}
            <use href="#dropShape" fill="oklch(18% 0.06 90)" opacity="0.7" />

            {/* Gold fill — revealed by clip */}
            <g clipPath="url(#oilFill)">
              <use href="#dropShape" fill="url(#goldFill)" />

              {/* Subtle surface shimmer */}
              <ellipse cx="100" cy="140" rx="56" ry="6"
                fill="rgba(255,255,255,0.08)" />
            </g>

            {/* Inner glow rim */}
            <use
              href="#dropShape"
              fill="none"
              stroke="oklch(82% 0.16 74)"
              strokeWidth="0.8"
              opacity="0.3"
            />
          </svg>

          {/* Text lines inside the drop — scroll-linked opacity, no re-renders */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 'clamp(4px, 0.8vh, 8px)',
            padding: '28% 16% 24%',
          }}>
            {DROP_LINES.map((line, i) => (
              <motion.div
                key={i}
                style={{ opacity: lineOpacities[i], y: lineYs[i], textAlign: 'center' }}
              >
                <p style={{
                  fontSize: 'clamp(9px, 1.1vw, 12px)',
                  color: 'oklch(14% 0.05 90)',
                  fontFamily: "'Tajawal', system-ui, sans-serif",
                  fontWeight: 700, margin: 0,
                  direction: 'rtl', lineHeight: 1.25,
                }}>
                  {line.ar}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Confetti ─────────────────────────────────────────────────────── */}
        {confettiFired && (
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: 0, height: 0,
            zIndex: 6, pointerEvents: 'none',
          }}>
            {PARTICLES.map((pt) => {
              const rad = (pt.angle * Math.PI) / 180;
              const tx  = Math.cos(rad) * pt.distance;
              const ty  = Math.sin(rad) * pt.distance;
              return (
                <motion.div
                  key={pt.id}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: tx, y: ty, opacity: 0, scale: 0.4 }}
                  transition={{
                    duration: 0.95 + Math.random() * 0.4,
                    delay: pt.delay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    position: 'absolute',
                    width: pt.size, height: pt.size,
                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    background: pt.color,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {ctaVisible && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 70, damping: 20, delay: 0.1 }}
              style={{
                position: 'relative', zIndex: 5,
                display: 'flex', gap: 14, marginTop: 'clamp(24px, 4vh, 44px)',
                flexWrap: 'wrap', justifyContent: 'center',
                padding: '0 20px',
              }}
            >
              <a href="/olivello/store" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: 'clamp(12px, 1.5vh, 16px) clamp(24px, 3vw, 36px)',
                    borderRadius: 6,
                    background: 'oklch(72% 0.16 72)',
                    border: 'none',
                    color: 'oklch(18% 0.05 90)',
                    fontSize: 'clamp(12px, 1.2vw, 15px)',
                    fontWeight: 700,
                    fontFamily: "'Tajawal', system-ui, sans-serif",
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                    direction: 'rtl',
                    boxShadow: '0 4px 28px rgba(200,168,75,0.35)',
                  }}
                >
                  اطلب قنينتك الآن
                </motion.button>
              </a>

              <a href="/olivello/store" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ scale: 1.04, borderColor: 'oklch(72% 0.16 72)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: 'clamp(12px, 1.5vh, 16px) clamp(24px, 3vw, 36px)',
                    borderRadius: 6,
                    background: 'transparent',
                    border: '1.5px solid rgba(200,168,75,0.42)',
                    color: 'oklch(78% 0.14 72)',
                    fontSize: 'clamp(12px, 1.2vw, 15px)',
                    fontWeight: 600,
                    fontFamily: "'Tajawal', system-ui, sans-serif",
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                    direction: 'rtl',
                  }}
                >
                  اكتشف المنتجات
                </motion.button>
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer tagline ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: ctaVisible ? 1 : 0 }}
          transition={{ delay: 0.55, duration: 1.1 }}
          style={{
            position: 'absolute', bottom: 'clamp(14px, 3vh, 28px)',
            left: 0, right: 0,
            textAlign: 'center', zIndex: 5,
          }}
        >
          <p style={{
            fontSize: 9, letterSpacing: '0.32em',
            color: 'rgba(200,168,75,0.35)',
            textTransform: 'uppercase',
            fontFamily: "'Inter', system-ui, sans-serif",
            margin: 0,
          }}>
            Olivello · Lebanese Mountain Olive Oil · Est. 1943
          </p>
        </motion.div>

      </motion.div>
    </div>
  );
}
