import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { Header } from '../components/common/Header';
import { CategoryBar } from '../components/catalog/CategoryBar';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { FloatingCartBar } from '../components/catalog/FloatingCartBar';
import { BottomNav } from '../components/common/BottomNav';

export function CatalogPage() {
  const { storeSlug } = useStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories(storeSlug);
  const { data: productsData, isLoading: isProductsLoading } = useProducts(storeSlug, {
    categoryId: selectedCategoryId ?? undefined,
  });

  return (
    <div className="min-h-screen bg-tg-bg flex flex-col pb-16">
      {/* Do'kon bosh sarlavhasi */}
      <Header />

      {/* Kategoriyalar gorizontal paneli */}
      <CategoryBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        isLoading={isCategoriesLoading}
      />

      {/* Mahsulotlar vitrinasi */}
      <main className="flex-1">
        <ProductGrid
          products={productsData?.products ?? []}
          isLoading={isProductsLoading}
          emptyTitle="Mahsulotlar topilmadi"
          emptyDescription={
            selectedCategoryId
              ? 'Tanlangan kategoriyada hozircha mahsulot yo\'q'
              : 'Do\'konda hali mahsulotlar kiritilmagan'
          }
        />
      </main>

      {/* Savatga o'tish suzuvchi paneli */}
      <FloatingCartBar />

      {/* Pastki navigatsiya paneli */}
      <BottomNav />
    </div>
  );
}
