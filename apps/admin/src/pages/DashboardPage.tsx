import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  Wallet,
  Plus,
  FileSpreadsheet,
  ArrowUpRight,
  ChevronRight,
  PackageCheck,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { formatMoney, formatDate } from '@flex/shared';

interface FinanceSummary {
  balance: number;
  monthIncome: number;
  monthExpense: number;
  todayIncome: number;
  averageOrderValue: number;
  pendingOrdersCount: number;
  totalOrdersCount: number;
}

interface OrderSummary {
  id: number;
  orderNumber: number;
  status: string;
  total: number;
  createdAt: string;
  customerPhone?: string;
  itemsCount: number;
}

export function DashboardPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [financeRes, ordersRes] = await Promise.allSettled([
          adminApi.get<FinanceSummary>('/store/finance/summary'),
          adminApi.getWithMeta<OrderSummary[]>('/store/orders', { limit: 5 }),
        ]);

        if (financeRes.status === 'fulfilled') {
          setSummary(financeRes.value);
        }
        if (ordersRes.status === 'fulfilled') {
          setRecentOrders(ordersRes.value.data || []);
        }
      } catch (err) {
        console.warn('Dashboard ma\'lumotlarini yuklashda xatolik:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      pending: { label: 'Kutilmoqda', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      confirmed: { label: 'Tasdiqlandi', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      preparing: { label: 'Tayyorlanmoqda', class: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
      delivering: { label: 'Yetkazilmoqda', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
      delivered: { label: 'Yetkazildi', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      cancelled: { label: 'Bekor qilindi', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    };
    const b = badges[status] || { label: status, class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${b.class}`}>
        {b.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Do'kon ko'rsatkichlari</h1>
          <p className="text-sm text-slate-400 mt-0.5">Savdo dinamikasi va buyurtmalar statistikasi</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/products/import"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Import qilish
          </Link>
          <Link
            to="/products/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3.5 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Yangi tovar
          </Link>
        </div>
      </div>

      {/* Metrics 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Sof kassa balansi</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white">
              {loading ? '...' : formatMoney(summary?.balance || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Bugungi tushum: {formatMoney(summary?.todayIncome || 0)}</p>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Oylik jami tushum</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white">
              {loading ? '...' : formatMoney(summary?.monthIncome || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">O'rtacha chek: {formatMoney(summary?.averageOrderValue || 0)}</p>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Jami buyurtmalar</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white">
              {loading ? '...' : (summary?.totalOrdersCount ?? recentOrders.length)} ta
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <PackageCheck className="w-3 h-3" />
              Sotuvlar faol
            </p>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Kutilayotgan buyurtmalar</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-400">
              {loading ? '...' : (summary?.pendingOrdersCount || 0)} ta
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Tezkor tasdiqlash talab etiladi</p>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">So'nggi buyurtmalar</h2>
            <p className="text-xs text-slate-400">Mijozlardan kelib tushgan yangi buyurtmalar</p>
          </div>
          <Link
            to="/orders"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            Barchasini ko'rish
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            Hozircha buyurtmalar mavjud emas
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                    #{order.orderNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {order.customerPhone || 'Mijoz'}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(order.createdAt)} • {order.itemsCount} xil tovar
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-sm font-bold text-white">
                    {formatMoney(order.total)}
                  </span>
                  <Link
                    to={`/orders/${order.id}`}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    title="Batafsil ko'rish"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
