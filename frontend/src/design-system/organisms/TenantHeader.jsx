/**
 * TenantHeader.jsx — Organism
 *
 * Sticky glassmorphism navigation bar. Fully self-contained:
 * reads tenant name, logo, whatsapp_number, and nav links from useTenantConfig().
 *
 * Features:
 *   - Elevated shadow + stronger backdrop when scrollY > 50
 *   - Language toggle (ar ↔ en) with RTL-aware layout flip
 *   - "Book Now" CTA, tenant-branded (see below)
 *   - Zero prop drilling — works for any slug on any route
 *
 * Nav links — capability-aware (Unified Tenant Header, 2026-08-31):
 *   Sourced from `navItems` (useTenantConfig() → getNavItems(), the same
 *   data TenantModuleNav.jsx already uses for RK/Mr H/Footlab). Do NOT
 *   hardcode a parallel link list here and do NOT call getNavItems()
 *   directly — useTenantConfig() is the one canonical entry point.
 *   The old hardcoded "Home"/"Contact" links are intentionally not part of
 *   navItems (they aren't client_services-gated features): "Home" is now
 *   the brand/logo click; "Contact" is superseded by the Book Now CTA.
 *
 * Book Now routing (fixed 2026-09-01 — real bug found testing RK on
 * localhost: clicking "احجز الآن" fired a generic no-date WhatsApp message,
 * completely bypassing RK's real staff-reservation flow):
 *   - Tenant has `reservations` (staff/slot-based booking, e.g. RK) active
 *     → navigate to its real booking page (`/${slug}/reserve`, same route
 *       `getServiceRoute`/`navItems` already resolve). A WhatsApp message
 *       with no date/time/service is meaningless for a slot-based tenant.
 *   - Otherwise (e.g. smar — real-estate viewing requests, no online slot
 *     system) → unchanged: open WhatsApp directly. This was this
 *     component's original, documented, intentional behavior for smar and
 *     is left as-is; only the confirmed-broken `reservations` case is fixed.
 *
 * Brand color (fixed 2026-09-01 — was hardcoded to smar's own gold
 * `#d4a853` for every tenant sharing this header; RK etc. rendered gold
 * regardless of their real brand color):
 *   All accent usages below read `config.primary_color` via CSS custom
 *   properties set once on the header root (`--tenant-accent*`), falling
 *   back to `#d4a853` only when a tenant has no `primary_color` configured
 *   — smar's own look is unchanged since smar's real primary_color IS
 *   `#d4a853`. `Button.jsx`'s shared `gold` variant is intentionally left
 *   untouched (also used by BookingFlow.jsx/KineticSection.jsx) — the Book
 *   Now button overrides it locally via an inline `style`, which wins over
 *   the variant's Tailwind classes without changing the shared atom.
 *
 * FM12 / React 19 safety:
 *   Native window scroll listener only — NO useScroll from Framer Motion.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '../atoms';
import GlobalAuthModal from './GlobalAuthModal';
import useTenantConfig from '../../hooks/useTenantConfig';
import useTenantSlug from '../../hooks/useTenantSlug';
import { getServiceRoute } from '../../config/service-catalog';

const FALLBACK_ACCENT = '#d4a853'; // smar's own brand gold — used only when a tenant has no primary_color

function hexToRgba(hex, alpha) {
  const h = typeof hex === 'string' ? hex.replace('#', '') : '';
  if (h.length !== 6) return `rgba(212, 168, 83, ${alpha})`; // FALLBACK_ACCENT as rgba
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenHex(hex, amount) {
  const h = typeof hex === 'string' ? hex.replace('#', '') : '';
  if (h.length !== 6) return '#b8892e'; // darkened FALLBACK_ACCENT
  const chan = (i) => Math.max(0, Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - amount)));
  return `rgb(${chan(0)}, ${chan(2)}, ${chan(4)})`;
}

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

  // ── Tenant brand color — CSS vars, see docblock ────────────────────────────
  const accent = config?.primary_color || FALLBACK_ACCENT;
  const accentVars = useMemo(() => ({
    '--tenant-accent':    accent,
    '--tenant-accent-06': hexToRgba(accent, 0.06),
    '--tenant-accent-25': hexToRgba(accent, 0.25),
    '--tenant-accent-40': hexToRgba(accent, 0.40),
    '--tenant-accent-50': hexToRgba(accent, 0.50),
    '--tenant-accent-deep': darkenHex(accent, 0.15),
  }), [accent]);

  // ── Book Now CTA — real reservation page when one exists, else WhatsApp ───
  const hasStaffReservations = (config?.active_services ?? []).includes('reservations');
  const bookingRoute = hasStaffReservations ? getServiceRoute('reservations', slug) : null;

  const handleBookNow = useCallback(() => {
    if (bookingRoute) {
      navigate(bookingRoute);
      return;
    }
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
  }, [bookingRoute, navigate, config?.whatsapp_number, lang]);

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
      style={{
        ...accentVars,
        background: scrolled ? 'rgba(10,10,15,0.90)' : 'rgba(10,10,15,0.60)',
        color: '#f0f0f5',
      }}
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
                text-white/60 hover:text-[var(--tenant-accent)]
                text-sm tracking-wide
                transition-colors duration-200
                bg-transparent border-0 cursor-pointer
                focus-visible:outline-none focus-visible:text-[var(--tenant-accent)]
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
              text-white/50 hover:text-[var(--tenant-accent)]
              border border-white/[0.08] hover:border-[var(--tenant-accent-40)]
              bg-white/[0.02] hover:bg-[var(--tenant-accent-06)]
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--tenant-accent-50)]
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
              text-white/50 hover:text-[var(--tenant-accent)]
              border border-white/[0.08] hover:border-[var(--tenant-accent-40)]
              bg-white/[0.02] hover:bg-[var(--tenant-accent-06)]
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--tenant-accent-50)]
            "
          >
            <User size={15} strokeWidth={1.7} />
          </button>

          {/* Book Now — desktop */}
          <div className="hidden sm:block">
            <Button
              onClick={handleBookNow}
              className="h-9 px-5 text-xs"
              style={{
                background: `linear-gradient(135deg, ${accent}, var(--tenant-accent-deep))`,
                boxShadow: `0 4px 24px var(--tenant-accent-25)`,
              }}
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
                text-sm text-white/70 hover:text-[var(--tenant-accent)]
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
              onClick={handleBookNow}
              className="w-full text-sm"
              style={{
                background: `linear-gradient(135deg, ${accent}, var(--tenant-accent-deep))`,
                boxShadow: `0 4px 24px var(--tenant-accent-25)`,
              }}
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
