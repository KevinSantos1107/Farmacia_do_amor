/**
 * api/word-duel-guess.ts
 *
 * Vercel Serverless Function:
 * Processa uma tentativa (palpite) de um jogador no modo duelo.
 *
 * Segurança:
 * - Validação de Firebase ID Token.
 * - Valida se é a vez do jogador (player === currentTurn).
 * - Valida tamanho 5 e presença no dicionário de 5 letras (isValidWord).
 * - Lê a palavra secreta do adversário exclusivamente do servidor em `word_duel_secrets/{roomId}`.
 * - Avalia o palpite e registra no array do jogador em `word_duel_rooms/{roomId}`.
 * - Alterna o turno para o adversário.
 * - Detecta vitória (todas as letras 'correct'):
 *   - Finaliza a rodada com `status: 'round_over'` e `winnerId: player`.
 *   - Revela as duas palavras (`p1RevealedWord`, `p2RevealedWord`).
 * - Retorna o resultado colorido da tentativa na resposta HTTP.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuthToken } from './_lib/authHelper';
import { isValidWord, normalizeWordServer, evaluateGuessServer, type LetterState } from './_lib/wordDictionary';
import { getAdminFirestore } from './_lib/firebaseAdmin';

interface GuessBody {
  idToken?: string;
  roomId?: string;
  player?: string;
  guess?: string;
  siteId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  const body = (req.body || {}) as GuessBody;
  const token = body.idToken || authHeader;

  // 1. Validação de autenticação
  const auth = await verifyAuthToken(token);
  if (!auth) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const { roomId, player, guess, siteId } = body;

  if (!roomId || typeof roomId !== 'string' || !player || typeof player !== 'string') {
    res.status(400).json({ error: 'missing_parameters' });
    return;
  }

  const p1Id = roomId.split('_')[0];
  const p2Id = roomId.split('_')[1];

  if (player !== p1Id && player !== p2Id) {
    res.status(400).json({ error: 'invalid_player_for_room' });
    return;
  }

  // 2. Normalização e validação de dicionário do palpite
  const normalizedGuess = normalizeWordServer(guess || '');
  if (normalizedGuess.length !== 5) {
    res.status(400).json({ error: 'invalid_guess_length' });
    return;
  }

  if (!isValidWord(normalizedGuess)) {
    res.status(400).json({ error: 'word_not_in_dictionary' });
    return;
  }

  const db = getAdminFirestore();

  const roomDocRef = siteId
    ? db.collection('sites').doc(siteId).collection('word_duel_rooms').doc(roomId)
    : db.collection('word_duel_rooms').doc(roomId);

  const secretsDocRef = siteId
    ? db.collection('sites').doc(siteId).collection('word_duel_secrets').doc(roomId)
    : db.collection('word_duel_secrets').doc(roomId);

  try {
    let responseResult: {
      success: boolean;
      states: LetterState[];
      row: { letter: string; state: LetterState }[];
      isWin: boolean;
      currentTurn: string;
      status: string;
      winnerId: string | null;
      p1RevealedWord?: string | null;
      p2RevealedWord?: string | null;
    } | null = null;

    let transactionError: { status: number; message: string; error: string } | null = null;

    await db.runTransaction(async (t) => {
      const roomSnap = await t.get(roomDocRef);
      const secretsSnap = await t.get(secretsDocRef);

      if (!roomSnap.exists || !secretsSnap.exists) {
        transactionError = { status: 404, message: 'Sala não encontrada', error: 'room_not_found' };
        return;
      }

      const roomData = roomSnap.data() || {};
      const secretsData = secretsSnap.data() || {};

      if (roomData.status !== 'dueling') {
        transactionError = { status: 400, message: 'A rodada não está ativa para palpites', error: 'not_in_dueling_state' };
        return;
      }

      // Validação estrita de turno
      if (roomData.currentTurn !== player) {
        transactionError = { status: 403, message: 'Não é o seu turno', error: 'not_your_turn' };
        return;
      }

      const isP1 = player === p1Id;
      const targetSecret = isP1 ? secretsData.p2Secret : secretsData.p1Secret;

      if (!targetSecret || typeof targetSecret !== 'string' || targetSecret.length !== 5) {
        transactionError = { status: 500, message: 'Palavra secreta não configurada', error: 'secret_missing' };
        return;
      }

      // Avaliação do palpite contra o alvo do adversário
      const states = evaluateGuessServer(normalizedGuess, targetSecret);
      const row = normalizedGuess.split('').map((letter, i) => ({
        letter,
        state: states[i],
      }));

      const isWin = states.every((s) => s === 'correct');

      const p1Guesses = Array.isArray(roomData.p1Guesses) ? [...roomData.p1Guesses] : [];
      const p2Guesses = Array.isArray(roomData.p2Guesses) ? [...roomData.p2Guesses] : [];

      if (isP1) {
        p1Guesses.push(row);
      } else {
        p2Guesses.push(row);
      }

      const nextTurn = isP1 ? p2Id : p1Id;

      if (isWin) {
        // Vitória: encerra a rodada e revela ambas as palavras
        const p1Revealed = secretsData.p1Secret || null;
        const p2Revealed = secretsData.p2Secret || null;

        t.update(roomDocRef, {
          p1Guesses,
          p2Guesses,
          status: 'round_over',
          winnerId: player,
          p1RevealedWord: p1Revealed,
          p2RevealedWord: p2Revealed,
          updatedAt: FieldValue.serverTimestamp(),
        });

        responseResult = {
          success: true,
          states,
          row,
          isWin: true,
          currentTurn: nextTurn,
          status: 'round_over',
          winnerId: player,
          p1RevealedWord: p1Revealed,
          p2RevealedWord: p2Revealed,
        };
      } else {
        // Continua o duelo, passando a vez
        t.update(roomDocRef, {
          p1Guesses,
          p2Guesses,
          currentTurn: nextTurn,
          updatedAt: FieldValue.serverTimestamp(),
        });

        responseResult = {
          success: true,
          states,
          row,
          isWin: false,
          currentTurn: nextTurn,
          status: 'dueling',
          winnerId: null,
        };
      }
    });

    if (transactionError) {
      const err = transactionError as { status: number; error: string; message: string };
      res.status(err.status).json({ error: err.error, message: err.message });
      return;
    }

    res.status(200).json(responseResult);
  } catch (err: unknown) {
    console.error('Erro em word-duel-guess:', err);
    res.status(500).json({ error: 'internal_error' });
  }
}
