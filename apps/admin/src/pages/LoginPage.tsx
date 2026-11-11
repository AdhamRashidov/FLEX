import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogIn, Key, Store, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../services/api';

export function LoginPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loginWithToken } = useAdminAuth();
  const navigate = useNavigate();

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await loginWithToken(tokenInput.trim());
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Tizimga kirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // Demo do'kon egasi sifatida tezkor kirish (Development / Demo rejim)
  const handleQuickDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Demo authentication via mock Telegram InitData or developer endpoint
      const res = await adminApi.post<{ token: string; user: { id: number } }>('/auth/telegram', {
        initData: 'query_id=test_owner_admin&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Adham%22%2C%22last_name%22%3A%22Owner%22%2C%22username%22%3A%22adham_owner%22%7D&auth_date=1731150000&hash=mock',
        storeSlug: 'hosil-market',
      });
      await loginWithToken(res.token, 1);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo kirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-600/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-600/10 rounded-full blur-2xl" />

        <div className="text-center mb-8 relative">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-500/20 mb-4">
            F
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FLEX Admin</h1>
          <p className="text-sm text-slate-400 mt-1">
            Do'kon egasi boshqaruv paneliga xush kelibsiz
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleManualLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              JWT Avtorizatsiya Tokoni
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !tokenInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Tekshirilmoqda...' : 'Token orqali kirish'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Yoki
          </span>
        </div>

        <button
          onClick={handleQuickDemoLogin}
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 font-medium text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 group"
        >
          <Store className="w-4 h-4 text-emerald-400" />
          Hosil Market (Demo egasi) sifatida kirish
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
        </button>
      </div>
    </div>
  );
}
