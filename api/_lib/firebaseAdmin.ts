/**
 * api/_lib/firebaseAdmin.ts
 *
 * Inicialização centralizada e idempotente do Firebase Admin SDK.
 * Suporta FIREBASE_SERVICE_ACCOUNT (variável de ambiente em produção Vercel),
 * arquivo local serviceAccountKey.json ou ADC (Application Default Credentials).
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

export function getAdminApp(): App {
  if (adminApp) return adminApp;
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // 1. Variável de ambiente com JSON completo da Service Account (ex: Vercel)
  const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envServiceAccount) {
    try {
      const parsed = typeof envServiceAccount === 'string'
        ? JSON.parse(envServiceAccount)
        : envServiceAccount;

      // A Vercel às vezes escapa duplamente o \n da private_key ao salvar a env var.
      // Corrige: converte \\n (literal backslash-n) para \n (newline real).
      if (parsed && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }

      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      });
      return adminApp;
    } catch (e) {
      console.error('Falha ao inicializar com FIREBASE_SERVICE_ACCOUNT env:', e);
      // Não silencia — relança para aparecer no log da função
      throw e;
    }
  }

  // 2. Chave de serviço em arquivo local (ex.: scripts/serviceAccountKey.json ou raiz)
  const cwd = process.cwd();
  const localPaths = [
    path.resolve(cwd, 'scripts', 'serviceAccountKey.json'),
    path.resolve(cwd, 'serviceAccountKey.json'),
  ];

  if (typeof __dirname !== 'undefined') {
    localPaths.push(
      path.resolve(__dirname, '..', '..', 'scripts', 'serviceAccountKey.json'),
      path.resolve(__dirname, '..', 'scripts', 'serviceAccountKey.json')
    );
  }

  for (const lp of localPaths) {
    if (fs.existsSync(lp)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(lp, 'utf-8'));
        adminApp = initializeApp({
          credential: cert(fileContent),
          projectId: fileContent.project_id || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
        });
        return adminApp;
      } catch (e) {
        console.warn(`Falha ao ler serviceAccountKey de ${lp}:`, e);
      }
    }
  }

  // 3. Fallback: ADC ou default app
  adminApp = initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  });
  return adminApp;
}

export function getAdminFirestore(): Firestore {
  if (adminDb) return adminDb;
  const app = getAdminApp();
  adminDb = getFirestore(app);
  return adminDb;
}
