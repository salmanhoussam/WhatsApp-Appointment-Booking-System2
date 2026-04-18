import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useTenantSlug from '../../../utils/useTenantSlug';

const BG_IMAGE   = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/showcase/journey_forest.jpg';
const LOGO_VIDEO = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/showcase/hero_video.mp4';

const IMG_W = 1376;
const IMG_H = 768;
const IMG_RATIO = IMG_W / IMG_H;

// Billboard panel — % of native image (1376×768). Tune to match billboard in image.
const BILLBOARD = { left: '79.5%', top: '45%', width: '13%', height: '17%', tilt: 'perspective(500px) rotateY(8deg) rotateZ(-3deg)' };

// Nav labels
const NAV = {
  ar: { gallery: 'معرض الصور', chalets: 'الشاليهات', villas: 'الفلل', about: 'من نحن', login: 'تسجيل الدخول', lang: 'EN' },
  en: { gallery: 'Gallery',    chalets: 'Chalets',     villas: 'Villas', about: 'About',   login: 'Login',           lang: 'AR' },
};

export default function SmarHero() {
  const slug     = useTenantSlug() ?? 'smar';
  const navigate = useNavigate();
  const [lang, setLang] = useState('ar');
  const t = NAV[lang];

  const outerRef = useRef(null);
  const bgRef    = useRef(null);
  const textRef  = useRef(null);

  useEffect(() => {
    function tick() {
      if (!outerRef.current) return;
      const { top } = outerRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1, -top / vh));
      if (bgRef.current)   bgRef.current.style.transform   = `translateY(${progress * 18}%)`;
      if (textRef.current) {
        const fade = Math.min(1, progress * 2.2);
        textRef.current.style.opacity   = String(1 - fade);
        textRef.current.style.transform = `translateY(${fade * -40}px)`;
      }
    }
    window.addEventListener('scroll', tick, { passive: true });
    return () => window.removeEventListener('scroll', tick);
  }, []);

  return (
    <div ref={outerRef} style={{ height: '200vh', position: 'relative' }}>

      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: '#050505' }}>

        {/* ── Layer 1: Background + billboard ── */}
        <div ref={bgRef} style={{ position: 'absolute', top: '-10%', left: 0, right: 0, bottom: '-10%', willChange: 'transform' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width:  `min(100vw, calc(100vh * ${IMG_RATIO}))`,
            height: `min(100vh, calc(100vw / ${IMG_RATIO}))`,
          }}>
            <img src={BG_IMAGE} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'fill' }} />

            <div style={{
              position: 'absolute',
              left: BILLBOARD.left, top: BILLBOARD.top,
              width: BILLBOARD.width, height: BILLBOARD.height,
              overflow: 'hidden',
              transform: BILLBOARD.tilt,
              transformOrigin: 'left center',
            }}>
              <video src={LOGO_VIDEO} autoPlay muted loop playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>

          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 40% 50%, transparent 30%, rgba(5,5,8,0.72) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', pointerEvents: 'none',
            background: 'linear-gradient(to bottom, transparent, #050508)' }} />
        </div>

        {/* ── Layer 2: NAV BAR ── */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          dir="rtl"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 4vw',
            background: 'linear-gradient(to bottom, rgba(5,5,8,0.75) 0%, transparent 100%)',
          }}
        >
          {/* Right side — page links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[
              { label: t.gallery,  path: `/${slug}/gallery` },
              { label: t.chalets,  path: `/${slug}/listings?type=chalet` },
              { label: t.villas,   path: `/${slug}/listings?type=villa` },
              { label: t.about,    path: `/${slug}/showcase#about` },
            ].map(({ label, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.80)',
                  fontSize: 'clamp(11px, 1vw, 13px)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  padding: '6px 14px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#d4a853';
                  e.currentTarget.style.background = 'rgba(212,168,83,0.10)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.80)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Left side — login + language toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'rgba(255,255,255,0.70)',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.12em',
                padding: '5px 12px', borderRadius: 14,
                cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#d4a853'; e.currentTarget.style.color = '#d4a853'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; }}
            >
              {t.lang}
            </button>

            {/* Login */}
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'rgba(212,168,83,0.15)',
                border: '1px solid rgba(212,168,83,0.40)',
                color: '#d4a853',
                fontSize: 'clamp(11px, 1vw, 13px)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '7px 18px', borderRadius: 20,
                cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,168,83,0.28)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,168,83,0.15)'; }}
            >
              {t.login}
            </button>
          </div>
        </motion.nav>

        {/* ── Layer 3: Typography ── */}
        <div
          ref={textRef}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            width: '55%', zIndex: 20,
            display: 'flex', flexDirection: 'column',
            alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 4vw 0 6vw',
            willChange: 'opacity, transform',
          }}
          dir="rtl"
        >
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            style={{
              color: '#d4a853',
              fontSize: 'clamp(10px, 1.1vw, 13px)',
              letterSpacing: '0.38em',
              textTransform: 'uppercase',
              marginBottom: 14, fontWeight: 700,
            }}
          >
            ملاذك السري في أحضان الطبيعة
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, x: 40, filter: 'blur(12px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.3, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              color: '#ffffff',
              fontSize: 'clamp(48px, 8.5vw, 110px)',
              fontWeight: 900, lineHeight: 1.05,
              letterSpacing: '-0.02em', margin: 0,
              textShadow: '0 8px 48px rgba(0,0,0,0.7)',
            }}
          >
            بيت سمار
          </motion.h1>
        </div>

        {/* ── Scroll cue ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
          style={{
            position: 'absolute', bottom: 28, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            zIndex: 20,
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700 }}>
            ابدأ الرحلة
          </span>
          <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,0.18)', overflow: 'hidden', position: 'relative' }}>
            <motion.div
              animate={{ y: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              style={{ width: '100%', height: '50%', background: '#d4a853' }}
            />
          </div>
        </motion.div>

      </div>
    </div>
  );
}
