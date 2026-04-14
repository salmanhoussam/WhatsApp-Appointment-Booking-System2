/**
 * SmarShowcasePage.jsx  —  DOM-based Cinematic Parallax (v3 — FM12 Safe)
 *
 * NO React Three Fiber. NO WebGL. NO custom shaders.
 * Pure Framer Motion + HTML + CSS mask-image feathering.
 *
 * Key fixes over v2:
 *   ● Replaced useScroll({ target, offset }) with useContext(ShowcaseContext)
 *     + pre-calculated scroll fractions — avoids FM 12.x internal scheduler
 *     bug that throws when sectionRef.current is null on first render.
 *   ● Replaced all 'vw' string values in useTransform with numeric px —
 *     FM 12's rewritten mixComplex parser is strict about CSS unit types.
 *   ● Added class-based ErrorBoundary — prevents any child crash from
 *     white-screening the entire app (no ErrorBoundary exists in App.jsx).
 *
 * Scroll architecture (500vh total document height, 400vh scrollable):
 *   Section 1  (0vh   → 100vh)  Hero Video      scrollProgress: 0.00 → 0.25
 *   Section 2  (100vh → 300vh)  Villa Station   scrollProgress: 0.25 → 0.50
 *   Section 3  (300vh → 500vh)  Chalet Station  scrollProgress: 0.75 → 1.00
 *
 * Section fractions derived as:
 *   scrollStart = (section_top)              / (docHeight - vpHeight)
 *   scrollEnd   = (section_bottom - vpHeight)/ (docHeight - vpHeight)
 *   Villa:  100/400 = 0.25  →  200/400 = 0.50
 *   Chalet: 300/400 = 0.75  →  400/400 = 1.00
 */

import React, { useContext, useEffect } from 'react';
import { useTransform, useMotionValue, motion } from 'framer-motion';

import ShowcaseHUD         from './ShowcaseHUD';
import { ShowcaseContext } from './ShowcaseContext';

// Re-export for any legacy import still referencing this file
export { ShowcaseContext };

const BASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar';

const VIDEO_URL  = `${BASE}/homepage/Logo_Formation_Video_Ready.mp4`;
const BG_URL     = `${BASE}/homepage/beitsmar7.jpg`;
const VILLA_URL  = `${BASE}/homepage/frontveiwvilla.png`;
const CHALET_URL = `${BASE}/homepage/beitsmar3.jpg`;

// ─── Error Boundary ───────────────────────────────────────────────────────────
// Class component required — React has no hook equivalent for error boundaries.
// Catches any render error in the showcase tree and shows a graceful fallback
// instead of white-screening the entire app.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width:          '100vw',
          height:         '100vh',
          background:     '#0a0a0f',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            16,
        }}>
          <div style={{
            width:        6,
            height:       6,
            borderRadius: '50%',
            background:   '#d4a853',
            boxShadow:    '0 0 18px 4px rgba(212,168,83,0.5)',
          }} />
          <span style={{
            color:         'rgba(255,255,255,0.25)',
            fontSize:      11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontFamily:    "'Inter', sans-serif",
          }}>
            Beit Smar
          </span>
          <a
            href="/listings"
            style={{
              marginTop:     16,
              color:         '#d4a853',
              fontSize:      12,
              letterSpacing: '0.12em',
              textDecoration:'none',
              textTransform: 'uppercase',
              opacity:       0.65,
              fontFamily:    "'Inter', sans-serif",
            }}
          >
            Discover Properties →
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Page root ────────────────────────────────────────────────────────────────
export default function SmarShowcasePage() {
  const scrollProgress = useMotionValue(0);

  // Drive scrollProgress 0 → 1 over the full scrollable document distance.
  // 500vh total − 100vh viewport = 400vh scrollable.
  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) scrollProgress.set(window.scrollY / max);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    // Fire once immediately so initial value is correct
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollProgress]);

  return (
    <ErrorBoundary>
      <ShowcaseContext.Provider value={{ scrollProgress }}>
        <div style={{ background: '#0a0a0f' }}>

          {/* ── Fixed HUD: navbar + progress dots ── */}
          <div style={{
            position:      'fixed',
            top:           0,
            left:          0,
            right:         0,
            bottom:        0,
            zIndex:        50,
            pointerEvents: 'none',
          }}>
            <ShowcaseHUD />
          </div>

          {/* ── Section 1: Hero Video (0vh → 100vh) ── */}
          <HeroSection videoUrl={VIDEO_URL} />

          {/* ── Section 2: Villa (100vh → 300vh) — image RIGHT, text LEFT ── */}
          <KineticStation
            bgUrl={BG_URL}
            imageUrl={VILLA_URL}
            imageAlt="Beit Smar Villa"
            flip={false}
            scrollStart={0.25}
            scrollEnd={0.50}
            eyebrow="STONE & WOOD HERITAGE"
            titleAr="التصميم الأصيل"
            titleEn="Authentic Architecture"
            bodyAr="مبنية من الحجر البلدي والخشب الأصيل، تجسّد فيلات بيت سمر إرثاً معمارياً عريقاً يمتد عبر الأجيال — حيث تلتقي الطبيعة بأرقى معايير الراحة الحديثة."
            bodyEn="Built from local stone and aged timber, each villa carries the craftsmanship of mountain heritage — brought to life with contemporary luxury."
            ctaLabel="اكتشف الفيلا / Explore Villa"
            ctaHref="/listings?type=villa"
          />

          {/* ── Section 3: Chalets (300vh → 500vh) — image LEFT, text RIGHT ── */}
          <KineticStation
            bgUrl={BG_URL}
            imageUrl={CHALET_URL}
            imageAlt="Beit Smar Chalets"
            flip={true}
            scrollStart={0.75}
            scrollEnd={1.00}
            eyebrow="MOUNTAIN RETREAT"
            titleAr="الشاليهات الجبلية"
            titleEn="Mountain Chalets"
            bodyAr="شاليهات حديثة مستوحاة من روح الجبل — حيث تلتقي الطبيعة بأرقى معايير الراحة والخصوصية الكاملة."
            bodyEn="Modern chalets inspired by the mountain spirit — where nature meets the finest standards of comfort and absolute privacy."
            ctaLabel="اكتشف الشاليهات / Explore Chalets"
            ctaHref="/listings?type=chalet"
          />

        </div>
      </ShowcaseContext.Provider>
    </ErrorBoundary>
  );
}

// ─────────────────────────────────────────────────────── Section 1: Hero Video
function HeroSection({ videoUrl }) {
  return (
    <section style={{
      position: 'relative',
      height:   '100vh',
      overflow: 'hidden',
    }}>
      <video
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        style={{
          position:  'absolute',
          top:       0,
          left:      0,
          width:     '100%',
          height:    '100%',
          objectFit: 'cover',
        }}
      />

      {/* Bottom vignette */}
      <div style={{
        position:      'absolute',
        top:           0,
        left:          0,
        right:         0,
        bottom:        0,
        background:    'linear-gradient(to bottom, rgba(10,10,15,0.18) 0%, transparent 35%, rgba(10,10,15,0.85) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Scroll hint */}
      <div style={{
        position:       'absolute',
        bottom:         32,
        left:           '50%',
        transform:      'translateX(-50%)',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            8,
        pointerEvents:  'none',
      }}>
        <span style={{
          color:         'rgba(255,255,255,0.28)',
          fontSize:      9,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          fontFamily:    "'Inter', sans-serif",
        }}>
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 9, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width:      1,
            height:     28,
            background: 'linear-gradient(to bottom, rgba(212,168,83,0.65), transparent)',
          }}
        />
      </div>
    </section>
  );
}

// ───────────────────────────────── Section 2 & 3: Kinetic Station (200vh each)
/**
 * No useScroll, no useRef, no vw strings.
 * Reads the page-level scrollProgress MotionValue directly from ShowcaseContext.
 * Uses pre-calculated scroll fractions (scrollStart/scrollEnd props) to derive
 * a normalised 0→1 progress for this section.
 *
 * All translateX values are NUMBERS (px) — FM 12.x handles these perfectly.
 *
 * flip=false → Villa:   image enters from RIGHT (+), text from LEFT (−)
 * flip=true  → Chalet:  image enters from LEFT  (−), text from RIGHT (+)
 *
 * "Organic meeting" timing:
 *   Text arrives fully at sp=0.55 (faster)
 *   Image arrives fully at sp=0.85 (slower)
 *   → Text waits in center while image slowly drifts in to meet it.
 */
function KineticStation({
  bgUrl, imageUrl, imageAlt, flip,
  scrollStart, scrollEnd,
  eyebrow, titleAr, titleEn, bodyAr, bodyEn,
  ctaLabel, ctaHref,
}) {
  const { scrollProgress } = useContext(ShowcaseContext);

  // Normalise page scroll to [0,1] within this section's window.
  // FM 12 useTransform clamps by default — values outside [scrollStart, scrollEnd]
  // produce 0 or 1. No { clamp: true } option needed.
  const sp = useTransform(scrollProgress, [scrollStart, scrollEnd], [0, 1]);

  // Capture viewport width once at render time — acceptable for a parallax effect.
  // window is always defined in Vite (no SSR). Fallback to 1440 for safety.
  const vpW = typeof window !== 'undefined' ? window.innerWidth : 1440;

  // ── Image: slow entry (arrives fully at sp=0.85) ──
  // Numeric px values — FM 12.x handles numbers flawlessly, unlike CSS strings.
  const imageX = useTransform(
    sp,
    [0, 0.85],
    flip ? [-vpW * 0.92, 0] : [vpW * 0.92, 0],
  );

  // ── Text: fast entry (arrives fully at sp=0.55) ──
  const textX = useTransform(
    sp,
    [0, 0.55],
    flip ? [vpW * 0.80, 0] : [-vpW * 0.80, 0],
  );

  // ── Background parallax drift (numeric px) ──
  const bgY = useTransform(sp, [0, 1], [0, -80]);

  // ── Fade in content ──
  const contentOpacity = useTransform(sp, [0, 0.14], [0, 1]);

  return (
    <section style={{ height: '200vh', position: 'relative' }}>
      <div style={{
        position: 'sticky',
        top:      0,
        height:   '100vh',
        overflow: 'hidden',
      }}>

        {/* ── Parallax background ── */}
        <motion.div
          style={{
            position:           'absolute',
            top:                '-18%',
            right:              '-18%',
            bottom:             '-18%',
            left:               '-18%',
            backgroundImage:    `url(${bgUrl})`,
            backgroundSize:     'cover',
            backgroundPosition: 'center',
            y:                  bgY,
            willChange:         'transform',
          }}
        />

        {/* Dark scrim */}
        <div style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          bottom:     0,
          background: 'rgba(10,10,15,0.62)',
        }} />

        {/* Top + bottom vignettes */}
        <div style={{
          position:      'absolute',
          top:           0,
          left:          0,
          right:         0,
          bottom:        0,
          background:    'linear-gradient(to bottom, #0a0a0f 0%, transparent 8%, transparent 85%, #0a0a0f 100%)',
          pointerEvents: 'none',
        }} />

        {/* ── Content layer ── */}
        <motion.div
          style={{
            position:       'absolute',
            top:            0,
            left:           0,
            right:          0,
            bottom:         0,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            'clamp(24px, 5vw, 72px)',
            padding:        '0 clamp(24px, 6vw, 80px)',
            opacity:        contentOpacity,
          }}
        >

          {/* Image with CSS mask soft-edge feathering */}
          <motion.div
            style={{
              flex:            flip ? '0 0 48%' : '0 0 46%',
              maxHeight:       '72vh',
              aspectRatio:     '4/3',
              order:           flip ? 1 : 2,
              x:               imageX,
              willChange:      'transform',
              borderRadius:    14,
              overflow:        'hidden',
              maskImage:       'radial-gradient(ellipse at center, black 48%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 48%, transparent 100%)',
            }}
          >
            <img
              src={imageUrl}
              alt={imageAlt}
              style={{
                width:     '100%',
                height:    '100%',
                objectFit: 'cover',
                display:   'block',
              }}
            />
          </motion.div>

          {/* Text panel */}
          <motion.div
            style={{
              flex:       '0 0 38%',
              minWidth:   0,
              order:      flip ? 2 : 1,
              x:          textX,
              willChange: 'transform',
            }}
          >
            {/* Gold hairline */}
            <div style={{
              width:        48,
              height:       1,
              background:   'linear-gradient(to right, #d4a853, transparent)',
              marginBottom: '1.25rem',
            }} />

            {/* Eyebrow */}
            <p style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      '0.6rem',
              letterSpacing: '0.46em',
              color:         '#d4a853',
              textTransform: 'uppercase',
              margin:        '0 0 1.2rem',
            }}>
              {eyebrow}
            </p>

            {/* Arabic title */}
            <h2 style={{
              fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              fontSize:   'clamp(2rem, 3.2vw, 3rem)',
              fontWeight: 300,
              color:      '#f0ebe3',
              margin:     '0 0 0.3rem',
              lineHeight: 1.1,
              direction:  'rtl',
            }}>
              {titleAr}
            </h2>

            {/* English subtitle */}
            <h3 style={{
              fontFamily:    "'Cormorant Garamond', 'Georgia', serif",
              fontSize:      'clamp(0.9rem, 1.3vw, 1.15rem)',
              fontWeight:    300,
              letterSpacing: '0.14em',
              color:         'rgba(212,168,83,0.62)',
              margin:        '0 0 1.8rem',
            }}>
              {titleEn}
            </h3>

            {/* Arabic body */}
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize:   '0.85rem',
              lineHeight: 1.85,
              color:      'rgba(255,255,255,0.44)',
              margin:     '0 0 0.6rem',
              direction:  'rtl',
              textAlign:  'right',
            }}>
              {bodyAr}
            </p>

            {/* English body */}
            <p style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      '0.78rem',
              lineHeight:    1.7,
              color:         'rgba(255,255,255,0.27)',
              margin:        '0 0 2.2rem',
              letterSpacing: '0.01em',
            }}>
              {bodyEn}
            </p>

            {/* CTA */}
            <motion.a
              href={ctaHref}
              whileHover={{
                scale:     1.04,
                boxShadow: '0 8px 32px rgba(212,168,83,0.42)',
              }}
              whileTap={{ scale: 0.96 }}
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            '0.6rem',
                background:     'linear-gradient(135deg, #d4a853 0%, #b8892e 100%)',
                borderRadius:   8,
                padding:        '0.9rem 2.2rem',
                fontFamily:     "'Inter', sans-serif",
                fontSize:       '0.72rem',
                letterSpacing:  '0.22em',
                color:          '#0a0a0f',
                fontWeight:     600,
                textTransform:  'uppercase',
                textDecoration: 'none',
                cursor:         'pointer',
                boxShadow:      '0 4px 24px rgba(212,168,83,0.26)',
              }}
            >
              {ctaLabel}
            </motion.a>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
