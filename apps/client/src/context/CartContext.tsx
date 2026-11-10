import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ProductDTO } from '@flex/shared';
import { DeliveryType } from '@flex/shared';
import { telegramService } from '../services/telegram.service';
import { useStore } from './StoreContext';

export interface CartItem {
  product: ProductDTO;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  deliveryType: DeliveryType;
  setDeliveryType: (type: DeliveryType) => void;
  addItem: (product: ProductDTO, qty?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: number) => number;
  totalCount: number;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { storeSlug, store } = useStore();
  const storageKey = `flex_cart_${storeSlug}`;

  const [deliveryType, setDeliveryType] = useState<DeliveryType>(DeliveryType.DELIVERY);

  // Savatni localStorage dan tiklash
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (err) {
        console.error('[CartContext] Savatni o\'qishda xatolik:', err);
      }
    }
    return [];
  });

  // Savat o'zgarganda localStorage ga saqlash
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (err) {
      console.error('[CartContext] Savatni saqlashda xatolik:', err);
    }
  }, [items, storageKey]);

  // Mahsulot qo'shish
  const addItem = (product: ProductDTO, qty = 1): void => {
    telegramService.haptic.light();
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        // Ombordagi miqdor cheklovi (agar trackStock true bo'lsa)
        if (product.trackStock && newQty > product.stockQuantity) {
          telegramService.haptic.warning();
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: newQty } : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  // Miqdorni to'g'ridan-to'g'ri o'zgartirish
  const updateQuantity = (productId: number, quantity: number): void => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    telegramService.haptic.selection();
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id === productId) {
          if (i.product.trackStock && quantity > i.product.stockQuantity) {
            telegramService.haptic.warning();
            return { ...i, quantity: i.product.stockQuantity };
          }
          return { ...i, quantity };
        }
        return i;
      })
    );
  };

  // Mahsulotni savatdan o'chirish
  const removeItem = (productId: number): void => {
    telegramService.haptic.medium();
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Savatni tozalash
  const clearCart = (): void => {
    telegramService.haptic.medium();
    setItems([]);
  };

  // Bitta mahsulotning savatdagi soni
  const getItemQuantity = (productId: number): number => {
    const item = items.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  // Jami mahsulotlar soni
  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  // Mahsulotlar summasi (subtotal)
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [items]);

  // Yetkazib berish narxi
  const deliveryFee = useMemo(() => {
    if (deliveryType === DeliveryType.PICKUP) return 0;
    if (!store?.deliveryEnabled) return 0;
    return store.deliveryPrice ?? 0;
  }, [deliveryType, store?.deliveryEnabled, store?.deliveryPrice]);

  // Umumiy yakuniy summa
  const totalAmount = useMemo(() => {
    return subtotal + deliveryFee;
  }, [subtotal, deliveryFee]);

  return (
    <CartContext.Provider
      value={{
        items,
        deliveryType,
        setDeliveryType,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        getItemQuantity,
        totalCount,
        subtotal,
        deliveryFee,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
