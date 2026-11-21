import { useState, useEffect, useMemo, useCallback } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { siteDoc, getCurrentSiteId } from '../../../services/firestore/paths';
import { useSiteConfigStore } from '../../../store/siteConfigStore';
import { usePlayerIdentityStore } from '../../../store/usePlayerIdentityStore';
import { getPlayerIds, getPlayerDisplayName } from '../../auth/playerIds';
import type { SyncPresenceDoc, SyncPresenceState } from '../sync/components/SyncPresenceBeacon';
import {
  subscribeToWordDuelRoom,
  startInvite,
  cancelInvite,
  acceptInvite,
  rejectInvite,
  updateLiveDraft,
  leaveGameRoom,
  forceEndGameRoom,
  returnToGameRoom,
  submitSecretWord,
  submitGuess,
  resetWordDuel,
} from './wordDuelService';
import type { WordDuelRoom } from './types';
import type { LetterCell } from '../word/types';

export function useWordDuel() {
  const config = useSiteConfigStore((s) => s.config);
  const myPlayerId = usePlayerIdentityStore((s) => s.player);
  // Usa getCurrentSiteId() (não hook) para evitar dependência do AuthContext
  // que só existe na árvore /admin. O siteDoc() já usa getCurrentSiteId() internamente.
  const siteId = getCurrentSiteId();

  const { p1Id, p2Id } = useMemo(() => getPlayerIds(config), [config]);
  const roomId = `${p1Id}_${p2Id}`;

  const isPlayer = myPlayerId === p1Id || myPlayerId === p2Id;
  const isP1 = myPlayerId === p1Id;
  const partnerId = isP1 ? p2Id : p1Id;
  const myDisplayName = getPlayerDisplayName(myPlayerId, config);
  const partnerDisplayName = getPlayerDisplayName(partnerId, config);

  const p1Avatar = config?.couple?.partner1?.avatar || (config?.couple?.partner1 as unknown as { avatarUrl?: string })?.avatarUrl;
  const p2Avatar = config?.couple?.partner2?.avatar || (config?.couple?.partner2 as unknown as { avatarUrl?: string })?.avatarUrl;
  const playerAvatar = (isP1 ? p1Avatar : p2Avatar) || undefined;
  const partnerAvatar = (isP1 ? p2Avatar : p1Avatar) || undefined;

  const [room, setRoom] = useState<WordDuelRoom | null>(null);
  const [partnerPresence, setPartnerPresence] = useState<SyncPresenceState>('offline');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Escuta a sala do duelo
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToWordDuelRoom(
      roomId,
      siteId,
      (updatedRoom) => {
        setRoom(updatedRoom);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [roomId, siteId]);

  // Escuta a presença do parceiro (reaproveitando o beacon já existente do sync)
  useEffect(() => {
    if (!isPlayer) return;
    const presenceRef = siteDoc('sync_presence', roomId, siteId);
    const unsubPresence = onSnapshot(presenceRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SyncPresenceDoc;
        const status = data.presence?.[partnerId] || 'offline';
        const partnerGame = data.currentGame?.[partnerId];
        const lastSeen = data.lastSeen?.[partnerId] || 0;
        if (status === 'offline' || Date.now() - lastSeen > 20000) {
          setPartnerPresence('offline');
        } else if (status === 'game' && partnerGame === 'word-duel') {
          // Parceiro está especificamente na sala do Duelo de Palavras!
          setPartnerPresence('game');
        } else {
          // Parceiro está no site geral ou em outro jogo (ex: Sincronia)
          setPartnerPresence('site');
        }
      } else {
        setPartnerPresence('offline');
      }
    });
    return () => unsubPresence();
  }, [isPlayer, partnerId, roomId, siteId]);

  // Expiração automática de convite
  const roomStatus = room?.status;
  const inviteExpiresAt = room?.inviteExpiresAt;
  const roomHostId = room?.hostId;

  useEffect(() => {
    if (roomStatus !== 'inviting' || roomHostId !== myPlayerId) return;
    if (!inviteExpiresAt) return;
    const delay = inviteExpiresAt - Date.now();
    const expire = () => {
      cancelInvite(roomId, siteId).catch(() => {});
    };
    if (delay <= 0) {
      expire();
      return;
    }
    const timer = setTimeout(expire, delay);
    return () => clearTimeout(timer);
  }, [roomStatus, inviteExpiresAt, roomHostId, myPlayerId, roomId, siteId]);

  const status = room?.status ?? 'lobby';
  const isInviting = status === 'inviting' && room?.hostId === myPlayerId;
  const isInvited = status === 'inviting' && room?.hostId !== myPlayerId;

  const myLocked = isP1 ? !!room?.p1Locked : !!room?.p2Locked;
  const partnerLocked = isP1 ? !!room?.p2Locked : !!room?.p1Locked;

  const myGuesses: LetterCell[][] = useMemo(() => {
    if (!room) return [];
    return isP1 ? room.p1Guesses || [] : room.p2Guesses || [];
  }, [room, isP1]);

  const partnerGuesses: LetterCell[][] = useMemo(() => {
    if (!room) return [];
    return isP1 ? room.p2Guesses || [] : room.p1Guesses || [];
  }, [room, isP1]);

  // Rascunho ao vivo
  const partnerDraft = room?.liveDraft?.[partnerId];
  const myDraft = room?.liveDraft?.[myPlayerId];

  const isMyTurn = status === 'dueling' && room?.currentTurn === myPlayerId;
  const isWinner = room?.status === 'round_over' && room.winnerId === myPlayerId;

  const myRevealedSecret = isP1 ? room?.p1RevealedWord : room?.p2RevealedWord;
  const partnerRevealedSecret = isP1 ? room?.p2RevealedWord : room?.p1RevealedWord;

  // Ações
  const handleStartDuel = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await startInvite(roomId, myPlayerId, partnerPresence, siteId);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao iniciar duelo');
    } finally {
      setIsSubmitting(false);
    }
  }, [roomId, myPlayerId, partnerPresence, siteId]);

  const handleCancelInvite = useCallback(async () => {
    await cancelInvite(roomId, siteId);
  }, [roomId, siteId]);

  const handleAcceptInvite = useCallback(async () => {
    await acceptInvite(roomId, siteId);
  }, [roomId, siteId]);

  const handleRejectInvite = useCallback(async () => {
    await rejectInvite(roomId, siteId);
  }, [roomId, siteId]);

  const leaveGame = useCallback(
    async (targetPlayerId?: string) => {
      await leaveGameRoom(roomId, targetPlayerId || myPlayerId, room?.status, siteId);
    },
    [roomId, myPlayerId, room?.status, siteId]
  );

  const forceEndGame = useCallback(async () => {
    await forceEndGameRoom(roomId, siteId);
  }, [roomId, siteId]);

  const returnToGame = useCallback(async () => {
    await returnToGameRoom(roomId, siteId);
  }, [roomId, siteId]);

  // Detector de parceiro desconectado / dead tab durante partida ativa
  useEffect(() => {
    if (status !== 'waiting_words' && status !== 'dueling') return;
    if (room?.leftBy) return;
    if (partnerPresence === 'offline') {
      const timer = setTimeout(() => {
        leaveGame(partnerId).catch(() => {});
      }, 20000);
      return () => clearTimeout(timer);
    }
  }, [status, room?.leftBy, partnerPresence, leaveGame, partnerId]);

  // Ao fechar aba / descarregar janela do navegador
  useEffect(() => {
    const handlePageHide = () => {
      if (status === 'waiting_words' || status === 'dueling') {
        leaveGame();
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [status, leaveGame]);

  const syncMyDraft = useCallback(
    (text: string, cursor: number) => {
      updateLiveDraft(roomId, myPlayerId, text, cursor, siteId);
    },
    [roomId, myPlayerId, siteId]
  );

  const lockMyWord = useCallback(
    async (word: string): Promise<boolean> => {
      setIsSubmitting(true);
      setErrorMsg(null);
      try {
        const res = await submitSecretWord(roomId, myPlayerId, word, siteId);
        if (!res.success) {
          setErrorMsg(res.error || 'Erro ao travar palavra');
          return false;
        }
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao travar palavra';
        setErrorMsg(msg);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [roomId, myPlayerId, siteId]
  );

  const makeGuess = useCallback(
    async (guess: string): Promise<{ success: boolean; error?: string }> => {
      setIsSubmitting(true);
      setErrorMsg(null);
      try {
        // Limpa o rascunho ao submeter
        updateLiveDraft(roomId, myPlayerId, '', 0, siteId);
        const res = await submitGuess(roomId, myPlayerId, guess, siteId);
        if (!res.success) {
          setErrorMsg(res.error || 'Erro ao enviar palpite');
          return { success: false, error: res.error };
        }
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao enviar palpite';
        setErrorMsg(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [roomId, myPlayerId, siteId]
  );

  const playAgain = useCallback(async (): Promise<boolean> => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await resetWordDuel(roomId, myPlayerId, siteId);
      if (!res.success) {
        setErrorMsg(res.error || 'Erro ao reiniciar');
        return false;
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao reiniciar';
      setErrorMsg(msg);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [roomId, myPlayerId, siteId]);

  return {
    roomId,
    myPlayerId,
    partnerId,
    p1Id,
    p2Id,
    isPlayer,
    myDisplayName,
    partnerDisplayName,
    playerAvatar,
    partnerAvatar,
    partnerPresence,
    isPartnerOnline: partnerPresence !== 'offline',
    room,
    status,
    isInviting,
    isInvited,
    loading,
    isSubmitting,
    errorMsg,
    myLocked,
    partnerLocked,
    myGuesses,
    partnerGuesses,
    partnerDraft,
    myDraft,
    isMyTurn,
    currentTurn: room?.currentTurn || '',
    winnerId: room?.winnerId || null,
    isWinner,
    myRevealedSecret,
    partnerRevealedSecret,
    leftBy: room?.leftBy || null,
    leftAt: room?.leftAt || null,
    startDuel: handleStartDuel,
    cancelInvite: handleCancelInvite,
    acceptInvite: handleAcceptInvite,
    rejectInvite: handleRejectInvite,
    leaveGame,
    forceEndGame,
    returnToGame,
    syncMyDraft,
    lockMyWord,
    makeGuess,
    playAgain,
  };
}
