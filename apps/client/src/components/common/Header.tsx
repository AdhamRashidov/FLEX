import { useNavigate } from 'react-router';
import { Search, Store, Clock, Bike } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatMoney } from '@flex/shared';

export function Header() {
  const { store, isLoading } = useStore();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <header className="p-4 bg-tg-bg border-b border-tg-secondary-bg">
        <div className="h-6 w-36 bg-tg-secondary-bg animate-pulse rounded mb-2" />
        <div className="h-4 w-48 bg-tg-secondary-bg animate-pulse rounded" />
      </header>
    );
  }

  return (
    <header className="p-4 bg-tg-bg border-b border-tg-secondary-bg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-tg-button/10 text-tg-button flex items-center justify-center font-bold text-lg">
            {store?.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Store className="w-5 h-5" />
            )}
          </div>
          <div>
            <h1 className="text-base font-bold text-tg-text leading-tight">
              {store?.name || 'FLEX Do\'kon'}
            </h1>
            <div className="flex items-center space-x-2 text-xs text-tg-hint mt-0.5">
              <span className="flex items-center text-emerald-600 font-medium">
                <Clock className="w-3 h-3 mr-1 inline" /> Ochiq
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Bike className="w-3 h-3 mr-1 inline" />
                {store?.deliveryEnabled
                  ? store.deliveryPrice > 0
                    ? formatMoney(store.deliveryPrice)
                    : 'Bepul yetkazish'
                  : 'Olib ketish'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Qidiruv paneliga o'tish tugmasi */}
      <button
        onClick={() => navigate('/search')}
        className="w-full flex items-center px-3.5 py-2.5 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm hover:opacity-90 active:scale-[0.99] transition-all"
      >
        <Search className="w-4 h-4 mr-2.5 text-tg-hint" />
        <span>Mahsulotlarni qidirish...</span>
      </button>
    </header>
  );
}
