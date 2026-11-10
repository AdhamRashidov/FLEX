import { useState } from 'react';
import { Search as SearchIcon, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useStore } from '../context/StoreContext';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { useDebounce } from '../hooks/useDebounce';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { BottomNav } from '../components/common/BottomNav';
import { FloatingCartBar } from '../components/catalog/FloatingCartBar';
import { telegramService } from '../services/telegram.service';
import { cn } from '../lib/utils';

export function SearchPage() {
  const navigate = useNavigate();
  const { storeSlug } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // 350ms debounce
  const debouncedSearch = useDebounce(searchTerm, 350);

  useTelegramBackButton();

  const { data: categories = [] } = useCategories(storeSlug);

  const { data: productsData, isLoading } = useProducts(storeSlug, {
    search: debouncedSearch.trim() || undefined,
    categoryId: selectedCategoryId ?? undefined,
  });

  const handleClear = () => {
    telegramService.haptic.light();
    setSearchTerm('');
  };

  const handleSelectCategory = (id: number | null) => {
    telegramService.haptic.selection();
    setSelectedCategoryId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-tg-bg flex flex-col pb-16">
      {/* Qidiruv Header */}
      <div className="sticky top-0 z-30 bg-tg-bg border-b border-tg-secondary-bg p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-tg-secondary-bg flex items-center justify-center text-tg-text active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mahsulotlarni izlash..."
              autoFocus
              className="w-full bg-tg-secondary-bg text-tg-text text-sm rounded-xl pl-10 pr-9 py-2.5 outline-none focus:ring-2 focus:ring-tg-button/30 placeholder:text-tg-hint transition-all"
            />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-tg-hint/30 text-tg-text flex items-center justify-center text-xs"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Kategoriyalar filtri */}
        {categories.length > 0 && (
          <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0',
                    isSelected
                      ? 'bg-tg-button text-tg-button-text'
                      : 'bg-tg-secondary-bg text-tg-hint hover:text-tg-text'
                  )}
                >
                  {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Natijalar xabari */}
      {debouncedSearch && productsData?.products && (
        <div className="px-4 pt-3 text-xs text-tg-hint">
          "{debouncedSearch}" bo'yicha {productsData.products.length} ta mahsulot topildi
        </div>
      )}

      {/* Mahsulotlar ro'yxati */}
      <main className="flex-1">
        <ProductGrid
          products={productsData?.products ?? []}
          isLoading={isLoading}
          emptyTitle="Hech narsa topilmadi"
          emptyDescription={
            debouncedSearch
              ? `"${debouncedSearch}" so'rovi bo'yicha mahsulot topilmadi`
              : 'Qidiruv so\'zini kiriting yoki kategoriyani tanlang'
          }
        />
      </main>

      <FloatingCartBar />
      <BottomNav />
    </div>
  );
}
