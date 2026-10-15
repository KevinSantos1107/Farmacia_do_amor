import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useSiteConfigStore } from '../store/siteConfigStore';
import { DEFAULT_SITE_ID } from '../config/defaults';
import { router } from './router';

export default function App() {
  const { config, isLoading, error, loadConfig } = useSiteConfigStore();

  useEffect(() => {
    // In dev, use the env var. In prod, this might come from window.location.hostname
    const siteId = import.meta.env.VITE_SITE_ID || DEFAULT_SITE_ID;
    loadConfig(siteId);
  }, [loadConfig]);

  // Inject dynamic <title> and <meta description> from siteConfig once loaded
  useEffect(() => {
    if (!config) return;
    const couple = config.couple;
    if (couple) {
      const title = `${couple.partner1.name} & ${couple.partner2.name}`;
      document.title = title;
      
      const desc = (config as { seo?: { description?: string } }).seo?.description || `O nosso espaço especial — ${title}`;
      
      // Update or create Description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', desc);

      // OpenGraph Tags
      const updateOgTag = (property: string, content: string) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('property', property);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      };

      updateOgTag('og:title', title);
      updateOgTag('og:description', desc);
      updateOgTag('og:type', 'website');
    }
  }, [config]);

  // Removido o if(isLoading) para que o SplashScreen cuide de toda a UI de loading inicial

  // Only show error if we are done loading and there is still an error or no config
  if (!isLoading && (error || !config)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Erro ao carregar</h1>
          <p className="text-slate-400">{error || 'Configuração não encontrada'}</p>
        </div>
      </div>
    );
  }

  return (
    <RouterProvider router={router} />
  );
}
