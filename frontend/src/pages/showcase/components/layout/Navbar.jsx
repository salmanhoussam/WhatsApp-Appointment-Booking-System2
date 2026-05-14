import { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '../../hooks/useTranslation';

const REGISTER_URL = window.location.hostname.includes('salmansaas.com')
  ? 'https://auth.salmansaas.com/register'
  : '/register';

export default function Navbar() {
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    padding: '1.2rem 2rem',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    transition: 'background 0.4s',
    background: scrolled
      ? 'rgba(5,5,5,0.92)'
      : 'transparent',
    borderBottom: scrolled ? '1px solid rgba(255,26,85,0.15)' : 'none',
    backdropFilter: scrolled ? 'blur(16px)' : 'none',
  };

  return (
    <nav style={navStyle} dir={isAr ? 'rtl' : 'ltr'}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 28,
          background: '#ff1a55',
          transform: 'skewX(-16deg)',
          boxShadow: '0 0 12px rgba(255,26,85,0.7)',
        }} />
        <span style={{
          fontFamily: "'Cairo', sans-serif",
          fontWeight: 900, fontSize: '1.4rem',
          letterSpacing: '-0.02em', color: '#fff',
        }}>
          Salman<span style={{ color: '#ff1a55' }}>SaaS</span>
        </span>
      </div>

      {/* Desktop links */}
      <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
        <a
          href="#services-section"
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.72rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
            textDecoration: 'none', transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ff1a55'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
        >
          {t.navServices}
        </a>

        <LanguageSwitcher />

        <a
          href={REGISTER_URL}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.72rem', letterSpacing: '0.1em',
            textTransform: 'uppercase',
            border: '1px solid rgba(255,26,85,0.5)',
            color: '#ff1a55',
            padding: '0.55rem 1.4rem',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ff1a55';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#ff1a55';
          }}
        >
          {isAr ? 'ابدأ مجاناً' : 'Start Free'}
        </a>
      </div>
    </nav>
  );
}
