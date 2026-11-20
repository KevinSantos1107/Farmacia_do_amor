import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSiteConfigStore } from '../../../store/siteConfigStore';
import { usePlayerIdentityStore } from '../../../store/usePlayerIdentityStore';
import { getPlayerIds, getPlayerDisplayName } from '../../auth/playerIds';
import { useSiteId } from '../../../services/firestore/paths';
import {
  subscribeToWordDuelRoom,
  submitSecretWord,
  submitGuess,
  resetWordDuel,
} from './wordDuelService';
import type { WordDuelRoom } from './types';
import type { LetterCell } from '../word/types';

export function useWordDuel() {
  const config = useSiteConfigStore((s) => s.config);
  const myPlayerId = usePlayerIdentityStore((s) => s.player);
  const siteId = useSiteId();

  const { p1Id, p2Id } = useMemo(() => getPlayerIds(config), [config]);
  const roomId = `${p1Id}_${p2Id}`;

  const isP1 = myPlayerId === p1Id;
  const partnerId = isP1 ? p2Id : p1Id;
  const myDisplayName = getPlayerDisplayName(myPlayerId, config);
  const partnerDisplayName = getPlayerDisplayName(partnerId, config);

  const [room, setRoom] = useState<WordDuelRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const status = room?.status ?? 'waiting_words';
  const myLocked = isP1 ? !!room?.p1Locked : !!room?.p2Locked;
  const partnerLocked = isP1 ? !!room?.p2Locked : !!room?.p1Locked;

  const myGuesses: LetterCell[][] = useMemo(() => {
    if (!room) return [];
    return isP1 ? room.p1Guesses || [] : room.p2Guesses || [] ;
  }, [room, isP1]);

  const partnerGuesses: LetterCell[][] = useMemo(() => {
    if (!room) return [];
    return isP1 ? room.p2Guesses || [] : room.p1Guesses || [];
  }, [room, isP1]);

  const isMyTurn = status === 'dueling' && room?.currentTurn === myPlayerId;
  const isWinner = room?.status === 'round_over' && room.winnerId === myPlayerId;

  const myRevealedSecret = isP1 ? room?.p1RevealedWord : room?.p2RevealedWord;
  const partnerRevealedSecret = isP1 ? room?.p2RevealedWord : room?.p1RevealedWord;

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
    myDisplayName,
    partnerDisplayName,
    room,
    status,
    loading,
    isSubmitting,
    errorMsg,
    myLocked,
    partnerLocked,
    myGuesses,
    partnerGuesses,
    isMyTurn,
    currentTurn: room?.currentTurn || '',
    winnerId: room?.winnerId || null,
    isWinner,
    myRevealedSecret,
    partnerRevealedSecret,
    lockMyWord,
    makeGuess,
    playAgain,
  };
}
