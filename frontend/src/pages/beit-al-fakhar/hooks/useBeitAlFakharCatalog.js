import { useQuery } from '@tanstack/react-query';
import publicApi from '../../../utils/publicApi';

// ── Real categories seeded from the shop video (Plates, Bowls & Vases, Mugs,
// Decorative Figurines) — never hardcode names/images here, always fetch live
// so the admin dashboard can edit them without a frontend redeploy. ──
export function useBeitAlFakharCategories() {
  return useQuery({
    queryKey: ['beit-al-fakhar', 'categories'],
    queryFn: () => publicApi.get('/store/categories', { params: { client_slug: 'beit-al-fakhar' } }).then((r) => r.data?.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBeitAlFakharFeatured() {
  return useQuery({
    queryKey: ['beit-al-fakhar', 'featured'],
    queryFn: () => publicApi.get('/store/products', { params: { client_slug: 'beit-al-fakhar', featured: true } }).then((r) => r.data?.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}
