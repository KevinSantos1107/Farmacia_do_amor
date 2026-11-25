/**
 * api/word-duel-reset.ts
 *
 * Vercel Serverless Function:
 * Reinicia a rodada para um novo jogo (jogar de novo).
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

interface VerifiedAuth {
  uid: string;
  isAdminForSite: (siteId: string) => boolean;
}

async function verifyAuthToken(authHeaderOrToken: string | undefined): Promise<VerifiedAuth | null> {
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
    if (!uid) return null;

    const firebaseClaim = payload.firebase as { sign_in_provider?: string } | undefined;
    const isNonAnonEmail =
      typeof payload.email === 'string' &&
      payload.email.length > 0 &&
      firebaseClaim?.sign_in_provider !== 'anonymous';
    const role = payload.role;
    const claimSiteId = payload.siteId;

    return {
      uid,
      isAdminForSite: (siteId: string) =>
        isNonAnonEmail && (role === 'super_admin' || (role === 'site_admin' && claimSiteId === siteId)),
    };
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

// ── 3. Handler Principal ───────────────────────────────────────
interface ResetBody {
  idToken?: string;
  roomId?: string;
  player?: string;
  siteId?: string;
}

const SAFE_DOC_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;

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

  if (!SAFE_DOC_ID_RE.test(roomId)) {
    res.status(400).json({ error: 'invalid_room_id' });
    return;
  }

  if (siteId !== undefined && siteId !== '' && (typeof siteId !== 'string' || !SAFE_DOC_ID_RE.test(siteId))) {
    res.status(400).json({ error: 'invalid_site_id' });
    return;
  }

  const roomParts = roomId.split('_');
  const p1Id = roomParts[0];
  const p2Id = roomParts[1];

  if (roomParts.length !== 2 || !p1Id || !p2Id || (player !== p1Id && player !== p2Id)) {
    res.status(400).json({ error: 'invalid_player_for_room' });
    return;
  }

  const db = getAdminFirestore();

  const isSiteLayout = process.env.DATA_LAYOUT === 'site' || process.env.VITE_DATA_LAYOUT === 'site';
  const resolvedSiteId = siteId || process.env.SITE_ID || process.env.VITE_SITE_ID || 'meu-site';

  // Verifica vínculo real uid -> player em player_links para jogadores não-admin.
  if (!auth.isAdminForSite(resolvedSiteId)) {
    try {
      const linkDocRef = isSiteLayout
        ? db.collection('sites').doc(resolvedSiteId).collection('player_links').doc(auth.uid)
        : db.collection('player_links').doc(auth.uid);

      const linkSnap = await linkDocRef.get();
      const linkData = linkSnap.exists ? linkSnap.data() : null;
      if (!linkData || linkData.player !== player) {
        console.warn(`[word-duel-reset] player_links not found or mismatch for uid=${auth.uid}, player=${player}`);
        res.status(403).json({ error: 'forbidden_player_mismatch' });
        return;
      }

      if (typeof linkData.tokenId === 'string' && linkData.tokenId) {
        const tokenDocRef = isSiteLayout
          ? db.collection('sites').doc(resolvedSiteId).collection('player_tokens').doc(linkData.tokenId)
          : db.collection('player_tokens').doc(linkData.tokenId);
        const tokenSnap = await tokenDocRef.get();
        if (!tokenSnap.exists || tokenSnap.data()?.player !== player) {
          res.status(403).json({ error: 'token_revoked' });
          return;
        }
      }
    } catch (linkErr: unknown) {
      const msg = linkErr instanceof Error ? linkErr.message : String(linkErr);
      console.error(`[word-duel-reset] Erro ao validar player_links uid=${auth.uid}:`, msg);
      res.status(403).json({ error: 'forbidden_player_mismatch', detail: 'Não foi possível verificar o vínculo do jogador. Verifique FIREBASE_SERVICE_ACCOUNT.' });
      return;
    }
  }

  const roomDocRef = isSiteLayout
    ? db.collection('sites').doc(resolvedSiteId).collection('word_duel_rooms').doc(roomId)
    : db.collection('word_duel_rooms').doc(roomId);

  const secretsDocRef = isSiteLayout
    ? db.collection('sites').doc(resolvedSiteId).collection('word_duel_secrets').doc(roomId)
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Erro em word-duel-reset:', msg);
    res.status(500).json({ error: 'internal_error', detail: msg });
  }
}
