import { useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { num: '+50',  labelAr: 'مشروع مكتمل',   labelEn: 'Projects Done' },
  { num: '99%',  labelAr: 'رضا العملاء',    labelEn: 'Satisfaction'  },
  { num: '24/7', labelAr: 'دعم فني متواصل', labelEn: 'Support'       },
  { num: '100%', labelAr: 'حماية وتشفير',   labelEn: 'Secure'        },
];

const FEATURES = [
  {
    icon: '⚡',
    titleAr: 'سرعة وأداء استثنائي',
    titleEn: 'Exceptional Speed',
    descAr: 'مواقعنا مبنية لتكون الأسرع — أداء يرفع ترتيبك في جوجل.',
    descEn: 'Our sites are built for speed — performance that improves your SEO.',
  },
  {
    icon: '📱',
    titleAr: 'تصميم متجاوب بالكامل',
    titleEn: 'Fully Responsive',
    descAr: 'يظهر موقعك بشكل مثالي على الجوال والآيباد والكمبيوتر.',
    descEn: 'Perfect display on mobile, tablet, and desktop — everywhere.',
  },
  {
    icon: '🔒',
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
  const statsRef    = useRef([]);
  const featuresRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      statsRef.current.forEach((el, i) => {
        gsap.from(el, {
          opacity: 0, y: 40, scale: 0.85,
          duration: 0.7, delay: i * 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
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
      style={{
        padding: '6rem 1.5rem',
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

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '4rem',
        }}>
          {STATS.map((s, i) => (
            <div
              key={i}
              ref={(el) => (statsRef.current[i] = el)}
              style={{
                background: 'rgba(255,26,85,0.05)',
                border: '1px solid rgba(255,26,85,0.18)',
                borderRadius: 6,
                padding: '1.6rem 1.2rem',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                fontWeight: 700, color: '#ff1a55', lineHeight: 1,
                marginBottom: 8,
              }}>
                {s.num}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                {isAr ? s.labelAr : s.labelEn}
              </div>
            </div>
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
                borderRadius: 6,
              }}
            >
              <div style={{
                width: 40, height: 40, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,26,85,0.12)',
                borderRadius: 6, fontSize: '1.2rem',
              }}>
                {f.icon}
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
