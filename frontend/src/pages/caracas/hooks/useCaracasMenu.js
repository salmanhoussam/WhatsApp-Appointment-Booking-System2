import { useQuery } from '@tanstack/react-query';
import publicApi from '../../../utils/publicApi';

const SLUG = 'caracas';
const PARAMS = { client_slug: SLUG };

export function useCaracasCategories() {
  return useQuery({
    queryKey: [SLUG, 'categories'],
    queryFn: () =>
      publicApi
        .get('/restaurant/menu/categories', { params: PARAMS })
        .then((r) => r.data.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaracasItems(categoryId) {
  return useQuery({
    queryKey: [SLUG, 'items', categoryId],
    queryFn: () =>
      publicApi
        .get(`/restaurant/menu/categories/${categoryId}/items`, { params: PARAMS })
        .then((r) => r.data.data ?? []),
    // '__all__' is the «الكل» pill's sentinel id, not a real category. Without this guard the hook
    // fires GET /menu/categories/__all__/items on every tap of the most-used tab — a request that
    // always fails, whose result is never read (MenuPage swaps in `allItems` for that id), and
    // whose errors sit in the console making the next real failure harder to see. Caught in the
    // browser the same session the «الكل» 404 was fixed, by reading the console rather than the
    // screen.
    enabled: !!categoryId && categoryId !== '__all__',
    staleTime: 5 * 60 * 1000,
  });
}
