import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Save,
  Package,
  Sparkles,
  Barcode,
  Image as ImageIcon,
  DollarSign,
  Check,
} from 'lucide-react';

import { adminApi } from '../services/api';
import type { CategoryDTO, ProductDTO } from '@flex/shared';
import { ProductUnit } from '@flex/shared';

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [oldPrice, setOldPrice] = useState<number | undefined>(undefined);
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState<string>(ProductUnit.DONA);
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [trackStock, setTrackStock] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Smart suggestion state from global catalog
  const [catalogSuggestion, setCatalogSuggestion] = useState<{
    name: string;
    category?: string;
    imageUrl?: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const cats = await adminApi.get<CategoryDTO[]>('/store/categories');
        setCategories(cats);

        if (isEdit && id) {
          const prod = await adminApi.get<ProductDTO>(`/store/products/${id}`);
          setName(prod.name);
          setCategoryId(prod.categoryId ? String(prod.categoryId) : '');
          setPrice(prod.price);
          setOldPrice(prod.oldPrice ?? undefined);
          setBarcode(prod.barcode ?? '');
          setSku(((prod as unknown) as Record<string, unknown>).sku as string ?? '');
          setUnit(prod.unit);
          setStockQuantity(prod.stockQuantity);
          setTrackStock(prod.trackStock);
          setIsActive(prod.isActive);
          setDescription(prod.description ?? '');
          const primaryImg = prod.images?.find((img) => img.isPrimary)?.url || prod.images?.[0]?.url;
          setImageUrl(primaryImg ?? '');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ma\'lumotlarni yuklashda xatolik');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, isEdit]);

  // Shtrix-kod kiritilganda avtomatik Global Katalogdan qidirish
  const handleBarcodeChange = async (val: string) => {
    setBarcode(val);
    if (val.trim().length >= 8) {
      try {
        const item = await adminApi.get<{
          name: string;
          category?: string;
          imageUrl?: string;
        } | null>(`/store/catalog/barcode/${encodeURIComponent(val.trim())}`);
        if (item) {
          setCatalogSuggestion(item);
        } else {
          setCatalogSuggestion(null);
        }
      } catch {
        setCatalogSuggestion(null);
      }
    } else {
      setCatalogSuggestion(null);
    }
  };

  const applyCatalogSuggestion = () => {
    if (!catalogSuggestion) return;
    if (!name) setName(catalogSuggestion.name);
    if (catalogSuggestion.imageUrl) setImageUrl(catalogSuggestion.imageUrl);
    setCatalogSuggestion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Mahsulot nomi kiritilishi shart');
      return;
    }
    if (price <= 0) {
      setError('Narx 0 dan katta bo\'lishi shart');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      categoryId: categoryId ? Number(categoryId) : undefined,
      price: Math.round(price),
      oldPrice: oldPrice ? Math.round(oldPrice) : undefined,
      barcode: barcode.trim() || undefined,
      sku: sku.trim() || undefined,
      unit,
      stockQuantity: trackStock ? Math.max(0, stockQuantity) : 0,
      lowStockThreshold: Math.max(0, lowStockThreshold),
      trackStock,
      isActive,
      description: description.trim() || undefined,
      images: imageUrl.trim() ? [{ url: imageUrl.trim(), isPrimary: true }] : [],
    };

    try {
      if (isEdit && id) {
        await adminApi.patch(`/store/products/${id}`, payload);
      } else {
        await adminApi.post('/store/products', payload);
      }
      navigate('/products');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Mahsulotlar ro'yxatiga qaytish
        </Link>
        <span className="text-xs text-slate-500 font-mono">
          {isEdit ? `ID: #${id}` : 'Yangi tovar'}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isEdit ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Barcha maydonlarni to'ldirib, saqlash tugmasini bosing
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Smart Suggestion Banner */}
      {catalogSuggestion && (
        <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                Global Katalogda tayyor rasm va ma'lumot topildi!
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                "{catalogSuggestion.name}" (0 bayt disk sarfi bilan tayyor studiya rasmini ulash)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={applyCatalogSuggestion}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 shadow-md transition"
          >
            <Check className="w-3.5 h-3.5" />
            Qo'llash
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            Asosiy ma'lumotlar
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mahsulot nomi *
              </label>
              <input
                type="text"
                required
                placeholder="Masalan: Coca-Cola 1.5L yoki Hot Lunch 90gr"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Kategoriya
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">Kategoriyasiz</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji ? `${c.emoji} ` : ''}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                O'lchov birligi
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value={ProductUnit.DONA}>Dona</option>
                <option value={ProductUnit.KG}>Kilogram (kg)</option>
                <option value={ProductUnit.LITR}>Litr</option>
                <option value={ProductUnit.METR}>Metr</option>
                <option value={ProductUnit.PACHKA}>Pachka</option>
                <option value={ProductUnit.QUTI}>Quti</option>
                <option value={ProductUnit.JUFT}>Juft</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-blue-400" />
                Shtrix-kod (EAN-13 / UPC)
              </label>
              <input
                type="text"
                placeholder="4780000000000"
                value={barcode}
                onChange={(e) => handleBarcodeChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Ichki artikul (SKU)
              </label>
              <input
                type="text"
                placeholder="ART-00123"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Narx va ombor qoldig'i
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Sotuv narxi (so'mda) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-semibold focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Chegirmadan oldingi narx (chizilgan narx)
              </label>
              <input
                type="number"
                min={0}
                value={oldPrice || ''}
                onChange={(e) => setOldPrice(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 md:col-span-2">
              <input
                type="checkbox"
                id="trackStock"
                checked={trackStock}
                onChange={(e) => setTrackStock(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <label htmlFor="trackStock" className="text-xs text-slate-300 cursor-pointer">
                Ombor qoldig'ini qat'iy hisoblash (Stock tracking)
              </label>
            </div>

            {trackStock && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Mavjud qoldiq soni
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Kam qolganlik chegarasi (ogohlantirish uchun)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Media & Details */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            Rasm va tavsif
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Rasm URL manzili (yoki Global katalog rasmi)
            </label>
            <input
              type="url"
              placeholder="https://example.com/product.webp"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
            {imageUrl && (
              <div className="mt-3 w-24 h-24 rounded-xl border border-slate-700 overflow-hidden bg-slate-900">
                <img src={imageUrl} alt="Ko'rinish" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Mahsulot tavsifi
            </label>
            <textarea
              rows={3}
              placeholder="Tarkibi, xususiyatlari, ishlab chiqaruvchi haqida..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
            />
            <label htmlFor="isActive" className="text-xs text-slate-300 cursor-pointer">
              Do'konda sotuv uchun faol ko'rinsin
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/products"
            className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Bekor qilish
          </Link>
          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/25 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saqlanmoqda...' : 'Mahsulotni saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}
