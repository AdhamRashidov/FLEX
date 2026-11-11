import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Phone,
  CreditCard,
  ShoppingBag,
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

interface OrderDetail {
  id: number;
  orderNumber: number;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentProofUrl: string | null;
  deliveryType: string;
  deliveryAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  customerNote: string | null;
  customerPhone?: string;
  customerName?: string;
  createdAt: string;
  items: OrderItem[];
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const data = await adminApi.get<OrderDetail>(`/store/orders/${id}`);
      setOrder(data);
    } catch (err) {
      console.warn('Buyurtma tafsilotlarini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrderDetail();
  }, [id]);

  const handleStatusChange = async (nextStatus: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      await adminApi.patch(`/store/orders/${order.id}/status`, { status: nextStatus });
      setOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Statusni o\'zgartirishda xatolik');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 text-xs">
        Buyurtma ma'lumotlari yuklanmoqda...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center space-y-4">
        <p className="text-slate-400 text-sm">Buyurtma topilmadi</p>
        <Link to="/orders" className="text-blue-400 text-xs hover:underline">
          Buyurtmalar ro'yxatiga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Buyurtmalarga qaytish
        </Link>
        <span className="text-xs text-slate-500 font-mono">
          ID: #{order.id}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Buyurtma {formatOrderNumber(order.orderNumber)}</span>
          </h1>
          <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Status Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-400">Holat:</label>
          <select
            value={order.status}
            disabled={updating}
            onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value={OrderStatus.PENDING}>Kutilmoqda (Pending)</option>
            <option value={OrderStatus.CONFIRMED}>Tasdiqlandi (Confirmed)</option>
            <option value={OrderStatus.PREPARING}>Tayyorlanmoqda (Preparing)</option>
            <option value={OrderStatus.DELIVERING}>Yetkazilmoqda (Delivering)</option>
            <option value={OrderStatus.DELIVERED}>Yetkazildi (Delivered)</option>
            <option value={OrderStatus.CANCELLED}>Bekor qilindi (Cancelled)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Items */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              Buyurtma tarkibi ({order.items.length} ta mahsulot)
            </h3>

            <div className="divide-y divide-slate-800/60">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-semibold text-white">{item.productName}</h4>
                    <p className="text-slate-400 mt-0.5">
                      {item.quantity} x {formatMoney(item.productPrice)}
                    </p>
                  </div>
                  <span className="font-bold text-white text-sm">
                    {formatMoney(item.total)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Mahsulotlar summasi:</span>
                <span>{formatMoney(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Yetkazib berish xizmati:</span>
                <span>{formatMoney(order.deliveryFee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Chegirma:</span>
                  <span>-{formatMoney(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-slate-800">
                <span>Umumiy to'lov:</span>
                <span className="text-blue-400">{formatMoney(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Delivery Info */}
        <div className="space-y-6">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
              Mijoz ma'lumotlari
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-slate-500 block text-[11px]">Telefon raqami:</span>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="font-bold text-blue-400 hover:underline flex items-center gap-1.5 mt-0.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {order.customerPhone || 'Kiritilmagan'}
                </a>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Yetkazib berish turi:</span>
                <span className="text-white font-semibold">
                  {order.deliveryType === 'delivery' ? 'Yetkazib berish' : 'Do\'kondan olib ketish'}
                </span>
              </div>

              {order.deliveryAddress && (
                <div>
                  <span className="text-slate-500 block text-[11px]">Manzil:</span>
                  <p className="text-slate-300 mt-0.5">{order.deliveryAddress}</p>
                </div>
              )}

              {order.customerNote && (
                <div>
                  <span className="text-slate-500 block text-[11px]">Mijoz izohi:</span>
                  <p className="text-amber-300/90 italic bg-amber-950/20 p-2.5 rounded-xl border border-amber-800/30 mt-0.5">
                    "{order.customerNote}"
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              To'lov
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">To'lov usuli:</span>
                <span className="font-semibold text-white">
                  {order.paymentMethod === 'cash' ? 'Naqd pul' : 'Karta orqali'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Holat:</span>
                <span className="font-semibold text-emerald-400 uppercase">
                  {order.paymentStatus}
                </span>
              </div>
              {order.paymentProofUrl && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">To'lov cheki rasmi:</span>
                  <a
                    href={order.paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl overflow-hidden border border-slate-800 hover:opacity-90 transition"
                  >
                    <img src={order.paymentProofUrl} alt="To'lov cheki" className="w-full h-auto" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
