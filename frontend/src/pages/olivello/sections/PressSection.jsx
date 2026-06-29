/**
 * PressSection.jsx — Olivello Showcase, Section 6 — رحلة زيتونة
 *
 * "الحصائر والمعصر — ثقل · ضغط · ولادة"
 * Five palm-fibre mats fall from above and stack, one by one.
 * When the stack is complete, the text "الانكسار هو الولادة الحقيقية" emerges from below.
 *
 * Scroll map (250vh sticky):
 *   whileInView triggers stagger for each mat (once, viewport 30%)
 *   0.72 → 0.88 conclusion text fades up
 *   0.88 → 0.98 full section fades out
 */

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

const MAT_COUNT = 5;

// Each mat: slightly different width + slight rotation for organic feel
const MAT_CONFIGS = [
  { widthPct: 88, rotate: -0.8, color: 'oklch(40% 0.09 82)' },
  { widthPct: 82, rotate:  0.6, color: 'oklch(36% 0.08 84)' },
  { widthPct: 92, rotate: -0.4, color: 'oklch(44% 0.10 80)' },
  { widthPct: 78, rotate:  1.1, color: 'oklch(34% 0.07 86)' },
  { widthPct: 86, rotate: -0.6, color: 'oklch(42% 0.09 83)' },
];

export default function PressSection() {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 55, damping: 20, mass: 1.1 });

  // Conclusion text
  const textOpacity = useTransform(p, [0.68, 0.86], [0, 1]);
  const textY       = useTransform(p, [0.68, 0.86], ['24px', '0px']);

  // Exit
  const exitOpacity = useTransform(p, [0.88, 0.98], [1, 0]);

  return (
    <div ref={ref} style={{ height: '250vh', position: 'relative' }}>
      <motion.div style={{
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
        background: 'oklch(16% 0.04 85)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: exitOpacity,
      }}>

        {/* Ambient warm glow at centre */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 55% 55% at 50% 60%, oklch(26% 0.07 85) 0%, oklch(16% 0.04 85) 100%)',
        }} />

        {/* Grain */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, opacity: 0.04, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        {/* ── Mat stack ────────────────────────────────────────────────────── */}
        <div style={{
          position: 'relative', zIndex: 3,
          width: 'clamp(200px, 52vw, 520px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 3,
        }}>
          {MAT_CONFIGS.map((mat, i) => (
            <motion.div
              key={i}
              initial={{ y: -110 * (i + 1), opacity: 0, rotate: mat.rotate * 2 }}
              whileInView={{ y: 0, opacity: 1, rotate: mat.rotate }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                delay: i * 0.12,
                type: 'spring',
                stiffness: 50,
                damping: 14,
                mass: 1.2 + i * 0.1,
              }}
              style={{
                width: `${mat.widthPct}%`,
                height: 'clamp(30px, 4.5vh, 56px)',
                borderRadius: 4,
                background: mat.color,
                border: `1px solid oklch(${parseInt(mat.color.match(/\d+/)[0]) + 12}% 0.08 82)`,
                // Horizontal fibre lines
                backgroundImage: `repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 10px,
                  rgba(0,0,0,0.12) 10px,
                  rgba(0,0,0,0.12) 11px
                ), repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 5px,
                  rgba(255,255,255,0.04) 5px,
                  rgba(255,255,255,0.04) 6px
                )`,
                boxShadow: `0 ${4 + i * 2}px ${8 + i * 4}px rgba(0,0,0,0.3)`,
              }}
            />
          ))}

          {/* Press weight plate */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0.6 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: MAT_COUNT * 0.12 + 0.18, type: 'spring', stiffness: 70, damping: 16 }}
            style={{
              width: '96%', height: 'clamp(14px, 2vh, 22px)',
              marginTop: 6,
              borderRadius: 3,
              background: 'oklch(28% 0.06 80)',
              border: '1px solid oklch(38% 0.08 80)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
            }}
          />
        </div>

        {/* Floor shadow */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.4 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: MAT_COUNT * 0.12 + 0.3, duration: 0.7 }}
          style={{
            position: 'relative', zIndex: 2,
            width: 'clamp(150px, 38vw, 380px)',
            height: 20, marginTop: 4,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)',
            filter: 'blur(6px)',
          }}
        />

        {/* ── Conclusion text ───────────────────────────────────────────────── */}
        <motion.div style={{
          position: 'absolute', zIndex: 4,
          bottom: '12vh', left: 0, right: 0,
          textAlign: 'center', padding: '0 28px',
          opacity: textOpacity, y: textY,
        }}>
          <p style={{
            fontSize: 9, letterSpacing: '0.36em', color: 'rgba(200,168,75,0.45)',
            textTransform: 'uppercase', marginBottom: 12,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            The Press · Traditional Stone Method
          </p>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 50px)',
            fontWeight: 800, color: 'oklch(78% 0.16 72)',
            fontFamily: "'Tajawal', system-ui, sans-serif",
            direction: 'rtl', marginBottom: 10, lineHeight: 1.25,
          }}>
            الانكسار
          </h2>
          <p style={{
            fontSize: 'clamp(14px, 1.6vw, 18px)',
            color: 'rgba(240,237,230,0.38)',
            fontFamily: "'Tajawal', system-ui, sans-serif",
            direction: 'rtl', lineHeight: 1.8,
          }}>
            هو الولادة الحقيقية
          </p>
        </motion.div>

      </motion.div>
    </div>
  );
}
