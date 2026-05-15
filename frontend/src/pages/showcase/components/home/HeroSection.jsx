import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REGISTER_URL, WHATSAPP_NUMBER } from '../../config';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';
  const [emailInput, setEmailInput] = useState('');
  const heroRef = useRef();
  const h1Ref   = useRef();
  const subRef  = useRef();
  const ctaRef  = useRef();

  const whatsappNumber = WHATSAPP_NUMBER;

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from(h1Ref.current,  { opacity: 0, y: 60, duration: 1,    delay: 0.3  })
        .from(subRef.current,  { opacity: 0, y: 30, duration: 0.8              }, '-=0.5')
        .from(ctaRef.current,  { opacity: 0, y: 20, duration: 0.7              }, '-=0.4');
    }, heroRef);
    return () => ctx.revert();
  }, []);

  const handleEmailSend = () => {
    if (!emailInput) return;
    window.location.href = `mailto:salman.houssam@gmail.com?subject=Inquiry&body=Email: ${emailInput}`;
  };

  return (
    <section
      ref={heroRef}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8rem 2rem 4rem',
        position: 'relative',
        textAlign: 'center',
      }}
    >
      {/* Faint radial glow behind text */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 55%, rgba(255,26,85,0.09) 0%, transparent 70%)',
      }} />

      <div style={{ maxWidth: 860, position: 'relative' }}>

        {/* Mono tag */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.72rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#ff1a55',
          marginBottom: '1.6rem',
        }}>
          <span style={{ width: 28, height: 2, background: '#ff1a55', display: 'inline-block' }} />
          {isAr ? 'حلول برمجية مبتكرة' : 'Innovative SaaS Solutions'}
          <span style={{ width: 28, height: 2, background: '#ff1a55', display: 'inline-block' }} />
        </div>

        {/* Main heading */}
        <h1
          ref={h1Ref}
          style={{
            fontFamily: "'Cairo', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            marginBottom: '1.6rem',
          }}
        >
          {t.heroTitle1}
          <br />
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>
            {t.heroTitle2}
          </span>
        </h1>

        {/* Sub-description */}
        <p
          ref={subRef}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 'clamp(0.78rem, 1.8vw, 0.92rem)',
            lineHeight: 1.85,
            color: 'rgba(255,255,255,0.45)',
            maxWidth: 640,
            margin: '0 auto 2.8rem',
          }}
        >
          {t.heroSubDesc || t.heroDesc}
        </p>

        {/* CTAs */}
        <div
          ref={ctaRef}
          style={{
            display: 'flex', flexDirection: 'column', gap: '0.9rem',
            alignItems: 'center',
          }}
        >
          {/* Primary: Register */}
          <a
            href={REGISTER_URL}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 10,
              fontFamily: "'Space Mono', monospace",
              fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              background: '#ff1a55',
              color: '#fff',
              padding: '0.9rem 2.6rem',
              textDecoration: 'none',
              transition: 'all 0.25s',
              boxShadow: '0 0 28px rgba(255,26,85,0.45)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ff3366';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(255,26,85,0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ff1a55';
              e.currentTarget.style.boxShadow = '0 0 28px rgba(255,26,85,0.45)';
            }}
          >
            {isAr ? '← ابدأ مجاناً الآن' : 'Start for Free →'}
          </a>

          {/* Email input */}
          <div style={{
            display: 'flex', alignItems: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(8px)',
            width: '100%', maxWidth: 420,
          }}>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={t.emailPlaceholder}
              style={{
                flex: 1, padding: '0.75rem 1rem',
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.72rem', color: '#fff',
              }}
            />
            <button
              onClick={handleEmailSend}
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(255,26,85,0.15)',
                border: 'none',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.65rem', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#ff1a55',
                cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,26,85,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,26,85,0.15)'; }}
            >
              {isAr ? 'إرسال' : 'Send'}
            </button>
          </div>

          {/* WhatsApp link */}
          <p style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.05em',
          }}>
            {isAr ? 'أو تواصل عبر ' : 'Or reach us on '}
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t.whatsappText)}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 700 }}
            >
              WhatsApp
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
