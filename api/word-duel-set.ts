/**
 * api/word-duel-set.ts
 *
 * Vercel Serverless Function:
 * Define ou atualiza a palavra secreta de 5 letras de um jogador no modo duelo.
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
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      });
    }
  }
  adminDb = getFirestore(adminApp);
  return adminDb;
}

// ── 3. Dicionário ──────────────────────────────────────────────
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

// ── 4. Handler Principal ───────────────────────────────────────
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

      const otherLocked = isP1 ? !!roomData.p2Locked : !!roomData.p1Locked;
      const otherSecret = otherLocked ? (isP1 ? secretsData.p2Secret : secretsData.p1Secret) : null;
      const roundNumber = typeof secretsData.roundNumber === 'number' ? secretsData.roundNumber : 1;

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

      const bothReady = !!(normalized && otherLocked && otherSecret);

      if (bothReady) {
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
    console.error('Erro em word-duel-set:', msg);
    res.status(500).json({ error: 'internal_error', detail: msg });
  }
}
