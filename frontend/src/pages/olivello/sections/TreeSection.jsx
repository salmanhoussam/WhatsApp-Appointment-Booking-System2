/**
 * TreeSection.jsx — Olivello Showcase, Section 1 — رحلة زيتونة
 *
 * 2.5D Parallax Hero — 4 layers, 300vh sticky scroll
 *
 * Layer 0 — Sky gradient:   moves y [0% → 18%]  (slowest)
 * Layer 1 — BG watermark:   moves y [0% → 38%]  (mix-blend-overlay)
 * Layer 2 — Olive tree:     rises from 100vh → 0vh, fades at exit
 * Layer 3 — Hero text:      moves y [0% → -12%] (fastest)
 */

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

const SUPABASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties';
const TREE_IMG = `${SUPABASE}/olivello/pages/home/hero/olive-tree.png`;

export default function TreeSection() {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 55, damping: 22, mass: 1.1 });

  // Layer 0 — sky
  const skyY = useTransform(p, [0, 1], ['0%', '18%']);

  // Layer 1 — background watermark
  const bgTitleY = useTransform(p, [0, 1], ['0%', '38%']);

  // Layer 2 — olive tree
  const treeY       = useTransform(p, [0, 0.55], ['100vh', '0vh']);
  const treeOpacity = useTransform(p, [0, 0.08, 0.72, 0.92], [0, 1, 1, 0]);
  const treeScale   = useTransform(p, [0, 0.55], [0.88, 1]);

  // Layer 3 — foreground text
  const fgY       = useTransform(p, [0, 1], ['0%', '-12%']);
  const fgOpacity = useTransform(p, [0, 0.05, 0.65, 0.85], [0, 1, 1, 0]);

  // Full section exit
  const exitOpacity = useTransform(p, [0.88, 0.98], [1, 0]);

  return (
    <div ref={ref} style={{ height: '300vh', position: 'relative' }}>
      <motion.div style={{
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: exitOpacity,
      }}>

        {/* ── Layer 0: Sky ──────────────────────────────────────────────────── */}
        <motion.div style={{
          position: 'absolute', inset: '-20% 0',
          background: 'linear-gradient(180deg, oklch(14% 0.04 130) 0%, oklch(18% 0.06 110) 40%, oklch(22% 0.05 100) 100%)',
          y: skyY, zIndex: 0,
        }} />

        {/* Grain overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, opacity: 0.035, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        {/* Radial vignette */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 65%, transparent 28%, rgba(0,0,0,0.60) 100%)',
        }} />

        {/* ── Layer 1: Watermark title ──────────────────────────────────────── */}
        <motion.div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          y: bgTitleY, mixBlendMode: 'overlay', pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: 'clamp(72px, 17vw, 230px)',
            fontWeight: 900, letterSpacing: '-0.05em',
            color: 'rgba(200,168,75,0.14)', lineHeight: 1,
            fontFamily: "'Inter', system-ui, sans-serif",
            userSelect: 'none',
          }}>
            OLIVELLO
          </span>
        </motion.div>

        {/* ── Layer 2: Olive tree ────────────────────────────────────────────── */}
        <motion.div style={{
          position: 'absolute', bottom: 0, left: '50%', x: '-50%',
          y: treeY, scale: treeScale, opacity: treeOpacity,
          zIndex: 4, width: 'clamp(240px, 44vw, 600px)',
          pointerEvents: 'none',
        }}>
          {/* Real image — upload to: olivello/pages/home/hero/olive-tree.png */}
          <img
            src={TREE_IMG}
            alt="Olive Tree"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{
              width: '100%', objectFit: 'contain', display: 'block',
              filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.7)) sepia(0.1) saturate(1.15)',
            }}
          />
          {/* CSS fallback — replaced by real PNG once uploaded */}
          <OliveTreeSVG />
        </motion.div>

        {/* ── Layer 3: Hero text ────────────────────────────────────────────── */}
        <motion.div style={{
          position: 'absolute', top: '14vh', left: 0, right: 0,
          zIndex: 5, textAlign: 'center',
          y: fgY, opacity: fgOpacity,
          padding: '0 24px',
        }}>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{
              fontSize: 10, letterSpacing: '0.36em',
              color: 'rgba(200,168,75,0.72)',
              textTransform: 'uppercase', marginBottom: 20,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Lebanese Mountain Olive Oil
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 1, type: 'spring', stiffness: 70, damping: 20, mass: 1.5 }}
            style={{
              fontSize: 'clamp(34px, 6.5vw, 82px)',
              fontWeight: 800, color: '#f0ede6', lineHeight: 1.1,
              margin: '0 auto 14px',
              fontFamily: "'Tajawal', system-ui, sans-serif",
              direction: 'rtl',
              textShadow: '0 4px 48px rgba(0,0,0,0.45)',
            }}
          >
            من الجبل إلى طاولتك
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.78, duration: 0.9 }}
            style={{
              fontSize: 'clamp(11px, 1.3vw, 15px)',
              letterSpacing: '0.18em',
              color: 'rgba(200,168,75,0.50)',
              textTransform: 'uppercase',
              fontFamily: "'Inter', system-ui, sans-serif",
              marginBottom: 44,
            }}
          >
            From the Mountain to Your Table
          </motion.p>

          {/* Scroll cue */}
          <motion.div
            animate={{ opacity: [0.35, 0.85, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
          >
            <span style={{
              fontSize: 9, letterSpacing: '0.28em',
              color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              scroll
            </span>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 1, height: 42,
                background: 'linear-gradient(to bottom, rgba(200,168,75,0.75), transparent)',
              }}
            />
          </motion.div>
        </motion.div>

      </motion.div>
    </div>
  );
}

// Minimal SVG olive tree — shown while image is uploading / as decorative fallback
function OliveTreeSVG() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <svg
        viewBox="0 0 200 260"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '70%', opacity: 0.55, filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}
      >
        {/* Trunk */}
        <rect x="92" y="190" width="16" height="70" rx="6" fill="oklch(38% 0.06 80)" />
        <rect x="96" y="200" width="6" height="60" rx="3" fill="oklch(32% 0.05 80)" opacity="0.5" />

        {/* Main canopy */}
        <ellipse cx="100" cy="130" rx="68" ry="75" fill="oklch(38% 0.12 130)" />
        <ellipse cx="100" cy="115" rx="55" ry="60" fill="oklch(44% 0.14 128)" />

        {/* Lighter highlight layer */}
        <ellipse cx="85"  cy="100" rx="40" ry="45" fill="oklch(50% 0.15 126)" opacity="0.7" />
        <ellipse cx="115" cy="108" rx="32" ry="36" fill="oklch(48% 0.13 130)" opacity="0.6" />

        {/* Tiny olives */}
        {[[80,95],[115,88],[95,118],[130,105],[72,118],[108,128]].map(([cx, cy], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx="4" ry="5.5"
            fill={i % 2 === 0 ? 'oklch(72% 0.14 75)' : 'oklch(30% 0.08 150)'}
            opacity="0.85"
          />
        ))}
      </svg>
    </div>
  );
}
