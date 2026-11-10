import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Plus, Minus, Check, ImageOff, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useProduct } from '../hooks/useProduct';
import { useCart } from '../context/CartContext';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { formatMoney } from '@flex/shared';
import { Skeleton } from '../components/common/Skeleton';
import { telegramService } from '../services/telegram.service';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { storeSlug } = useStore();
  const { getItemQuantity, addItem, updateQuantity } = useCart();

  // Telegram native BackButton
  useTelegramBackButton();

  const { data: product, isLoading, error } = useProduct(storeSlug, id);

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tg-bg p-4 flex flex-col">
        <Skeleton className="w-full aspect-square rounded-2xl mb-4" />
        <Skeleton className="h-6 w-3/4 rounded mb-2" />
        <Skeleton className="h-5 w-1/3 rounded mb-4" />
        <Skeleton className="h-20 w-full rounded-xl mb-4" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-tg-bg p-6 flex flex-col items-center justify-center text-center">
        <ImageOff className="w-12 h-12 text-tg-hint mb-3" />
        <h2 className="text-lg font-bold text-tg-text mb-2">Mahsulot topilmadi</h2>
        <p className="text-sm text-tg-hint mb-6">Ushbu mahsulot o'chirilgan yoki mavjud emas.</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-tg-button text-tg-button-text rounded-xl font-medium text-sm"
        >
          Katalogga qaytish
        </button>
      </div>
    );
  }

  const currentCartQty = getItemQuantity(product.id);
  const images = product.images.length > 0 ? product.images : [];
  const currentImage = images[activeImageIdx] || images[0];
  const isOutOfStock = product.trackStock && product.stockQuantity <= 0;

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    telegramService.haptic.light();
    addItem(product, 1);
  };

  const handleIncrement = () => {
    telegramService.haptic.selection();
    addItem(product, 1);
  };

  const handleDecrement = () => {
    telegramService.haptic.selection();
    updateQuantity(product.id, currentCartQty - 1);
  };

  return (
    <div className="min-h-screen bg-tg-bg flex flex-col pb-28">
      {/* Yuqori navigatsiya paneli (Brauzer rejimi uchun ham) */}
      <div className="sticky top-0 z-30 bg-tg-bg/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-tg-secondary-bg">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center text-tg-text active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-tg-text truncate max-w-[200px]">
          {product.name}
        </span>
        <button
          onClick={() => navigate('/cart')}
          className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center text-tg-text active:scale-95 transition-transform relative"
        >
          <ShoppingBag className="w-5 h-5" />
          {currentCartQty > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-tg-button text-tg-button-text text-[10px] font-bold flex items-center justify-center">
              {currentCartQty}
            </span>
          )}
        </button>
      </div>

      {/* Rasm galereyasi */}
      <div className="p-4">
        <div className="relative aspect-square w-full rounded-3xl bg-tg-secondary-bg overflow-hidden flex items-center justify-center border border-tg-secondary-bg">
          {currentImage?.url ? (
            <img
              src={currentImage.url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-tg-hint/50">
              <ImageOff className="w-12 h-12 mb-2" />
              <span className="text-xs">Rasm mavjud emas</span>
            </div>
          )}

          {discountPercent !== null && (
            <span className="absolute top-4 left-4 bg-tg-destructive text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-md">
              -{discountPercent}% chegirma
            </span>
          )}
        </div>

        {/* Thumbnail slayder (agar rasmlar bir nechta bo'lsa) */}
        {images.length > 1 && (
          <div className="flex space-x-2 mt-3 overflow-x-auto no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => {
                  telegramService.haptic.selection();
                  setActiveImageIdx(idx);
                }}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                  activeImageIdx === idx
                    ? 'border-tg-button scale-95'
                    : 'border-transparent opacity-60'
                }`}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mahsulot ma'lumotlari */}
      <div className="px-4 space-y-4">
        <div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-tg-text">
              {formatMoney(product.price)}
            </span>
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="text-sm text-tg-hint line-through">
                {formatMoney(product.oldPrice)}
              </span>
            )}
          </div>
          <p className="text-xs text-tg-hint mt-0.5">
            1 {product.unit} uchun narx
          </p>
        </div>

        <h1 className="text-lg font-bold text-tg-text leading-snug">
          {product.name}
        </h1>

        {/* Ombordagi holati */}
        <div className="flex items-center space-x-2 text-xs">
          {isOutOfStock ? (
            <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-600 font-medium">
              ❌ Mahsulot omborda tugagan
            </span>
          ) : product.trackStock && product.stockQuantity <= 5 ? (
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 font-medium">
              ⚠️ Qoldiq kam: {product.stockQuantity} {product.unit}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" /> Omborda mavjud
            </span>
          )}
        </div>

        {/* Tavsif */}
        {product.description && (
          <div className="bg-tg-secondary-bg/60 rounded-2xl p-3.5">
            <h3 className="text-xs font-semibold text-tg-hint uppercase tracking-wider mb-1.5">
              Tavsif
            </h3>
            <p className="text-sm text-tg-text leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}

        {/* Xususiyatlar jadvali */}
        <div className="bg-tg-secondary-bg/60 rounded-2xl p-3.5 divide-y divide-tg-secondary-bg text-xs">
          <div className="flex justify-between py-2">
            <span className="text-tg-hint">O'lchov birligi</span>
            <span className="font-semibold text-tg-text">{product.unit}</span>
          </div>
          {product.barcode && (
            <div className="flex justify-between py-2">
              <span className="text-tg-hint">Shtrix-kod</span>
              <span className="font-mono font-medium text-tg-text">{product.barcode}</span>
            </div>
          )}
          <div className="flex justify-between py-2">
            <span className="text-tg-hint">Sifat kafolati</span>
            <span className="text-emerald-600 font-medium flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 100% Sifatli
            </span>
          </div>
        </div>
      </div>

      {/* Pastki sticky buyurtma berish paneli */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-tg-bg/95 backdrop-blur-md border-t border-tg-secondary-bg p-4 pb-safe-bottom">
        <div className="max-w-md mx-auto">
          {isOutOfStock ? (
            <button
              disabled
              className="w-full py-3.5 rounded-2xl bg-tg-secondary-bg text-tg-hint font-semibold text-sm cursor-not-allowed text-center"
            >
              Hozirda mavjud emas
            </button>
          ) : currentCartQty === 0 ? (
            <button
              onClick={handleAddToCart}
              className="w-full py-3.5 rounded-2xl bg-tg-button text-tg-button-text font-bold text-sm flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Savatga qo'shish — {formatMoney(product.price)}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-tg-secondary-bg rounded-2xl p-1 shrink-0">
                <button
                  onClick={handleDecrement}
                  className="w-11 h-11 rounded-xl bg-tg-bg text-tg-text flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-12 text-center text-base font-bold text-tg-text">
                  {currentCartQty}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-11 h-11 rounded-xl bg-tg-button text-tg-button-text flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={() => navigate('/cart')}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-tg-button text-tg-button-text font-bold text-sm flex items-center justify-between active:scale-[0.98] transition-transform shadow-lg"
              >
                <span>Savatga o'tish</span>
                <span>{formatMoney(product.price * currentCartQty)}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
