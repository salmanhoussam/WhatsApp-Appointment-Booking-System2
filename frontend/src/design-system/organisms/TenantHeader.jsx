/**
 * TenantHeader.jsx — Organism
 *
 * Sticky glassmorphism navigation bar. Fully self-contained:
 * reads tenant name, logo, whatsapp_number, and nav links from useTenantConfig().
 *
 * Features:
 *   - Elevated shadow + stronger backdrop when scrollY > 50
 *   - Language toggle (ar ↔ en) with RTL-aware layout flip
 *   - Gold "Book Now" CTA that opens WhatsApp
 *   - Zero prop drilling — works for any slug on any route
 *
 * Nav links — capability-aware (Unified Tenant Header, 2026-08-31):
 *   Sourced from `navItems` (useTenantConfig() → getNavItems(), the same
 *   data TenantModuleNav.jsx already uses for RK/Mr H/Footlab). Do NOT
 *   hardcode a parallel link list here and do NOT call getNavItems()
 *   directly — useTenantConfig() is the one canonical entry point.
 *   The old hardcoded "Home"/"Contact" links are intentionally not part of
 *   navItems (they aren't client_services-gated features): "Home" is now
 *   the brand/logo click; "Contact" is superseded by the Book Now CTA,
 *   which already opens WhatsApp.
 *
 * FM12 / React 19 safety:
 *   Native window scroll listener only — NO useScroll from Framer Motion.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '../atoms';
import GlobalAuthModal from './GlobalAuthModal';
import useTenantConfig from '../../hooks/useTenantConfig';
import useTenantSlug from '../../hooks/useTenantSlug';

export default function TenantHeader() {
  const { config, navItems } = useTenantConfig();
  const navigate   = useNavigate();
  const slug       = useTenantSlug();

  const [scrolled,        setScrolled]        = useState(false);
  const [lang,            setLang]            = useState('ar');
  const [menuOpen,        setMenuOpen]        = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const goHome = useCallback(() => navigate(`/${slug}`), [navigate, slug]);

  // ── Scroll elevation listener ─────────────────────────────────────────────
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── WhatsApp CTA ──────────────────────────────────────────────────────────
  const handleBookNow = useCallback(() => {
    const number  = config?.whatsapp_number;
    const message = lang === 'ar'
      ? 'مرحباً، أودّ حجز موعد لمعاينة الوحدات.'
      : 'Hello, I would like to book a viewing appointment.';
    if (number) {
      window.open(
        `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  }, [config?.whatsapp_number, lang]);

  const isRtl = lang === 'ar';

  return (
    <>
    <header
      dir={isRtl ? 'rtl' : 'ltr'}
      className={[
        'fixed top-0 w-full z-50 transition-all duration-500',
        scrolled
          ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/[0.10] shadow-[0_4px_32px_rgba(0,0,0,0.55)]'
          : 'bg-[#0a0a0f]/60 backdrop-blur-md border-b border-white/[0.04]',
      ].join(' ')}
      style={{ background: scrolled ? 'rgba(10,10,15,0.90)' : 'rgba(10,10,15,0.60)', color: '#f0f0f5' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* ── Logo / Brand — clickable, navigates home ───────────────────────── */}
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-3 flex-shrink-0 bg-transparent border-0 cursor-pointer p-0 focus-visible:outline-none"
        >
          {config?.logo_url && (
            <img
              src={config.logo_url}
              alt={config.name_ar}
              className="h-8 w-auto object-contain"
            />
          )}
          <span
            className="
              text-[#f0ebe3] font-semibold text-base tracking-wide
              hidden sm:inline-block
            "
          >
            {isRtl ? config?.name_ar : config?.name_en}
          </span>
        </button>

        {/* ── Desktop Nav ──────────────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.route)}
              className="
                text-white/60 hover:text-[#d4a853]
                text-sm tracking-wide
                transition-colors duration-200
                bg-transparent border-0 cursor-pointer
                focus-visible:outline-none focus-visible:text-[#d4a853]
              "
            >
              {isRtl ? item.labelAr : item.labelEn}
            </button>
          ))}
        </nav>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-shrink-0">

          {/* Language toggle */}
          <button
            type="button"
            onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
            aria-label="Toggle language"
            className="
              h-8 px-3 rounded-full
              text-[11px] font-semibold tracking-widest uppercase
              text-white/50 hover:text-[#d4a853]
              border border-white/[0.08] hover:border-[#d4a853]/40
              bg-white/[0.02] hover:bg-[#d4a853]/[0.06]
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4a853]/50
            "
          >
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>

          {/* User / Login button */}
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            aria-label={isRtl ? 'تسجيل الدخول' : 'Sign in'}
            className="
              flex items-center justify-center
              h-8 w-8 rounded-full
              text-white/50 hover:text-[#d4a853]
              border border-white/[0.08] hover:border-[#d4a853]/40
              bg-white/[0.02] hover:bg-[#d4a853]/[0.06]
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4a853]/50
            "
          >
            <User size={15} strokeWidth={1.7} />
          </button>

          {/* Book Now — desktop */}
          <div className="hidden sm:block">
            <Button
              variant="gold"
              onClick={handleBookNow}
              className="h-9 px-5 text-xs"
            >
              {isRtl ? 'احجز الآن' : 'Book Now'}
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="
              md:hidden flex flex-col items-center justify-center
              h-9 w-9 gap-1.5 rounded-md
              text-white/60 hover:text-white
              bg-white/[0.04] hover:bg-white/[0.08]
              border border-white/[0.06]
              transition-all duration-200
              focus-visible:outline-none
            "
          >
            <span
              className={`block h-px w-5 bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}
            />
            <span
              className={`block h-px w-5 bg-current transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`}
            />
            <span
              className={`block h-px w-5 bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown ───────────────────────────────────────────────────── */}
      <div
        className={[
          'md:hidden overflow-hidden transition-all duration-300',
          menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
        aria-hidden={!menuOpen}
      >
        <nav
          className="
            flex flex-col gap-1 px-4 pb-4 pt-2
            border-t border-white/[0.06]
            bg-[#0a0a0f]/95
          "
        >
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => { navigate(item.route); setMenuOpen(false); }}
              className="
                text-start py-2.5 px-3 rounded-lg
                text-sm text-white/70 hover:text-[#d4a853]
                hover:bg-white/[0.04]
                transition-colors duration-200
                bg-transparent border-0 cursor-pointer w-full
                focus-visible:outline-none
              "
            >
              {isRtl ? item.labelAr : item.labelEn}
            </button>
          ))}

          <div className="mt-2">
            <Button
              variant="gold"
              onClick={handleBookNow}
              className="w-full text-sm"
            >
              {isRtl ? 'احجز الآن' : 'Book Now'}
            </Button>
          </div>
        </nav>
      </div>
    </header>

    <GlobalAuthModal
      isOpen={isLoginModalOpen}
      onClose={() => setIsLoginModalOpen(false)}
    />
    </>
  );
}
