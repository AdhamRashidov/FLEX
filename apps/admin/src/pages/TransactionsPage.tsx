import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { TransactionType, formatMoney, formatDate } from '@flex/shared';


interface TransactionRecord {
  id: number;
  type: TransactionType;
  category: string;
  amount: number;
  description: string | null;
  orderId: number | null;
  createdAt: string;
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Form state
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState('other');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getWithMeta<TransactionRecord[]>('/store/finance/transactions', {
        type: filterType !== 'all' ? filterType : undefined,
        limit: 50,
      });
      setTransactions(res.data);
    } catch (err) {
      console.warn('Tranzaksiyalarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterType]);

  const handleCreateTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Summa 0 dan katta bo\'lishi shart');
      return;
    }

    setSaving(true);
    try {
      const created = await adminApi.post<TransactionRecord>('/store/finance/transactions', {
        type,
        category,
        amount: Math.round(amount),
        description: description.trim() || undefined,
      });
      setTransactions((prev) => [created, ...prev]);
      setModalOpen(false);
      setAmount(0);
      setDescription('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Tranzaksiyani saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/finance"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Moliya hisobotiga qaytish
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Kirim-chiqim qaydnomasi</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Barcha kassa operatsiyalari va qo'lda kiritilgan xarajatlar
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Operatsiya qo'shish
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['all', TransactionType.INCOME, TransactionType.EXPENSE].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterType === t
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t === 'all' ? 'Barcha operatsiyalar' : t === TransactionType.INCOME ? 'Tushumlar (+)' : 'Chiqimlar (-)'}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="divide-y divide-slate-800/60">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">Yuklanmoqda...</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Tranzaksiyalar mavjud emas
            </div>
          ) : (
            transactions.map((tx) => {
              const isIncome = tx.type === TransactionType.INCOME;
              return (
                <div
                  key={tx.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-900/40 transition text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {tx.description || (isIncome ? 'Sotuv tushumi' : 'Operatsion chiqim')}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="uppercase font-mono text-slate-500">{tx.category}</span>
                        <span>•</span>
                        <span>{formatDate(tx.createdAt)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-black text-sm ${
                        isIncome ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatMoney(tx.amount)}
                    </span>
                    {tx.orderId && (
                      <span className="block text-[10px] text-slate-500 font-mono">
                        Buyurtma #{tx.orderId}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Manual Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-white text-base mb-1">Yangi operatsiya kiritish</h3>
            <p className="text-xs text-slate-400 mb-4">Kassaga kirim yoki chiqimni qayd eting</p>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Turi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType(TransactionType.INCOME)}
                    className={`py-2 rounded-xl text-xs font-semibold transition ${
                      type === TransactionType.INCOME
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Kirim (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType(TransactionType.EXPENSE)}
                    className={`py-2 rounded-xl text-xs font-semibold transition ${
                      type === TransactionType.EXPENSE
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Chiqim (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Kategoriya
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="sale">Sotuv (Sale)</option>
                  <option value="delivery">Yetkazib berish (Delivery)</option>
                  <option value="rent">Ijara (Rent)</option>
                  <option value="salary">Ish haqi (Salary)</option>
                  <option value="refund">Qaytarish (Refund)</option>
                  <option value="other">Boshqa (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Summa (so'mda) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tavsif / Izoh
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Do'kon tozalash xarajati"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
