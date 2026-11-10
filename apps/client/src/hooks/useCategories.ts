import { useQuery } from '@tanstack/react-query';
import type { CategoryDTO } from '@flex/shared';
import { api } from '../services/api';

export function useCategories(storeSlug: string) {
  return useQuery<CategoryDTO[], Error>({
    queryKey: ['categories', storeSlug],
    queryFn: () => api.get<CategoryDTO[]>(`/shop/${storeSlug}/categories`),
    enabled: Boolean(storeSlug),
    staleTime: 60 * 1000, // 1 daqiqa
  });
}
