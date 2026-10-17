import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase/auth';
import { ToastProvider } from '../../shared/ui/ToastProvider';
import {
  LogOut,
  LayoutDashboard,
  Settings,
  Image as ImageIcon,
  Music,
  History,
  Menu,
  X,
  ExternalLink,
  Share2,
  KeyRound,
  Sparkles,
} from 'lucide-react';

export function AdminShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Exact match for /admin (Dashboard), prefix match for all others
  const isActive = (path: string) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(path);


  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Configurações', icon: Settings, path: '/admin/config' },
    { label: 'Retrospectiva', icon: Sparkles, path: '/admin/retrospective' },
    { label: 'Álbum', icon: ImageIcon, path: '/admin/album' },
    { label: 'História', icon: History, path: '/admin/timeline' },
    { label: 'Músicas', icon: Music, path: '/admin/playlist' },
    { label: 'Roleta', icon: LayoutDashboard, path: '/admin/roulette' },
    { label: 'Mapa de Estrelas', icon: LayoutDashboard, path: '/admin/starmap' },
    { label: 'Quiz do Casal', icon: Settings, path: '/admin/quiz' },
    { label: 'Acessos (Links)', icon: KeyRound, path: '/admin/tokens' },
    { label: 'Compartilhar', icon: Share2, path: '/admin/share' },
  ];

  return (
    <ToastProvider>
      <div className="h-[100dvh] w-full flex bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Overlay do Mobile e Tablet */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixa na esquerda (Desktop >= lg) ou Drawer (Mobile e Tablet < lg) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center">
            <span className="font-serif font-bold text-lg tracking-tight text-white">
              Engine Admin
            </span>
            {user?.role === 'super_admin' && (
              <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-mono uppercase">
                Master
              </span>
            )}
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            aria-label="Fechar menu"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  navigate(item.path);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? 'bg-slate-800 text-white font-semibold border-l-2 border-indigo-500 pl-[10px]'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? 'opacity-100 text-indigo-400' : 'opacity-70'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold uppercase shadow-lg">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
              <p className="text-xs text-indigo-400 truncate font-medium">
                {user?.role === 'super_admin' ? '⭐ Super Admin' : '🔑 Administrador'}
              </p>
            </div>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors mb-2"
          >
            <ExternalLink className="w-4 h-4" />
            Ver Site
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900">
        {/* Mobile & Tablet Header */}
        <header className="h-16 lg:hidden flex items-center justify-between px-4 sm:px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação"
              className="text-slate-400 hover:text-white p-1"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-serif font-bold text-white">Engine Admin</span>
          </div>
          <button onClick={handleLogout} aria-label="Sair do painel" className="text-red-400 p-1">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
    </ToastProvider>
  );
}
