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
    // ── Fase 1: Salvar segredo e fazer transição atômica para 'dueling' ──────
    let bothReadyFromTx = false;

    await db.runTransaction(async (t) => {
      const [roomSnap, secretsSnap] = await Promise.all([
        t.get(roomDocRef),
        t.get(secretsDocRef),
      ]);

      const secretsData = secretsSnap.exists ? secretsSnap.data() || {} : {};
      const roomData = roomSnap.exists ? roomSnap.data() || {} : {};
      const roundNumber = typeof secretsData.roundNumber === 'number' ? secretsData.roundNumber : 1;

      // Salva ESTRITAMENTE o segredo do jogador atual.
      // NUNCA zera o segredo do outro jogador aqui (o reset é feito apenas em word-duel-reset).
      const secretsUpdate: Record<string, unknown> = {
        [secretField]: normalized,
        roundNumber,
        updatedAt: FieldValue.serverTimestamp(),
      };
      t.set(secretsDocRef, secretsUpdate, { merge: true });

      // Avalia o estado consolidado de ambos os jogadores
      const finalP1Secret = isP1 ? normalized : (secretsData.p1Secret as string | undefined);
      const finalP2Secret = isP1 ? (secretsData.p2Secret as string | undefined) : normalized;

      const finalP1Locked = isP1 ? true : !!roomData.p1Locked;
      const finalP2Locked = isP1 ? !!roomData.p2Locked : true;

      const isP1SecretValid = typeof finalP1Secret === 'string' && finalP1Secret.trim().length === 5;
      const isP2SecretValid = typeof finalP2Secret === 'string' && finalP2Secret.trim().length === 5;

      const bothReady = finalP1Locked && finalP2Locked && isP1SecretValid && isP2SecretValid;
      bothReadyFromTx = bothReady;

      const starterId = roomData.starterId || p1Id;

      if (bothReady) {
        // Ambos prontos com palavras válidas: inicia a batalha!
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
        // Apenas o jogador atual travou sua palavra, aguardando o parceiro
        t.set(
          roomDocRef,
          {
            roomId,
            p1Id,
            p2Id,
            status: 'waiting_words',
            [lockedField]: true,
            starterId,
            currentTurn: starterId,
            winnerId: null,
            p1RevealedWord: null,
            p2RevealedWord: null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    });

    // ── Fase 2: Recuperação pós-transação contra condições de corrida ────────
    // Se por milissegundos duas requisições concorrentes não viram o estado uma da outra
    // durante a transação, re-verificamos o documento final consolidado.
    if (!bothReadyFromTx) {
      const [freshRoomSnap, freshSecretsSnap] = await Promise.all([
        roomDocRef.get(),
        secretsDocRef.get(),
      ]);

      const freshRoom = freshRoomSnap.exists ? freshRoomSnap.data() || {} : {};
      const freshSecrets = freshSecretsSnap.exists ? freshSecretsSnap.data() || {} : {};

      const realP1Locked = !!freshRoom.p1Locked;
      const realP2Locked = !!freshRoom.p2Locked;
      const realP1Secret = typeof freshSecrets.p1Secret === 'string' && freshSecrets.p1Secret.trim().length === 5;
      const realP2Secret = typeof freshSecrets.p2Secret === 'string' && freshSecrets.p2Secret.trim().length === 5;
      const currentStatus = freshRoom.status;

      if (
        realP1Locked &&
        realP2Locked &&
        realP1Secret &&
        realP2Secret &&
        currentStatus === 'waiting_words'
      ) {
        const starterId = freshRoom.starterId || p1Id;
        await roomDocRef.update({
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
        });
      }
    }

    res.status(200).json({ success: true, locked: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Erro em word-duel-set:', msg);
    res.status(500).json({ error: 'internal_error', detail: msg });
  }
}
