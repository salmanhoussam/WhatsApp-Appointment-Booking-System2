/**
 * MillSection.jsx — Olivello Showcase, Section 3 — رحلة زيتونة
 *
 * Spotlight / lantern reveal effect — 200vh sticky scroll.
 *
 * Scroll map:
 *   0 → 0.65   clip-path circle grows: 0% → 90%  (dark veil peels away)
 *   0.28 → 0.55 text fades in (mill name + description)
 *   0.88 → 0.98 full section fades to black (exit)
 *
 * The stone mill sits at centre; darkness falls away like a lantern opening.
 */

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionTemplate } from 'framer-motion';

// Stone wheel spokes — decorative angles
const SPOKES = [0, 30, 60, 90, 120, 150];

export default function MillSection() {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 1 });

  // Spotlight grows from 2% → 90%
  const spotPct  = useTransform(p, [0, 0.65], [2, 90]);
  const clipPath = useMotionTemplate`circle(${spotPct}% at 50% 45%)`;

  // Wheel slow rotation — starts only after some reveal
  const wheelRotate = useTransform(p, [0.1, 0.9], [0, 360]);

  // Text reveal
  const textOpacity = useTransform(p, [0.28, 0.55], [0, 1]);
  const textY       = useTransform(p, [0.28, 0.55], ['22px', '0px']);

  // Exit
  const exitOpacity = useTransform(p, [0.88, 0.98], [1, 0]);

  return (
    <div ref={ref} style={{ height: '200vh', position: 'relative' }}>
      <motion.div style={{
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
        background: 'oklch(10% 0.02 100)',
        opacity: exitOpacity,
      }}>

        {/* ── Ambient glow behind the mill ─────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 55% 55% at 50% 45%, oklch(22% 0.08 100) 0%, oklch(10% 0.02 100) 100%)',
        }} />

        {/* ── Mill visual (always in DOM, revealed by clip-path) ─────────── */}
        <motion.div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          clipPath,
          WebkitClipPath: clipPath,
        }}>

          {/* Stone wheel */}
          <motion.div
            style={{
              width:        'clamp(130px, 20vw, 240px)',
              height:       'clamp(130px, 20vw, 240px)',
              borderRadius: '50%',
              border:       '1.5px solid rgba(200,168,75,0.25)',
              background:   'radial-gradient(circle, oklch(30% 0.08 100) 0%, oklch(20% 0.05 100) 100%)',
              display:      'flex', alignItems: 'center', justifyContent: 'center',
              position:     'relative',
              rotate:       wheelRotate,
              boxShadow:    '0 0 80px 24px rgba(200,168,75,0.10), inset 0 0 30px rgba(0,0,0,0.5)',
            }}
          >
            {/* Spokes */}
            {SPOKES.map((angle) => (
              <div
                key={angle}
                style={{
                  position:        'absolute',
                  width:           '92%', height: 1,
                  background:      'rgba(200,168,75,0.18)',
                  transform:       `rotate(${angle}deg)`,
                  transformOrigin: 'center',
                }}
              />
            ))}

            {/* Outer ring */}
            <div style={{
              position:     'absolute',
              width:        '82%', height: '82%',
              borderRadius: '50%',
              border:       '1px solid rgba(200,168,75,0.12)',
            }} />

            {/* Centre hub */}
            <div style={{
              width:        28, height: 28,
              borderRadius: '50%',
              background:   'radial-gradient(circle, rgba(200,168,75,0.45) 0%, rgba(200,168,75,0.05) 100%)',
              border:       '1px solid rgba(200,168,75,0.3)',
            }} />
          </motion.div>

          {/* Warm floor glow */}
          <div style={{
            position:  'absolute',
            bottom:    '8%', left: '50%', x: '-50%',
            width:     'clamp(160px, 28vw, 320px)',
            height:    40,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(200,168,75,0.18) 0%, transparent 70%)',
            filter:    'blur(12px)',
          }} />
        </motion.div>

        {/* ── Dark veil (full screen, has the spotlight hole via clip-path above) ── */}
        {/* The clip-path on the content layer IS the reveal — no separate veil needed */}

        {/* ── Ambient particles (static, subtle) ───────────────────────────── */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ y: [-4, 4, -4], opacity: [0.3, 0.7, 0.3] }}
            transition={{
              duration: 2.8 + i * 0.4,
              repeat:   Infinity,
              delay:    i * 0.35,
            }}
            style={{
              position:     'absolute',
              width:        3, height: 3,
              borderRadius: '50%',
              background:   'rgba(200,168,75,0.55)',
              left:         `${28 + (i * 6.5) % 44}%`,
              top:          `${32 + (i * 9) % 36}%`,
              zIndex:       2,
            }}
          />
        ))}

        {/* ── Text reveal ───────────────────────────────────────────────────── */}
        <motion.div style={{
          position:  'absolute', zIndex: 4,
          bottom:    '12vh', left: 0, right: 0,
          textAlign: 'center', padding: '0 28px',
          opacity:   textOpacity, y: textY,
        }}>
          <p style={{
            fontSize:      10, letterSpacing: '0.38em',
            color:         'rgba(200,168,75,0.60)',
            textTransform: 'uppercase', marginBottom: 14,
            fontFamily:    "'Inter', system-ui, sans-serif",
          }}>
            Cold Stone Press · Since 1943
          </p>

          <h2 style={{
            fontSize:   'clamp(26px, 4vw, 54px)',
            fontWeight: 700, color: '#f0ede6',
            fontFamily: "'Tajawal', system-ui, sans-serif",
            direction:  'rtl', marginBottom: 14,
            lineHeight: 1.2,
          }}>
            المعصرة الحجرية
          </h2>

          <p style={{
            fontSize:   'clamp(13px, 1.4vw, 16px)',
            color:      'rgba(240,237,230,0.40)',
            maxWidth:   480, margin: '0 auto 10px',
            fontFamily: "'Tajawal', system-ui, sans-serif",
            direction:  'rtl', lineHeight: 1.85,
          }}>
            الحجر الدوار يطحن الزيتون بضغط هادئ ومتوازن — محافظاً على كل قطرة من الزيت البكر الممتاز.
          </p>

          <p style={{
            fontSize:   'clamp(11px, 1.1vw, 13px)',
            color:      'rgba(255,255,255,0.18)',
            letterSpacing: '0.06em',
            fontFamily: "'Inter', system-ui, sans-serif",
            maxWidth:   420, margin: '0 auto',
          }}>
            The stone wheel grinds at steady pressure — preserving every drop of extra virgin gold.
          </p>
        </motion.div>

      </motion.div>
    </div>
  );
}
