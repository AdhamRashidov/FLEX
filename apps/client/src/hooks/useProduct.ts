import { useQuery } from '@tanstack/react-query';
import type { ProductDTO } from '@flex/shared';
import { api } from '../services/api';

export function useProduct(storeSlug: string, productId: number | string | undefined) {
  return useQuery<ProductDTO, Error>({
    queryKey: ['product', storeSlug, productId],
    queryFn: () => api.get<ProductDTO>(`/shop/${storeSlug}/products/${productId}`),
    enabled: Boolean(storeSlug && productId),
    staleTime: 60 * 1000,
  });
}
