import { useQuery } from '@tanstack/react-query';
import type { ProductDTO, Pagination } from '@flex/shared';
import { api } from '../services/api';

export interface ProductFilters {
  categoryId?: number;
  search?: string;
  page?: number;
  limit?: number;
  inStockOnly?: boolean;
}

export interface ProductsResponse {
  products: ProductDTO[];
  pagination?: Pagination;
}

export function useProducts(storeSlug: string, filters: ProductFilters = {}) {
  const { categoryId, search, page = 1, limit = 20, inStockOnly } = filters;

  return useQuery<ProductsResponse, Error>({
    queryKey: ['products', storeSlug, { categoryId, search, page, limit, inStockOnly }],
    queryFn: async () => {
      const res = await api.getWithMeta<ProductDTO[]>(`/shop/${storeSlug}/products`, {
        categoryId,
        search,
        page,
        limit,
        inStockOnly,
      });

      return {
        products: res.data,
        pagination: res.pagination,
      };
    },
    enabled: Boolean(storeSlug),
    staleTime: 30 * 1000,
  });
}
