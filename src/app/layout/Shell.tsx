import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '../../shared/utils/cn';
import { SplashScreen } from '../../features/core/SplashScreen';
import { HamburgerMenu } from '../../features/core/HamburgerMenu';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { lazy, Suspense } from 'react';
import Home from '../../pages/Home';
import { GlobalModals } from '../../features/modals/GlobalModals';
import { PlayerAuthInit } from '../../features/auth/PlayerAuthInit';
import { AccessDeniedPanel } from '../../features/auth/AccessDeniedPanel';
import { usePlayerIdentityStore } from '../../store/usePlayerIdentityStore';
import { lockBodyScroll } from '../../shared/utils/scrollLock';

const RetroShell = lazy(() => import('../../features/retrospective-v2/components/RetroShell').then(m => ({ default: m.RetroShell })));
const AudioEngine = lazy(() => import('../../features/player/AudioEngine').then(m => ({ default: m.AudioEngine })));
const ReturnToGameToast = lazy(() => import('../../features/games/sync/components/ReturnToGameToast').then(m => ({ default: m.ReturnToGameToast })));
const SyncPresenceBeacon = lazy(() => import('../../features/games/sync/components/SyncPresenceBeacon').then(m => ({ default: m.SyncPresenceBeacon })));
const SyncInviteToast = lazy(() => import('../../features/games/sync/components/SyncInviteToast').then(m => ({ default: m.SyncInviteToast })));

export function Shell() {
  const [showSplash, setShowSplash] = useState(true);
  const { config, isLoading } = useSiteConfigStore();
  const tokenStatus = usePlayerIdentityStore((s) => s.tokenStatus);
  const location = useLocation();

  // The site is ready when config is loaded. We can also add other ready checks here later.
  const isReady = !isLoading && !!config;

  const title = config?.couple
    ? `${config.couple.partner1.name} & ${config.couple.partner2.name}`
    : 'Kevin & Iara';

  // Se o usuário acessou diretamente uma rota de overlay (/quiz, /word-game, /devotional, etc.)
  // como primeira página da sessão (idx === 0), prepara a raiz '/' no histórico.
  // Assim, se o usuário pressionar Voltar no navegador ou notebook, ele voltará para a Home
  // em vez de ser jogado para fora do site (ex: tela inicial do Google).
  useEffect(() => {
    const isOverlayRoute = location.pathname !== '/' && !location.pathname.startsWith('/admin');
    const isFirstEntry = window.history.state?.idx === 0;

    if (isOverlayRoute && isFirstEntry) {
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      try {
        window.history.replaceState({ ...window.history.state, idx: 0 }, '', '/');
        window.history.pushState({ ...window.history.state, idx: 1 }, '', currentPath);
      } catch {
        // Ignora em caso de restrição do ambiente
      }
    }
  }, []); // Executa apenas na carga inicial

  // Previne rolagem do body enquanto a splash screen estiver ativa
  useEffect(() => {
    if (showSplash) {
      const unlock = lockBodyScroll();
      return () => {
        unlock();
      };
    }
  }, [showSplash]);

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text transition-colors duration-700 font-sans relative">
      <PlayerAuthInit />

      {/* Se o token não foi validado/autorizado e a verificação terminou */}
      {tokenStatus === 'unauthorized' ? (
        <AccessDeniedPanel />
      ) : (
        <>
          {/* Splash Screen fica sobreposto até terminar sua animação de saída */}
          {showSplash && (
            <SplashScreen
              isReady={isReady && tokenStatus === 'authorized'}
              onComplete={() => setShowSplash(false)}
              title={title}
            />
          )}

          {/* Renderiza o site por baixo apenas quando as configurações e autorização estiverem prontas. */}
          {isReady && tokenStatus === 'authorized' && (
            <div 
              className={cn(
                "flex flex-col min-h-screen",
                showSplash ? "pointer-events-none h-screen overflow-hidden" : ""
              )}
            >
              <Suspense fallback={null}>
                <RetroShell />
              </Suspense>
              
              <HamburgerMenu />

              <main className="flex-1">
                <Home />
                <Outlet />
              </main>

              <Suspense fallback={null}>
                <AudioEngine />
              </Suspense>
              <GlobalModals />
              <Suspense fallback={null}>
                <ReturnToGameToast />
                <SyncPresenceBeacon />
                <SyncInviteToast />
              </Suspense>
            </div>
          )}
        </>
      )}
    </div>
  );
}
