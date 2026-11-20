/**
 * src/features/games/word-duel/wordDuelService.ts
 *
 * Serviço de comunicação com as funções serverless do Modo Duelo e listeners Firestore.
 */

import { onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { siteDoc } from '../../../services/firestore/paths';
import { auth } from '../../../services/firebase/auth';
import type { WordDuelRoom } from './types';

/**
 * Escuta atualizações em tempo real da sala do Modo Duelo.
 */
export function subscribeToWordDuelRoom(
  roomId: string,
  siteId: string | undefined,
  onUpdate: (room: WordDuelRoom | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = siteDoc('word_duel_rooms', roomId, siteId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as WordDuelRoom);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('Erro ao escutar sala do modo duelo:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Obtém o Firebase ID Token atual ou lança erro se não autenticado.
 */
async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado no Firebase.');
  }
  return await user.getIdToken();
}

/**
 * Trava a palavra secreta escolhida pelo jogador.
 */
export async function submitSecretWord(
  roomId: string,
  player: string,
  word: string,
  siteId?: string
): Promise<{ success: boolean; error?: string }> {
  const idToken = await getIdToken();
  const res = await fetch('/api/word-duel-set', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      idToken,
      roomId,
      player,
      word,
      siteId,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Falha ao salvar palavra secreta.' };
  }
  return { success: true };
}

/**
 * Envia um palpite (tentativa de decifrar a palavra do adversário).
 */
export async function submitGuess(
  roomId: string,
  player: string,
  guess: string,
  siteId?: string
): Promise<{
  success: boolean;
  error?: string;
  states?: ('correct' | 'present' | 'absent')[];
  isWin?: boolean;
}> {
  const idToken = await getIdToken();
  const res = await fetch('/api/word-duel-guess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      idToken,
      roomId,
      player,
      guess,
      siteId,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Falha ao enviar tentativa.' };
  }
  return data;
}

/**
 * Reinicia a rodada para jogar novamente.
 */
export async function resetWordDuel(
  roomId: string,
  player: string,
  siteId?: string
): Promise<{ success: boolean; error?: string }> {
  const idToken = await getIdToken();
  const res = await fetch('/api/word-duel-reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      idToken,
      roomId,
      player,
      siteId,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Falha ao reiniciar partida.' };
  }
  return { success: true };
}
