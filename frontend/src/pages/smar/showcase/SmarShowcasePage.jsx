/**
 * SmarShowcasePage.jsx  —  DOM-based Cinematic Parallax (Rebuild)
 *
 * NO React Three Fiber. NO WebGL. NO custom shaders.
 * Pure Framer Motion + HTML + CSS mask-image feathering.
 *
 * Scroll architecture (500vh total):
 *   Section 1  (100vh)  — Hero Video, full-screen muted autoplay
 *   Section 2  (200vh)  — Villa Station:  PNG slides from RIGHT, text from LEFT
 *   Section 3  (200vh)  — Chalet Station: photo slides from LEFT, text from RIGHT
 *
 * ShowcaseContext: scrollProgress MotionValue (0→1 over full page)
 *   → consumed by ShowcaseHUD for progress dots + section label
 */

import { useRef, useEffect }  from 'react';
import {
  useScroll, useTransform,
  useMotionValue, motion,
} from 'framer-motion';

import ShowcaseHUD          from './ShowcaseHUD';
import { ShowcaseContext }  from './ShowcaseContext';

// Re-export so any legacy import from this file still resolves
export { ShowcaseContext };

const BASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar';

const VIDEO_URL  = `${BASE}/homepage/Logo_Formation_Video_Ready.mp4`;
const BG_URL     = `${BASE}/homepage/beitsmar7.jpg`;
const VILLA_URL  = `${BASE}/homepage/frontveiwvilla.png`;
const CHALET_URL = `${BASE}/homepage/beitsmar3.jpg`;

// ─── Page root ────────────────────────────────────────────────────────────────
export default function SmarShowcasePage() {
  const scrollProgress = useMotionValue(0);

  // Drive scrollProgress 0 → 1 via native scroll event (no RAF overhead)
  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) scrollProgress.set(window.scrollY / max);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollProgress]);

  return (
    <ShowcaseContext.Provider value={{ scrollProgress }}>
      <div style={{ background: '#0a0a0f' }}>

        {/* ── Fixed HUD: always on top ── */}
        <div style={{
          position:      'fixed',
          inset:         0,
          zIndex:        50,
          pointerEvents: 'none',
        }}>
          <ShowcaseHUD />
        </div>

        {/* ── Section 1: Hero Video ── */}
        <HeroSection videoUrl={VIDEO_URL} />

        {/* ── Section 2: Villa (image from RIGHT, text from LEFT) ── */}
        <KineticStation
          bgUrl={BG_URL}
          imageUrl={VILLA_URL}
          imageAlt="Beit Smar Villa"
          flip={false}
          eyebrow="STONE & WOOD HERITAGE"
          titleAr="التصميم الأصيل"
          titleEn="Authentic Architecture"
          bodyAr="مبنية من الحجر البلدي والخشب الأصيل، تجسّد فيلات بيت سمر إرثاً معمارياً عريقاً يمتد عبر الأجيال — حيث تلتقي الطبيعة بأرقى معايير الراحة الحديثة."
          bodyEn="Built from local stone and aged timber, each villa carries the craftsmanship of mountain heritage — brought to life with contemporary luxury."
          ctaLabel="اكتشف الفيلا / Explore Villa"
          ctaHref="/listings?type=villa"
        />

        {/* ── Section 3: Chalets (image from LEFT, text from RIGHT) ── */}
        <KineticStation
          bgUrl={BG_URL}
          imageUrl={CHALET_URL}
          imageAlt="Beit Smar Chalets"
          flip={true}
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
  );
}

// ─────────────────────────────────────────────────────── Section 1: Hero Video
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
          inset:     0,
          width:     '100%',
          height:    '100%',
          objectFit: 'cover',
        }}
      />

      {/* Bottom vignette — eases into the dark sections below */}
      <div style={{
        position:      'absolute',
        inset:         0,
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

// ───────────────────────────────────── Section 2 & 3: Kinetic Station (200vh)
/**
 * flip=false → Villa:   image enters from RIGHT,  text enters from LEFT
 * flip=true  → Chalets: image enters from LEFT,   text enters from RIGHT
 *
 * Image is slower  (arrives fully at scrollYProgress 0.85)
 * Text  is faster  (arrives fully at scrollYProgress 0.55)
 * → creates an "organic meeting" moment: text waits, image drifts in
 */
function KineticStation({
  bgUrl, imageUrl, imageAlt, flip,
  eyebrow, titleAr, titleEn, bodyAr, bodyEn,
  ctaLabel, ctaHref,
}) {
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target:  sectionRef,
    offset:  ['start start', 'end end'],
  });

  // Image: slow entry
  const imageX = useTransform(
    scrollYProgress,
    [0, 0.85],
    flip ? ['-92vw', '0vw'] : ['92vw', '0vw'],
  );

  // Text: fast entry
  const textX = useTransform(
    scrollYProgress,
    [0, 0.55],
    flip ? ['80vw', '0vw'] : ['-80vw', '0vw'],
  );

  // Parallax drift on background
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '-16%']);

  // Fade in entire content block
  const contentOpacity = useTransform(scrollYProgress, [0, 0.14], [0, 1]);

  return (
    <section ref={sectionRef} style={{ height: '200vh', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

        {/* ── Background with parallax drift ── */}
        <motion.div
          style={{
            position:           'absolute',
            top:                '-18%',   // explicit props — avoids CSS shorthand
            right:              '-18%',   // parsing issues in some bundler configs
            bottom:             '-18%',
            left:               '-18%',
            backgroundImage:    `url(${bgUrl})`,
            backgroundSize:     'cover',
            backgroundPosition: 'center',
            y:                  bgY,
            willChange:         'transform',
          }}
        />
        {/* Dark scrim over background */}
        <div style={{
          position:  'absolute',
          inset:     0,
          background: 'rgba(10,10,15,0.62)',
        }} />
        {/* Top + bottom vignettes */}
        <div style={{
          position:  'absolute',
          inset:     0,
          background: 'linear-gradient(to bottom, #0a0a0f 0%, transparent 8%, transparent 85%, #0a0a0f 100%)',
          pointerEvents: 'none',
        }} />

        {/* ── Content ── */}
        <motion.div
          style={{
            position:       'absolute',
            inset:          0,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            'clamp(24px, 5vw, 72px)',
            padding:        '0 clamp(24px, 6vw, 80px)',
            opacity:        contentOpacity,
          }}
        >

          {/* ─── Image with CSS mask feathering ─── */}
          <motion.div
            style={{
              flex:               flip ? '0 0 48%' : '0 0 46%',
              maxHeight:          '72vh',
              aspectRatio:        '4/3',
              order:              flip ? 1 : 2,
              x:                  imageX,
              willChange:         'transform',
              borderRadius:       14,
              overflow:           'hidden',
              // Soft-edge feather via CSS mask — zero shader overhead
              maskImage:          'radial-gradient(ellipse at center, black 48%, transparent 100%)',
              WebkitMaskImage:    'radial-gradient(ellipse at center, black 48%, transparent 100%)',
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

          {/* ─── Text panel ─── */}
          <motion.div
            style={{
              flex:      '0 0 38%',
              minWidth:  0,
              order:     flip ? 2 : 1,
              x:         textX,
              willChange:'transform',
            }}
          >
            {/* Gold hairline accent */}
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
                display:         'inline-flex',
                alignItems:      'center',
                gap:             '0.6rem',
                background:      'linear-gradient(135deg, #d4a853 0%, #b8892e 100%)',
                borderRadius:    8,
                padding:         '0.9rem 2.2rem',
                fontFamily:      "'Inter', sans-serif",
                fontSize:        '0.72rem',
                letterSpacing:   '0.22em',
                color:           '#0a0a0f',
                fontWeight:      600,
                textTransform:   'uppercase',
                textDecoration:  'none',
                cursor:          'pointer',
                boxShadow:       '0 4px 24px rgba(212,168,83,0.26)',
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
