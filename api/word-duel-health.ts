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

  // Inspeciona diretórios no Vercel
  const inspectDir = (dir: string) => {
    try {
      if (fs.existsSync(dir)) {
        return fs.readdirSync(dir);
      }
      return `NOT_FOUND: ${dir}`;
    } catch (e) {
      return `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  };

  const fsState = {
    cwd,
    taskFiles: inspectDir('/var/task'),
    apiFiles: inspectDir('/var/task/api'),
    libFiles: inspectDir('/var/task/api/_lib'),
    publicFiles: inspectDir('/var/task/public'),
  };

  // Testa dicionário diretamente lendo o JSON
  let dictDirectLoad = false;
  let wordCount = 0;
  const dictPath = path.join(cwd, 'public', 'pt-5-letters.json');
  if (fs.existsSync(dictPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
      dictDirectLoad = Array.isArray(data);
      wordCount = data.length;
    } catch {
      dictDirectLoad = false;
    }
  }

  // Testa Firebase Admin inicializando diretamente
  let firebaseAdminDirect = false;
  let firebaseAdminError: string | null = null;
  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    
    let app;
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (envServiceAccount) {
        const parsed = typeof envServiceAccount === 'string' ? JSON.parse(envServiceAccount) : envServiceAccount;
        if (parsed && typeof parsed.private_key === 'string') {
          parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }
        app = initializeApp({
          credential: cert(parsed),
          projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID,
        });
      } else {
        throw new Error('FIREBASE_SERVICE_ACCOUNT não definida');
      }
    }
    const db = getFirestore(app);
    firebaseAdminDirect = !!db;
  } catch (e) {
    firebaseAdminError = e instanceof Error ? e.message : String(e);
  }

  res.status(200).json({
    ok: dictDirectLoad && firebaseAdminDirect,
    dictDirectLoad,
    wordCount,
    firebaseAdminDirect,
    firebaseAdminError,
    fsState,
  });
}
