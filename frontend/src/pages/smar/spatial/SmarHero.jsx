/**
 * SmarHero.jsx  —  Scroll-Driven Villa Reveal Hero
 *
 * Scroll map (280vh sticky stage):
 *
 *   0%       Villa at y: +95vh  → only the very top 5% is visible at the bottom
 *   0→40%    Villa rises:  95vh → 5vh  (fills the screen)
 *   35→55%   Description fades in below the villa
 *   80→95%   Everything fades out (transition to timeline)
 *
 * Background image always has slow parallax (moves at 25% of scroll).
 * Title "بيت سمار" staggered letter reveal on mount.
 * i18n: receives `t` (translations object) as prop.
 */

import { useRef, useContext } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { LanguageContext } from './SpatialHomePage';

const BASE      = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage';
const BG_IMG    = `${BASE}/beitsmar1.jpg`;
const VILLA_IMG = `${BASE}/frontveiwvilla.png`;

// Characters for staggered reveal — support both langs
const AR_CHARS = ['ب','ي','ت',' ','س','م','ا','ر'];
const EN_CHARS = ['B','e','i','t',' ','S','m','a','r'];

const letterVariants = {
  hidden:  { opacity: 0, y: 50, rotateX: 30, filter: 'blur(6px)' },
  visible: (i) => ({
    opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)',
    transition: {
      delay:     0.15 + i * 0.065,
      duration:  0.85,
      type:      'spring',
      stiffness: 70,
      damping:   16,
    },
  }),
};

export default function SmarHero() {
  const { t } = useContext(LanguageContext);
  const wrapperRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target:  wrapperRef,
    offset:  ['start start', 'end end'],
  });

  // Smooth inertia on all transforms
  const progress = useSpring(scrollYProgress, { stiffness: 55, damping: 22, mass: 1.1 });

  // ── Background slow parallax ──────────────────────────────────────────────
  const bgY = useTransform(progress, [0, 1], ['0%', '28%']);

  // ── Villa: starts at 95vh (5% peeking), rises to 5vh ──────────────────────
  const villaY       = useTransform(progress, [0, 0.42], ['95vh', '5vh']);
  const villaOpacity = useTransform(progress, [0, 0.08, 0.75, 0.92], [0, 1, 1, 0]);
  const villaScale   = useTransform(progress, [0, 0.42], [0.92, 1]);

  // ── Description fades in after villa settles ──────────────────────────────
  const descOpacity = useTransform(progress, [0.36, 0.55, 0.75, 0.92], [0, 1, 1, 0]);
  const descY       = useTransform(progress, [0.36, 0.55], ['22px', '0px']);

  // ── Title + eyebrow exit ──────────────────────────────────────────────────
  const titleOpacity = useTransform(progress, [0, 0.04, 0.30, 0.42], [0, 1, 1, 0]);
  const titleY       = useTransform(progress, [0, 0.42], ['0%', '-8%']);

  // ── Overall container fade for exit ──────────────────────────────────────
  const sectionOpacity = useTransform(progress, [0.88, 0.98], [1, 0]);

  const chars = t.lang === 'ar' ? AR_CHARS : EN_CHARS;

  return (
    // 280vh scroll container — makes everything inside scroll-driven
    <div
      ref={wrapperRef}
      style={{ height: '280vh', position: 'relative' }}
    >
      {/* ── Sticky viewport ── */}
      <motion.div
        style={{
          position:   'sticky',
          top:        0,
          height:     '100vh',
          overflow:   'hidden',
          display:    'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity:    sectionOpacity,
        }}
      >
        {/* ① Parallax background */}
        <motion.div
          style={{
            position:           'absolute',
            inset:              '-15% 0',
            backgroundImage:    `url(${BG_IMG})`,
            backgroundSize:     'cover',
            backgroundPosition: 'center 55%',
            y:                  bgY,
            zIndex:             0,
          }}
        />

        {/* Gradient vignette */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.50) 50%, rgba(0,0,0,0.82) 100%)',
        }} />

        {/* ② Eyebrow + staggered title — fades out as villa rises */}
        <motion.div
          style={{
            position:  'absolute',
            top:       '14vh',
            left:      0, right: 0,
            zIndex:    3,
            textAlign: 'center',
            opacity:   titleOpacity,
            y:         titleY,
          }}
        >
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            style={{
              fontSize: 10, letterSpacing: '0.30em',
              color: 'rgba(212,168,83,0.85)',
              textTransform: 'uppercase', marginBottom: 18,
            }}
          >
            {t.eyebrow}
          </motion.p>

          {/* Staggered letter reveal */}
          <div style={{
            display: 'flex', justifyContent: 'center',
            direction: t.dir,
            perspective: '700px',
          }}>
            {chars.map((char, i) => (
              <motion.span
                key={i}
                custom={i}
                variants={letterVariants}
                initial="hidden"
                animate="visible"
                style={{
                  display:        'inline-block',
                  fontSize:       'clamp(52px, 9.5vw, 108px)',
                  fontWeight:     900,
                  color:          char === ' ' ? 'transparent' : '#ffffff',
                  lineHeight:     1,
                  textShadow:     '0 4px 40px rgba(0,0,0,0.45)',
                  width:          char === ' ' ? '0.32em' : 'auto',
                  transformOrigin:'top center',
                  letterSpacing:  t.lang === 'ar' ? '-0.01em' : '-0.03em',
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* ③ Villa — scroll-driven rise from 95vh to 5vh */}
        <motion.div
          style={{
            position:  'absolute',
            bottom:    0,
            left:      '50%',
            x:         '-50%',
            y:         villaY,
            scale:     villaScale,
            opacity:   villaOpacity,
            zIndex:    4,
            width:     'clamp(300px, 58vw, 760px)',
            pointerEvents: 'none',
          }}
        >
          <img
            src={VILLA_IMG}
            alt="Beit Smar Villa"
            style={{
              width:      '100%',
              objectFit:  'contain',
              display:    'block',
              filter:     'drop-shadow(0 30px 70px rgba(0,0,0,0.60))',
            }}
          />
        </motion.div>

        {/* ④ Description — appears after villa settles */}
        <motion.div
          style={{
            position:  'absolute',
            bottom:    '8vh',
            left:      0, right: 0,
            zIndex:    5,
            textAlign: 'center',
            opacity:   descOpacity,
            y:         descY,
            padding:   '0 24px',
          }}
        >
          <p style={{
            fontSize:     'clamp(14px, 1.8vw, 17px)',
            color:        'rgba(255,255,255,0.62)',
            lineHeight:   1.85,
            maxWidth:     520,
            margin:       '0 auto 28px',
            direction:    t.dir,
          }}>
            {t.description}
          </p>

          {/* Scroll cue */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 8,
          }}>
            <span style={{
              fontSize: 9, letterSpacing: '0.26em',
              color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
            }}>
              {t.scroll}
            </span>
            <motion.div
              animate={{ y: [0, 9, 0] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 1, height: 36,
                background: 'linear-gradient(to bottom, rgba(212,168,83,0.75), transparent)',
              }}
            />
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
