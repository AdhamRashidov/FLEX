import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Plus,
  Search,
  FileSpreadsheet,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import { adminApi } from '../services/api';
import type { ProductDTO, CategoryDTO, Pagination } from '@flex/shared';
import { formatMoney } from '@flex/shared';

export function ProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState<Pagination | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [stockEditModal, setStockEditModal] = useState<{ id: number; name: string; stock: number } | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getWithMeta<ProductDTO[]>('/store/products', {
        page,
        limit: 20,
        categoryId: selectedCategory || undefined,
        search: search || undefined,
      });
      setProducts(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.warn('Mahsulotlarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await adminApi.get<CategoryDTO[]>('/store/categories');
      setCategories(data);
    } catch (err) {
      console.warn('Kategoriyalarni yuklashda xatolik:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCategory, search]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Haqiqatan ham "${name}" mahsulotini o'chirmoqchimisiz?`)) return;
    try {
      await adminApi.delete(`/store/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'O\'chirishda xatolik');
    }
  };

  const handleUpdateStock = async () => {
    if (!stockEditModal) return;
    try {
      await adminApi.patch(`/store/products/${stockEditModal.id}/stock`, {
        quantity: newStockVal,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === stockEditModal.id ? { ...p, stockQuantity: newStockVal } : p))
      );
      setStockEditModal(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Qoldiqni yangilashda xatolik');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Mahsulotlar katalogi</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Do'konda mavjud barcha tovarlar va ularning ombor qoldig'i
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/products/import"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Ommaviy import
          </Link>
          <Link
            to="/products/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3.5 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Yangi mahsulot
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Nomi yoki shtrix-kodi bo'yicha qidirish..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="w-full md:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value="">Barcha kategoriyalar</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ''}
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Mahsulot</th>
                <th className="py-3 px-4">Kategoriya</th>
                <th className="py-3 px-4">Narxi</th>
                <th className="py-3 px-4">Qoldiq</th>
                <th className="py-3 px-4">Holat</th>
                <th className="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Mahsulotlar topilmadi
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const primaryImg = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url;
                  const isLowStock = product.trackStock && product.stockQuantity <= 5;
                  const isOutOfStock = product.trackStock && product.stockQuantity <= 0;

                  return (
                    <tr key={product.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center overflow-hidden shrink-0">
                            {primaryImg ? (
                              <img src={primaryImg} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm line-clamp-1">{product.name}</div>
                            {product.barcode && (
                              <span className="text-[11px] font-mono text-slate-400">{product.barcode}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {categories.find((c) => c.id === product.categoryId)?.name || '—'}
                      </td>

                      <td className="py-3 px-4 font-semibold text-white">
                        {formatMoney(product.price)}
                        {product.oldPrice && (
                          <div className="text-[11px] line-through text-slate-500 font-normal">
                            {formatMoney(product.oldPrice)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {product.trackStock ? (
                          <button
                            onClick={() => {
                              setStockEditModal({ id: product.id, name: product.name, stock: product.stockQuantity });
                              setNewStockVal(product.stockQuantity);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer hover:opacity-80 transition ${
                              isOutOfStock
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : isLowStock
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-200 border border-slate-700'
                            }`}
                          >
                            {(isLowStock || isOutOfStock) && <AlertTriangle className="w-3 h-3" />}
                            {product.stockQuantity} {product.unit}
                          </button>
                        ) : (
                          <span className="text-slate-500">Cheksiz</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {product.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Faol
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Nofaol
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/products/${product.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="Tahrirlash"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Jami: {pagination.total} ta mahsulot ({pagination.page} / {pagination.totalPages} sahifa)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-800 transition"
              >
                Oldingi
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-800 transition"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stock Edit Modal */}
      {stockEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-white text-base mb-1">Qoldiqni yangilash</h3>
            <p className="text-xs text-slate-400 mb-4 line-clamp-1">{stockEditModal.name}</p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Yangi qoldiq miqdori
              </label>
              <input
                type="number"
                min={0}
                value={newStockVal}
                onChange={(e) => setNewStockVal(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setStockEditModal(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleUpdateStock}
                className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
