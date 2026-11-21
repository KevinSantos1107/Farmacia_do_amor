/**
 * api/word-duel-health.ts
 *
 * Endpoint TEMPORÁRIO de diagnóstico para verificar se o dicionário e o Firebase Admin
 * estão funcionando corretamente na Vercel.
 *
 * REMOVER após diagnóstico!
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import fs from 'fs';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const cwd = process.cwd();
  const dirName = typeof __dirname !== 'undefined' ? __dirname : '(no __dirname)';

  // Testa paths de dicionário
  const dictPaths: { path: string; exists: boolean }[] = [];
  const pathsToCheck = [
    path.join(cwd, 'public', 'pt-5-letters.json'),
    ...(typeof __dirname !== 'undefined'
      ? [
          path.join(__dirname, 'pt-5-letters.json'),
          path.join(__dirname, '..', 'pt-5-letters.json'),
          path.join(__dirname, '..', '..', 'public', 'pt-5-letters.json'),
          path.join(__dirname, '..', 'public', 'pt-5-letters.json'),
        ]
      : []),
  ];

  for (const p of pathsToCheck) {
    dictPaths.push({ path: p, exists: fs.existsSync(p) });
  }

  // Testa dicionário
  let dictLoaded = false;
  let dictError: string | null = null;
  try {
    const { isValidWord } = await import('./_lib/wordDictionary');
    dictLoaded = isValidWord('CARRO');
  } catch (e) {
    dictError = e instanceof Error ? e.message : String(e);
  }

  // Testa Firebase Admin
  let firebaseReady = false;
  let firebaseError: string | null = null;
  try {
    const { getAdminFirestore } = await import('./_lib/firebaseAdmin');
    const db = getAdminFirestore();
    // Apenas verifica se db existe (não faz leitura real)
    firebaseReady = !!db;
  } catch (e) {
    firebaseError = e instanceof Error ? e.message : String(e);
  }

  // Info de ambiente
  const envInfo = {
    hasFirebaseServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasViteFirebaseProjectId: !!process.env.VITE_FIREBASE_PROJECT_ID,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '(não definido)',
    nodeEnv: process.env.NODE_ENV,
    cwd,
    dirname: dirName,
  };

  res.status(200).json({
    ok: dictLoaded && firebaseReady,
    dictLoaded,
    dictError,
    dictPaths,
    firebaseReady,
    firebaseError,
    env: envInfo,
  });
}
