import { useLocation, useNavigate } from 'react-router';
import { Store, Search, ShoppingCart, ClipboardList } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { telegramService } from '../../services/telegram.service';
import { cn } from '../../lib/utils';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalCount } = useCart();

  const tabs = [
    {
      id: 'catalog',
      label: 'Katalog',
      path: '/',
      icon: Store,
      badge: 0,
    },
    {
      id: 'search',
      label: 'Qidiruv',
      path: '/search',
      icon: Search,
      badge: 0,
    },
    {
      id: 'cart',
      label: 'Savat',
      path: '/cart',
      icon: ShoppingCart,
      badge: totalCount,
    },
    {
      id: 'orders',
      label: 'Buyurtmalar',
      path: '/orders',
      icon: ClipboardList,
      badge: 0,
    },
  ];

  const handleTabClick = (path: string) => {
    telegramService.haptic.selection();
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-tg-bg/95 backdrop-blur-md border-t border-tg-secondary-bg pb-safe-bottom">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const isActive =
            tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 transition-colors relative',
                isActive ? 'text-tg-button font-medium' : 'text-tg-hint hover:text-tg-text'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-0.5" />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-tg-destructive text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center leading-tight shadow-sm animate-in zoom-in-50">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
