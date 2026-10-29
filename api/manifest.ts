import type { VercelRequest, VercelResponse } from '@vercel/node';

export const DEFAULT_APP_NAME = 'Kevin & Iara';

export function getManifestPayload(coupleName: string) {
  const name = coupleName.trim() || DEFAULT_APP_NAME;
  return {
    name,
    short_name: name,
    description: `Um espaço especial para ${name} — memórias e momentos únicos.`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#05050A',
    theme_color: '#05050A',
    lang: 'pt-BR',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

  let coupleName = typeof req.query?.name === 'string' ? req.query.name.trim() : '';
  const siteId =
    typeof req.query?.site === 'string'
      ? req.query.site.trim()
      : process.env.VITE_SITE_ID || 'meu-site';

  if (!coupleName && siteId) {
    try {
      const projectId =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.VITE_FIREBASE_PROJECT_ID ||
        'kevin-iara-site';
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sites/${siteId}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const fsRes = await fetch(firestoreUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (fsRes.ok) {
        const data = (await fsRes.json()) as {
          fields?: {
            couple?: {
              mapValue?: {
                fields?: {
                  partner1?: { mapValue?: { fields?: { name?: { stringValue?: string } } } };
                  partner2?: { mapValue?: { fields?: { name?: { stringValue?: string } } } };
                };
              };
            };
          };
        };
        const p1 =
          data?.fields?.couple?.mapValue?.fields?.partner1?.mapValue?.fields?.name?.stringValue;
        const p2 =
          data?.fields?.couple?.mapValue?.fields?.partner2?.mapValue?.fields?.name?.stringValue;
        if (p1 && p2) {
          coupleName = `${p1} & ${p2}`;
        }
      }
    } catch {
      // Falha no Firestore remoto: usa fallback
    }
  }

  if (!coupleName) {
    coupleName = process.env.VITE_SITE_NAME || DEFAULT_APP_NAME;
  }

  return res.status(200).json(getManifestPayload(coupleName));
}
