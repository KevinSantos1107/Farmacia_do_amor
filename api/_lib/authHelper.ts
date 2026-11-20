/**
 * api/_lib/authHelper.ts
 *
 * Validação de Firebase ID Token usando JWKS oficial do Google via 'jose'.
 * Mesma abordagem segura e leve usada em api/generate-devotional.ts.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export async function verifyAuthToken(authHeaderOrToken: string | undefined): Promise<{ uid: string } | null> {
  if (!authHeaderOrToken || typeof authHeaderOrToken !== 'string') {
    return null;
  }

  const token = authHeaderOrToken.startsWith('Bearer ')
    ? authHeaderOrToken.slice(7).trim()
    : authHeaderOrToken.trim();

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
    return { uid };
  } catch {
    return null;
  }
}
