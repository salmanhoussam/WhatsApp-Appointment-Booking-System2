/**
 * SpatialHomePage.jsx — Bait Smar Z-Axis Kinetic Gallery
 *
 * 3-Stage Scroll Experience (500vh):
 *   Stage 1 (0–15%)  : Mountain background zooms in (scale)
 *   Stage 2 (15–35%) : Villa PNG rises from bottom with white mist overlay
 *   Stage 3 (40–100%): Z-Axis gallery — amenity cards fly from deep Z-space
 *                       while kinetic typography slides horizontally behind them
 */
import React from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

// ─── Assets ──────────────────────────────────────────────────────────────────
const SUPABASE = 'https://gdzthjcvzvhfpsvoxhbm.supabase.co/storage/v1/object/public/stores/smar';

const MOUNTAIN_IMG   = `${SUPABASE}/mountain.jpg`;
const VILLA_IMG      = `${SUPABASE}/frontveiwvilla.png`;

// ─── Amenity Cards data ───────────────────────────────────────────────────────
const AMENITIES = [
  { id: 1, label: 'المسبح الخاص',    sub: 'Private Infinity Pool', img: `${SUPABASE}/pool.jpg`,      rotateY:  12 },
  { id: 2, label: 'إطلالة بانورامية', sub: 'Mountain Panorama',    img: `${SUPABASE}/view.jpg`,      rotateY: -10 },
  { id: 3, label: 'غرفة الأمراء',    sub: 'Royal Master Suite',   img: `${SUPABASE}/suite.jpg`,     rotateY:   8 },
  { id: 4, label: 'جلسة خارجية',     sub: 'Outdoor Stone Lounge', img: `${SUPABASE}/outdoor.jpg`,   rotateY: -14 },
];

// Fixed screen positions: offset in px from center of viewport
const CARD_LAYOUT = [
  { left: 'calc(50% - 440px)', top: 'calc(50% - 190px)' },
  { left: 'calc(50% + 160px)', top: 'calc(50% - 250px)' },
  { left: 'calc(50% - 300px)', top: 'calc(50% + 60px)'  },
  { left: 'calc(50% + 110px)', top: 'calc(50% + 50px)'  },
];

// Scroll ranges [enterStart, peak, exitEnd] for each card
const CARD_RANGES = [
  [0.38, 0.52, 0.65],
  [0.50, 0.63, 0.76],
  [0.61, 0.74, 0.87],
  [0.72, 0.84, 0.96],
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ZAxisCard({ amenity, layout, range, progress }) {
  const z       = useTransform(progress, range,                                    [-3000, 0, 1500]);
  const opacity = useTransform(progress, [range[0], range[0] + 0.07, range[2] - 0.05, range[2]], [0, 1, 1, 0]);

  return (
    <motion.div
      style={{
        position:        'absolute',
        left:            layout.left,
        top:             layout.top,
        width:           240,
        height:          320,
        z,
        opacity,
        rotateY:         amenity.rotateY,
        borderRadius:    20,
        overflow:        'hidden',
        boxShadow:       '0 24px 64px rgba(0,0,0,0.55)',
        cursor:          'pointer',
        transformOrigin: 'center center',
      }}
      whileHover={{ scale: 1.06, rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.8 }}
    >
      {/* Image */}
      <img
        src={amenity.img}
        alt={amenity.label}
        style={{ width: '100%', height: '68%', objectFit: 'cover', display: 'block' }}
        onError={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg,#1a1a2e,#16213e)';
          e.currentTarget.src = '';
        }}
      />
      {/* Glassmorphism label */}
      <div style={{
        background:           'rgba(6,6,6,0.88)',
        backdropFilter:       'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        padding:              '14px 18px',
        height:               '32%',
        direction:            'rtl',
        display:              'flex',
        flexDirection:        'column',
        justifyContent:       'center',
        gap:                  5,
        borderTop:            '1px solid rgba(255,255,255,0.07)',
      }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0, letterSpacing: 0.4 }}>
          {amenity.label}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, margin: 0, fontFamily: 'sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {amenity.sub}
        </p>
      </div>
    </motion.div>
  );
}

function KineticTypography({ progress }) {
  const x1 = useTransform(progress, [0.35, 1.0], ['0%',   '-38%']);
  const x2 = useTransform(progress, [0.35, 1.0], ['0%',   '38%' ]);

  const baseStyle = {
    fontSize:      'clamp(68px,13vw,148px)',
    fontWeight:    900,
    color:         'rgba(255,255,255,0.032)',
    whiteSpace:    'nowrap',
    lineHeight:    0.88,
    userSelect:    'none',
    letterSpacing: '-0.02em',
    margin:        0,
  };

  return (
    <div style={{
      position:       'absolute',
      inset:          0,
      display:        'flex',
      flexDirection:  'column',
      justifyContent: 'center',
      overflow:       'hidden',
      pointerEvents:  'none',
    }}>
      <motion.p style={{ ...baseStyle, x: x1, direction: 'rtl' }}>
        سمار&nbsp;•&nbsp;الطبيعة&nbsp;•&nbsp;الفخامة&nbsp;•&nbsp;سمار&nbsp;•&nbsp;الطبيعة
      </motion.p>
      <motion.p style={{ ...baseStyle, x: x2, direction: 'ltr', marginTop: '0.4em' }}>
        LUXURY&nbsp;•&nbsp;ESCAPE&nbsp;•&nbsp;SERENITY&nbsp;•&nbsp;BAIT&nbsp;SMAR
      </motion.p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SpatialHomePage() {
  const { scrollYProgress } = useScroll();

  // Smooth spring (stiffness 60 / damping 20 = heavy, cinematic inertia)
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });

  // ── Stage 1 transforms (Mountain 0→15%) ──────────────────────────────────
  const mountainScale   = useTransform(progress, [0,    0.15], [1.0,  1.35]);
  const mountainOpacity = useTransform(progress, [0.10, 0.20], [1,    0   ]);

  // ── Stage 2 transforms (Villa 15→35%) ────────────────────────────────────
  const villaY       = useTransform(progress, [0.15, 0.35],               ['80%', '0%']);
  const villaOpacity = useTransform(progress, [0.15, 0.24, 0.80, 0.95],   [0, 1, 1, 0]);
  const mistOpacity  = useTransform(progress, [0.15, 0.30],               [0, 1        ]);

  // ── Stage 3 transforms (Gallery 35→100%) ─────────────────────────────────
  const galleryVoidOpacity = useTransform(progress, [0.33, 0.44], [0, 1]);
  const galleryOpacity     = useTransform(progress, [0.36, 0.46], [0, 1]);
  const ctaOpacity         = useTransform(progress, [0.88, 0.96], [0, 1]);

  return (
    <div data-slug="smar" style={{ height: '500vh', background: '#000' }}>

      {/* ── Fixed HUD nav (mix-blend-difference for inversion effect) ── */}
      <nav style={{
        position:       'fixed',
        top:            0,
        left:           0,
        right:          0,
        zIndex:         100,
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '22px 40px',
        mixBlendMode:   'difference',
        direction:      'rtl',
      }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '0.28em' }}>
          BAIT SMAR
        </span>
        <div style={{ display: 'flex', gap: 28 }}>
          {['استكشف', 'احجز الآن', 'تواصل'].map((label) => (
            <a
              key={label}
              href="#"
              style={{ color: '#fff', textDecoration: 'none', fontSize: 13, letterSpacing: '0.08em', opacity: 0.82 }}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* ── Sticky 3D viewport (500vh outer → sticky 100vh inner) ── */}
      <div style={{
        position:        'sticky',
        top:             0,
        height:          '100vh',
        overflow:        'hidden',
        background:      '#080808',
        perspective:     '1200px',
        transformStyle:  'preserve-3d',
      }}>

        {/* ════════════════════════════════════════════════════════════
            STAGE 1 — Mountain Zoom
        ════════════════════════════════════════════════════════════ */}
        <motion.div style={{
          position: 'absolute',
          inset:    0,
          scale:    mountainScale,
          opacity:  mountainOpacity,
        }}>
          <img
            src={MOUNTAIN_IMG}
            alt="جبال سمار"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              e.currentTarget.style.background = 'linear-gradient(180deg,#0d1520 0%,#1a2a18 100%)';
              e.currentTarget.src = '';
            }}
          />
          {/* Dark overlay for text legibility */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)' }} />

          {/* Hero title */}
          <div style={{
            position:       'absolute',
            inset:          0,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            direction:      'rtl',
          }}>
            <motion.h1
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                color:         '#fff',
                fontSize:      'clamp(52px,11vw,116px)',
                fontWeight:    900,
                margin:        0,
                letterSpacing: '-0.02em',
                textAlign:     'center',
                lineHeight:    0.88,
              }}
            >
              بيت سمار
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              transition={{ delay: 0.9, duration: 1.2 }}
              style={{
                color:       '#fff',
                fontSize:    13,
                letterSpacing: '0.5em',
                marginTop:   28,
                fontFamily:  'sans-serif',
                textAlign:   'center',
              }}
            >
              BAIT SMAR &nbsp;·&nbsp; الأمسان
            </motion.p>
            {/* Scroll hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 2, duration: 1 }}
              style={{
                position:  'absolute',
                bottom:    48,
                display:   'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap:       8,
              }}
            >
              <span style={{ color: '#fff', fontSize: 11, letterSpacing: '0.3em', fontFamily: 'sans-serif' }}>SCROLL</span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.5)' }}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════
            STAGE 2 — Villa Rise + Mist
        ════════════════════════════════════════════════════════════ */}
        <motion.div style={{ position: 'absolute', inset: 0, opacity: villaOpacity }}>
          {/* Dark warm bg */}
          <div style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1209 100%)',
          }} />

          {/* Villa PNG — rises from bottom */}
          <motion.img
            src={VILLA_IMG}
            alt="واجهة الشاليه"
            style={{
              position:        'absolute',
              bottom:          0,
              left:            '50%',
              x:               '-50%',
              y:               villaY,
              width:           'min(92%, 920px)',
              objectFit:       'contain',
              transformOrigin: 'bottom center',
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />

          {/* White mist overlay at bottom */}
          <motion.div style={{
            position:   'absolute',
            bottom:     0,
            left:       0,
            right:      0,
            height:     '32%',
            background: 'linear-gradient(to top, rgba(238,232,220,0.72) 0%, transparent 100%)',
            opacity:    mistOpacity,
            pointerEvents: 'none',
          }} />

          {/* Ambient property label */}
          <motion.div
            style={{
              position:      'absolute',
              top:           '12%',
              left:          '50%',
              x:             '-50%',
              opacity:       useTransform(progress, [0.22, 0.30, 0.75, 0.85], [0, 1, 1, 0]),
              textAlign:     'center',
              direction:     'rtl',
              whiteSpace:    'nowrap',
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, letterSpacing: '0.4em', fontFamily: 'sans-serif', margin: 0 }}>
              CHALET COLLECTION
            </p>
          </motion.div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════
            STAGE 3 — Z-Axis Kinetic Gallery
        ════════════════════════════════════════════════════════════ */}
        <motion.div style={{ position: 'absolute', inset: 0, opacity: galleryOpacity }}>

          {/* Deep void radial bg */}
          <motion.div style={{
            position:   'absolute',
            inset:      0,
            opacity:    galleryVoidOpacity,
            background: 'radial-gradient(ellipse 80% 70% at 50% 50%, #1c0f06 0%, #080808 100%)',
          }} />

          {/* Kinetic typography (behind cards) */}
          <KineticTypography progress={progress} />

          {/* 3D perspective container for Z-axis cards */}
          <div style={{
            position:       'absolute',
            inset:          0,
            perspective:    '1200px',
            transformStyle: 'preserve-3d',
          }}>
            {AMENITIES.map((amenity, i) => (
              <ZAxisCard
                key={amenity.id}
                amenity={amenity}
                layout={CARD_LAYOUT[i]}
                range={CARD_RANGES[i]}
                progress={progress}
              />
            ))}
          </div>

          {/* Booking CTA — fades in at end of scroll */}
          <motion.div style={{
            position:   'absolute',
            bottom:     48,
            left:       '50%',
            x:          '-50%',
            opacity:    ctaOpacity,
            direction:  'rtl',
            textAlign:  'center',
            whiteSpace: 'nowrap',
          }}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                background:           'rgba(255,255,255,0.07)',
                backdropFilter:       'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border:               '1px solid rgba(255,255,255,0.14)',
                color:                '#fff',
                padding:              '15px 52px',
                borderRadius:         100,
                fontSize:             15,
                letterSpacing:        '0.1em',
                cursor:               'pointer',
                fontWeight:           600,
              }}
            >
              احجز تجربتك الآن
            </motion.button>
          </motion.div>

        </motion.div>

      </div>
    </div>
  );
}
