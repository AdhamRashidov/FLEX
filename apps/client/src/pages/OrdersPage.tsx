import { useNavigate } from 'react-router';
import { ArrowLeft, ClipboardList, ChevronRight, Package, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { formatMoney, formatDate } from '@flex/shared';
import { OrderStatus } from '@flex/shared';
import type { OrderDTO } from '@flex/shared';
import { EmptyState } from '../components/common/EmptyState';
import { BottomNav } from '../components/common/BottomNav';
import { telegramService } from '../services/telegram.service';

export function OrdersPage() {
  const navigate = useNavigate();
  const { storeSlug } = useStore();

  useTelegramBackButton();

  const storageKey = `flex_orders_${storeSlug}`;
  let orders: OrderDTO[] = [];
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) orders = JSON.parse(saved);
  } catch {
    orders = [];
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 mr-1" /> Kutilmoqda
          </span>
        );
      case OrderStatus.CONFIRMED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Tasdiqlandi
          </span>
        );
      case OrderStatus.PREPARING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-800">
            <Package className="w-3 h-3 mr-1" /> Tayyorlanmoqda
          </span>
        );
      case OrderStatus.DELIVERING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-800">
            <Truck className="w-3 h-3 mr-1" /> Yetkazilmoqda
          </span>
        );
      case OrderStatus.DELIVERED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Yetkazildi
          </span>
        );
      case OrderStatus.CANCELLED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" /> Bekor qilindi
          </span>
        );
      default:
        return null;
    }
  };

  const handleOrderClick = (orderId: number) => {
    telegramService.haptic.light();
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="min-h-screen bg-tg-bg flex flex-col pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-tg-bg/95 backdrop-blur-md px-4 py-3 flex items-center border-b border-tg-secondary-bg">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center text-tg-text active:scale-95 transition-transform mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-tg-text">Mening buyurtmalarim</h1>
      </div>

      <div className="p-4 flex-1">
        {orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-10 h-10" />}
            title="Buyurtmalar mavjud emas"
            description="Siz hali birorta ham buyurtma bermadingiz"
            actionText="Katalogga o'tish"
            onAction={() => navigate('/')}
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleOrderClick(order.id)}
                className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-4 shadow-xs active:scale-[0.99] transition-all cursor-pointer hover:border-tg-button/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-tg-text">
                      Buyurtma #{order.orderNumber}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                  <ChevronRight className="w-4 h-4 text-tg-hint" />
                </div>

                <div className="text-xs text-tg-hint mb-3">
                  {formatDate(order.createdAt)}
                </div>

                <div className="pt-2.5 border-t border-tg-secondary-bg flex items-center justify-between">
                  <span className="text-xs text-tg-hint">
                    {order.items.length} xil mahsulot
                  </span>
                  <span className="text-sm font-bold text-tg-text">
                    {formatMoney(order.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
