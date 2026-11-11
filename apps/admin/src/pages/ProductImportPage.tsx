import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  FileSpreadsheet,
  Globe,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Sparkles,
  Download,
} from 'lucide-react';
import { adminApi } from '../services/api';


interface CatalogItem {
  id: number;
  name: string;
  barcode: string | null;
  category: string | null;
  imageUrl: string | null;
  unit: string;
  brand: string | null;
  isAdopted?: boolean;
}

export function ProductImportPage() {
  const [activeTab, setActiveTab] = useState<'excel' | 'catalog'>('catalog');

  // Excel state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [excelResult, setExcelResult] = useState<{
    success: boolean;
    total: number;
    created: number;
    updated: number;
    autoLinkedImages: number;
    errors?: string[];
  } | null>(null);

  // Global Catalog state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [catalogResults, setCatalogResults] = useState<CatalogItem[]>([]);
  const [adoptingId, setAdoptingId] = useState<number | null>(null);
  const [adoptPrice, setAdoptPrice] = useState<number>(15000);
  const [adoptStock, setAdoptStock] = useState<number>(10);
  const [adoptModalItem, setAdoptModalItem] = useState<CatalogItem | null>(null);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setExcelResult(null);

    try {
      const res = await adminApi.uploadFile<{
        total: number;
        created: number;
        updated: number;
        autoLinkedImages: number;
        errors?: string[];
      }>('/store/import/excel', file);

      setExcelResult({
        success: true,
        ...res,
      });
      setFile(null);
    } catch (err: unknown) {
      setExcelResult({
        success: false,
        total: 0,
        created: 0,
        updated: 0,
        autoLinkedImages: 0,
        errors: [err instanceof Error ? err.message : 'Faylni o\'qishda xatolik yuz berdi'],
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCatalogSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await adminApi.get<CatalogItem[]>('/store/catalog/search', {
        query: searchQuery.trim(),
      });
      setCatalogResults(res);
    } catch (err) {
      console.warn('Katalogni qidirishda xatolik:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAdopt = async () => {
    if (!adoptModalItem) return;
    setAdoptingId(adoptModalItem.id);
    try {
      await adminApi.post('/store/catalog/adopt', {
        catalogId: adoptModalItem.id,
        price: adoptPrice,
        stockQuantity: adoptStock,
      });
      setCatalogResults((prev) =>
        prev.map((it) => (it.id === adoptModalItem.id ? { ...it, isAdopted: true } : it))
      );
      setAdoptModalItem(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'O\'zlashtirishda xatolik');
    } finally {
      setAdoptingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Mahsulotlar ro'yxatiga qaytish
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Mahsulotlarni ommaviy import qilish</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Excel fayl orqali yuklang yoki tayyor Global Katalogdan tanlang
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'catalog'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          Global Katalogdan tanlash (Tavsiya etiladi)
        </button>
        <button
          onClick={() => setActiveTab('excel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'excel'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel / CSV Fayl yuklash
        </button>
      </div>

      {/* Tab 1: Global Catalog Adoption */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  O'zbekistondagi eng mashhur tovarlar bazasi
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Shtrix-kod yoki tovar nomini yozing. Tayyor tiniq studiya rasmlari va tavsiflari bilan 1-klikda do'koningizga qo'shing. Barcha do'konlar yagona rasm bazasidan foydalanadi (0 bayt ortiqcha disk sarfi).
                </p>
              </div>
            </div>

            <form onSubmit={handleCatalogSearch} className="flex gap-2 pt-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Masalan: Coca-Cola, Dinay, Hot Lunch, 478000..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                {searching ? 'Qidirilmoqda...' : 'Qidirish'}
              </button>
            </form>
          </div>

          {/* Catalog Results Grid */}
          {catalogResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {catalogResults.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    <div className="aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Globe className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                        {item.category || item.brand || 'Umumiy'}
                      </span>
                      <h4 className="font-bold text-white text-xs line-clamp-2 mt-0.5">{item.name}</h4>
                      {item.barcode && (
                        <div className="text-[11px] font-mono text-slate-400 mt-1">{item.barcode}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    {item.isAdopted ? (
                      <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Do'konga qo'shildi
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAdoptModalItem(item);
                          setAdoptPrice(15000);
                          setAdoptStock(10);
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Do'konga qo'shish
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Excel / CSV Upload */}
      {activeTab === 'excel' && (
        <div className="space-y-6">
          <div className="bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white">Excel faylini yuklash</h3>
              <p className="text-xs text-slate-400 mt-1">
                Fayl ustunlari: <code>Nomi (shart)</code>, <code>Narxi</code>, <code>Shtrix-kod</code>, <code>Kategoriya</code>, <code>Qoldiq</code>
              </p>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center transition cursor-pointer bg-slate-900/40">
                <input
                  type="file"
                  id="excelFileInput"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="excelFileInput" className="cursor-pointer block">
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-white block">
                    {file ? file.name : 'Excel yoki CSV faylni bu yerga tashlang yoki bosing'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Maksimal hajm: 10 MB (.xlsx, .csv)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <a
                  href="/templates/import_template.xlsx"
                  download
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Namuna faylni yuklab olish
                </a>

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition"
                >
                  {uploading ? 'Yuklanmoqda va tahlil qilinmoqda...' : 'Importni boshlash'}
                </button>
              </div>
            </form>
          </div>

          {/* Import Result Notification */}
          {excelResult && (
            <div
              className={`p-5 rounded-2xl border ${
                excelResult.success
                  ? 'bg-emerald-950/40 border-emerald-800/60'
                  : 'bg-rose-950/40 border-rose-800/60'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {excelResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )}
                <h4 className="text-sm font-bold text-white">
                  {excelResult.success ? 'Import muvaffaqiyatli yakunlandi!' : 'Importda xatolik yuz berdi'}
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-900/60 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Jami qatorlar:</span>
                  <strong className="text-white text-sm">{excelResult.total}</strong>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Yangi tovarlar:</span>
                  <strong className="text-emerald-400 text-sm">{excelResult.created}</strong>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Yangilanganlar:</span>
                  <strong className="text-blue-400 text-sm">{excelResult.updated}</strong>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Avto-ulangan rasm:</span>
                  <strong className="text-purple-400 text-sm">{excelResult.autoLinkedImages}</strong>
                </div>
              </div>

              {excelResult.errors && excelResult.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-rose-300 space-y-1">
                  {excelResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Adopt Modal */}
      {adoptModalItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-white text-base mb-1">Do'konga qo'shish</h3>
            <p className="text-xs text-slate-400 mb-4 line-clamp-1">{adoptModalItem.name}</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sotuv narxi (so'mda)
                </label>
                <input
                  type="number"
                  min={0}
                  value={adoptPrice}
                  onChange={(e) => setAdoptPrice(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dastlabki qoldiq (dona)
                </label>
                <input
                  type="number"
                  min={0}
                  value={adoptStock}
                  onChange={(e) => setAdoptStock(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setAdoptModalItem(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleAdopt}
                disabled={adoptingId !== null}
                className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition"
              >
                {adoptingId !== null ? 'Qo\'shilmoqda...' : 'Tasdiqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
