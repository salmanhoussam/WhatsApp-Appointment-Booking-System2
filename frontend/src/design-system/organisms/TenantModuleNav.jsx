/**
 * TenantModuleNav — Organism
 *
 * Sticky top nav for restaurant/store module tenants.
 * Reads active services from useTenantConfig() and renders nav links
 * dynamically from the service-catalog, using the tenant's primary_color.
 *
 * Used by: MenuPage (caracas), StorePage (footlab), and any future module tenants.
 * NOT used by smar — smar has its own spatial TenantHeader.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useTenantConfig from '../../hooks/useTenantConfig';
import useTenantSlug   from '../../utils/useTenantSlug';

export default function TenantModuleNav() {
  const { config, navItems } = useTenantConfig();
  const navigate  = useNavigate();
  const location  = useLocation();
  const slug      = useTenantSlug();

  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  const accent      = config?.primary_color ?? '#d4a853';
  const accentDim   = `${accent}22`;
  const tenantLabel = config?.name_ar ?? config?.name_en ?? '';

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 40); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function isActive(route) {
    return location.pathname === route || location.pathname.startsWith(route + '/');
  }

  if (!navItems?.length) return null;

  return (
    <header
      className={[
        'fixed top-0 w-full z-50 transition-all duration-400',
        scrolled
          ? 'bg-[#0a0a0f]/92 backdrop-blur-xl border-b border-white/[0.10] shadow-[0_4px_24px_rgba(0,0,0,0.50)]'
          : 'bg-[#0a0a0f]/70 backdrop-blur-md border-b border-white/[0.04]',
      ].join(' ')}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* ── Brand ─────────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => navigate(`/${slug}`)}
          className="text-sm font-semibold tracking-wide transition-colors duration-200 bg-transparent border-0 cursor-pointer focus-visible:outline-none"
          style={{ color: accent }}
        >
          {tenantLabel}
        </button>

        {/* ── Desktop nav links ──────────────────────────────────────────────── */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.route);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.route)}
                className="h-8 px-4 rounded-full text-xs font-medium tracking-wide transition-all duration-200 bg-transparent border-0 cursor-pointer focus-visible:outline-none"
                style={{
                  color:      active ? accent : 'rgba(255,255,255,0.55)',
                  background: active ? accentDim : 'transparent',
                  border:     active ? `1px solid ${accent}40` : '1px solid transparent',
                }}
              >
                {item.labelAr}
              </button>
            );
          })}
        </nav>

        {/* ── Mobile hamburger ──────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="sm:hidden flex flex-col items-center justify-center h-8 w-8 gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] focus-visible:outline-none"
        >
          <span className={`block h-px w-4 bg-white/60 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <span className={`block h-px w-4 bg-white/60 transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-px w-4 bg-white/60 transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </button>
      </div>

      {/* ── Mobile dropdown ───────────────────────────────────────────────────── */}
      <div
        className={[
          'sm:hidden overflow-hidden transition-all duration-300',
          menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
        aria-hidden={!menuOpen}
      >
        <nav className="flex flex-col gap-1 px-4 pb-4 pt-2 border-t border-white/[0.06]">
          {navItems.map((item) => {
            const active = isActive(item.route);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => { navigate(item.route); setMenuOpen(false); }}
                className="text-start py-2.5 px-3 rounded-lg text-sm transition-colors duration-200 bg-transparent border-0 cursor-pointer w-full focus-visible:outline-none"
                style={{
                  color:      active ? accent : 'rgba(255,255,255,0.65)',
                  background: active ? accentDim : 'transparent',
                }}
              >
                {item.labelAr}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
