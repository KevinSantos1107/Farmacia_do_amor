/**
 * api/word-duel-reset.ts
 *
 * Vercel Serverless Function:
 * Reinicia a rodada para um novo jogo (jogar de novo).
 *
 * - Zera p1Secret e p2Secret em `word_duel_secrets/{roomId}`.
 * - Inverte o starterId para alternar quem começa na próxima rodada.
 * - Redefine o status da sala pública para 'waiting_words', limpando palpites e vencedores.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuthToken } from './_lib/authHelper';
import { getAdminFirestore } from './_lib/firebaseAdmin';

interface ResetBody {
  idToken?: string;
  roomId?: string;
  player?: string;
  siteId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  const body = (req.body || {}) as ResetBody;
  const token = body.idToken || authHeader;

  const auth = await verifyAuthToken(token);
  if (!auth) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const { roomId, player, siteId } = body;

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

  const db = getAdminFirestore();

  const roomDocRef = siteId
    ? db.collection('sites').doc(siteId).collection('word_duel_rooms').doc(roomId)
    : db.collection('word_duel_rooms').doc(roomId);

  const secretsDocRef = siteId
    ? db.collection('sites').doc(siteId).collection('word_duel_secrets').doc(roomId)
    : db.collection('word_duel_secrets').doc(roomId);

  try {
    await db.runTransaction(async (t) => {
      const roomSnap = await t.get(roomDocRef);
      const secretsSnap = await t.get(secretsDocRef);

      const roomData = roomSnap.exists ? roomSnap.data() || {} : {};
      const secretsData = secretsSnap.exists ? secretsSnap.data() || {} : {};

      const currentStarter = roomData.starterId || p1Id;
      // Inverte quem começa a cada nova rodada
      const nextStarter = currentStarter === p1Id ? p2Id : p1Id;
      const currentRound = typeof secretsData.roundNumber === 'number' ? secretsData.roundNumber : 1;

      // Reseta os segredos
      t.set(
        secretsDocRef,
        {
          p1Secret: null,
          p2Secret: null,
          roundNumber: currentRound + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false }
      );

      // Reseta a sala pública
      t.set(
        roomDocRef,
        {
          roomId,
          p1Id,
          p2Id,
          status: 'waiting_words',
          p1Locked: false,
          p2Locked: false,
          currentTurn: nextStarter,
          starterId: nextStarter,
          p1Guesses: [],
          p2Guesses: [],
          winnerId: null,
          p1RevealedWord: null,
          p2RevealedWord: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    res.status(200).json({ success: true, status: 'waiting_words' });
  } catch (err: unknown) {
    console.error('Erro em word-duel-reset:', err);
    res.status(500).json({ error: 'internal_error' });
  }
}
