/**
 * useTenantConfig.js
 *
 * Provides tenant branding and feature flags to any component in the tree.
 *
 * ─── PHASE STATUS ────────────────────────────────────────────────────────────
 * Phase 35.1 (current): Live API call → GET /api/v1/public/{slug}/config
 *   In-memory session cache prevents redundant requests.
 *   Falls back to DEFAULT_CONFIG if the request fails.
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *   const { config, isLoading } = useTenantConfig();          // auto-slug
 *   const { config }           = useTenantConfig('smar');     // explicit slug
 *
 * ─── RETURNED SHAPE ──────────────────────────────────────────────────────────
 *   config = {
 *     slug, name_ar, name_en,
 *     primary_color, hero_video_url,
 *     whatsapp_number, currency,
 *     features:        { spatial, listings, booking, payment },
 *     unit_types:      string[],
 *     payment_methods: string[],
 *   }
 */

import { useState, useEffect, useRef } from 'react';
import publicApi     from '../utils/publicApi';
import useTenantSlug from '../utils/useTenantSlug';

// ─── Default fallback (prevents white screen if API is unreachable) ──────────
const DEFAULT_CONFIG = {
  slug:            'unknown',
  name_ar:         'المنصة',
  name_en:         'Platform',
  primary_color:   '#d4a853',
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

// ─── In-memory session cache — one fetch per slug per page load ───────────────
const _cache = {};

// ─── Hook ────────────────────────────────────────────────────────────────────
export default function useTenantConfig(slugOverride) {
  // useTenantSlug is a hook — must always be called unconditionally
  const autoSlug = useTenantSlug();
  const slug     = slugOverride ?? autoSlug ?? 'smar';

  const [config,    setConfig]    = useState(() => _cache[slug] ?? null);
  const [isLoading, setIsLoading] = useState(!_cache[slug]);
  const [error,     setError]     = useState(null);

  const slugRef = useRef(slug);
  slugRef.current = slug;

  useEffect(() => {
    const s = slugRef.current;

    // Cache hit — no network call
    if (_cache[s]) {
      setConfig(_cache[s]);
      setIsLoading(false);
      return;
    }

    // ── Phase 35.1: live API call ─────────────────────────────────────────────
    const controller = new AbortController();
    setIsLoading(true);

    publicApi
      .get(`/${s}/config`, { signal: controller.signal })
      .then(res => {
        _cache[s] = res.data;
        setConfig(res.data);
        setError(null);
      })
      .catch(err => {
        if (err.name === 'CanceledError' || controller.signal.aborted) return;
        // Fall back to default so UI never hard-crashes
        const fallback = { ...DEFAULT_CONFIG, slug: s };
        _cache[s] = fallback;
        setConfig(fallback);
        setError(err?.response?.data?.detail ?? err?.message ?? 'Config unavailable');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  return {
    config:    config ?? DEFAULT_CONFIG,
    isLoading,
    error,
  };
}
