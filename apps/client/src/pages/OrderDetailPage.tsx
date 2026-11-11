import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle2, MapPin, Phone, CreditCard, Banknote } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { formatMoney, formatDate } from '@flex/shared';
import { OrderStatus, PaymentMethod } from '@flex/shared';
import type { OrderDTO } from '@flex/shared';

import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { storeSlug, store } = useStore();

  useTelegramBackButton();

  // 1. Avval mahalliy xotiradan qidirish (darhol ko'rsatish uchun)
  const storageKey = `flex_orders_${storeSlug}`;
  let localOrder: OrderDTO | null = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const orders: OrderDTO[] = JSON.parse(saved);
      localOrder = orders.find((o) => String(o.id) === orderId) ?? null;
    }
  } catch {
    localOrder = null;
  }

  // 2. Serverdan yangi holatni yuklash
  const { data: serverOrder, isLoading } = useQuery<OrderDTO | null>({
    queryKey: ['orderDetail', storeSlug, orderId],
    queryFn: () => api.get<OrderDTO>(`/shop/${storeSlug}/orders/${orderId}`).catch(() => null),
    enabled: Boolean(storeSlug && orderId),
    staleTime: 10_000,
  });

  const order = serverOrder || localOrder;

  if (isLoading && !order) {
    return (
      <div className="min-h-screen bg-tg-bg p-6 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 border-2 border-tg-button border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-tg-hint">Buyurtma ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-tg-bg p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-lg font-bold text-tg-text mb-2">Buyurtma topilmadi</h2>
        <p className="text-sm text-tg-hint mb-6">Ushbu buyurtma mavjud emas yoki o'chirilgan.</p>
        <button
          onClick={() => navigate('/orders')}
          className="px-5 py-2.5 bg-tg-button text-tg-button-text rounded-xl font-medium text-sm"
        >
          Buyurtmalarga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg flex flex-col pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-tg-bg/95 backdrop-blur-md px-4 py-3 flex items-center border-b border-tg-secondary-bg">
        <button
          onClick={() => navigate('/orders')}
          className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center text-tg-text active:scale-95 transition-transform mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-tg-text">
            Buyurtma #{order.orderNumber}
          </h1>
          <p className="text-[11px] text-tg-hint">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Muvaffaqiyat xabari */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-3 text-emerald-800">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Buyurtmangiz qabul qilindi!</h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              Tez orada do'kon xodimi buyurtmangizni tayyorlashni boshlaydi.
            </p>
          </div>
        </div>

        {/* Holat bosqichlari */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-tg-hint uppercase tracking-wider mb-3">
            Buyurtma holati
          </h3>
          <div className="flex items-center space-x-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping inline-block" />
            <span className="font-bold text-tg-text">
              {order.status === OrderStatus.PENDING ? 'Kutilmoqda' : order.status}
            </span>
            <span className="text-tg-hint">• Kuryer biriktirilishi kutilmoqda</span>
          </div>
        </div>

        {/* Mahsulotlar ro'yxati */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-tg-hint uppercase tracking-wider mb-3">
            Tarkib ({order.items.length} xil)
          </h3>
          <div className="divide-y divide-tg-secondary-bg">
            {order.items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-tg-text">{item.productName}</p>
                  <p className="text-tg-hint mt-0.5">
                    {formatMoney(item.productPrice)} × {item.quantity}
                  </p>
                </div>
                <span className="font-bold text-tg-text">{formatMoney(item.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Yetkazish va To'lov */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-4 space-y-3 text-xs shadow-xs">
          <h3 className="text-xs font-semibold text-tg-hint uppercase tracking-wider">
            Yetkazish va to'lov
          </h3>

          <div className="flex items-start space-x-2.5">
            <MapPin className="w-4 h-4 text-tg-hint shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-tg-text">Manzil:</span>
              <p className="text-tg-hint mt-0.5">{order.deliveryAddress}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {order.paymentMethod === PaymentMethod.CASH ? (
              <Banknote className="w-4 h-4 text-tg-hint shrink-0" />
            ) : (
              <CreditCard className="w-4 h-4 text-tg-hint shrink-0" />
            )}
            <div>
              <span className="font-semibold text-tg-text">To'lov turi:</span>{' '}
              <span className="text-tg-hint">
                {order.paymentMethod === PaymentMethod.CASH
                  ? 'Naqd pul (Qabul qilinganda)'
                  : 'Karta orqali'}
              </span>
            </div>
          </div>

          {order.customerNote && (
            <div className="p-2.5 rounded-xl bg-tg-secondary-bg text-tg-hint italic">
              "{order.customerNote}"
            </div>
          )}
        </div>

        {/* Hisob-kitob */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-4 space-y-2 text-xs shadow-xs">
          <div className="flex justify-between text-tg-hint">
            <span>Mahsulotlar summasi</span>
            <span className="font-medium text-tg-text">{formatMoney(order.subtotal)}</span>
          </div>

          <div className="flex justify-between text-tg-hint">
            <span>Yetkazib berish</span>
            <span className="font-medium text-tg-text">
              {order.deliveryFee > 0 ? formatMoney(order.deliveryFee) : 'Bepul'}
            </span>
          </div>

          <div className="pt-2 border-t border-tg-secondary-bg flex justify-between items-baseline">
            <span className="text-sm font-bold text-tg-text">Jami to'langan / to'lanadi</span>
            <span className="text-base font-extrabold text-tg-button">
              {formatMoney(order.total)}
            </span>
          </div>
        </div>

        {/* Do'kon bilan aloqa */}
        {store?.phone && (
          <a
            href={`tel:${store.phone}`}
            className="w-full py-3 rounded-2xl bg-tg-secondary-bg text-tg-text font-semibold text-xs flex items-center justify-center space-x-2 active:scale-95 transition-transform"
          >
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Do'konga qo'ng'iroq qilish ({store.phone})</span>
          </a>
        )}
      </div>
    </div>
  );
}
