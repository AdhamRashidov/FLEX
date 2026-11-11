import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Package,
} from 'lucide-react';

import { adminApi } from '../services/api';
import { formatMoney, formatDateShort } from '@flex/shared';

interface FinanceSummary {
  balance: number;
  monthIncome: number;
  monthExpense: number;
  todayIncome: number;
  averageOrderValue: number;
}

interface SalesDataPoint {
  date: string;
  totalSales: number;
  ordersCount: number;
}

interface TopProduct {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [salesReport, setSalesReport] = useState<SalesDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [period, setPeriod] = useState<string>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFinanceData() {
      try {
        setLoading(true);
        const [sumRes, salesRes, topRes] = await Promise.allSettled([
          adminApi.get<FinanceSummary>('/store/finance/summary'),
          adminApi.get<{ report: SalesDataPoint[] }>(`/store/finance/reports/sales?period=${period}`),
          adminApi.get<{ topProducts: TopProduct[] }>('/store/finance/reports/top-products?limit=10'),
        ]);

        if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
        if (salesRes.status === 'fulfilled') setSalesReport(salesRes.value.report || []);
        if (topRes.status === 'fulfilled') setTopProducts(topRes.value.topProducts || []);
      } catch (err) {
        console.warn('Moliya ma\'lumotlarini yuklashda xatolik:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFinanceData();
  }, [period]);

  const maxSale = Math.max(...salesReport.map((s) => s.totalSales), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Moliya va hisobotlar</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Do'kon tushumi, xarajatlari va savdo tahlili
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/finance/transactions"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition"
          >
            <Receipt className="w-4 h-4 text-emerald-400" />
            Tranzaksiyalar qaydnomasi
          </Link>
        </div>
      </div>

      {/* 4 Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Kassa qoldig'i (Balans)</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-xl font-black text-white">
            {loading ? '...' : formatMoney(summary?.balance || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Haqiqiy naqd va karta tushumlari</p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Oylik jami tushum</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 text-xl font-black text-blue-400">
            {loading ? '...' : formatMoney(summary?.monthIncome || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Bugun: {formatMoney(summary?.todayIncome || 0)}</p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Oylik xarajatlar</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 text-xl font-black text-rose-400">
            {loading ? '...' : formatMoney(summary?.monthExpense || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ijara, ta'minot, oylik</p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>O'rtacha chek (AOV)</span>
            <Receipt className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 text-xl font-black text-white">
            {loading ? '...' : formatMoney(summary?.averageOrderValue || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Bitta buyurtma o'rtacha qiymati</p>
        </div>
      </div>

      {/* Sales Dynamic Visual Chart */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Sotuvlar dinamikasi</h3>
            <p className="text-xs text-slate-400">Kunlar bo'yicha tushum va buyurtmalar ko'rsatkichi</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            {['7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  period === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-4">
          {salesReport.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Bu oraliqda sotuv ma'lumotlari mavjud emas
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-44 flex items-end gap-1.5 pt-4 border-b border-slate-800">
                {salesReport.map((point, idx) => {
                  const heightPercent = Math.max(8, Math.round((point.totalSales / maxSale) * 100));
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center group relative h-full justify-end"
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-slate-800 border border-slate-700 text-white text-[10px] font-mono py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-10 transition">
                        {formatMoney(point.totalSales)} ({point.ordersCount} buyurtma)
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-blue-600/60 hover:bg-blue-500 rounded-t-md transition-all duration-200"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-mono">
                <span>{formatDateShort(salesReport[0]?.date || '')}</span>
                <span>{formatDateShort(salesReport[salesReport.length - 1]?.date || '')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top 10 Best Sellers */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-400" />
          Eng ko'p sotilgan tovarlar (TOP-10)
        </h3>

        <div className="divide-y divide-slate-800/60 text-xs">
          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              Hozircha sotuv hisoboti mavjud emas
            </div>
          ) : (
            topProducts.map((p, idx) => (
              <div key={p.productId} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-slate-500 font-bold font-mono text-center">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-white">{p.productName}</h4>
                    <span className="text-[11px] text-slate-400">{p.totalQuantity} ta sotilgan</span>
                  </div>
                </div>
                <span className="font-bold text-white text-sm">
                  {formatMoney(p.totalRevenue)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
