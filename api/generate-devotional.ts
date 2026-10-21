/**
 * api/generate-devotional.ts
 *
 * Vercel Serverless Function para geração de devocionais personalizados com a API Gemini.
 * Executa em ambiente Node.js na infraestrutura da Vercel.
 *
 * Segurança:
 *  - Validação de Firebase ID Token via JWKS público do Google.
 *  - Rate limit em memória por UID (5 req/min, 30 req/dia).
 *  - Chave de API lida exclusivamente da variável GEMINI_API_KEY no servidor.
 *  - A chave é enviada no cabeçalho x-goog-api-key (nunca em query string).
 *  - Sanitização e validação de tamanho de payload para evitar abuso.
 *  - Logs seguros: nunca loga tokens, payload completo ou chaves de API.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// ─────────────────────────────────────────────
// Constantes e Configurações
// ─────────────────────────────────────────────

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
export const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export const MAX_FIELD_LENGTH = 2000;
export const MAX_TOTAL_BODY_LENGTH = 15000;

export const RATE_LIMIT_MINUTE_MAX = 5;
export const RATE_LIMIT_DAY_MAX = 30;
const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export interface DevotionalHistoryItem {
  date: string;
  mood: string;
  reference: string;
  book: string;
  meditationAngle: string;
  challengeTheme: string;
}

export interface SoloPayloadData {
  mode: 'solo';
  playerName: string;
  playerId: string;
  mood: string;
  text: string;
  focus: string;
  history: DevotionalHistoryItem[];
}

export interface SyncPayloadData {
  mode: 'sync';
  name1: string;
  name2: string;
  mood1: string;
  text1: string;
  mood2: string;
  text2: string;
  history: DevotionalHistoryItem[];
}

export type ValidatedPayload = SoloPayloadData | SyncPayloadData;

interface RateLimitRecord {
  minuteCount: number;
  minuteStart: number;
  dayCount: number;
  dayStart: number;
}

// ─────────────────────────────────────────────
// Rate Limiting (Best-Effort em Memória)
// ─────────────────────────────────────────────

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  uid: string,
  now = Date.now(),
  store: Map<string, RateLimitRecord> = rateLimitStore
): { allowed: boolean; reason?: string } {
  let record = store.get(uid);

  if (!record) {
    store.set(uid, {
      minuteCount: 1,
      minuteStart: now,
      dayCount: 1,
      dayStart: now,
    });
    return { allowed: true };
  }

  if (now - record.minuteStart >= ONE_MINUTE_MS) {
    record.minuteCount = 0;
    record.minuteStart = now;
  }

  if (now - record.dayStart >= ONE_DAY_MS) {
    record.dayCount = 0;
    record.dayStart = now;
  }

  if (record.minuteCount >= RATE_LIMIT_MINUTE_MAX) {
    return {
      allowed: false,
      reason: 'Limite de requisições por minuto excedido. Aguarde alguns instantes.',
    };
  }

  if (record.dayCount >= RATE_LIMIT_DAY_MAX) {
    return {
      allowed: false,
      reason: 'Limite diário de requisições excedido. Tente novamente amanhã.',
    };
  }

  record.minuteCount++;
  record.dayCount++;
  return { allowed: true };
}

// ─────────────────────────────────────────────
// Validação e Sanitização do Payload
// ─────────────────────────────────────────────

function sanitizeString(val: unknown, maxLength = MAX_FIELD_LENGTH): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLength);
}

function sanitizeHistory(history: unknown): DevotionalHistoryItem[] {
  if (!Array.isArray(history)) return [];
  return history.slice(0, 7).map((item) => {
    if (!item || typeof item !== 'object') {
      return { date: '', mood: '', reference: '', book: '', meditationAngle: '', challengeTheme: '' };
    }
    const rec = item as Record<string, unknown>;
    return {
      date: sanitizeString(rec.date, 50),
      mood: sanitizeString(rec.mood, 50),
      reference: sanitizeString(rec.reference, 100),
      book: sanitizeString(rec.book, 100),
      meditationAngle: sanitizeString(rec.meditationAngle, 100),
      challengeTheme: sanitizeString(rec.challengeTheme, 100),
    };
  });
}

export function validatePayload(body: unknown): { valid: true; data: ValidatedPayload } | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Corpo da requisição inválido.' };
  }

  let bodyStr = '';
  try {
    bodyStr = JSON.stringify(body);
  } catch {
    return { valid: false, error: 'JSON malformado.' };
  }

  if (bodyStr.length > MAX_TOTAL_BODY_LENGTH) {
    return { valid: false, error: 'Requisição excede o tamanho máximo permitido.' };
  }

  const rec = body as Record<string, unknown>;
  const mode = rec.mode;

  if (mode === 'solo') {
    const playerName = sanitizeString(rec.playerName, 100);
    const playerId = sanitizeString(rec.playerId, 50);
    const mood = sanitizeString(rec.mood, 50);
    const text = sanitizeString(rec.text, MAX_FIELD_LENGTH);
    const focus = sanitizeString(rec.focus, 50);
    const history = sanitizeHistory(rec.history);

    if (!playerName) {
      return { valid: false, error: 'O nome do usuário é obrigatório.' };
    }
    if (!mood) {
      return { valid: false, error: 'O estado emocional (mood) é obrigatório.' };
    }

    return {
      valid: true,
      data: {
        mode: 'solo',
        playerName,
        playerId,
        mood,
        text,
        focus: focus || 'o relacionamento',
        history,
      },
    };
  }

  if (mode === 'sync') {
    const name1 = sanitizeString(rec.name1, 100);
    const name2 = sanitizeString(rec.name2, 100);
    const mood1 = sanitizeString(rec.mood1, 50);
    const text1 = sanitizeString(rec.text1, MAX_FIELD_LENGTH);
    const mood2 = sanitizeString(rec.mood2, 50);
    const text2 = sanitizeString(rec.text2, MAX_FIELD_LENGTH);
    const history = sanitizeHistory(rec.history);

    if (!name1 || !name2) {
      return { valid: false, error: 'Os nomes do casal são obrigatórios.' };
    }
    if (!mood1 || !mood2) {
      return { valid: false, error: 'Os estados emocionais de ambos são obrigatórios.' };
    }

    return {
      valid: true,
      data: {
        mode: 'sync',
        name1,
        name2,
        mood1,
        text1,
        mood2,
        text2,
        history,
      },
    };
  }

  return { valid: false, error: 'Modo inválido. Deve ser "solo" ou "sync".' };
}

// ─────────────────────────────────────────────
// Construção de Prompts
// ─────────────────────────────────────────────

function formatHistorySummary(history: DevotionalHistoryItem[]): string {
  if (!history || history.length === 0) return '';

  const lines = history
    .filter((h) => h.reference)
    .map(
      (h) =>
        `- ${h.date || 'recente'}: humor="${h.mood}", versículo="${h.reference}", tema="${h.meditationAngle}", desafio="${h.challengeTheme}"`
    );

  if (lines.length === 0) return '';

  return `HISTÓRICO RECENTE — NÃO repita nenhum destes versículos nem os mesmos temas:
${lines.join('\n')}

Regras obrigatórias:
- Escolha um versículo DIFERENTE de todos os listados acima.
- Não use o mesmo livro bíblico dos últimos 3 devocionais.
- Mude o ângulo da meditação — se ontem foi sobre coragem, hoje fale sobre confiança.
- Se o humor de hoje for igual ao de dias anteriores, reconheça isso gentilmente na meditação: "Você tem carregado esse peso por alguns dias..." e aborde o tema por um ângulo diferente.`;
}

export function buildSoloPrompt(data: SoloPayloadData): string {
  const historySummary = formatHistorySummary(data.history);

  return `Você é um ministro devocional cristão gentil, sábio e acolhedor.

${data.playerName} compartilhou como está se sentindo agora:
- Estado emocional: "${data.mood}"
- O que está sentindo: "${data.text || 'Não detalhou em texto'}"
- Foco da reflexão: "${data.focus}"

${historySummary ? `${historySummary}\n` : ''}

Gere um devocional personalizado. Responda SOMENTE com JSON válido, sem markdown, sem texto fora do JSON:

{
  "verse": "texto completo do versículo (tradução NVI ou ARA)",
  "reference": "Livro capítulo:versículo",
  "meditation": "3 a 5 frases conectando o versículo com o que a pessoa descreveu. Pessoal, calorosa, sem jargões religiosos excessivos.",
  "reflectionQuestion": "Uma pergunta profunda e gentil para a pessoa refletir ao longo do dia.",
  "practicalChallenge": "Uma ação concreta e pequena para fazer ainda hoje. Deve ser realizável em menos de 10 minutos.",
  "prayer": "Uma oração curta, calorosa e sincera (3 a 5 frases) para a pessoa orar a Deus agora, conectando o que ela está sentindo com a graça do Senhor.",
  "_meta": {
    "book": "nome do livro bíblico",
    "meditationAngle": "tema central da meditação em 3-5 palavras",
    "challengeTheme": "tema do desafio em 2-3 palavras"
  }
}`;
}

export function buildSyncPrompt(data: SyncPayloadData): string {
  const historySummary = formatHistorySummary(data.history);

  return `Você é um ministro devocional cristão que cuida de casais.

O casal ${data.name1} e ${data.name2} está fazendo o devocional juntos hoje.

${data.name1} está se sentindo: "${data.mood1}" — "${data.text1 || 'sem detalhes adicionais'}"
${data.name2} está se sentindo: "${data.mood2}" — "${data.text2 || 'sem detalhes adicionais'}"

${historySummary ? `${historySummary}\n` : ''}

Gere um devocional que fale COM O CASAL como unidade, honrando os dois estados emocionais. Chame os dois pelo nome na meditação. Responda SOMENTE com JSON válido, sem markdown:

{
  "verse": "texto completo do versículo (tradução NVI ou ARA)",
  "reference": "Livro capítulo:versículo",
  "meditation": "4 a 6 frases que conectam o versículo com os dois sentimentos. Chame ${data.name1} e ${data.name2} pelo nome.",
  "reflectionQuestion": "Uma pergunta para os dois responderem juntos em voz alta.",
  "practicalChallenge": "Um desafio pequeno que os dois façam juntos ainda hoje.",
  "couplePrompt": "Uma frase para um dizer ao outro, conectando os sentimentos com o versículo.",
  "prayer": "Uma oração curta, calorosa e tocante (3 a 5 frases) para o casal orar juntos em voz alta agora, abençoando o amor, a cumplicidade e a vida deles.",
  "_meta": {
    "book": "nome do livro bíblico",
    "meditationAngle": "tema central da meditação em 3-5 palavras",
    "challengeTheme": "tema do desafio em 2-3 palavras"
  }
}`;
}

// ─────────────────────────────────────────────
// Validação do Retorno da IA
// ─────────────────────────────────────────────

function isValidSoloDevotional(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, unknown>;
  if (typeof r.verse !== 'string' || !r.verse.trim()) return false;
  if (typeof r.reference !== 'string' || !r.reference.trim()) return false;
  if (typeof r.meditation !== 'string' || !r.meditation.trim()) return false;
  if (typeof r.reflectionQuestion !== 'string' || !r.reflectionQuestion.trim()) return false;
  if (typeof r.practicalChallenge !== 'string' || !r.practicalChallenge.trim()) return false;
  if (typeof r.prayer !== 'string' || !r.prayer.trim()) {
    r.prayer = 'Senhor Deus, entrego este momento em Tuas mãos. Que a Tua paz guarde o meu coração e que eu sinta o Teu amor guiando cada um dos meus passos hoje. Amém.';
  }
  if (!r._meta || typeof r._meta !== 'object') return false;
  const meta = r._meta as Record<string, unknown>;
  if (typeof meta.book !== 'string' || typeof meta.meditationAngle !== 'string' || typeof meta.challengeTheme !== 'string') {
    return false;
  }
  return true;
}

function isValidSyncDevotional(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, unknown>;
  if (typeof r.verse !== 'string' || !r.verse.trim()) return false;
  if (typeof r.reference !== 'string' || !r.reference.trim()) return false;
  if (typeof r.meditation !== 'string' || !r.meditation.trim()) return false;
  if (typeof r.reflectionQuestion !== 'string' || !r.reflectionQuestion.trim()) return false;
  if (typeof r.practicalChallenge !== 'string' || !r.practicalChallenge.trim()) return false;
  if (typeof r.couplePrompt !== 'string' || !r.couplePrompt.trim()) return false;
  if (typeof r.prayer !== 'string' || !r.prayer.trim()) {
    r.prayer = 'Senhor, abençoa a nossa união e enche a nossa história com a Tua graça. Que o amor, a cumplicidade e o perdão sejam o nosso alicerce todos os dias. Amém.';
  }
  if (!r._meta || typeof r._meta !== 'object') return false;
  const meta = r._meta as Record<string, unknown>;
  if (typeof meta.book !== 'string' || typeof meta.meditationAngle !== 'string' || typeof meta.challengeTheme !== 'string') {
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// Handler Principal (Vercel Serverless Function)
// ─────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // 1. Apenas POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  // 2. Extração do Bearer Token
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  // 3. Verificação das variáveis de ambiente necessárias
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'kevin-iara-site';
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!geminiApiKey) {
    console.error('Configuração do servidor incompleta: GEMINI_API_KEY não definida.');
    res.status(500).json({ error: 'Erro de configuração no servidor.' });
    return;
  }

  // 4. Validação criptográfica do Firebase ID Token contra o JWKS público do Google
  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    payload = verified.payload as Record<string, unknown>;
  } catch {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  // 5. Exigir UID válido
  const uid = typeof payload.sub === 'string' ? payload.sub : '';
  if (!uid) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  // 6. Rate limiting por UID
  const rateCheck = checkRateLimit(uid);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: rateCheck.reason || 'Limite de requisições excedido.' });
    return;
  }

  // 7. Validação e sanitização do payload de entrada
  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      res.status(400).json({ error: 'Corpo da requisição deve ser um JSON válido.' });
      return;
    }
  }

  const validation = validatePayload(parsedBody);
  if (!validation.valid || 'error' in validation) {
    res.status(400).json({ error: 'error' in validation ? validation.error : 'Corpo da requisição inválido.' });
    return;
  }

  // 8. Construção do prompt conforme o modo
  const prompt =
    validation.data.mode === 'solo'
      ? buildSoloPrompt(validation.data)
      : buildSyncPrompt(validation.data);

  // 9. Chamada segura ao Gemini
  try {
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      console.error('Falha na chamada ao serviço Gemini. Status HTTP:', geminiResponse.status);
      if (geminiResponse.status === 401 || geminiResponse.status === 403) {
        res.status(502).json({
          error:
            'Chave do Gemini inválida ou não configurada (HTTP 401/403). Gere uma chave de API gratuita no Google AI Studio (aistudio.google.com/app/apikey) e configure GEMINI_API_KEY no arquivo .env.',
        });
        return;
      }
      res.status(502).json({ error: 'Erro de comunicação com o serviço de IA. Tente novamente mais tarde.' });
      return;
    }

    const geminiJson = (await geminiResponse.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== 'string') {
      res.status(502).json({ error: 'Resposta vazia ou inesperada da IA.' });
      return;
    }

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let parsedDevotional: unknown;
    try {
      parsedDevotional = JSON.parse(cleaned);
    } catch {
      res.status(502).json({ error: 'A IA retornou um formato JSON inválido. Tente novamente.' });
      return;
    }

    if (validation.data.mode === 'solo') {
      if (!isValidSoloDevotional(parsedDevotional)) {
        res.status(502).json({ error: 'O devocional solo gerado não possui todos os campos esperados.' });
        return;
      }
    } else {
      if (!isValidSyncDevotional(parsedDevotional)) {
        res.status(502).json({ error: 'O devocional sincronizado gerado não possui todos os campos esperados.' });
        return;
      }
    }

    res.status(200).json(parsedDevotional);
  } catch (error) {
    console.error('Erro interno na execução do Gemini:', (error as Error)?.message || 'Erro desconhecido');
    res.status(500).json({ error: 'Erro interno ao processar o devocional.' });
  }
}
