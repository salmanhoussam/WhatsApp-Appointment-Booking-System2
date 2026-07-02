import { useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REGISTER_URL } from '../../config';
import VideoGenerationCard from './VideoGenerationCard';
import RomanceDateCard     from './RomanceDateCard';

gsap.registerPlugin(ScrollTrigger);

const IconBooking = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ff1a55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="10" rx="1" />
    <path d="M6 16l4-3h6" />
  </svg>
);

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ff1a55" strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="5"  x2="17" y2="5"  />
    <line x1="3" y1="10" x2="17" y2="10" />
    <line x1="3" y1="15" x2="12" y2="15" />
  </svg>
);

const IconStore = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ff1a55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7h16l-1.5 10H3.5L2 7z" />
    <path d="M1 7l2-4h14l2 4" />
    <line x1="10" y1="7" x2="10" y2="17" />
  </svg>
);

const SERVICES = [
  {
    num:    '01',
    Icon:   IconBooking,
    titleKey: 's1Title',
    descKey:  's1Desc',
    ctaKey:   's1Btn',
    href:     REGISTER_URL,
    stat:   { ar: 'أتمتة ١٠٠٪', en: '100% Automated' },
    accent: '#3b82f6',
  },
  {
    num:    '02',
    Icon:   IconMenu,
    titleKey: 's2Title',
    descKey:  's2Desc',
    ctaKey:   null,
    href:     REGISTER_URL,
    stat:   { ar: '+٤٠٪ مبيعات', en: '+40% Sales' },
    accent: '#f59e0b',
  },
  {
    num:    '03',
    Icon:   IconStore,
    titleKey: 's3Title',
    descKey:  's3Desc',
    ctaKey:   null,
    href:     REGISTER_URL,
    stat:   { ar: '٢٤/٧ بيع', en: '24/7 Sales' },
    accent: '#22c55e',
  },
];

export default function ServicesSection() {
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';
  const sectionRef = useRef();
  const cardRefs   = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      cardRefs.current.forEach((el, i) => {
        gsap.from(el, {
          opacity: 0, y: 50,
          duration: 0.8, delay: i * 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="services-section"
      ref={sectionRef}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ padding: '6rem 2rem', position: 'relative' }}
    >
      {/* Horizontal neon line */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,26,85,0.4), transparent)',
        marginBottom: '4rem',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Label + heading */}
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.72rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#ff1a55',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 28, height: 2, background: '#ff1a55', display: 'inline-block' }} />
          {isAr ? 'خدماتنا' : 'Our Services'}
        </p>

        <h2 style={{
          fontFamily: "'Cairo', sans-serif",
          fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          color: '#ffffff', marginBottom: '3rem', lineHeight: 1.1,
        }}>
          {t.servicesTitle}
        </h2>

        {/* Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* ── New service cards (SVC_04 / SVC_05) ── */}
          <VideoGenerationCard lang={isAr ? 'ar' : 'en'} />
          <RomanceDateCard     lang={isAr ? 'ar' : 'en'} />

          {SERVICES.map((svc, i) => (
            <div
              key={svc.num}
              ref={(el) => (cardRefs.current[i] = el)}
              style={{
                position: 'relative', overflow: 'hidden',
                padding: '2rem',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                transition: 'border-color 0.3s, box-shadow 0.3s',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${svc.accent}66`;
                e.currentTarget.style.boxShadow   = `0 0 30px ${svc.accent}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.boxShadow   = 'none';
              }}
            >
              {/* Background number */}
              <span style={{
                position: 'absolute', top: 10, [isAr ? 'left' : 'right']: 16,
                fontFamily: "'Space Mono', monospace",
                fontSize: '4.5rem', fontWeight: 700,
                color: `${svc.accent}0f`,
                lineHeight: 1, pointerEvents: 'none',
                userSelect: 'none',
              }}>
                {svc.num}
              </span>

              {/* Stat badge — top corner */}
              <div style={{
                position: 'absolute', top: 14, [isAr ? 'right' : 'left']: 14,
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.62rem', letterSpacing: '0.06em',
                color: svc.accent,
                background: `${svc.accent}18`,
                border: `1px solid ${svc.accent}44`,
                padding: '0.22rem 0.65rem',
                fontWeight: 700,
              }}>
                {isAr ? svc.stat.ar : svc.stat.en}
              </div>

              {/* Icon */}
              <div style={{
                width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${svc.accent}14`,
                border: `1px solid ${svc.accent}33`,
                marginBottom: '1.4rem',
                marginTop: '2.2rem',
              }}>
                <svc.Icon />
              </div>

              {/* Number tag */}
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.62rem', letterSpacing: '0.12em',
                color: svc.accent, textTransform: 'uppercase',
                display: 'block', marginBottom: '0.6rem',
              }}>
                SVC_{svc.num}
              </span>

              <h3 style={{
                fontFamily: "'Cairo', sans-serif",
                fontWeight: 700, fontSize: '1.15rem',
                color: '#ffffff', marginBottom: '0.8rem',
              }}>
                <span style={{ color: svc.accent, marginInlineEnd: '0.3rem' }}>◆</span>
                {t[svc.titleKey]}
              </h3>

              <p style={{
                fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.7, marginBottom: svc.ctaKey ? '1.4rem' : 0,
              }}>
                {t[svc.descKey]}
              </p>

              {svc.ctaKey && (
                <a
                  href={svc.href}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.7rem', letterSpacing: '0.06em',
                    color: svc.accent, textDecoration: 'none',
                    borderBottom: `1px solid ${svc.accent}55`,
                    paddingBottom: 2,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  {t[svc.ctaKey]}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
