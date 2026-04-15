/**
 * useTenantConfig.js
 *
 * Provides tenant branding and feature flags to any component in the tree.
 *
 * ─── PHASE STATUS ────────────────────────────────────────────────────────────
 * Phase 32 (current): Returns a static mock per slug.
 *   No network call — instant, zero loading state.
 * Phase 35 (planned): Replace the mock lookup with:
 *   GET /api/v1/public/{slug}/config
 *   The in-memory cache and the returned shape stay identical — only the
 *   data source changes. No consumer code needs to be updated.
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *   const { config, isLoading } = useTenantConfig();          // auto-slug
 *   const { config }           = useTenantConfig('smar');     // explicit slug
 *
 * ─── RETURNED SHAPE ──────────────────────────────────────────────────────────
 *   config = {
 *     slug, name_ar, name_en,
 *     primaryColor, logo_url,
 *     hero_video_url, hero_image_url,
 *     whatsapp_number,
 *     currency,
 *     features:        { spatial, listings, booking, payment },
 *     unit_types:      string[],
 *     payment_methods: string[],
 *   }
 */

import { useState, useEffect, useRef } from 'react';
import useTenantSlug                   from '../utils/useTenantSlug';

// ─── Mock data registry ───────────────────────────────────────────────────────
// One entry per tenant. Phase 35 replaces this with an API call.
const MOCK_CONFIGS = {
  smar: {
    slug:            'smar',
    name_ar:         'بيت سمار',
    name_en:         'Beit Smar',
    primaryColor:    '#d4a853',
    logo_url:        '/logo.png',
    hero_video_url:  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/Logo_Formation_Video_Ready.mp4',
    hero_image_url:  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/beitsmar7.jpg',
    whatsapp_number: '96178727986',
    currency:        'USD',
    features: {
      spatial:  true,
      listings: true,
      booking:  true,
      payment:  true,
    },
    unit_types:      ['villa', 'chalet'],
    payment_methods: ['cash', 'card', 'whatsapp', 'whish', 'omt'],
  },
};

// ─── Default fallback (prevents white screen if slug is unknown) ──────────────
const DEFAULT_CONFIG = {
  slug:            'unknown',
  name_ar:         'المنصة',
  name_en:         'Platform',
  primaryColor:    '#d4a853',
  logo_url:        '/logo.png',
  hero_video_url:  null,
  hero_image_url:  null,
  whatsapp_number: null,
  currency:        'USD',
  features: {
    spatial:  false,
    listings: true,
    booking:  true,
    payment:  false,
  },
  unit_types:      [],
  payment_methods: ['cash'],
};

// ─── In-memory cache (persists for session — avoids repeated API calls) ───────
// Key: slug string → Value: resolved config object
const _cache = {};

// ─── Hook ────────────────────────────────────────────────────────────────────
export default function useTenantConfig(slugOverride) {
  // Resolve slug: explicit override → useTenantSlug (subdomain/path aware)
  // useTenantSlug is a hook so it must always be called, then conditionally used.
  const autoSlug = useTenantSlug();
  const slug     = slugOverride ?? autoSlug ?? 'smar';

  const [config,    setConfig]    = useState(() => _cache[slug] ?? null);
  const [isLoading, setIsLoading] = useState(!_cache[slug]);
  const [error,     setError]     = useState(null);

  // Stable ref so the effect doesn't re-run on every render
  const slugRef = useRef(slug);
  slugRef.current = slug;

  useEffect(() => {
    const s = slugRef.current;

    // Cache hit — instant return
    if (_cache[s]) {
      setConfig(_cache[s]);
      setIsLoading(false);
      return;
    }

    // ── Phase 35: swap this block for the real API call ──────────────────────
    // const controller = new AbortController();
    // publicApi.get(`/${s}/config`, { signal: controller.signal })
    //   .then(res  => { _cache[s] = res.data; setConfig(res.data); })
    //   .catch(err => { if (!controller.signal.aborted) setError(err); })
    //   .finally(() => setIsLoading(false));
    // return () => controller.abort();
    // ─────────────────────────────────────────────────────────────────────────

    // Phase 32: synchronous mock lookup
    const resolved = MOCK_CONFIGS[s] ?? { ...DEFAULT_CONFIG, slug: s };
    _cache[s] = resolved;
    setConfig(resolved);
    setIsLoading(false);
  }, [slug]);

  return {
    config:    config ?? DEFAULT_CONFIG,
    isLoading,
    error,
  };
}
