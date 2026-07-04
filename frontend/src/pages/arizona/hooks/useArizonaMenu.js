import { useQuery } from '@tanstack/react-query';
import publicApi from '../../../utils/publicApi';

const SLUG = 'arizona';
const PARAMS = { client_slug: SLUG };

export function useArizonaCategories() {
  return useQuery({
    queryKey: [SLUG, 'categories'],
    queryFn: () =>
      publicApi
        .get('/restaurant/menu/categories', { params: PARAMS })
        .then((r) => r.data.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

export function useArizonaItems(categoryId) {
  return useQuery({
    queryKey: [SLUG, 'items', categoryId],
    queryFn: () =>
      publicApi
        .get(`/restaurant/menu/categories/${categoryId}/items`, { params: PARAMS })
        .then((r) => r.data.data ?? []),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  });
}
