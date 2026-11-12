import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  LogIn,
  User,
  Lock,
  Eye,
  EyeOff,
  Store,
  ShieldAlert,
  ArrowRight,
  Send,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../services/api';

export function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loginWithCredentials, loginWithToken } = useAdminAuth();
  const navigate = useNavigate();

  // Telegram WebApp orqali ochilganini tekshirish
  const [tgInitData, setTgInitData] = useState<string | null>(null);

  useEffect(() => {
    // Saved loginni xotiradan olish
    const savedLogin = localStorage.getItem('flex_admin_saved_login');
    if (savedLogin) setLogin(savedLogin);

    // Telegram WebApp ma'lumotlarini tekshirish
    const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
    if (tg?.initData) {
      setTgInitData(tg.initData);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) {
      setError('Telefon/login va parolni kiriting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (rememberMe) {
        localStorage.setItem('flex_admin_saved_login', login.trim());
      } else {
        localStorage.removeItem('flex_admin_saved_login');
      }

      await loginWithCredentials(login.trim(), password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login yoki parol noto\'g\'ri');
    } finally {
      setLoading(false);
    }
  };

  // Telegram orqali 1-klikda kirish
  const handleTelegramLogin = async () => {
    if (!tgInitData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.post<{ token: string; user: { id: number } }>('/auth/telegram', {
        initData: tgInitData,
      });
      await loginWithToken(res.token);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Telegram orqali kirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // Demo ma'lumotlar bilan to'ldirish
  const fillDemoCredentials = () => {
    setLogin('hosil_admin');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Orqa fon nur effekti */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Logo & Header */}
        <div className="text-center mb-8 relative">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-500/25 mb-4">
            F
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FLEX Admin</h1>
          <p className="text-xs text-slate-400 mt-1">
            Do'kon boshqaruv paneliga xavfsiz kirish
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Telegram 1-Click Banner (agar Telegram orqali ochilgan bo'lsa) */}
        {tgInitData && (
          <div className="mb-6 p-4 bg-blue-950/40 border border-blue-800/60 rounded-2xl">
            <p className="text-xs text-slate-300 mb-3">
              Telegram hisobingiz aniqlandi. Parolsiz, 1-klikda kirishingiz mumkin:
            </p>
            <button
              type="button"
              onClick={handleTelegramLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Send className="w-4 h-4" />
              Telegram orqali kirish
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              Telefon raqami yoki Login
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="+998 90 123 45 67 yoki hosil_admin"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                Parol
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Parolingizni kiriting"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              Eslab qolish
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 mt-2"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Tekshirilmoqda...' : 'Tizimga kirish'}
          </button>
        </form>

        {/* Demo yordamchi tugma */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Tezkor sinov
          </span>
        </div>

        <button
          type="button"
          onClick={fillDemoCredentials}
          className="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 font-medium text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 group"
        >
          <Store className="w-4 h-4 text-emerald-400" />
          <span>Demo egasi hisobini to'ldirish (<code>hosil_admin</code>)</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
        </button>
      </div>
    </div>
  );
}
