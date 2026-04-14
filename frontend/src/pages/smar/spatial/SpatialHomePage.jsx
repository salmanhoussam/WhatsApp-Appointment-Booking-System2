/**
 * SpatialHomePage.jsx  —  2.5D Kinetic Parallax Landing Page
 *
 * Section layout:
 *   0vh   – 100vh   VideoHero        — logo formation video, full-screen cover
 *   100vh – 300vh   VillaStation     — sticky 200vh, villa PNG ← RIGHT, text ← LEFT
 *   300vh – 500vh   ChaletStation    — sticky 200vh, chalet img ← LEFT, text ← RIGHT
 *   500vh+          CtaFooter
 *
 * Animation rules (from .claude/skills/Advanced Animations Skill.md):
 *   Image  : arrives at scroll progress 0.85  (slower, deliberate)
 *   Text   : arrives at scroll progress 0.55  (faster, "reaches center first")
 *   → Text waits for the image, creating the organic "meeting" moment
 *   Soft edges: CSS mask-image radial-gradient on every image subject
 *   Spring: Smooth Spatial { stiffness: 60, damping: 20 } for entrance anims
 *
 * Scroll: Lenis (lerp 0.09) — no useSpring needed on top
 */

import { useEffect, useRef } from 'react';
import Lenis               from 'lenis';
import { motion, useScroll, useTransform } from 'framer-motion';

import SmarHeader  from './SmarHeader';
import { useLanguage } from '../../../context/LanguageContext';

// ─── Asset URLs ───────────────────────────────────────────────────────────────
const BASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage';

const ASSETS = {
  heroVideo:  `${BASE}/Logo_Formation_Video_Ready.mp4`,
  background: `${BASE}/beitsmar7.jpg`,
  villa:      `${BASE}/frontveiwvilla.png`,
  chalet:     `${BASE}/beitsmar3.jpg`,
};

// ─── GS MAR Glass panel ───────────────────────────────────────────────────────
const GLASS = {
  backdropFilter:       'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  background:           'rgba(8, 8, 14, 0.58)',
  border:               '1px solid rgba(212,168,83,0.22)',
  boxShadow:            '0 8px 48px rgba(212,168,83,0.10), inset 0 1px 0 rgba(255,255,255,0.07)',
  borderRadius:         18,
  padding:              '28px 32px',
};

// ─── Smooth scroll ────────────────────────────────────────────────────────────
function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    let raf;
    const tick = (time) => { lenis.raf(time); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
}

// ─── Section 1: Video Hero (0vh – 100vh) ─────────────────────────────────────
// Logo formation video, full-screen object-cover, centred text overlay.
function VideoHero() {
  const { t } = useLanguage();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

      {/* The video ─ object-cover fills every pixel */}
      <video
        autoPlay muted loop playsInline
        src={ASSETS.heroVideo}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
        }}
      />

      {/* Bottom-heavy gradient so text reads perfectly */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.12) 38%, rgba(0,0,0,0.75) 100%)',
      }} />

      {/* Centred text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 24px',
        direction: t.dir,
      }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          style={{
            fontSize: 10, letterSpacing: '0.36em',
            color: 'rgba(212,168,83,0.85)',
            textTransform: 'uppercase', marginBottom: 20,
          }}
        >
          {t.eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, type: 'spring', stiffness: 65, damping: 18 }}
          style={{
            fontSize: 'clamp(52px, 11vw, 120px)',
            fontWeight: 900, color: '#ffffff',
            lineHeight: 1, letterSpacing: '-0.03em',
            textShadow: '0 4px 48px rgba(0,0,0,0.5)',
            marginBottom: 20,
          }}
        >
          {t.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 1 }}
          style={{
            fontSize: 'clamp(14px, 1.6vw, 17px)',
            color: 'rgba(255,255,255,0.58)',
            maxWidth: 500, lineHeight: 1.75,
            marginBottom: 48,
          }}
        >
          {t.description}
        </motion.p>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <span style={{
            fontSize: 9, letterSpacing: '0.28em',
            color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
          }}>
            {t.scroll}
          </span>
          <motion.div
            animate={{ y: [0, 9, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 1, height: 36,
              background: 'linear-gradient(to bottom, #d4a853, transparent)',
              borderRadius: 2,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Kinetic Station ──────────────────────────────────────────────────────────
// Reusable 200vh sticky section.
//
// flip=false  →  image RIGHT  /  text LEFT   (Villa)
// flip=true   →  image LEFT   /  text RIGHT  (Chalet)
//
// Scroll timing:
//   Image : enters at 0, arrives (x=0) at progress 0.85
//   Text  : enters at 0, arrives (x=0) at progress 0.55  (faster → meets image)
function KineticStation({ imageSrc, flip, label, titleAr, titleEn, bodyAr, bodyEn }) {
  const sectionRef = useRef(null);
  const { lang } = useLanguage();

  // Track scroll progress within this 200vh section
  const { scrollYProgress } = useScroll({
    target:  sectionRef,
    offset:  ['start start', 'end end'],
  });

  // ── Image: slides in from the far side (slower) ──
  const imageX = useTransform(
    scrollYProgress,
    [0, 0.85],
    flip ? ['-90vw', '0vw'] : ['90vw', '0vw'],
  );

  // ── Text: slides in from the opposite side (faster — arrives first) ──
  const textX = useTransform(
    scrollYProgress,
    [0, 0.55],
    flip ? ['80vw', '0vw'] : ['-80vw', '0vw'],
  );

  // ── Background: deep parallax drift ──
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '-14%']);

  // ── Fade both in quickly on entry, keep visible ──
  const contentOpacity = useTransform(scrollYProgress, [0, 0.12], [0, 1]);

  const title = lang === 'ar' ? titleAr : titleEn;
  const body  = lang === 'ar' ? bodyAr  : bodyEn;

  return (
    // Outer 200vh tall — creates the scroll distance
    <section
      ref={sectionRef}
      style={{ height: '200vh', position: 'relative' }}
    >
      {/* Sticky inner — stays in viewport for the full 200vh scroll */}
      <div style={{
        position: 'sticky', top: 0,
        height: '100vh', overflow: 'hidden',
        background: '#0a0a0f',
      }}>

        {/* ── Deep background with subtle parallax ── */}
        <motion.div
          style={{
            position: 'absolute', inset: 0,
            y: bgY,
            scale: 1.18,                 // prevents white edges on Y drift
            backgroundImage:   `url(${ASSETS.background})`,
            backgroundSize:    'cover',
            backgroundPosition:'center',
          }}
        />

        {/* Dark cinematic overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(10,10,15,0.72) 0%, rgba(10,10,15,0.48) 50%, rgba(10,10,15,0.68) 100%)',
        }} />

        {/* ── Content layer ── */}
        <motion.div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex',
            flexDirection: flip ? 'row' : 'row-reverse', // flip determines side
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 clamp(32px, 6vw, 96px)',
            gap: 32,
            opacity: contentOpacity,
          }}
        >

          {/* ════ Typography block ════ */}
          <motion.div
            style={{
              x:       textX,
              flex:    '0 1 auto',
              maxWidth: 'min(440px, 40vw)',
              direction: lang === 'ar' ? 'rtl' : 'ltr',
            }}
          >
            {/* Section label */}
            <p style={{
              fontSize: 10, letterSpacing: '0.36em',
              color: '#d4a853', textTransform: 'uppercase',
              marginBottom: 20, fontWeight: 700,
            }}>
              {label}
            </p>

            {/* Massive serif headline */}
            <h2 style={{
              fontFamily:    '"Georgia", "Times New Roman", serif',
              fontSize:      'clamp(44px, 7vw, 88px)',
              fontWeight:    700,
              color:         '#ffffff',
              lineHeight:    1.0,
              letterSpacing: '-0.02em',
              marginBottom:  '1rem',
              textShadow:    '0 4px 60px rgba(212,168,83,0.40)',
            }}>
              {title.split(' ').map((word, i) => (
                i === title.split(' ').length - 1
                  ? <span key={i} style={{ color: '#d4a853' }}>{word}</span>
                  : <span key={i}>{word} </span>
              ))}
            </h2>

            {/* Body copy in glassmorphism panel */}
            <div style={{ ...GLASS, maxWidth: 380 }}>
              <p style={{
                color: 'rgba(255,255,255,0.52)',
                fontSize: 'clamp(13px, 1.2vw, 15px)',
                lineHeight: 1.85, margin: 0,
              }}>
                {body}
              </p>

              {/* Explore link */}
              <motion.a
                href="/smar/listings"
                whileHover={{ x: 4, color: '#d4a853' }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  marginTop: 20, color: 'rgba(212,168,83,0.60)',
                  fontSize: 11, letterSpacing: '0.18em',
                  textTransform: 'uppercase', textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {lang === 'ar' ? 'استكشف المزيد ←' : 'Explore →'}
              </motion.a>
            </div>
          </motion.div>

          {/* ════ Image subject ════ */}
          <motion.div
            style={{
              x:    imageX,
              flex: '0 0 auto',
              // Soft radial fade — the core of the kinetic diorama look
              maskImage:         'radial-gradient(ellipse at center, black 38%, transparent 72%)',
              WebkitMaskImage:   'radial-gradient(ellipse at center, black 38%, transparent 72%)',
            }}
          >
            <img
              src={imageSrc}
              alt=""
              style={{
                width:      'min(560px, 50vw)',
                height:     'auto',
                display:    'block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </motion.div>

        </motion.div>

        {/* ── Subtle bottom vignette → blends into next section ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
          background: 'linear-gradient(to bottom, transparent, #0a0a0f)',
          pointerEvents: 'none',
        }} />
      </div>
    </section>
  );
}

// ─── CTA footer ───────────────────────────────────────────────────────────────
function CtaFooter() {
  const { t } = useLanguage();
  return (
    <section style={{
      background: '#0a0a0f',
      padding:    '120px 32px',
      textAlign:  'center',
      position:   'relative',
      overflow:   'hidden',
    }}>
      {/* Radial gold glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 700, height: 320, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(212,168,83,0.09) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 44 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, type: 'spring', stiffness: 60, damping: 20 }}
      >
        <p style={{
          fontSize: 10, letterSpacing: '0.30em',
          color: 'rgba(212,168,83,0.60)',
          textTransform: 'uppercase', marginBottom: 18,
        }}>
          {t.cta_eyebrow}
        </p>

        <h2 style={{
          fontSize: 'clamp(38px,6.5vw,78px)', fontWeight: 900,
          color: '#ffffff', letterSpacing: '-0.03em',
          lineHeight: 1, marginBottom: 18,
          direction: t.dir,
          fontFamily: '"Georgia", "Times New Roman", serif',
        }}>
          {t.cta_title}
        </h2>

        <p style={{
          fontSize: 17, color: 'rgba(255,255,255,0.38)',
          direction: t.dir, lineHeight: 1.75,
          maxWidth: 500, margin: '0 auto 50px',
        }}>
          {t.cta_body}
        </p>

        <motion.a
          href="/smar/listings"
          whileHover={{ scale: 1.06, boxShadow: '0 14px 50px rgba(212,168,83,0.42)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            display:        'inline-block',
            padding:        '18px 58px',
            borderRadius:   50,
            background:     'linear-gradient(135deg, #d4a853 0%, #b8893a 100%)',
            color:          '#fff',
            fontSize:       14, fontWeight: 700,
            letterSpacing:  '0.09em',
            textDecoration: 'none', textTransform: 'uppercase',
            boxShadow:      '0 8px 38px rgba(212,168,83,0.28)',
          }}
        >
          {t.cta_button}
        </motion.a>
      </motion.div>
    </section>
  );
}

// ─── Page compositor ──────────────────────────────────────────────────────────
export default function SpatialHomePage() {
  useSmoothScroll();

  return (
    <div style={{ background: '#0a0a0f', overflowX: 'hidden', width: '100%' }}>

      {/* Fixed transparent header — z:100, overlays everything */}
      <SmarHeader />

      {/* ── Section 1: Logo formation video hero ── */}
      <VideoHero />

      {/* ── Section 2: Villa Station (image RIGHT ← text LEFT) ── */}
      <KineticStation
        imageSrc={ASSETS.villa}
        flip={false}
        label="01 — LUXURY VILLAS"
        titleAr="فلل ديلوكس"
        titleEn="Luxury Villas"
        bodyAr="فلل فاخرة عند مدخل المنتجع، تجمع بين الأناقة المعمارية وإطلالات البحر المتوسط الخلابة على مدار السنة."
        bodyEn="Luxury villas at the resort entrance, blending architectural elegance with breathtaking Mediterranean views year-round."
      />

      {/* ── Section 3: Chalet Station (image LEFT ← text RIGHT) ── */}
      <KineticStation
        imageSrc={ASSETS.chalet}
        flip={true}
        label="02 — MOUNTAIN CHALETS"
        titleAr="شاليهات الجبل"
        titleEn="Mountain Chalets"
        bodyAr="شاليهات من الحجر اللبناني الأصيل تتربع على منحدرات الجبل، حيث يعانق التراث العريق سكينة الطبيعة."
        bodyEn="Authentic Lebanese stone chalets nestled on mountain slopes, where centuries-old heritage embraces natural serenity."
      />

      {/* ── CTA footer ── */}
      <CtaFooter />

    </div>
  );
}
