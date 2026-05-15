import { useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SYS_ROWS = [
  { key: 'projects_delivered ........ ', val: '50+',   color: '#ffffff'  },
  { key: 'client_satisfaction ....... ', val: '99%',   color: '#22c55e'  },
  { key: 'support_availability ...... ', val: '24/7',  color: '#f59e0b'  },
  { key: 'data_encryption ........... ', val: '100%',  color: '#8b5cf6'  },
];

const IconSpeed = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ff1a55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,2 16,9 9,16" />
    <line x1="2" y1="9" x2="16" y2="9" />
  </svg>
);

const IconResponsive = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ff1a55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="1" width="8" height="16" rx="1" />
    <circle cx="9" cy="14" r="0.8" fill="#ff1a55" stroke="none" />
  </svg>
);

const IconSecurity = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ff1a55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 1L3 4v5c0 3.5 2.2 6 6 7.5C12.8 15 15 12.5 15 9V4L9 1z" />
    <polyline points="6,9 8,11 12,7" />
  </svg>
);

const FEATURES = [
  {
    Icon: IconSpeed,
    titleAr: 'سرعة وأداء استثنائي',
    titleEn: 'Exceptional Speed',
    descAr: 'مواقعنا مبنية لتكون الأسرع — أداء يرفع ترتيبك في جوجل.',
    descEn: 'Our sites are built for speed — performance that improves your SEO.',
  },
  {
    Icon: IconResponsive,
    titleAr: 'تصميم متجاوب بالكامل',
    titleEn: 'Fully Responsive',
    descAr: 'يظهر موقعك بشكل مثالي على الجوال والآيباد والكمبيوتر.',
    descEn: 'Perfect display on mobile, tablet, and desktop — everywhere.',
  },
  {
    Icon: IconSecurity,
    titleAr: 'أمان عالي المستوى',
    titleEn: 'Enterprise Security',
    descAr: 'بنية تحتية سحابية مؤمّنة بأحدث معايير التشفير.',
    descEn: 'Cloud infrastructure secured with the latest encryption standards.',
  },
];

export default function WhyUsSection() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const sectionRef  = useRef();
  const termRef     = useRef();
  const featuresRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(termRef.current, {
        opacity: 0, y: 30,
        duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: termRef.current, start: 'top 88%' },
      });
      featuresRef.current.forEach((el, i) => {
        gsap.from(el, {
          opacity: 0, x: isAr ? 40 : -40,
          duration: 0.8, delay: i * 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [isAr]);

  return (
    <section
      ref={sectionRef}
      id="why-us"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        padding: '6rem 2rem',
        position: 'relative',
      }}
    >
      {/* Subtle glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(255,26,85,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Mono label */}
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.72rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#ff1a55',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 28, height: 2, background: '#ff1a55', display: 'inline-block' }} />
          {isAr ? 'لماذا نحن' : 'Why SalmanSaaS'}
        </p>

        <h2 style={{
          fontSize: 'clamp(2.2rem, 5vw, 4rem)',
          fontWeight: 900, lineHeight: 1.1,
          color: '#ffffff', marginBottom: '3rem',
          fontFamily: "'Cairo', sans-serif",
        }}>
          {isAr ? 'لماذا تختار' : 'Why Choose'}{' '}
          <span style={{ color: '#ff1a55' }}>SalmanSaaS</span>?
        </h2>

        {/* Terminal sys-info — replaces big-number stat cards */}
        <div
          ref={termRef}
          style={{
            fontFamily: "'Space Mono', monospace",
            background: 'rgba(8,8,8,0.7)',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '1.4rem 1.8rem',
            marginBottom: '4rem',
            fontSize: '0.72rem',
            letterSpacing: '0.05em',
            lineHeight: 2.4,
          }}
        >
          <p style={{ color: '#ff1a55', marginBottom: '0.4rem' }}>
            {'$ sys_info --tenant-platform'}
          </p>
          {SYS_ROWS.map(({ key, val, color }) => (
            <p key={key} style={{ margin: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.28)' }}>{key}</span>
              <span style={{ color }}>{val}</span>
            </p>
          ))}
        </div>

        {/* Features list */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
        }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              ref={(el) => (featuresRef.current[i] = el)}
              style={{
                display: 'flex', gap: '1rem', alignItems: 'flex-start',
                padding: '1.4rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{
                width: 40, height: 40, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,26,85,0.08)',
                border: '1px solid rgba(255,26,85,0.18)',
              }}>
                <f.Icon />
              </div>
              <div>
                <h4 style={{
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: 700, fontSize: '1rem',
                  color: '#ffffff', marginBottom: 4,
                }}>
                  {isAr ? f.titleAr : f.titleEn}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                  {isAr ? f.descAr : f.descEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
