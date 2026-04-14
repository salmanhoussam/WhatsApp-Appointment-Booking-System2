/**
 * SmarShowcasePage.jsx  —  DOM-based Cinematic Parallax  (v4 — React 19 / FM12 Safe)
 *
 * ─── ARCHITECTURE CHANGE (v4) ───────────────────────────────────────────────────
 * v3 used Framer Motion MotionValues bound directly to motion.div style props
 * (e.g. style={{ x: imageX, y: bgY, opacity: contentOpacity }}). In FM 12 +
 * React 19, FM internally uses useLayoutEffect to subscribe to those values.
 * React 19's StrictMode double-mount tears those subscriptions down and throws
 * BEFORE the ErrorBoundary can catch them → white screen.
 *
 * v4 removes every MotionValue-driven style binding:
 *   ● Scroll-driven transforms use useRef + direct DOM mutations (ref.style.X = ...)
 *     in a passive scroll listener — zero React re-renders, zero FM layout effects.
 *   ● motion.* is kept ONLY for keyframe animations (animate=) and gesture props
 *     (whileHover / whileTap) which are safe in React 19.
 *
 * Scroll architecture (500vh total, 400vh scrollable):
 *   Section 1  Hero Video      0vh  → 100vh   (always visible)
 *   Section 2  Villa Station   100vh → 300vh   scrollFrac: 0.25 → 0.50
 *   Section 3  Chalet Station  300vh → 500vh   scrollFrac: 0.75 → 1.00
 */

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ShowcaseHUD from './ShowcaseHUD';

const BASE      = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar';
const VIDEO_URL  = `${BASE}/homepage/Logo_Formation_Video_Ready.mp4`;
const BG_URL     = `${BASE}/homepage/beitsmar7.jpg`;
const VILLA_URL  = `${BASE}/homepage/frontveiwvilla.png`;
const CHALET_URL = `${BASE}/homepage/beitsmar3.jpg`;

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || 'unknown error' };
  }

  componentDidCatch(err, info) {
    // Visible in the browser console so the exact throw location is clear
    console.error('[ShowcaseErrorBoundary] caught:', err, info?.componentStack);
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
              marginTop:      16,
              color:          '#d4a853',
              fontSize:       12,
              letterSpacing:  '0.12em',
              textDecoration: 'none',
              textTransform:  'uppercase',
              opacity:        0.65,
              fontFamily:     "'Inter', sans-serif",
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
  return (
    <ErrorBoundary>
      <div style={{ background: '#0a0a0f' }}>

        {/* Fixed HUD — navbar + progress dots (self-contained scroll listener) */}
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

        {/* Section 1: Hero Video */}
        <HeroSection videoUrl={VIDEO_URL} />

        {/* Section 2: Villa — image enters from RIGHT, text from LEFT */}
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

        {/* Section 3: Chalets — image enters from LEFT, text from RIGHT */}
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
    </ErrorBoundary>
  );
}

// ─────────────────────────────────────────────── Section 1 : Hero Video (100vh)
function HeroSection({ videoUrl }) {
  return (
    <section style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
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

      {/* Scroll hint — motion.div with animate prop only (safe in React 19) */}
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
        {/* animate= keyframe animation — no MotionValue binding, safe in React 19 */}
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

// ─────────────────────────────────────────── Sections 2 & 3 : Kinetic Station
/**
 * Scroll-driven parallax using direct DOM mutation (ref.current.style.transform).
 *
 * NO Framer Motion MotionValues in style props.
 * NO useLayoutEffect from FM.
 * Safe with React 19 + StrictMode + FM 12.
 *
 * Each instance attaches its own passive scroll listener which runs outside
 * React's render cycle — zero state updates on scroll, zero re-renders.
 *
 * Timing (same as v3):
 *   Image  : fully arrived at sectionProgress 0.85 (slower, deliberate)
 *   Text   : fully arrived at sectionProgress 0.55 (faster, meets image)
 *   Content: fades in over sectionProgress 0.00 → 0.14
 */
function KineticStation({
  bgUrl, imageUrl, imageAlt, flip,
  scrollStart, scrollEnd,
  eyebrow, titleAr, titleEn, bodyAr, bodyEn,
  ctaLabel, ctaHref,
}) {
  const bgRef      = useRef(null);
  const contentRef = useRef(null);
  const imageRef   = useRef(null);
  const textRef    = useRef(null);

  useEffect(() => {
    // Capture viewport width once — parallax is allowed to be slightly off on resize
    const vpW = window.innerWidth;

    function tick() {
      const max  = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const rawSP = window.scrollY / max;

      // Normalise to [0,1] within this section's scroll window
      const sp = clamp((rawSP - scrollStart) / (scrollEnd - scrollStart), 0, 1);

      // Derived progress values — clamped sub-ranges
      const imgProg = clamp(sp / 0.85, 0, 1);  // image: slower
      const txtProg = clamp(sp / 0.55, 0, 1);  // text:  faster
      const fadeProg = clamp(sp / 0.14, 0, 1); // fade-in

      // X offsets in px (positive = right, negative = left)
      const imageX = (1 - imgProg) * (flip ? -vpW * 0.92 : vpW * 0.92);
      const textX  = (1 - txtProg) * (flip ? vpW * 0.80 : -vpW * 0.80);
      // Background slow parallax in px
      const bgY    = sp * -80;

      if (bgRef.current) {
        bgRef.current.style.transform = `translateY(${bgY}px)`;
      }
      if (contentRef.current) {
        contentRef.current.style.opacity = String(fadeProg);
      }
      if (imageRef.current) {
        imageRef.current.style.transform = `translateX(${imageX}px)`;
      }
      if (textRef.current) {
        textRef.current.style.transform = `translateX(${textX}px)`;
      }
    }

    window.addEventListener('scroll', tick, { passive: true });
    tick(); // set initial positions synchronously before first paint of this section
    return () => window.removeEventListener('scroll', tick);
  }, [scrollStart, scrollEnd, flip]); // stable values — effect runs once

  return (
    <section style={{ height: '200vh', position: 'relative' }}>
      <div style={{
        position: 'sticky',
        top:      0,
        height:   '100vh',
        overflow: 'hidden',
      }}>

        {/* ── Parallax background (direct DOM mutation via ref) ── */}
        <div
          ref={bgRef}
          style={{
            position:           'absolute',
            top:                '-18%',
            right:              '-18%',
            bottom:             '-18%',
            left:               '-18%',
            backgroundImage:    `url(${bgUrl})`,
            backgroundSize:     'cover',
            backgroundPosition: 'center',
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

        {/* ── Content wrapper — opacity driven by scroll (starts hidden) ── */}
        <div
          ref={contentRef}
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
            opacity:        0, // updated by scroll listener
          }}
        >

          {/* Image — slide in, soft radial mask */}
          <div
            ref={imageRef}
            style={{
              flex:            flip ? '0 0 48%' : '0 0 46%',
              maxHeight:       '72vh',
              aspectRatio:     '4/3',
              order:           flip ? 1 : 2,
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
          </div>

          {/* Text panel */}
          <div
            ref={textRef}
            style={{
              flex:       '0 0 38%',
              minWidth:   0,
              order:      flip ? 2 : 1,
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

            {/*
              CTA — whileHover / whileTap use FM gesture state,
              NOT MotionValue style bindings. Safe in React 19.
            */}
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
          </div>

        </div>
      </div>
    </section>
  );
}
