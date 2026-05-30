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

import { useQuery }   from '@tanstack/react-query';
import publicApi      from '../utils/publicApi';
import useTenantSlug  from '../utils/useTenantSlug';
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

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey:  [slug, 'config'],
    queryFn:   () => publicApi.get(`/${slug}/config`).then(r => r.data),
    staleTime: 10 * 60 * 1000,   // 10 min — tenant config rarely changes
    gcTime:    30 * 60 * 1000,   // 30 min — keep in memory across navigation
    retry:     1,
    enabled:   !!slug,
  });

  // On error: fall back to DEFAULT_CONFIG so the page never hard-crashes
  const config = isError ? { ...DEFAULT_CONFIG, slug } : (data ?? null);
  const resolved = config ?? DEFAULT_CONFIG;

  return {
    config:    resolved,
    navItems:  getNavItems(resolved.active_services ?? [], resolved.slug ?? slug),
    isLoading,
    error:     isError ? (queryError?.response?.data?.detail ?? queryError?.message ?? 'Config unavailable') : null,
  };
}
