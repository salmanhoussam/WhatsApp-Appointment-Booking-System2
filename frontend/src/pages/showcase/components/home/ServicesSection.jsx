import { useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const REGISTER_URL = window.location.hostname.includes('salmansaas.com')
  ? 'https://auth.salmansaas.com/register'
  : '/register';

const SERVICES = [
  {
    num: '01',
    icon: '💬',
    titleKey: 's1Title',
    descKey:  's1Desc',
    ctaKey:   's1Btn',
    href:     REGISTER_URL,
  },
  {
    num: '02',
    icon: '🍽️',
    titleKey: 's2Title',
    descKey:  's2Desc',
    ctaKey:   null,
    href:     REGISTER_URL,
  },
  {
    num: '03',
    icon: '🛒',
    titleKey: 's3Title',
    descKey:  's3Desc',
    ctaKey:   null,
    href:     REGISTER_URL,
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
                e.currentTarget.style.borderColor = 'rgba(255,26,85,0.4)';
                e.currentTarget.style.boxShadow   = '0 0 30px rgba(255,26,85,0.12)';
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
                color: 'rgba(255,26,85,0.06)',
                lineHeight: 1, pointerEvents: 'none',
                userSelect: 'none',
              }}>
                {svc.num}
              </span>

              {/* Icon */}
              <div style={{
                width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,26,85,0.1)',
                border: '1px solid rgba(255,26,85,0.2)',
                marginBottom: '1.4rem',
                fontSize: '1.4rem',
              }}>
                {svc.icon}
              </div>

              {/* Number tag */}
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.62rem', letterSpacing: '0.12em',
                color: '#ff1a55', textTransform: 'uppercase',
                display: 'block', marginBottom: '0.6rem',
              }}>
                SVC_{svc.num}
              </span>

              <h3 style={{
                fontFamily: "'Cairo', sans-serif",
                fontWeight: 700, fontSize: '1.15rem',
                color: '#ffffff', marginBottom: '0.8rem',
              }}>
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
                    color: '#ff1a55', textDecoration: 'none',
                    borderBottom: '1px solid rgba(255,26,85,0.35)',
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
