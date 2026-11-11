import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  Store,
  Truck,
  CreditCard,
  Key,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Save,
} from 'lucide-react';



interface PosSettings {
  posApiKey: string | null;
  posEnabled: boolean;
  posLastSyncAt: string | null;
}

export function SettingsPage() {
  const { currentStore, refreshProfile } = useAdminAuth();

  // Store General Settings Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(5);
  const [deliveryPrice, setDeliveryPrice] = useState(10000);
  const [minOrderAmount, setMinOrderAmount] = useState(30000);
  const [paymentCardNumber, setPaymentCardNumber] = useState('');
  const [paymentCardHolder, setPaymentCardHolder] = useState('');
  const [savingStore, setSavingStore] = useState(false);
  const [storeSavedSuccess, setStoreSavedSuccess] = useState(false);

  // POS Settings
  const [posData, setPosData] = useState<PosSettings | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (currentStore) {
      setName(currentStore.name);
      setDescription(currentStore.description || '');
      setPhone(currentStore.phone || '');
      setDeliveryEnabled(currentStore.deliveryEnabled);
      setDeliveryRadiusKm(currentStore.deliveryRadiusKm);
      setDeliveryPrice(currentStore.deliveryPrice);
      setMinOrderAmount(currentStore.minOrderAmount);
      setPaymentCardNumber(((currentStore as unknown) as Record<string, unknown>).paymentCardNumber as string || '');
      setPaymentCardHolder(((currentStore as unknown) as Record<string, unknown>).paymentCardHolder as string || '');
    }
  }, [currentStore]);

  const fetchPosSettings = async () => {
    try {
      const data = await adminApi.get<PosSettings>('/store/settings/pos');
      setPosData(data);
    } catch (err) {
      console.warn('POS sozlamalarini yuklashda xatolik:', err);
    }
  };

  useEffect(() => {
    fetchPosSettings();
  }, []);

  const handleSaveStore = async (e: FormEvent) => {

    e.preventDefault();
    setSavingStore(true);
    setStoreSavedSuccess(false);

    try {
      await adminApi.patch('/store/profile', {
        name: name.trim(),
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        deliveryEnabled,
        deliveryRadiusKm: Number(deliveryRadiusKm),
        deliveryPrice: Number(deliveryPrice),
        minOrderAmount: Number(minOrderAmount),
        paymentCardNumber: paymentCardNumber.trim() || undefined,
        paymentCardHolder: paymentCardHolder.trim() || undefined,
      });
      await refreshProfile();
      setStoreSavedSuccess(true);
      setTimeout(() => setStoreSavedSuccess(false), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Saqlashda xatolik');
    } finally {
      setSavingStore(false);
    }
  };

  const handleTogglePos = async (enabled: boolean) => {
    try {
      await adminApi.patch('/store/settings/pos/toggle', { enabled });
      setPosData((prev) => (prev ? { ...prev, posEnabled: enabled } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'POS statusini o\'zgartirishda xatolik');
    }
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Yangi POS API kalit generatsiya qilmoqchimisiz? Eskisi bekor qilinadi!')) return;
    setRegenerating(true);
    try {
      const res = await adminApi.post<{ posApiKey: string }>('/store/settings/pos/regenerate-key');
      setPosData((prev) => (prev ? { ...prev, posApiKey: res.posApiKey } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Kalit generatsiya qilishda xatolik');
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Do'kon sozlamalari</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Do'kon profili, yetkazib berish hududi va POS/1C integratsiyasi
        </p>
      </div>

      {storeSavedSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          Sozlamalar muvaffaqiyatli saqlandi!
        </div>
      )}

      {/* Store General Settings */}
      <form onSubmit={handleSaveStore} className="space-y-6">
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-400" />
            Umumiy ma'lumotlar
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Do'kon nomi *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Bog'lanish telefoni</label>
              <input
                type="text"
                placeholder="+998 90 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium text-slate-300 mb-1.5">Do'kon tavsifi</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Do'kon haqida qisqacha ma'lumot..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Delivery Settings */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            Yetkazib berish parametrlari
          </h3>

          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="deliveryEnabled"
              checked={deliveryEnabled}
              onChange={(e) => setDeliveryEnabled(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
            />
            <label htmlFor="deliveryEnabled" className="text-xs text-slate-300 cursor-pointer">
              Yetkazib berish xizmati yoqilgan bo'lsin
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Radius (km)</label>
              <input
                type="number"
                min={1}
                value={deliveryRadiusKm}
                onChange={(e) => setDeliveryRadiusKm(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Yetkazish narxi (so'm)</label>
              <input
                type="number"
                min={0}
                value={deliveryPrice}
                onChange={(e) => setDeliveryPrice(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Minimal buyurtma (so'm)</label>
              <input
                type="number"
                min={0}
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* P2P Payment Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-400" />
            Karta orqali to'lov (P2P chek qabul qilish)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Karta raqami</label>
              <input
                type="text"
                placeholder="8600 0000 0000 0000"
                value={paymentCardNumber}
                onChange={(e) => setPaymentCardNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Karta egasi ismi</label>
              <input
                type="text"
                placeholder="ALISHER VALIYEV"
                value={paymentCardHolder}
                onChange={(e) => setPaymentCardHolder(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white uppercase focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingStore}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg transition"
          >
            <Save className="w-4 h-4" />
            {savingStore ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
          </button>
        </div>
      </form>

      {/* POS / 1C Integration Settings Section */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">POS va 1C Sinxronizatsiya</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kassada tovar sotilganda avtomatik ravishda FLEX stock'ni kamaytirish
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">POS holati:</span>
            <button
              onClick={() => handleTogglePos(!posData?.posEnabled)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                posData?.posEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {posData?.posEnabled ? 'Faol' : 'O\'chiq'}
            </button>
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-300">
            Do'konning Maxfiy POS API Kaliti
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={posData?.posApiKey || 'Kalit generatsiya qilinmagan'}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-emerald-400 select-all"
            />
            {posData?.posApiKey && (
              <button
                type="button"
                onClick={() => copyToClipboard(posData.posApiKey || '')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
                title="Nusxalash"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              disabled={regenerating}
              onClick={handleRegenerateKey}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
              title="Yangi kalit yaratish"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Bu kalitni 1C yoki kassa dasturiga <code>X-POS-Api-Key</code> sarlavhasi (header) sifatida kiritasiz.
          </p>
        </div>

        {/* 1C Sync Agent Instruction Box */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-blue-400" />
            1C va POS Sync Agent buyrug'i:
          </h4>
          <pre className="p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto">
            {`npx tsx tools/sync-agent/agent.ts --url http://localhost:4000 --key ${posData?.posApiKey || '<YOUR_KEY>'} --file ./stock.json`}
          </pre>
          <p className="text-[11px] text-slate-400">
            Agent har qanday o'zgarishni avtomatik ravishda FLEX platformasiga sinxronizatsiya qilib boradi.
          </p>
        </div>
      </div>
    </div>
  );
}
