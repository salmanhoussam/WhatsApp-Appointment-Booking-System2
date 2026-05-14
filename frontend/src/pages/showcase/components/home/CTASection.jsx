import { useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const REGISTER_URL = window.location.hostname.includes('salmansaas.com')
  ? 'https://auth.salmansaas.com/register'
  : '/register';

export default function CTASection() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const sectionRef = useRef();

  const whatsappNumber  = '96178727986';
  const supportEmail    = 'support@salmansaas.com';

  const templates = {
    whatsapp:     isAr ? 'أريد معرفة المزيد عن خدمات SalmanSaaS' : 'I want to learn more about SalmanSaaS services',
    emailSubject: isAr ? 'طلب استشارة - SalmanSaaS'               : 'Consultation Inquiry - SalmanSaaS',
    emailBody:    isAr
      ? 'مرحباً سلمان، أريد الحصول على استشارة حول رقمنة عملي.'
      : 'Hello, I would like a consultation about digitizing my business.',
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(sectionRef.current.querySelectorAll('[data-reveal]'), {
        opacity: 0, y: 40,
        duration: 0.9, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Horizontal line */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,26,85,0.4), transparent)',
        marginBottom: '4rem',
      }} />

      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(255,26,85,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative' }}>

        <p
          data-reveal
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.72rem', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: '#ff1a55',
            marginBottom: '1rem',
          }}
        >
          {isAr ? '// ابدأ رحلتك الرقمية' : '// Begin Your Digital Journey'}
        </p>

        <h2
          data-reveal
          style={{
            fontFamily: "'Cairo', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(2.2rem, 5.5vw, 4rem)',
            lineHeight: 1.1, color: '#ffffff',
            marginBottom: '1.2rem',
          }}
        >
          {isAr ? 'ابدأ رقمنة عملك اليوم' : 'Digitize Your Business Today'}
        </h2>

        <p
          data-reveal
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.82rem', lineHeight: 1.85,
            color: 'rgba(255,255,255,0.42)',
            marginBottom: '2.5rem',
          }}
        >
          {isAr
            ? '// فريقنا جاهز لمساعدتك في اختيار النظام الأنسب لنمو مشروعك.'
            : '// Our team is ready to help you choose the right system for your growth.'}
        </p>

        {/* Primary CTA */}
        <a
          data-reveal
          href={REGISTER_URL}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            gap: 8,
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            background: '#ff1a55', color: '#fff',
            padding: '1rem 2.8rem',
            textDecoration: 'none',
            boxShadow: '0 0 32px rgba(255,26,85,0.5)',
            transition: 'all 0.25s',
            marginBottom: '0.6rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ff3366';
            e.currentTarget.style.boxShadow  = '0 0 50px rgba(255,26,85,0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ff1a55';
            e.currentTarget.style.boxShadow  = '0 0 32px rgba(255,26,85,0.5)';
          }}
        >
          {isAr ? '← ابدأ مجاناً — أنشئ حسابك الآن' : 'Start for Free — Create Account →'}
        </a>

        <p data-reveal style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.62rem', color: 'rgba(255,255,255,0.22)',
          marginBottom: '2.5rem', letterSpacing: '0.05em',
        }}>
          {isAr ? 'بدون بطاقة بنكية · إعداد فوري · دعم فوري' : 'No credit card · Instant setup · Live support'}
        </p>

        {/* Secondary CTAs */}
        <div data-reveal style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(templates.whatsapp)}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: "'Space Mono', monospace",
              fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase',
              border: '1px solid rgba(34,197,94,0.35)',
              color: '#22c55e',
              padding: '0.8rem 1.6rem',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(34,197,94,0.1)';
              e.currentTarget.style.boxShadow  = '0 0 20px rgba(34,197,94,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow  = 'none';
            }}
          >
            💬 {isAr ? 'واتساب' : 'WhatsApp'}
          </a>

          <a
            href={`mailto:${supportEmail}?subject=${encodeURIComponent(templates.emailSubject)}&body=${encodeURIComponent(templates.emailBody)}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: "'Space Mono', monospace",
              fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.55)',
              padding: '0.8rem 1.6rem',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,26,85,0.35)';
              e.currentTarget.style.color       = '#ff1a55';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color       = 'rgba(255,255,255,0.55)';
            }}
          >
            📧 {isAr ? 'إيميل' : 'Email'}
          </a>
        </div>

        {/* Support badge */}
        <div data-reveal style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          marginTop: '2rem',
          padding: '0.6rem 1.2rem',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#8b5cf6',
            boxShadow: '0 0 8px #8b5cf6',
          }} />
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            {isAr ? 'الدعم الرسمي:' : 'Official Support:'}
            {' '}
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{supportEmail}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
