import { useNavigate } from 'react-router';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Bike, Store as StoreIcon, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { formatMoney } from '@flex/shared';
import { DeliveryType } from '@flex/shared';
import { EmptyState } from '../components/common/EmptyState';
import { telegramService } from '../services/telegram.service';
import { BottomNav } from '../components/common/BottomNav';

export function CartPage() {
  const navigate = useNavigate();
  const { store } = useStore();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    deliveryType,
    setDeliveryType,
    subtotal,
    deliveryFee,
    totalAmount,
  } = useCart();

  useTelegramBackButton();

  const minOrderAmount = store?.minOrderAmount ?? 0;
  const isMinOrderMet = subtotal >= minOrderAmount;
  const minOrderDiff = minOrderAmount - subtotal;

  const handleCheckout = () => {
    if (!isMinOrderMet) {
      telegramService.haptic.error();
      return;
    }
    telegramService.haptic.light();
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-tg-bg flex flex-col pb-16">
        <div className="sticky top-0 z-30 bg-tg-bg/90 backdrop-blur-md px-4 py-3 flex items-center border-b border-tg-secondary-bg">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center text-tg-text active:scale-95 transition-transform mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-tg-text">Savat</h1>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<ShoppingBag className="w-10 h-10" />}
            title="Savatingiz bo'sh"
            description="Katalogga o'ting va o'zingizga yoqqan mahsulotlarni tanlang"
            actionText="Katalogga o'tish"
            onAction={() => navigate('/')}
          />
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg flex flex-col pb-36">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-tg-bg/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-tg-secondary-bg">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center text-tg-text active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-tg-text">
            Savat ({items.length})
          </h1>
        </div>

        <button
          onClick={clearCart}
          className="text-xs text-tg-destructive font-medium flex items-center space-x-1 active:opacity-70 transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Tozalash</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Mahsulotlar ro'yxati */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg divide-y divide-tg-secondary-bg overflow-hidden shadow-xs">
          {items.map((item) => {
            const primaryImg =
              item.product.images.find((i) => i.isPrimary) || item.product.images[0];

            return (
              <div key={item.product.id} className="p-3.5 flex items-center space-x-3">
                {/* Rasm */}
                <div className="w-16 h-16 rounded-xl bg-tg-secondary-bg overflow-hidden shrink-0 flex items-center justify-center">
                  {primaryImg?.url ? (
                    <img
                      src={primaryImg.url}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-tg-hint/50" />
                  )}
                </div>

                {/* Nom va Narx */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-tg-text line-clamp-1 mb-1">
                    {item.product.name}
                  </h3>
                  <div className="text-xs text-tg-hint mb-2">
                    {formatMoney(item.product.price)} / 1 {item.product.unit}
                  </div>

                  {/* Stepper */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-tg-secondary-bg rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-md bg-tg-bg text-tg-text flex items-center justify-center active:scale-90 shadow-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-tg-text">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-md bg-tg-button text-tg-button-text flex items-center justify-center active:scale-90 shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-xs font-bold text-tg-text">
                      {formatMoney(item.product.price * item.quantity)}
                    </div>
                  </div>
                </div>

                {/* O'chirish */}
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="w-8 h-8 rounded-lg text-tg-hint hover:text-tg-destructive flex items-center justify-center active:scale-95 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Yetkazib berish turi */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-3.5 shadow-xs">
          <h3 className="text-xs font-semibold text-tg-hint uppercase tracking-wider mb-2.5">
            Yetkazish usuli
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                telegramService.haptic.selection();
                setDeliveryType(DeliveryType.DELIVERY);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                deliveryType === DeliveryType.DELIVERY
                  ? 'border-tg-button bg-tg-button/5 text-tg-button font-medium'
                  : 'border-tg-secondary-bg text-tg-hint'
              }`}
            >
              <Bike className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold">Yetkazib berish</span>
              <span className="text-[10px] mt-0.5">
                {deliveryFee > 0 ? formatMoney(deliveryFee) : 'Bepul'}
              </span>
            </button>

            <button
              onClick={() => {
                telegramService.haptic.selection();
                setDeliveryType(DeliveryType.PICKUP);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                deliveryType === DeliveryType.PICKUP
                  ? 'border-tg-button bg-tg-button/5 text-tg-button font-medium'
                  : 'border-tg-secondary-bg text-tg-hint'
              }`}
            >
              <StoreIcon className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold">Olib ketish</span>
              <span className="text-[10px] mt-0.5">0 so'm</span>
            </button>
          </div>
        </div>

        {/* Minimal buyurtma ogohlantirishi */}
        {!isMinOrderMet && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start space-x-2.5 text-xs text-amber-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Minimal buyurtma miqdori: {formatMoney(minOrderAmount)}</p>
              <p className="text-amber-600/80 mt-0.5">
                Buyurtma berish uchun yana kamida {formatMoney(minOrderDiff)} lik mahsulot qo'shing.
              </p>
            </div>
          </div>
        )}

        {/* Narxlar xulosasi */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-3.5 space-y-2 text-xs shadow-xs">
          <div className="flex justify-between text-tg-hint">
            <span>Mahsulotlar summasi</span>
            <span className="font-medium text-tg-text">{formatMoney(subtotal)}</span>
          </div>

          <div className="flex justify-between text-tg-hint">
            <span>Yetkazib berish</span>
            <span className="font-medium text-tg-text">
              {deliveryFee > 0 ? formatMoney(deliveryFee) : 'Bepul'}
            </span>
          </div>

          <div className="pt-2 border-t border-tg-secondary-bg flex justify-between items-baseline">
            <span className="text-sm font-bold text-tg-text">Jami to'lov</span>
            <span className="text-base font-extrabold text-tg-button">
              {formatMoney(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Pastki tugma */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-tg-bg/95 backdrop-blur-md border-t border-tg-secondary-bg p-4 pb-safe-bottom">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleCheckout}
            disabled={!isMinOrderMet}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-between transition-all shadow-lg ${
              isMinOrderMet
                ? 'bg-tg-button text-tg-button-text active:scale-[0.98]'
                : 'bg-tg-secondary-bg text-tg-hint cursor-not-allowed'
            }`}
          >
            <span>Rasmiylashtirishga o'tish</span>
            <span>{formatMoney(totalAmount)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
