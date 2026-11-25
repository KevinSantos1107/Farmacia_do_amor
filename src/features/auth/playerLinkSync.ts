import { getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../../services/firebase/config';
import { siteDoc } from '../../services/firestore/paths';
import { usePlayerIdentityStore } from '../../store/usePlayerIdentityStore';

let lastSyncedKey: string | null = null;
let inFlightSync: Promise<boolean> | null = null;

function buildSyncKey(uid: string, player: string, tokenId: string): string {
  return `${uid}:${player}:${tokenId}`;
}

/**
 * Marca em memória que o vínculo player_links/{uid} já foi gravado com sucesso.
 */
export function markPlayerLinkSynced(uid: string, player: string, tokenId: string): void {
  lastSyncedKey = buildSyncKey(uid, player, tokenId);
}

/**
 * Limpa o cache em memória (ex.: após revogação ou logout).
 */
export function resetPlayerLinkSyncCache(): void {
  lastSyncedKey = null;
}

/**
 * Garante que player_links/{uid} no Firestore corresponde ao jogador e tokenId ativos
 * no store local antes de chamadas autenticadas às APIs serverless.
 *
 * Usa cache em memória por (uid, player, tokenId) para evitar leituras/escritas extras
 * em requisições normais, a menos que `force` seja verdadeiro (ex.: retry após 403).
 */
export async function ensurePlayerLink(force = false): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  const { player, tokenId } = usePlayerIdentityStore.getState();

  if (!uid || !tokenId || !player || player === 'visitante') {
    return false;
  }

  const key = buildSyncKey(uid, player, tokenId);
  if (!force && lastSyncedKey === key) {
    return true;
  }

  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async () => {
    try {
      const tokenSnap = await getDoc(siteDoc('player_tokens', tokenId));
      if (!tokenSnap.exists() || tokenSnap.data()?.player !== player) {
        return false;
      }

      await setDoc(siteDoc('player_links', uid), {
        player,
        tokenId,
      });
      lastSyncedKey = key;
      return true;
    } catch (err) {
      console.warn('[playerLinkSync] Falha ao sincronizar player_links:', err);
      return false;
    } finally {
      inFlightSync = null;
    }
  })();

  return inFlightSync;
}
