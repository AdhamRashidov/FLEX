import { useEffect, useState, type FormEvent } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';


import { adminApi } from '../services/api';
import type { CategoryDTO } from '@flex/shared';

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await adminApi.get<CategoryDTO[]>('/store/categories');
      setCategories(data);
    } catch (err) {
      console.warn('Kategoriyalarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setEmoji('📦');
    setSortOrder(categories.length);
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryDTO) => {
    setEditingCategory(cat);
    setName(cat.name);
    setEmoji(cat.emoji || '📦');
    setSortOrder(cat.sortOrder);
    setError(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: number, catName: string) => {
    if (!confirm(`Haqiqatan ham "${catName}" kategoriyasini o'chirmoqchimisiz?`)) return;
    try {
      await adminApi.delete(`/store/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'O\'chirishda xatolik');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Kategoriya nomi kiritilishi shart');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      emoji: emoji.trim() || undefined,
      sortOrder,
    };

    try {
      if (editingCategory) {
        const updated = await adminApi.patch<CategoryDTO>(
          `/store/categories/${editingCategory.id}`,
          payload
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? { ...c, ...updated } : c))
        );
      } else {
        const created = await adminApi.post<CategoryDTO>('/store/categories', payload);
        setCategories((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Kategoriyalar</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Do'kon mahsulotlarini bo'limlar bo'yicha tartiblash
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Yangi kategoriya
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            Yuklanmoqda...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            Hozircha kategoriyalar yaratilmagan
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-xl shrink-0">
                  {cat.emoji || '📦'}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-white text-sm truncate">{cat.name}</h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <span className="font-mono">#{cat.sortOrder}</span> tartib
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Tahrirlash"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                  title="O'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-white text-base mb-1">
              {editingCategory ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Nomi va emoji belgisini kiriting
            </p>

            {error && (
              <div className="mb-4 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex gap-3">
                <div className="w-20">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Emoji
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 text-center text-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nomi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Ichimliklar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tartib raqami (Sort order)
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
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
