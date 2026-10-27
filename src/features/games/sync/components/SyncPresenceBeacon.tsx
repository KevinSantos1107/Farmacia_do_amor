import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { setDoc, serverTimestamp } from 'firebase/firestore';
import { siteDoc } from '../../../../services/firestore/paths';
import { usePlayerIdentityStore } from '../../../../store/usePlayerIdentityStore';
import { useSiteConfigStore } from '../../../../store/siteConfigStore';
import { getPlayerIds } from '../../../auth/playerIds';
import { useModalsStore } from '../../../../store/useModalsStore';

export type SyncPresenceState = 'offline' | 'site' | 'game';

export interface SyncPresenceDoc {
  updatedAt: unknown;
  presence: Record<string, SyncPresenceState>;
  lastSeen: Record<string, number>;
}

/** Retorna true se o pathname indica que estamos dentro do jogo Sincronia */
function isOnSyncRoute(pathname: string): boolean {
  return pathname === '/sync' || pathname === '/sincronia';
}

export function SyncPresenceBeacon() {
  const player = usePlayerIdentityStore((s) => s.player);
  const config = useSiteConfigStore((s) => s.config);
  const { activeModal } = useModalsStore();
  const location = useLocation();

  useEffect(() => {
    if (!player || !config) return;
    const { p1Id, p2Id } = getPlayerIds(config);
    if (player !== p1Id && player !== p2Id) return;

    const roomId = `${p1Id}_${p2Id}`;
    const ref = siteDoc('sync_presence', roomId);

    // Considera "no jogo" tanto quando aberto via modal (activeModal === 'sync')
    // quanto quando acessado diretamente pela rota /sync ou /sincronia
    const getStatus = (): SyncPresenceState =>
      activeModal === 'sync' || isOnSyncRoute(location.pathname) ? 'game' : 'site';

    // IMPORTANT: Use nested objects (not dot-notation keys) so Firestore
    // merges them as sub-fields, not literal dot-in-key field names.
    const updatePresence = (status: SyncPresenceState) => {
      setDoc(
        ref,
        {
          presence: { [player]: status },
          lastSeen: { [player]: Date.now() },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ).catch(() => {});
    };

    updatePresence(getStatus());

    const ticker = setInterval(() => {
      if (document.hidden || !navigator.onLine) return;
      updatePresence(getStatus());
    }, 8000);

    const handleHide = () => updatePresence('offline');
    const handleVisibility = () => {
      if (!document.hidden) {
        updatePresence(getStatus());
      }
    };

    // Se o usuário fecha ou recarrega a aba, desmarca imediatamente
    window.addEventListener('beforeunload', handleHide);
    window.addEventListener('pagehide', handleHide);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(ticker);
      window.removeEventListener('beforeunload', handleHide);
      window.removeEventListener('pagehide', handleHide);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [player, config, activeModal, location.pathname]);

  return null;
}
