/**
 * useTenantConfig.js
 *
 * Provides tenant branding and feature flags to any component in the tree.
 * Backed by TanStack Query — automatic caching, deduplication, background refresh.
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
 *
 * ─── CACHE BEHAVIOR ──────────────────────────────────────────────────────────
 *   staleTime 10 min  → no re-fetch on navigation between pages
 *   queryKey  [slug, 'config']  → each tenant cached independently
 *   On error  → DEFAULT_CONFIG fallback so UI never hard-crashes
 */

import { useMemo }    from 'react';
import { useQuery }   from '@tanstack/react-query';
import publicApi      from '../utils/publicApi';
import useTenantSlug  from '../hooks/useTenantSlug';
import { getNavItems } from '../config/service-catalog';

// ─── Default fallback (prevents white screen if API is unreachable) ──────────
const DEFAULT_CONFIG = {
  slug:            'unknown',
  name_ar:         'المنصة',
  name_en:         'Platform',
  primary_color:   '#d4a853',
  hero_video_url:  null,
  hero_image_url:  null,
  whatsapp_number: '',
  instagram_url:   null,
  maps_url:        null,
  currency:        'USD',
  features: {
    spatial:  false,
    listings: true,
    booking:  true,
    payment:  false,
  },
  config:          {},
  unit_types:      [],
  payment_methods: ['cash'],
  service_type:    null,
  active_services: [],
};

// ─── Hook ────────────────────────────────────────────────────────────────────
export default function useTenantConfig(slugOverride) {
  // useTenantSlug is a hook — must always be called unconditionally
  const autoSlug = useTenantSlug();
  const slug     = slugOverride ?? autoSlug ?? 'smar';

  // TEMP RUNTIME TRACE — 2026-07-21, remove once beit-al-fakhar /store investigation closes
  console.log('[RUNTIME-TRACE] useTenantConfig render', { slug })

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey:  [slug, 'config'],
    queryFn:   () => publicApi.get(`/${slug}/config`).then(r => r.data),
    staleTime: 10 * 60 * 1000,   // 10 min — tenant config rarely changes
    gcTime:    30 * 60 * 1000,   // 30 min — keep in memory across navigation
    // 2, not 1 — the dev backend has repeatedly shown transient cold-start
    // failures this session (Prisma engine spawn), and a failed config fetch
    // here cascades into moduleKey staying null, which blanks category/item
    // fetching downstream (useCatalog.js). One extra retry absorbs that
    // known transient case cheaply; it does not fix the backend's own
    // cold-start flakiness, which is a separate, bigger topic.
    retry:     2,
    enabled:   !!slug,
  });

  // On error: fall back to DEFAULT_CONFIG so the page never hard-crashes.
  // Memoized — an inline `{ ...DEFAULT_CONFIG, slug }` object literal here gets
  // a new reference every render, which loops forever in any effect that
  // depends on `config` (e.g. useCatalog.js pushing config into the Zustand
  // store) — real bug hit on beit-al-fakhar's /home page, 2026-07-20.
  const config = useMemo(
    () => (isError ? { ...DEFAULT_CONFIG, slug } : (data ?? null)),
    [isError, data, slug]
  );
  const resolved = config ?? DEFAULT_CONFIG;

  // TEMP RUNTIME TRACE — 2026-07-21, remove once beit-al-fakhar /store investigation closes
  console.log('[RUNTIME-TRACE] useTenantConfig result', {
    slug, isLoading, isError, hasData: !!data, active_services: resolved.active_services,
  })

  return {
    config:    resolved,
    navItems:  getNavItems(resolved.active_services ?? [], resolved.slug ?? slug),
    isLoading,
    error:     isError ? (queryError?.response?.data?.detail ?? queryError?.message ?? 'Config unavailable') : null,
  };
}
