import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
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
  Crown,
  Phone,
  Sparkles,
  CheckCircle2,
  XCircle,
  Building2,
  UserPlus,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../services/api';
import {
  formatPhone,
  normalizeUzPhone,
  isValidUzPhone,
  isStrongPassword,
  isValidUsername,
} from '@flex/shared';

interface LoginPageProps {
  defaultTab?: 'login' | 'register';
}

export function LoginPage({ defaultTab }: LoginPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithCredentials, loginWithToken, registerOwner } = useAdminAuth();

  // Tab holati: 'login' yoki 'register'
  const isRegisterPath = location.pathname === '/register' || defaultTab === 'register';
  const [tab, setTab] = useState<'login' | 'register'>(isRegisterPath ? 'register' : 'login');

  // ── Login form holatlari ──────────────────────
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // ── Register form holatlari ───────────────────
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('+998 ');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // ── Umumiy holatlar ───────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tgInitData, setTgInitData] = useState<string | null>(null);

  useEffect(() => {
    // Agar URL /register bo'lsa tabni to'g'irlash
    if (location.pathname === '/register') {
      setTab('register');
    } else if (location.pathname === '/login') {
      setTab('login');
    }
  }, [location.pathname]);

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

  // Parol kuchi tekshiruvchilari (Live Password Strength Meter)
  const passwordChecks = useMemo(() => {
    const p = regPassword;
    return {
      hasMinLength: p.length >= 8,
      hasUpper: /[A-Z]/.test(p),
      hasLower: /[a-z]/.test(p),
      hasNumber: /[0-9]/.test(p),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
    };
  }, [regPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordChecks.hasMinLength) score++;
    if (passwordChecks.hasUpper && passwordChecks.hasLower) score++;
    if (passwordChecks.hasNumber) score++;
    if (passwordChecks.hasSpecial) score++;
    return score; // 0..4
  }, [passwordChecks]);

  // Telefon raqam kiritilganda formatlash
  const handlePhoneChange = (val: string) => {
    if (!val.startsWith('+998')) {
      setRegPhone('+998 ');
      return;
    }
    // Faqat raqamlar va bo'sh joy qoldiramiz
    const cleaned = val.replace(/[^\d+]/g, '');
    setRegPhone(formatPhone(cleaned));
  };

  // ── Login Submit ─────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  // ── Register Submit ──────────────────────────
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validatsiyalar
    if (regFirstName.trim().length < 2) {
      setError('Ismingizni to\'liq kiriting (kamida 2 ta harf)');
      return;
    }

    if (regStoreName.trim().length < 2) {
      setError('Do\'koningiz nomini kiriting (kamida 2 ta harf)');
      return;
    }

    if (!isValidUsername(regUsername.trim())) {
      setError('Username faqat lotin harflari, raqamlar va _ dan iborat bo\'lishi shart (3-30 ta belgi)');
      return;
    }

    const normalizedPhone = normalizeUzPhone(regPhone);
    if (!isValidUzPhone(normalizedPhone)) {
      setError('Telefon raqami O\'zbekiston formatida bo\'lishi shart (+998 90 123 45 67)');
      return;
    }

    if (!isStrongPassword(regPassword)) {
      setError('Parol xavfsizlik talablariga javob bermaydi (Kamida 8 ta belgi, katta-kichik harf, raqam va maxsus belgi)');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Kiritilgan parollar bir-biriga mos kelmadi');
      return;
    }

    setLoading(true);

    try {
      await registerOwner({
        firstName: regFirstName.trim(),
        lastName: regLastName.trim() || undefined,
        storeName: regStoreName.trim(),
        username: regUsername.trim(),
        phone: normalizedPhone,
        password: regPassword,
      });

      // Muvaffaqiyatli ro'yxatdan o'tgach darhol admin panelga yo'naltirish
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Orqa fon nur effekti */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Logo & Header */}
        <div className="text-center mb-6 relative">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-500/25 mb-3">
            F
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FLEX Platform</h1>
          <p className="text-xs text-slate-400 mt-1">
            {tab === 'login'
              ? 'Do\'kon boshqaruv paneliga xavfsiz kirish'
              : 'O\'z do\'koningizni 1 daqiqada oching va savdoni boshlang'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
              navigate('/login');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
              tab === 'login'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Tizimga kirish
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
              navigate('/register');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
              tab === 'register'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Yangi do'kon ochish
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-950/50 border border-rose-800/70 rounded-xl text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TAB 1: TIZIMGA KIRISH (LOGIN)
        ═══════════════════════════════════════════ */}
        {tab === 'login' && (
          <div>
            {/* Telegram 1-Click Banner */}
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

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Telefon raqami yoki Login
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="+998 90 123 45 67 yoki adham_rashidov"
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

            {/* Tezkor sinov tugmalari */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Tezkor sinov hisoblari
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setLogin('adham_rashidov');
                  setPassword('Adham123!');
                  setError(null);
                }}
                className="w-full bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 font-medium text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 group"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Super Admin (Big Boss) hisobi</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setLogin('hosil_admin');
                  setPassword('admin123');
                  setError(null);
                }}
                className="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 font-medium text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 group"
              >
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Do'kon egasi demo (<code>hosil_admin</code>)</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TAB 2: YANGI DO'KON OCHISH (REGISTER)
        ═══════════════════════════════════════════ */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {/* Ism & Familiya */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-blue-400" />
                  Ismingiz *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan, Olim"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Familiyangiz
                </label>
                <input
                  type="text"
                  placeholder="Masalan, Karimov"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Do'kon nomi */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                Do'koningiz nomi *
              </label>
              <input
                type="text"
                required
                placeholder="Masalan, Olim Parfyumeriya yoki Fresh Market"
                value={regStoreName}
                onChange={(e) => setRegStoreName(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Username & Telefon raqami */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-blue-400" />
                  Login / Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="olim_shop"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-blue-400" />
                  Telefon raqam *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+998 90 123 45 67"
                  value={regPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
            </div>

            {/* Parol */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  Kuchli parol yarating *
                </label>
              </div>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  placeholder="Kamida 8 belgi, katta-kichik harf, raqam va belgi"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Bar */}
              {regPassword.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => {
                      const isActive = strengthScore >= step;
                      const barColor =
                        strengthScore <= 1
                          ? 'bg-rose-500'
                          : strengthScore <= 3
                            ? 'bg-amber-400'
                            : 'bg-emerald-500';
                      return (
                        <div
                          key={step}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            isActive ? barColor : 'bg-slate-700'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 pt-1">
                    <span
                      className={`flex items-center gap-1 ${
                        passwordChecks.hasMinLength ? 'text-emerald-400 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {passwordChecks.hasMinLength ? (
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                      ) : (
                        <XCircle className="w-2.5 h-2.5 shrink-0" />
                      )}
                      Kamida 8 belgi
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        passwordChecks.hasUpper && passwordChecks.hasLower
                          ? 'text-emerald-400 font-medium'
                          : 'text-slate-500'
                      }`}
                    >
                      {passwordChecks.hasUpper && passwordChecks.hasLower ? (
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                      ) : (
                        <XCircle className="w-2.5 h-2.5 shrink-0" />
                      )}
                      Katta va kichik harf
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        passwordChecks.hasNumber ? 'text-emerald-400 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {passwordChecks.hasNumber ? (
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                      ) : (
                        <XCircle className="w-2.5 h-2.5 shrink-0" />
                      )}
                      Kamida 1 ta raqam
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        passwordChecks.hasSpecial ? 'text-emerald-400 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {passwordChecks.hasSpecial ? (
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                      ) : (
                        <XCircle className="w-2.5 h-2.5 shrink-0" />
                      )}
                      Maxsus belgi (!@#$)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Parolni tasdiqlash */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                Parolni takrorlang *
              </label>
              <input
                type="password"
                required
                placeholder="Parolni qayta tering"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                className={`w-full bg-slate-800/90 border rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                  regConfirmPassword && regConfirmPassword !== regPassword
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-slate-700 focus:border-blue-500'
                }`}
              />
              {regConfirmPassword && regConfirmPassword !== regPassword && (
                <p className="text-[11px] text-rose-400 mt-1">Parollar mos emas</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || strengthScore < 3}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 mt-3"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              {loading ? 'Do\'kon yaratilmoqda...' : 'Do\'konni ochish va Boshlash'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                  navigate('/login');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Profilingiz bormi? <span className="underline font-semibold">Tizimga kirish</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
