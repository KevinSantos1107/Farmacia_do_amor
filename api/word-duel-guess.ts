/**
 * api/word-duel-guess.ts
 *
 * Vercel Serverless Function:
 * Processa uma tentativa (palpite) de um jogador no modo duelo.
 *
 * Totalmente autocontido para compatibilidade garantida com Node ESM da Vercel.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import fs from 'fs';
import path from 'path';

// ── 1. Auth Helper ─────────────────────────────────────────────
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

async function verifyAuthToken(authHeaderOrToken: string | undefined): Promise<{ uid: string } | null> {
  if (!authHeaderOrToken || typeof authHeaderOrToken !== 'string') return null;
  const token = authHeaderOrToken.startsWith('Bearer ') ? authHeaderOrToken.slice(7).trim() : authHeaderOrToken.trim();
  if (!token) return null;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'kevin-iara-site';
  try {
    const verified = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    const payload = verified.payload as Record<string, unknown>;
    const uid = typeof payload.sub === 'string' ? payload.sub : '';
    return uid ? { uid } : null;
  } catch {
    return null;
  }
}

// ── 2. Firebase Admin ──────────────────────────────────────────
let adminApp: App | null = null;
let adminDb: Firestore | null = null;

function getAdminFirestore(): Firestore {
  if (adminDb) return adminDb;
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
    // 1. Variável de ambiente (Vercel Production)
    const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (envServiceAccount) {
      const parsed = typeof envServiceAccount === 'string' ? JSON.parse(envServiceAccount) : envServiceAccount;
      if (parsed && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      });
    } else {
      // 2. Chave de serviço local (desenvolvimento localhost)
      const cwd = process.cwd();
      const localPaths = [
        path.join(cwd, 'scripts', 'serviceAccountKey.json'),
        path.join(cwd, 'serviceAccountKey.json'),
      ];
      let loaded = false;
      for (const p of localPaths) {
        if (fs.existsSync(p)) {
          try {
            const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
            adminApp = initializeApp({
              credential: cert(parsed),
              projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
            });
            loaded = true;
            break;
          } catch (e) {
            console.warn(`Falha ao ler chave de serviço local de ${p}:`, e);
          }
        }
      }
      if (!loaded) {
        adminApp = initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'kevin-iara-site',
        });
      }
    }
  }
  if (!adminApp) {
    throw new Error('Falha ao inicializar Firebase Admin App.');
  }
  adminDb = getFirestore(adminApp);
  return adminDb;
}

// ── 3. Dicionário & Avaliação ─────────────────────────────────
let cachedWords: Set<string> | null = null;

function loadDictionary(): Set<string> {
  if (cachedWords) return cachedWords;
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'public', 'pt-5-letters.json'),
    path.resolve(cwd, 'public', 'pt-5-letters.json'),
  ];
  let rawData = '';
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      rawData = fs.readFileSync(p, 'utf-8');
      break;
    }
  }
  if (!rawData) {
    throw new Error('Arquivo pt-5-letters.json não encontrado no servidor.');
  }
  const list: string[] = JSON.parse(rawData);
  cachedWords = new Set(list.map((w) => w.toUpperCase().trim()));
  return cachedWords;
}

function normalizeWordServer(w: string): string {
  if (!w || typeof w !== 'string') return '';
  return w
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

function isValidWord(word: string): boolean {
  const norm = normalizeWordServer(word);
  if (norm.length !== 5) return false;
  return loadDictionary().has(norm);
}

export type LetterState = 'correct' | 'present' | 'absent';

function evaluateGuessServer(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(answer.length).fill('absent');
  const answerArr = answer.split('');
  const guessArr = guess.split('');

  // 1ª passagem: corretas (verdes)
  guessArr.forEach((l, i) => {
    if (l === answerArr[i]) {
      result[i] = 'correct';
      answerArr[i] = '*';
    }
  });

  // 2ª passagem: presentes (amarelas)
  guessArr.forEach((l, i) => {
    if (result[i] === 'correct') return;
    const idx = answerArr.indexOf(l);
    if (idx !== -1) {
      result[i] = 'present';
      answerArr[idx] = '*';
    }
  });

  return result;
}

// ── 4. Handler Principal ───────────────────────────────────────
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

  const isSiteLayout = process.env.VITE_DATA_LAYOUT === 'site' || process.env.DATA_LAYOUT === 'site';
  const roomDocRef = isSiteLayout && siteId
    ? db.collection('sites').doc(siteId).collection('word_duel_rooms').doc(roomId)
    : db.collection('word_duel_rooms').doc(roomId);

  const secretsDocRef = isSiteLayout && siteId
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
          [`liveDraft.${player}`]: null,
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
          [`liveDraft.${player}`]: null,
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Erro em word-duel-guess:', msg);
    res.status(500).json({ error: 'internal_error', detail: msg });
  }
}
