import { useEffect } from 'react';
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

export function SyncPresenceBeacon() {
  const player = usePlayerIdentityStore((s) => s.player);
  const config = useSiteConfigStore((s) => s.config);
  const { activeModal } = useModalsStore();

  useEffect(() => {
    if (!player || !config) return;
    const { p1Id, p2Id } = getPlayerIds(config);
    if (player !== p1Id && player !== p2Id) return;

    const roomId = `${p1Id}_${p2Id}`;
    const ref = siteDoc('sync_presence', roomId);

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

    const currentStatus: SyncPresenceState = activeModal === 'sync' ? 'game' : 'site';
    updatePresence(currentStatus);

    const ticker = setInterval(() => {
      if (document.hidden || !navigator.onLine) return;
      const status: SyncPresenceState = activeModal === 'sync' ? 'game' : 'site';
      updatePresence(status);
    }, 15000);

    const handleHide = () => updatePresence('offline');
    const handleVisibility = () => {
      if (!document.hidden) {
        const status: SyncPresenceState = activeModal === 'sync' ? 'game' : 'site';
        updatePresence(status);
      }
    };

    window.addEventListener('pagehide', handleHide);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(ticker);
      window.removeEventListener('pagehide', handleHide);
      document.removeEventListener('visibilitychange', handleVisibility);
      updatePresence('offline');
    };
  }, [player, config, activeModal]);

  return null;
}
