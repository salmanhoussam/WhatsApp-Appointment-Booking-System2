import { useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REGISTER_URL, WHATSAPP_NUMBER } from '../../config';

gsap.registerPlugin(ScrollTrigger);

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#ff1a55" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
    <polyline points="2,6 5,9 10,3" />
  </svg>
);

const PLANS = [
  {
    key: 'starter',
    nameAr: 'المبتدئ',
    nameEn: 'Starter',
    priceUSD: 0,
    periodAr: 'مجاناً للأبد',
    periodEn: 'Free forever',
    color: '#6b7280',
    featuresAr: ['موقع واحد', '100 حجز / شهر', 'قالب جاهز', 'دعم بالإيميل'],
    featuresEn: ['1 website', '100 bookings / mo', 'Ready template', 'Email support'],
    ctaAr: 'ابدأ مجاناً',
    ctaEn: 'Start Free',
    href: REGISTER_URL,
    badge: null,
    highlighted: false,
  },
  {
    key: 'pro',
    nameAr: 'الاحترافي',
    nameEn: 'Pro',
    priceUSD: 29,
    periodAr: '/ شهر',
    periodEn: '/ month',
    color: '#ff1a55',
    featuresAr: ['3 مواقع', 'حجوزات غير محدودة', 'قائمة مطعم + متجر', 'إيميلات تلقائية', 'دعم واتساب'],
    featuresEn: ['3 websites', 'Unlimited bookings', 'Restaurant + Store', 'Auto emails', 'WhatsApp support'],
    ctaAr: 'ابدأ Pro الآن',
    ctaEn: 'Start Pro Now',
    href: REGISTER_URL,
    badgeAr: 'الأكثر شيوعاً',
    badgeEn: 'Most Popular',
    highlighted: true,
  },
  {
    key: 'enterprise',
    nameAr: 'المؤسسي',
    nameEn: 'Enterprise',
    priceUSD: null,
    periodAr: 'تواصل معنا',
    periodEn: 'Contact us',
    color: '#8b5cf6',
    featuresAr: ['مواقع غير محدودة', 'دومين خاص', 'تكامل ERP / POS', 'SLA 99.9%', 'مدير حساب مخصص'],
    featuresEn: ['Unlimited sites', 'Custom domain', 'ERP / POS integration', '99.9% SLA', 'Dedicated manager'],
    ctaAr: 'تحدث مع الفريق',
    ctaEn: 'Talk to Team',
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    badge: null,
    highlighted: false,
  },
]

export default function PricingSection() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const sectionRef = useRef();
  const cardRefs   = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(sectionRef.current.querySelectorAll('[data-reveal]'), {
        opacity: 0, y: 30,
        duration: 0.7, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 82%' },
      });
      cardRefs.current.forEach((el, i) => {
        gsap.from(el, {
          opacity: 0, y: 50,
          duration: 0.8, delay: i * 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ padding: '6rem 2rem', position: 'relative' }}
    >
      {/* Neon divider */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,26,85,0.4), transparent)',
        marginBottom: '4rem',
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 700, height: 400,
        background: 'radial-gradient(ellipse, rgba(255,26,85,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>

        {/* Label */}
        <p data-reveal style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.72rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#ff1a55',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 28, height: 2, background: '#ff1a55', display: 'inline-block' }} />
          {isAr ? 'خطط الأسعار' : 'Pricing'}
        </p>

        {/* Heading */}
        <h2 data-reveal style={{
          fontFamily: "'Cairo', sans-serif",
          fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          color: '#ffffff', marginBottom: '0.8rem', lineHeight: 1.1,
        }}>
          {isAr ? 'خطة تناسب كل نشاط' : 'A Plan for Every Business'}
        </h2>
        <p data-reveal style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)',
          marginBottom: '3.5rem', lineHeight: 1.7,
        }}>
          {isAr
            ? 'ابدأ مجاناً — وسّع مع نمو نشاطك بدون قيود.'
            : 'Start free — scale as you grow with no limits.'}
        </p>

        {/* Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          alignItems: 'stretch',
        }}>
          {PLANS.map((plan, i) => {
            const badge = isAr ? plan.badgeAr : plan.badgeEn;
            return (
              <div
                key={plan.key}
                ref={el => (cardRefs.current[i] = el)}
                style={{
                  position: 'relative',
                  padding: plan.highlighted ? '2rem' : '1.8rem',
                  background: plan.highlighted
                    ? 'rgba(255,26,85,0.04)'
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${plan.highlighted ? 'rgba(255,26,85,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: plan.highlighted ? '0 0 40px rgba(255,26,85,0.10), inset 0 0 40px rgba(255,26,85,0.03)' : 'none',
                  display: 'flex', flexDirection: 'column',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${plan.color}60`;
                  e.currentTarget.style.boxShadow   = `0 0 30px ${plan.color}18`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = plan.highlighted ? 'rgba(255,26,85,0.35)' : 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.boxShadow   = plan.highlighted ? '0 0 40px rgba(255,26,85,0.10), inset 0 0 40px rgba(255,26,85,0.03)' : 'none';
                }}
              >
                {/* Popular badge */}
                {badge && (
                  <div style={{
                    position: 'absolute', top: -12,
                    [isAr ? 'right' : 'left']: 20,
                    background: plan.color,
                    color: '#fff', fontSize: '0.62rem',
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '3px 12px',
                  }}>
                    {badge}
                  </div>
                )}

                {/* Plan label */}
                <div style={{ marginBottom: '1.4rem' }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.62rem', letterSpacing: '0.14em',
                    color: plan.color, textTransform: 'uppercase',
                    display: 'block', marginBottom: '0.5rem',
                  }}>
                    {`PLN_0${i + 1}`}
                  </span>
                  <h3 style={{
                    fontFamily: "'Cairo', sans-serif",
                    fontWeight: 800, fontSize: '1.3rem',
                    color: '#fff', margin: 0,
                  }}>
                    {isAr ? plan.nameAr : plan.nameEn}
                  </h3>
                </div>

                {/* Price */}
                <div style={{ marginBottom: '1.8rem' }}>
                  {plan.priceUSD !== null ? (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                        fontWeight: 700, color: plan.highlighted ? plan.color : '#ffffff',
                        lineHeight: 1,
                      }}>
                        {plan.priceUSD === 0 ? (isAr ? 'مجاناً' : 'Free') : `$${plan.priceUSD}`}
                      </span>
                      {plan.priceUSD > 0 && (
                        <span style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)',
                          marginBottom: 6,
                        }}>
                          {isAr ? plan.periodAr : plan.periodEn}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '1.1rem', color: plan.color, fontWeight: 700,
                    }}>
                      {isAr ? plan.periodAr : plan.periodEn}
                    </span>
                  )}
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 auto', flex: 1 }}>
                  {(isAr ? plan.featuresAr : plan.featuresEn).map((f, fi) => (
                    <li key={fi} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      fontSize: '0.83rem', color: 'rgba(255,255,255,0.55)',
                      marginBottom: '0.6rem', lineHeight: 1.5,
                    }}>
                      <IconCheck />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href={plan.href}
                  style={{
                    display: 'block', textAlign: 'center',
                    marginTop: '1.8rem',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '0.9rem 1.5rem',
                    textDecoration: 'none',
                    fontWeight: 700,
                    background: plan.highlighted ? plan.color : 'transparent',
                    color: plan.highlighted ? '#fff' : plan.color,
                    border: `1px solid ${plan.highlighted ? plan.color : `${plan.color}50`}`,
                    boxShadow: plan.highlighted ? `0 0 24px ${plan.color}55` : 'none',
                    transition: 'all 0.22s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background  = plan.color;
                    e.currentTarget.style.color       = '#fff';
                    e.currentTarget.style.boxShadow   = `0 0 32px ${plan.color}80`;
                    e.currentTarget.style.borderColor = plan.color;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background  = plan.highlighted ? plan.color : 'transparent';
                    e.currentTarget.style.color       = plan.highlighted ? '#fff' : plan.color;
                    e.currentTarget.style.boxShadow   = plan.highlighted ? `0 0 24px ${plan.color}55` : 'none';
                    e.currentTarget.style.borderColor = plan.highlighted ? plan.color : `${plan.color}50`;
                  }}
                >
                  {isAr ? plan.ctaAr : plan.ctaEn}
                </a>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <p data-reveal style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.65rem', color: 'rgba(255,255,255,0.18)',
          textAlign: 'center', marginTop: '2.5rem', letterSpacing: '0.05em',
        }}>
          {isAr
            ? 'جميع الخطط تشمل SSL مجاني · بيانات محمية · بدون عقد'
            : 'All plans include free SSL · protected data · no contract'}
        </p>
      </div>
    </section>
  );
}
