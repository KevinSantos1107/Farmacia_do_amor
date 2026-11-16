/**
 * api/music-search.ts
 *
 * Busca de músicas diretamente no YouTube (sem necessidade de microserviço externo).
 * Executa nativamente no Node.js / Vercel Serverless Function em ~200ms.
 *
 * GET /api/music-search?q=nome+da+musica
 * Retorna: { tracks: SearchResult[] }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface SearchResult {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  durationSeconds: number;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

function setCorsHeaders(res: VercelResponse): void {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
}

function parseDurationText(text: string | undefined): number {
  if (!text) return 0;
  const parts = text.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

async function searchYouTube(q: string): Promise<SearchResult[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  if (!res.ok) {
    throw new Error(`YouTube HTTP error ${res.status}`);
  }

  const html = await res.text();
  const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
  if (!match) return [];

  const data = JSON.parse(match[1]);
  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
      ?.contents?.[0]?.itemSectionRenderer?.contents || [];

  const results: SearchResult[] = [];
  for (const item of contents) {
    if (!item.videoRenderer || !item.videoRenderer.videoId) continue;
    const v = item.videoRenderer;
    const videoId = v.videoId;
    const title = v.title?.runs?.[0]?.text || '';
    const artist = v.ownerText?.runs?.[0]?.text || '';
    const thumbs = v.thumbnail?.thumbnails || [];
    const thumbnail =
      thumbs.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const durationSeconds = parseDurationText(v.lengthText?.simpleText);

    results.push({
      videoId,
      title,
      artist,
      thumbnail,
      durationSeconds,
    });

    if (results.length >= 10) break;
  }

  return results;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    res.status(400).json({ error: "Parâmetro 'q' é obrigatório." });
    return;
  }

  try {
    const tracks = await searchYouTube(q);
    res.status(200).json({ tracks });
  } catch (err: unknown) {
    console.error('[music-search] Erro ao buscar músicas:', err);
    res.status(500).json({ error: 'Erro ao buscar músicas.' });
  }
}
