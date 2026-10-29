import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useSiteConfigStore } from '../store/siteConfigStore';
import { DEFAULT_SITE_ID } from '../config/defaults';
import { router } from './router';
import { Spinner } from '../shared/ui/Spinner';
import { applySiteMetadata, getCoupleDisplayName } from '../shared/utils/siteMetadata';

export default function App() {
  const { config, isLoading, error, loadConfig } = useSiteConfigStore();

  useEffect(() => {
    const siteId = import.meta.env.VITE_SITE_ID || DEFAULT_SITE_ID;
    loadConfig(siteId);
  }, [loadConfig]);

  // Previne ativação acidental do modo Caret Browsing (Navegação com cursor de texto) via tecla F7
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F7') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Inject dynamic <title>, PWA manifest, and <meta description> from siteConfig once loaded
  useEffect(() => {
    if (!config) return;
    const coupleName = getCoupleDisplayName(config.couple);
    const desc =
      (config as { seo?: { description?: string } }).seo?.description ||
      `O nosso espaço especial — ${coupleName}`;

    applySiteMetadata(coupleName, config.id, desc);
  }, [config]);

  const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  // Em rotas que começam com /admin: enquanto isLoading, mostrar apenas o Spinner com fundo escuro do admin
  if (isAdmin && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spinner size="lg" className="text-indigo-400" />
      </div>
    );
  }

  // Erro: sem config e sem cache — mostra tela de erro com botão de retry no site público
  if (!isAdmin && !isLoading && (error || !config)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4 px-4">
          <h1 className="text-2xl font-bold text-red-400">Erro ao carregar</h1>
          <p className="text-slate-400">{error || 'Configuração não encontrada'}</p>
          <button
            onClick={() => {
              const siteId = import.meta.env.VITE_SITE_ID || DEFAULT_SITE_ID;
              void loadConfig(siteId);
            }}
            className="mt-4 px-6 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-white font-medium transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // No site público ('/'): renderiza RouterProvider imediatamente.
  // O Shell.tsx é quem gerencia uma ÚNICA SplashScreen com a barra contínua.
  return <RouterProvider router={router} />;
}

