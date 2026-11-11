import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  TrendingUp,
  Settings,
  Store,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { cn } from '../../lib/utils';

export function AdminLayout() {
  const { currentStore, logout } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigate = useNavigate();

  const navItems = [
    { label: 'Boshqaruv paneli', path: '/', icon: LayoutDashboard },
    { label: 'Mahsulotlar', path: '/products', icon: Package },
    { label: 'Kategoriyalar', path: '/categories', icon: Layers },
    { label: 'Buyurtmalar', path: '/orders', icon: ShoppingBag },
    { label: 'Moliya va hisobot', path: '/finance', icon: TrendingUp },
    { label: 'Do\'kon sozlamalari', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800 p-4 shrink-0">
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/20">
            F
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm tracking-tight text-white truncate">
              {currentStore?.name || 'FLEX Admin'}
            </h1>
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Do'kon faol
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800 space-y-2">
          {currentStore?.slug && (
            <a
              href={`http://localhost:5173/?store=${currentStore.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <span className="flex items-center gap-2">
                <Store className="w-3.5 h-3.5" />
                Do'konni ochish
              </span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
            F
          </div>
          <span className="font-semibold text-sm text-white truncate max-w-[180px]">
            {currentStore?.name || 'FLEX Admin'}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute top-0 right-0 w-3/4 max-w-xs h-full bg-slate-950 border-l border-slate-800 p-5 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <span className="font-bold text-white text-sm">Menyu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        )
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-950/30 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
