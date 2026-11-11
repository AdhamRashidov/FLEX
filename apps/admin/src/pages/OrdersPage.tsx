import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ShoppingBag,
  ChevronRight,
  MapPin,
  Calendar,
} from 'lucide-react';

import { adminApi } from '../services/api';
import { OrderStatus, formatMoney, formatDate, formatOrderNumber } from '@flex/shared';

interface OrderItem {
  id: number;
  productName: string;
  quantity: number;
  productPrice: number;
  total: number;
}

interface OrderRecord {
  id: number;
  orderNumber: number;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryType: string;
  deliveryAddress: string | null;
  customerNote: string | null;
  customerPhone?: string;
  createdAt: string;
  items?: OrderItem[];
}

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getWithMeta<OrderRecord[]>('/store/orders', {
        status: activeStatus !== 'all' ? activeStatus : undefined,
        limit: 50,
      });
      setOrders(res.data);
    } catch (err) {
      console.warn('Buyurtmalarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeStatus]);

  const handleUpdateStatus = async (orderId: number, nextStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await adminApi.patch(`/store/orders/${orderId}/status`, { status: nextStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Statusni o\'zgartirishda xatolik');
    } finally {
      setUpdatingId(null);
    }
  };

  const tabs = [
    { key: 'all', label: 'Barchasi' },
    { key: OrderStatus.PENDING, label: 'Kutilmoqda' },
    { key: OrderStatus.CONFIRMED, label: 'Tasdiqlangan' },
    { key: OrderStatus.PREPARING, label: 'Tayyorlanmoqda' },
    { key: OrderStatus.DELIVERING, label: 'Yetkazilmoqda' },
    { key: OrderStatus.DELIVERED, label: 'Yetkazildi' },
    { key: OrderStatus.CANCELLED, label: 'Bekor qilingan' },
  ];

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Kutilmoqda</span>;
      case OrderStatus.CONFIRMED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Tasdiqlandi</span>;
      case OrderStatus.PREPARING:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Tayyorlanmoqda</span>;
      case OrderStatus.DELIVERING:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Yetkazilmoqda</span>;
      case OrderStatus.DELIVERED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Yetkazildi</span>;
      case OrderStatus.CANCELLED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Bekor qilindi</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Buyurtmalar nazorati</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Telegram Mini App orqali mijozlardan kelgan buyurtmalar
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeStatus === tab.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Yuklanmoqda...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center bg-slate-950/40 border border-slate-800/60 rounded-2xl">
            <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Bu holatda buyurtmalar yo'q</p>
            <p className="text-xs text-slate-500 mt-0.5">Yangi buyurtmalar kelib tushganda shu yerda ko'rinadi</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-sm text-white">
                    {formatOrderNumber(order.orderNumber)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {order.customerPhone || 'Mijoz'}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-black text-white">{formatMoney(order.total)}</span>
                    <span className="block text-[10px] text-slate-500">
                      {order.paymentMethod === 'cash' ? 'Naqd to\'lov' : 'Karta orqali'}
                    </span>
                  </div>
                  <Link
                    to={`/orders/${order.id}`}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                    title="Tafsilotlar"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {order.deliveryAddress && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{order.deliveryAddress}</span>
                </div>
              )}

              {/* Quick Status Workflow Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="text-xs text-slate-400">
                  {order.deliveryType === 'delivery' ? 'Yetkazib berish' : 'Olib ketish'}
                </div>

                <div className="flex items-center gap-2">
                  {order.status === OrderStatus.PENDING && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(order.id, OrderStatus.CANCELLED)}
                        disabled={updatingId === order.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition"
                      >
                        Rad etish
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, OrderStatus.CONFIRMED)}
                        disabled={updatingId === order.id}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition"
                      >
                        Qabul qilish
                      </button>
                    </>
                  )}

                  {order.status === OrderStatus.CONFIRMED && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, OrderStatus.PREPARING)}
                      disabled={updatingId === order.id}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
                    >
                      Tayyorlashga o'tish
                    </button>
                  )}

                  {order.status === OrderStatus.PREPARING && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, OrderStatus.DELIVERING)}
                      disabled={updatingId === order.id}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md transition"
                    >
                      Yetkazishga chiqarish
                    </button>
                  )}

                  {order.status === OrderStatus.DELIVERING && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, OrderStatus.DELIVERED)}
                      disabled={updatingId === order.id}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition"
                    >
                      Yetkazildi deb belgilash
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
