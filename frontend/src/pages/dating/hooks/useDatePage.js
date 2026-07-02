import { useQuery, useMutation } from '@tanstack/react-query';
import publicApi from '../../../utils/publicApi';

export function useDatePage(slug) {
  return useQuery({
    queryKey: ['dating', slug],
    queryFn: () => publicApi.get(`/dating/${slug}`).then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: !!slug,
  });
}

export function useCreateDatePage() {
  return useMutation({
    mutationFn: (data) => publicApi.post('/dating/create', data).then(r => r.data),
  });
}

export function useSubmitAnswer(slug) {
  return useMutation({
    mutationFn: (data) =>
      publicApi.post(`/dating/${slug}/answer`, data).then(r => r.data),
  });
}
