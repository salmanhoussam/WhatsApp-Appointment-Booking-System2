import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

const WA = 'https://wa.me/96178727986';

const LINKS = [
  { href: '#workflow-demo', ar: 'كيف يعمل', en: 'How It Works' },
  { href: '#use-cases',    ar: 'لمن نحن',   en: 'Use Cases'    },
  { href: '#trust',        ar: 'التقييمات', en: 'Reviews'      },
];

export default function Navbar() {
  const { lang, toggleLang } = useTranslation();
  const isAr = lang === 'ar';
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* close mobile menu on link click */
  const handleLink = () => setOpen(false);

  return (
    <nav
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(6,11,24,0.95)' : 'rgba(6,11,24,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.3s',
      }}
    >
      {/* ── Main bar ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem', height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>

        {/* Logo */}
        <a href="/marketing" style={{ display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#ff1a55', lineHeight: 1 }}>◆</span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.85rem', fontWeight: 700, color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Salman<span style={{ color: '#ff1a55' }}>SaaS</span>
          </span>
        </a>

        {/* ── Desktop links (hidden on mobile via Tailwind) ── */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '28px' }}>
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.2s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >
              {isAr ? l.ar : l.en}
            </a>
          ))}
        </div>

        {/* ── Right group ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.45)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              padding: '5px 11px',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            {isAr ? 'EN' : 'ع'}
          </button>

          {/* CTA — desktop */}
          <a
            href={WA}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex"
            style={{ alignItems: 'center', gap: '6px', padding: '7px 18px', background: '#ff1a55', borderRadius: '8px', fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem', fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 0 18px rgba(255,26,85,0.25)', whiteSpace: 'nowrap', transition: 'box-shadow 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(255,26,85,0.5)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 18px rgba(255,26,85,0.25)'}
          >
            {isAr ? 'ابدأ الآن' : 'Get Started'}
          </a>

          {/* Hamburger — mobile only */}
          <button
            className="flex md:hidden"
            onClick={() => setOpen(v => !v)}
            aria-label="Toggle menu"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 9px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                animate={open
                  ? i === 0 ? { rotate: 45, y: 8 }
                  : i === 1 ? { opacity: 0 }
                  : { rotate: -45, y: -8 }
                  : { rotate: 0, y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{ display: 'block', width: '18px', height: '1.5px', background: 'rgba(255,255,255,0.6)', borderRadius: '2px', transformOrigin: 'center' }}
              />
            ))}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,11,24,0.98)' }}
          >
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {LINKS.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={handleLink}
                  style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {isAr ? l.ar : l.en}
                </a>
              ))}
              <a
                href={WA}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLink}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#ff1a55', borderRadius: '10px', fontFamily: 'Cairo, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: '#fff', textDecoration: 'none', marginTop: '4px', boxShadow: '0 0 20px rgba(255,26,85,0.3)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.533 5.853L0 24l6.347-1.503A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.894 0-3.672-.512-5.194-1.403l-.374-.222-3.769.892.906-3.677-.244-.387A10 10 0 0112 2c5.514 0 10 4.486 10 10s-4.486 10-10 10z"/>
                </svg>
                {isAr ? 'ابدأ عبر واتساب' : 'Start on WhatsApp'}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
