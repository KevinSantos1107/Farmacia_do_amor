/**
 * api/word-duel-set.ts
 *
 * Vercel Serverless Function:
 * Define ou atualiza a palavra secreta de 5 letras de um jogador no modo duelo.
 *
 * Segurança:
 * - Validação de Firebase ID Token.
 * - Validação estrita do dicionário no servidor (isValidWord).
 * - A palavra é salva exclusivamente em `word_duel_secrets/{roomId}`, protegida contra leitura do cliente.
 * - NENHUMA palavra é retornada na resposta.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuthToken } from './_lib/authHelper';
import { isValidWord, normalizeWordServer } from './_lib/wordDictionary';
import { getAdminFirestore } from './_lib/firebaseAdmin';

interface SetWordBody {
  idToken?: string;
  roomId?: string;
  player?: string;
  word?: string;
  siteId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  const body = (req.body || {}) as SetWordBody;
  const token = body.idToken || authHeader;

  // 1. Validação de autenticação
  const auth = await verifyAuthToken(token);
  if (!auth) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const { roomId, player, word, siteId } = body;

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

  // 2. Normalização e validação da palavra de 5 letras
  const normalized = normalizeWordServer(word || '');
  if (normalized.length !== 5) {
    res.status(400).json({ error: 'invalid_word_length' });
    return;
  }

  if (!isValidWord(normalized)) {
    res.status(400).json({ error: 'word_not_in_dictionary' });
    return;
  }

  const db = getAdminFirestore();

  // Abstração de caminhos para suportar multi-site APENAS se VITE_DATA_LAYOUT=site estiver configurado
  const isSiteLayout = process.env.VITE_DATA_LAYOUT === 'site' || process.env.DATA_LAYOUT === 'site';
  const roomDocRef = isSiteLayout && siteId
    ? db.collection('sites').doc(siteId).collection('word_duel_rooms').doc(roomId)
    : db.collection('word_duel_rooms').doc(roomId);

  const secretsDocRef = isSiteLayout && siteId
    ? db.collection('sites').doc(siteId).collection('word_duel_secrets').doc(roomId)
    : db.collection('word_duel_secrets').doc(roomId);

  const isP1 = player === p1Id;
  const secretField = isP1 ? 'p1Secret' : 'p2Secret';
  const lockedField = isP1 ? 'p1Locked' : 'p2Locked';

  try {
    await db.runTransaction(async (t) => {
      const roomSnap = await t.get(roomDocRef);
      const secretsSnap = await t.get(secretsDocRef);

      const secretsData = secretsSnap.exists ? secretsSnap.data() || {} : {};
      const roomData = roomSnap.exists ? roomSnap.data() || {} : {};

      // Verifica se o outro jogador já travou sua palavra NESTA rodada (baseado em roomData)
      const otherLocked = isP1 ? !!roomData.p2Locked : !!roomData.p1Locked;
      const otherSecret = otherLocked ? (isP1 ? secretsData.p2Secret : secretsData.p1Secret) : null;
      const roundNumber = typeof secretsData.roundNumber === 'number' ? secretsData.roundNumber : 1;

      // Se o outro jogador ainda não havia travado nesta rodada,
      // limpa qualquer segredo residual antigo do outro jogador para garantir consistência
      const secretsUpdate: Record<string, unknown> = {
        [secretField]: normalized,
        roundNumber,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!otherLocked) {
        const otherSecretField = isP1 ? 'p2Secret' : 'p1Secret';
        secretsUpdate[otherSecretField] = null;
      }

      t.set(secretsDocRef, secretsUpdate, { merge: true });

      // Checa se ambas as palavras estão verdadeiramente definidas e travadas nesta rodada
      const bothReady = !!(normalized && otherLocked && otherSecret);

      if (bothReady) {
        // Ambas as palavras travadas: inicia a fase de duelo
        const starterId = roomData.starterId || p1Id;
        t.set(
          roomDocRef,
          {
            roomId,
            p1Id,
            p2Id,
            status: 'dueling',
            p1Locked: true,
            p2Locked: true,
            currentTurn: starterId,
            starterId,
            p1Guesses: [],
            p2Guesses: [],
            winnerId: null,
            p1RevealedWord: null,
            p2RevealedWord: null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // Apenas o jogador atual travou sua palavra
        t.set(
          roomDocRef,
          {
            roomId,
            p1Id,
            p2Id,
            status: 'waiting_words',
            [lockedField]: true,
            starterId: roomData.starterId || p1Id,
            currentTurn: roomData.starterId || p1Id,
            winnerId: null,
            p1RevealedWord: null,
            p2RevealedWord: null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    });

    res.status(200).json({ success: true, locked: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('Erro em word-duel-set:', msg, stack);
    res.status(500).json({ error: 'internal_error', detail: msg });
  }
}
