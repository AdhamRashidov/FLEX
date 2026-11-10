import { useNavigate, useLocation } from 'react-router';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatMoney } from '@flex/shared';
import { telegramService } from '../../services/telegram.service';

export function FloatingCartBar() {
  const { totalCount, subtotal } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Savat yoki checkout sahifasida bo'lsa suzuvchi panelni ko'rsatmaymiz
  if (totalCount === 0 || location.pathname === '/cart' || location.pathname === '/checkout') {
    return null;
  }

  const handleClick = () => {
    telegramService.haptic.light();
    navigate('/cart');
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <button
          onClick={handleClick}
          className="w-full bg-tg-button text-tg-button-text rounded-2xl py-3 px-4 shadow-lg flex items-center justify-between active:scale-[0.98] transition-all animate-in slide-in-from-bottom-3 duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs text-white/80 font-medium">
                {totalCount} ta mahsulot
              </div>
              <div className="text-sm font-bold leading-tight">
                {formatMoney(subtotal)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-xl">
            <span>Savatga</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    </div>
  );
}
