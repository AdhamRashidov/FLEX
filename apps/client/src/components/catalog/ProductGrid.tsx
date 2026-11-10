import type { ProductDTO } from '@flex/shared';
import { ProductCard } from './ProductCard';
import { Skeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { PackageOpen } from 'lucide-react';

interface ProductGridProps {
  products: ProductDTO[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ProductGrid({
  products,
  isLoading,
  emptyTitle = 'Mahsulotlar topilmadi',
  emptyDescription = 'Hozirda ushbu bo\'limda mahsulotlar mavjud emas',
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-tg-secondary-bg overflow-hidden p-2 flex flex-col justify-between h-64 bg-tg-bg"
          >
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="space-y-2 mt-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-8 w-full rounded-xl mt-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="w-8 h-8" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 pb-24">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
