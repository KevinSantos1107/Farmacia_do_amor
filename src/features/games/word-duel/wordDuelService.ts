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
import { auth } from '../../../services/firebase/config';
import { waitForAuth } from '../../../services/records/common';
import { ensurePlayerLink } from '../../auth/playerLinkSync';
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
  if (partnerPresence === 'offline') {
    throw new Error('Aguarde o parceiro ficar online para iniciar a partida.');
  }

  // Se o parceiro estiver "no site" (fora da sala), envia convite ('inviting').
  // Se já estiver na sala ("no jogo" / 'game'), inicia diretamente ('waiting_words').
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

const WORD_DUEL_ERROR_MESSAGES: Record<string, string> = {
  forbidden_player_mismatch: 'Sessão do jogador dessincronizada. Atualize a página ou reabra seu link de acesso.',
  token_revoked: 'Seu link de acesso foi revogado. Solicite um novo link.',
  unauthorized: 'Sessão expirada. Atualize a página e tente novamente.',
  word_not_in_dictionary: 'Palavra não encontrada no dicionário.',
  invalid_word_length: 'A palavra deve ter exatamente 5 letras.',
  invalid_guess_length: 'O palpite deve ter exatamente 5 letras.',
};

async function postWordDuelApi<T extends Record<string, unknown>>(
  endpoint: string,
  payload: Record<string, unknown>,
  fallbackError: string
): Promise<T & { success: boolean; error?: string }> {
  await ensurePlayerLink();

  const sendRequest = async () => {
    const idToken = await getIdToken();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ idToken, ...payload }),
    });

    const rawText = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return { res, data: null as Record<string, unknown> | null, rawText };
    }
    return { res, data, rawText };
  };

  let attempt = await sendRequest();

  if (attempt.res.status === 403 && attempt.data?.error === 'forbidden_player_mismatch') {
    const synced = await ensurePlayerLink(true);
    if (synced) {
      attempt = await sendRequest();
    }
  }

  if (!attempt.data) {
    return {
      success: false,
      error: attempt.rawText || 'Resposta inválida do servidor.',
    } as T & { success: boolean; error?: string };
  }

  if (!attempt.res.ok) {
    const rawErr = typeof attempt.data.error === 'string' ? attempt.data.error : fallbackError;
    return {
      success: false,
      error: WORD_DUEL_ERROR_MESSAGES[rawErr] ?? rawErr,
    } as T & { success: boolean; error?: string };
  }

  return attempt.data as T & { success: boolean; error?: string };
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
  const res = await postWordDuelApi(
    '/api/word-duel-set',
    { roomId, player, word, siteId },
    'Falha ao salvar palavra secreta.'
  );
  return res.success ? { success: true } : { success: false, error: res.error };
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
  row?: { letter: string; state: 'correct' | 'present' | 'absent' }[];
  isWin?: boolean;
}> {
  return postWordDuelApi<{
    states?: ('correct' | 'present' | 'absent')[];
    row?: { letter: string; state: 'correct' | 'present' | 'absent' }[];
    isWin?: boolean;
  }>('/api/word-duel-guess', { roomId, player, guess, siteId }, 'Falha ao enviar tentativa.');
}

/**
 * Recuperação de estado travado: se ambos já estão com p_Locked = true
 * e o status ainda é 'waiting_words', força a transição para 'dueling'.
 * Isso cobre o race condition de submissão simultânea onde a API de cada
 * jogador não detectou o outro como pronto (viu dados desatualizados).
 */
export async function recoverDuelingTransition(roomId: string, siteId?: string): Promise<void> {
  const docRef = siteDoc('word_duel_rooms', roomId, siteId);
  try {
    // Apenas uma atualização leve — a API já garantiu que os segredos existem
    // quando os dois estão marcados como locked. O status será atualizado
    // para 'dueling', destravando o jogo para ambos os dispositivos.
    // A transação é idempotente: se o status já for 'dueling', não causa problema.
    await updateDoc(docRef, {
      status: 'dueling',
      updatedAt: serverTimestamp(),
    });
  } catch {
    // best-effort: pode falhar se regras de segurança não permitirem
    // (nesse caso a API já deveria ter feito a recuperação)
  }
}

/**
 * Reinicia a rodada para jogar novamente.
 */
export async function resetWordDuel(
  roomId: string,
  player: string,
  siteId?: string
): Promise<{ success: boolean; error?: string }> {
  const res = await postWordDuelApi(
    '/api/word-duel-reset',
    { roomId, player, siteId },
    'Falha ao reiniciar partida.'
  );
  return res.success ? { success: true } : { success: false, error: res.error };
}
