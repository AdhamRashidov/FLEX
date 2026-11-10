import type { CategoryDTO } from '@flex/shared';
import { telegramService } from '../../services/telegram.service';
import { cn } from '../../lib/utils';

interface CategoryBarProps {
  categories: CategoryDTO[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  isLoading?: boolean;
}

export function CategoryBar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isLoading,
}: CategoryBarProps) {
  if (isLoading) {
    return (
      <div className="flex space-x-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-9 w-24 rounded-full bg-tg-secondary-bg animate-pulse shrink-0"
          />
        ))}
      </div>
    );
  }

  const handleSelect = (id: number | null) => {
    telegramService.haptic.selection();
    onSelectCategory(id);
  };

  return (
    <div className="px-4 py-2.5 bg-tg-bg border-b border-tg-secondary-bg sticky top-0 z-30">
      <div className="flex space-x-2 overflow-x-auto no-scrollbar scroll-smooth">
        {/* Barchasi chipi */}
        <button
          onClick={() => handleSelect(null)}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
            selectedCategoryId === null
              ? 'bg-tg-button text-tg-button-text shadow-sm'
              : 'bg-tg-secondary-bg text-tg-text hover:bg-tg-secondary-bg/80'
          )}
        >
          ✨ Barchasi
        </button>

        {/* Kategoriyalar ro'yxati */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 flex items-center space-x-1.5',
                isSelected
                  ? 'bg-tg-button text-tg-button-text shadow-sm'
                  : 'bg-tg-secondary-bg text-tg-text hover:bg-tg-secondary-bg/80'
              )}
            >
              {cat.emoji && <span>{cat.emoji}</span>}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
