/**
 * src/features/games/word-duel/wordDuelService.ts
 *
 * Serviço de comunicação com as funções serverless do Modo Duelo e listeners Firestore.
 */

import {
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { siteDoc } from '../../../services/firestore/paths';
import { auth } from '../../../services/firebase/auth';
import { waitForAuth } from '../../../services/records/common';
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
 * Obtém o Firebase ID Token atual aguardando inicialização do Auth.
 */
export async function getIdToken(): Promise<string> {
  await waitForAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Aguarde a autenticação do jogador...');
  }
  return await user.getIdToken();
}

/**
 * Inicia convite para o parceiro jogar Duelo de Palavras.
 */
export async function startInvite(
  roomId: string,
  hostId: string,
  partnerPresence: string,
  siteId?: string
): Promise<void> {
  // Se o parceiro estiver apenas "no site" (fora do jogo), envia convite ('inviting').
  // Se já estiver "no jogo" ('game') ou 'offline', inicia diretamente ('waiting_words').
  const needsInvite = partnerPresence === 'site';
  const docRef = siteDoc('word_duel_rooms', roomId, siteId);

  await setDoc(
    docRef,
    {
      roomId,
      p1Id: roomId.split('_')[0],
      p2Id: roomId.split('_')[1],
      hostId,
      status: needsInvite ? 'inviting' : 'waiting_words',
      inviteExpiresAt: needsInvite ? Date.now() + 60000 : null,
      p1Locked: false,
      p2Locked: false,
      currentTurn: hostId,
      starterId: hostId,
      p1Guesses: [],
      p2Guesses: [],
      liveDraft: {},
      winnerId: null,
      p1RevealedWord: null,
      p2RevealedWord: null,
      leftBy: null,
      leftAt: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Cancela o convite e retorna ao lobby.
 */
export async function cancelInvite(roomId: string, siteId?: string): Promise<void> {
  const docRef = siteDoc('word_duel_rooms', roomId, siteId);
  await updateDoc(docRef, {
    status: 'lobby',
    inviteExpiresAt: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Aceita o convite e inicia a escolha das palavras secretas.
 */
export async function acceptInvite(roomId: string, siteId?: string): Promise<void> {
  const docRef = siteDoc('word_duel_rooms', roomId, siteId);
  await updateDoc(docRef, {
    status: 'waiting_words',
    inviteExpiresAt: null,
    leftBy: null,
    leftAt: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Recusa o convite e volta ao lobby.
 */
export async function rejectInvite(roomId: string, siteId?: string): Promise<void> {
  const docRef = siteDoc('word_duel_rooms', roomId, siteId);
  await updateDoc(docRef, {
    status: 'lobby',
    inviteExpiresAt: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Sincroniza o rascunho de digitação em tempo real (para o adversário assistir).
 */
export async function updateLiveDraft(
  roomId: string,
  player: string,
  text: string,
  cursor: number,
  siteId?: string
): Promise<void> {
  try {
    const docRef = siteDoc('word_duel_rooms', roomId, siteId);
    await updateDoc(docRef, {
      [`liveDraft.${player}`]: {
        text,
        cursor,
        updatedAt: Date.now(),
      },
    });
  } catch {
    // best-effort em tempo real
  }
}

/**
 * Sai da partida (unilateralmente) ou marca abandono temporário.
 */
export async function leaveGameRoom(
  roomId: string,
  leaverId: string,
  status?: string,
  siteId?: string
): Promise<void> {
  const docRef = siteDoc('word_duel_rooms', roomId, siteId);
  try {
    if (status === 'lobby' || status === 'round_over') {
      await updateDoc(docRef, {
        status: 'lobby',
        leftBy: null,
        leftAt: null,
        updatedAt: serverTimestamp(),
      });
      return;
    }
    await updateDoc(docRef, {
      leftBy: leaverId,
      leftAt: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Erro ao sair da partida:', err);
  }
}

/**
 * Encerra a partida forçadamente e devolve ao lobby.
 */
export async function forceEndGameRoom(roomId: string, siteId?: string): Promise<void> {
  const docRef = siteDoc('word_duel_rooms', roomId, siteId);
  try {
    await updateDoc(docRef, {
      status: 'lobby',
      leftBy: null,
      leftAt: null,
      p1Locked: false,
      p2Locked: false,
      p1Guesses: [],
      p2Guesses: [],
      liveDraft: {},
      winnerId: null,
      p1RevealedWord: null,
      p2RevealedWord: null,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Erro ao forçar encerramento da partida:', err);
  }
}

/**
 * Retorna à partida em andamento.
 */
export async function returnToGameRoom(roomId: string, siteId?: string): Promise<void> {
  const docRef = siteDoc('word_duel_rooms', roomId, siteId);
  try {
    await updateDoc(docRef, {
      leftBy: null,
      leftAt: null,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Erro ao retornar à partida:', err);
  }
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

  const rawText = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawText);
  } catch {
    return { success: false, error: rawText || 'Resposta inválida do servidor.' };
  }

  if (!res.ok) {
    const err = typeof data.error === 'string' ? data.error : 'Falha ao salvar palavra secreta.';
    return { success: false, error: err };
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

  const rawText = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawText);
  } catch {
    return { success: false, error: rawText || 'Resposta inválida do servidor.' };
  }

  if (!res.ok) {
    const err = typeof data.error === 'string' ? data.error : 'Falha ao enviar tentativa.';
    return { success: false, error: err };
  }
  return data as {
    success: boolean;
    error?: string;
    states?: ('correct' | 'present' | 'absent')[];
    isWin?: boolean;
  };
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

  const rawText = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawText);
  } catch {
    return { success: false, error: rawText || 'Resposta inválida do servidor.' };
  }

  if (!res.ok) {
    const err = typeof data.error === 'string' ? data.error : 'Falha ao reiniciar partida.';
    return { success: false, error: err };
  }
  return { success: true };
}
