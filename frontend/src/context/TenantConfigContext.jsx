/**
 * TenantConfigContext.jsx
 *
 * Provides the fetched tenant config to the entire component tree so
 * leaf components (Navbar, Footer, WhatsApp button, Unit Modal) can read
 * dynamic values without prop-drilling or redundant API calls.
 *
 * Usage:
 *   // In the route root:
 *   <TenantConfigProvider slug="smar">…</TenantConfigProvider>
 *
 *   // In any descendant:
 *   const { config } = useTenantConfigContext();
 *   config.whatsapp_number, config.primary_color, config.instagram_url, …
 */

import { createContext, useContext, useEffect } from 'react';
import useTenantConfig from '../hooks/useTenantConfig';

const TenantConfigContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function TenantConfigProvider({ slug, children }) {
  const { config, isLoading, error } = useTenantConfig(slug);

  // Inject CSS custom property so any component can use var(--tenant-primary)
  // without importing the context — useful for CSS modules and styled divs.
  useEffect(() => {
    const color = config?.primary_color;
    if (color) {
      document.documentElement.style.setProperty('--tenant-primary', color);
    }
  }, [config?.primary_color]);

  return (
    <TenantConfigContext.Provider value={{ config, isLoading, error }}>
      {children}
    </TenantConfigContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useTenantConfigContext() {
  const ctx = useContext(TenantConfigContext);
  if (ctx) return ctx;

  // Called outside a Provider — return a safe shell so components don't crash.
  // whatsapp_number intentionally empty so no stale phone number is shown.
  return {
    config: {
      slug:            'unknown',
      name_ar:         '',
      name_en:         '',
      primary_color:   '#d4a853',
      hero_video_url:  null,
      whatsapp_number: '',
      instagram_url:   null,
      maps_url:        null,
      currency:        'USD',
      features:        {},
      config:          {},
      unit_types:      [],
      payment_methods: ['cash'],
    },
    isLoading: false,
    error:     null,
  };
}
