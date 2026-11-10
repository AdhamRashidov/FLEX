import React from 'react';
import { useNavigate } from 'react-router';
import { Plus, Minus, ImageOff } from 'lucide-react';
import type { ProductDTO } from '@flex/shared';
import { formatMoney } from '@flex/shared';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: ProductDTO;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const { getItemQuantity, addItem, updateQuantity } = useCart();

  const cartQty = getItemQuantity(product.id);
  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const isOutOfStock = product.trackStock && product.stockQuantity <= 0;

  // Chegirma foizini hisoblash
  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem(product, 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product, 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, cartQty - 1);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-tg-bg rounded-2xl border border-tg-secondary-bg overflow-hidden flex flex-col justify-between shadow-xs hover:border-tg-button/30 transition-all cursor-pointer group active:scale-[0.98]"
    >
      {/* Rasm va Chegirma nishoni */}
      <div className="relative aspect-square w-full bg-tg-secondary-bg flex items-center justify-center overflow-hidden">
        {primaryImage?.url ? (
          <img
            src={primaryImage.url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-tg-hint/60">
            <ImageOff className="w-8 h-8 mb-1" />
            <span className="text-[10px]">Rasm yo'q</span>
          </div>
        )}

        {discountPercent !== null && (
          <span className="absolute top-2 left-2 bg-tg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
            -{discountPercent}%
          </span>
        )}

        {product.unit && (
          <span className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-xs text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
            1 {product.unit}
          </span>
        )}
      </div>

      {/* Ma'lumotlar va Tugmalar */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-xs font-semibold text-tg-text line-clamp-2 leading-tight mb-1.5">
            {product.name}
          </h3>

          <div className="mb-2.5">
            <div className="text-sm font-bold text-tg-text leading-none">
              {formatMoney(product.price)}
            </div>
            {product.oldPrice && product.oldPrice > product.price && (
              <div className="text-[11px] text-tg-hint line-through mt-0.5">
                {formatMoney(product.oldPrice)}
              </div>
            )}
          </div>
        </div>

        {/* Savat boshqaruvi */}
        <div>
          {isOutOfStock ? (
            <button
              disabled
              className="w-full py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-xs font-medium cursor-not-allowed text-center"
            >
              Tugagan
            </button>
          ) : cartQty === 0 ? (
            <button
              onClick={handleAdd}
              className="w-full py-2 px-3 rounded-xl bg-tg-button text-tg-button-text text-xs font-medium flex items-center justify-center space-x-1 hover:opacity-95 active:scale-95 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Savatga</span>
            </button>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between bg-tg-secondary-bg rounded-xl p-1"
            >
              <button
                onClick={handleDecrement}
                className="w-7 h-7 rounded-lg bg-tg-bg text-tg-text flex items-center justify-center active:scale-90 transition-transform shadow-xs"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-tg-text px-2">{cartQty}</span>
              <button
                onClick={handleIncrement}
                className="w-7 h-7 rounded-lg bg-tg-button text-tg-button-text flex items-center justify-center active:scale-90 transition-transform shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
