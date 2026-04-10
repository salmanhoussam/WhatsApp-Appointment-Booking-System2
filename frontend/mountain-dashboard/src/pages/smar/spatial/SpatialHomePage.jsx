/**
 * SpatialHomePage.jsx  —  Beit Smar · Main Landing Page
 *
 * Exports:
 *   LanguageContext  — { t, toggleLang }  consumed by child components
 *
 * Stacks:
 *   <SmarHeader />                       (fixed glassmorphism nav)
 *   <SmarWebGLHero />                    (Active Theory WebGL — 100vh, GLSL ripple shader)
 *   <SmarTimelineGallery items={...} />  (spatial timeline, prop-driven)
 *   <CtaFooter />
 *
 * Smooth scroll: vanilla `lenis` (React 19 compatible).
 */

import { createContext, useContext, useEffect, useState } from 'react';
import Lenis from 'lenis';
import { motion } from 'framer-motion';

import SmarHeader          from './SmarHeader';
import SmarTimelineGallery from './SmarTimelineGallery';
import { translations }    from './i18n';

// ─── Language context (exported — consumed by SmarHeader, SmarHero, SmarTimelineGallery) ──
export const LanguageContext = createContext({
  t:          translations.ar,
  toggleLang: () => {},
});

// ─── Supabase base ─────────────────────────────────────────────────────────────
const BASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage';

// ─── Timeline items (bilingual) ───────────────────────────────────────────────
const smarCategories = [
  {
    num:     1,
    titleAr: 'العمارة والتصميم',
    titleEn: 'Architecture & Design',
    img:     `${BASE}/amenity1.jpg`,
    bodyAr:  'حجر لبناني تقليدي يعانق التصميم العصري. قناطر هندسية وأسقف قرميدية تروي قصة أجيال.',
    bodyEn:  'Traditional Lebanese stone meets contemporary design. Geometric arches and terracotta roofs that tell a generations-long story.',
  },
  {
    num:     2,
    titleAr: 'الحدائق المعلقة',
    titleEn: 'The Hanging Gardens',
    img:     `${BASE}/amenity2.jpg`,
    bodyAr:  'حدائق متدرجة تنساب على سفح الجبل، تفوح منها روائح الياسمين والمريمية مع إطلالة بحرية لا تُنسى.',
    bodyEn:  'Terraced gardens cascading down the hillside, fragrant with jasmine and sage, with an unforgettable sea view.',
  },
  {
    num:     3,
    titleAr: 'المسبح والتراس',
    titleEn: 'The Pool & Terrace',
    img:     `${BASE}/amenity3.jpg`,
    bodyAr:  'مسبح لا متناهي يندمج مع الأفق. كل لحظة هنا، سواء في قهوة الصباح أو غروب الشمس، هي لوحة سينمائية.',
    bodyEn:  'An infinity pool that merges with the horizon. Every moment here — morning coffee or sunset — is a cinematic frame.',
  },
];

const VIDEO_URL =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/Mountain%20veiw.mp4';

// ─── Video Hero ────────────────────────────────────────────────────────────────
// Full-screen muted autoplay video with a dark gradient + centered text.
// No shaders, no WebGL — crystal clear, buttery smooth.
function VideoHero() {
  const { t } = useContext(LanguageContext);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

      {/* The video — object-cover so it fills every pixel */}
      <video
        autoPlay muted loop playsInline
        src={VIDEO_URL}
        style={{
          position:   'absolute',
          inset:      0,
          width:      '100%',
          height:     '100%',
          objectFit:  'cover',
          objectPosition: 'center',
        }}
      />

      {/* Gradient overlay — bottom-heavy so text reads perfectly */}
      <div style={{
        position:   'absolute',
        inset:      0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.72) 100%)',
      }} />

      {/* Centered hero text */}
      <div style={{
        position:        'absolute',
        inset:           0,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        textAlign:       'center',
        padding:         '0 24px',
        direction:       t.dir,
      }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          style={{
            fontSize:      10,
            letterSpacing: '0.36em',
            color:         'rgba(212,168,83,0.85)',
            textTransform: 'uppercase',
            marginBottom:  20,
          }}
        >
          {t.eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, type: 'spring', stiffness: 65, damping: 18 }}
          style={{
            fontSize:   'clamp(52px, 11vw, 120px)',
            fontWeight: 900,
            color:      '#ffffff',
            lineHeight: 1,
            letterSpacing: '-0.03em',
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
            fontSize:   'clamp(14px, 1.6vw, 17px)',
            color:      'rgba(255,255,255,0.60)',
            maxWidth:   480,
            lineHeight: 1.75,
            marginBottom: 44,
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
            color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
          }}>
            {t.lang === 'ar' ? 'مرر للأسفل' : 'Scroll down'}
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
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

// ─── Smooth scroll hook ────────────────────────────────────────────────────────
function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    let raf;
    const tick = (time) => { lenis.raf(time); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
}

// ─── CTA footer ───────────────────────────────────────────────────────────────
function CtaFooter() {
  const { t } = useContext(LanguageContext);
  return (
    <section style={{
      background:   '#0a0a0f',
      padding:      '120px 32px',
      textAlign:    'center',
      position:     'relative',
      overflow:     'hidden',
    }}>
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        width:700, height:320, borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(212,168,83,0.09) 0%, transparent 70%)',
        pointerEvents:'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 44 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, type: 'spring', stiffness: 60, damping: 18 }}
      >
        <p style={{
          fontSize:10, letterSpacing:'0.30em',
          color:'rgba(212,168,83,0.60)',
          textTransform:'uppercase', marginBottom:18,
        }}>
          {t.cta_eyebrow}
        </p>

        <h2 style={{
          fontSize:'clamp(38px,6.5vw,78px)', fontWeight:900,
          color:'#ffffff', letterSpacing:'-0.03em',
          lineHeight:1, marginBottom:18,
          direction: t.dir,
        }}>
          {t.cta_title}
        </h2>

        <p style={{
          fontSize:17, color:'rgba(255,255,255,0.38)',
          marginBottom:50, direction: t.dir, lineHeight:1.75,
          maxWidth:500, margin:'0 auto 50px',
        }}>
          {t.cta_body}
        </p>

        <motion.a
          href="/smar"
          whileHover={{ scale: 1.06, boxShadow: '0 14px 50px rgba(212,168,83,0.42)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            display:        'inline-block',
            padding:        '18px 58px',
            borderRadius:   50,
            background:     'linear-gradient(135deg, #d4a853 0%, #b8893a 100%)',
            color:          '#fff',
            fontSize:       14,
            fontWeight:     700,
            letterSpacing:  '0.09em',
            textDecoration: 'none',
            textTransform:  'uppercase',
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
  const [lang, setLang] = useState('ar');
  useSmoothScroll();

  const toggleLang = () => setLang(prev => prev === 'ar' ? 'en' : 'ar');
  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ t, toggleLang }}>
      {/*
        Outer shell: black bg, no overflow-x bleed.
        SmarHeader is position:fixed so it overlays the hero without
        pushing it down — no top padding or spacer needed.
      */}
      <div className="relative w-full bg-black overflow-x-hidden">

        {/* Fixed transparent header — sits above the canvas at z-100 */}
        <SmarHeader />

        {/*
          WebGL hero: 100vh, no margin, no padding.
          The R3F canvas is absolute inset-0 inside this block,
          so nothing below it is hidden or pushed.
        */}
        <VideoHero />

        {/* Timeline gallery — flush against hero bottom edge */}
        <SmarTimelineGallery items={smarCategories} />

        {/* CTA footer */}
        <CtaFooter />

      </div>
    </LanguageContext.Provider>
  );
}
