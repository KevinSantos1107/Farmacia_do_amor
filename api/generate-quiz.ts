/**
 * api/generate-quiz.ts
 *
 * Vercel Serverless Function para geração de perguntas de quiz com a API Gemini.
 * Executa em ambiente Node.js na infraestrutura da Vercel.
 *
 * Segurança:
 *  - Validação de Firebase ID Token via JWKS público do Google (sem service account).
 *  - Exige usuário autenticado com email verificado (rejeita anônimo).
 *  - Exige custom claim role ('super_admin' ou 'site_admin').
 *  - Chave de API lida exclusivamente da variável de servidor GEMINI_API_KEY (nunca no bundle do browser).
 *  - A chave é enviada no cabeçalho x-goog-api-key (nunca em query string).
 *  - Sanitização e limitação de tamanho do payload para evitar abuso.
 *  - Rate limit em memória (best-effort) por UID.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// ─────────────────────────────────────────────
// Constantes e Configurações
// ─────────────────────────────────────────────

export const GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export const MAX_FIELD_LENGTH = 2000;
export const MAX_TOTAL_BODY_LENGTH = 25000;

export const RATE_LIMIT_MINUTE_MAX = 5;
export const RATE_LIMIT_DAY_MAX = 30;
const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export interface CoupleStoryData {
  dates: string;
  places: string;
  phrases: string;
  media: string;
  food: string;
  memories: string;
  other: string;
  names: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface RawGeneratedQuestion {
  question: string;
  options: QuizOption[];
  correctOptionId: string;
}

interface RateLimitRecord {
  minuteCount: number;
  minuteStart: number;
  dayCount: number;
  dayStart: number;
}

// ─────────────────────────────────────────────
// Rate Limiting (Best-Effort em Memória)
// ─────────────────────────────────────────────

/**
 * Rate limit em memória (best-effort) indexado por UID.
 *
 * LIMITAÇÃO DE ARQUITETURA SERVERLESS:
 * Em ambientes serverless (Vercel Functions), as instâncias são efêmeras e stateless.
 * O Map em memória é local a cada container e reinicia em cold starts. Não é sincronizado
 * entre réplicas concorrentes.
 * Serve como proteção imediata contra rajadas e loops acidentais no client. Para ambientes
 * com controle rígido distribuído, deve ser utilizado um store externo como Redis/Upstash.
 */
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

  // Reinicia contagem do minuto se a janela expirou
  if (now - record.minuteStart >= ONE_MINUTE_MS) {
    record.minuteCount = 0;
    record.minuteStart = now;
  }

  // Reinicia contagem do dia se a janela expirou
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
// Validação de Dados de Entrada
// ─────────────────────────────────────────────

export function validateStoryData(body: unknown):
  | { valid: true; data: CoupleStoryData }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Corpo da requisição inválido.' };
  }

  let bodyStr = '';
  try {
    bodyStr = JSON.stringify(body);
  } catch {
    return { valid: false, error: 'JSON malformado no corpo da requisição.' };
  }

  if (bodyStr.length > MAX_TOTAL_BODY_LENGTH) {
    return {
      valid: false,
      error: `Tamanho total da requisição excede o limite máximo permitido (${MAX_TOTAL_BODY_LENGTH} caracteres).`,
    };
  }

  const rec = body as Record<string, unknown>;

  if (typeof rec.names !== 'string' || rec.names.trim() === '') {
    return { valid: false, error: 'O campo "names" é obrigatório e deve ser preenchido.' };
  }

  if (rec.names.length > MAX_FIELD_LENGTH) {
    return {
      valid: false,
      error: `O campo "names" excede o limite de ${MAX_FIELD_LENGTH} caracteres.`,
    };
  }

  const textFields = ['dates', 'places', 'phrases', 'media', 'food', 'memories', 'other'] as const;
  const sanitized: CoupleStoryData = {
    names: rec.names.trim(),
    dates: '',
    places: '',
    phrases: '',
    media: '',
    food: '',
    memories: '',
    other: '',
  };

  for (const field of textFields) {
    const val = rec[field];
    if (val !== undefined && val !== null) {
      if (typeof val !== 'string') {
        return { valid: false, error: `O campo "${field}" deve ser uma string de texto.` };
      }
      if (val.length > MAX_FIELD_LENGTH) {
        return {
          valid: false,
          error: `O campo "${field}" excede o limite de ${MAX_FIELD_LENGTH} caracteres.`,
        };
      }
      sanitized[field] = val;
    }
  }

  return { valid: true, data: sanitized };
}

// ─────────────────────────────────────────────
// Validação das Perguntas Geradas pela IA
// ─────────────────────────────────────────────

export function isValidRawQuestion(q: unknown): q is RawGeneratedQuestion {
  if (!q || typeof q !== 'object') return false;
  const raw = q as Record<string, unknown>;
  if (typeof raw.question !== 'string' || raw.question.trim() === '') return false;
  if (!Array.isArray(raw.options) || raw.options.length < 2) return false;
  if (typeof raw.correctOptionId !== 'string' || raw.correctOptionId.trim() === '') return false;

  for (const opt of raw.options) {
    if (!opt || typeof opt !== 'object') return false;
    const optObj = opt as Record<string, unknown>;
    if (typeof optObj.id !== 'string' || optObj.id.trim() === '' || typeof optObj.text !== 'string' || optObj.text.trim() === '') {
      return false;
    }
  }

  const optionIds = (raw.options as Array<{ id: string }>).map((o) => o.id);
  if (!optionIds.includes(raw.correctOptionId)) return false;

  return true;
}

// ─────────────────────────────────────────────
// Construção do Prompt do Gemini
// ─────────────────────────────────────────────

export function buildPrompt(data: CoupleStoryData): string {
  const parts = [
    data.dates && `- Datas e momentos importantes: ${data.dates}`,
    data.places && `- Lugares especiais: ${data.places}`,
    data.phrases && `- Frases, apelidos e piadas internas: ${data.phrases}`,
    data.media && `- Músicas, filmes e séries favoritos: ${data.media}`,
    data.food && `- Comidas e restaurantes preferidos: ${data.food}`,
    data.memories && `- Momentos marcantes: ${data.memories}`,
    data.other && `- Outros detalhes: ${data.other}`,
  ]
    .filter(Boolean)
    .join('\n');

  return `Você é um assistente especializado em criar perguntas de quiz personalizadas e divertidas para casais.

Com base nas informações a seguir sobre o casal formado por ${data.names}, crie o máximo possível de perguntas de múltipla escolha interessantes e relevantes. Não force um número fixo — se o material permitir 30 perguntas boas, crie 30; se permitir 60, crie 60. Priorize qualidade e variedade. Evite perguntas genéricas ou que possam ser respondidas sem conhecer o casal.

Informações do casal:
${parts}

Requisitos obrigatórios:
1. Cada pergunta deve ter exatamente 4 alternativas (options).
2. Use IDs das alternativas como: "opt-a", "opt-b", "opt-c", "opt-d".
3. O campo "correctOptionId" deve conter o ID da alternativa correta.
4. As alternativas incorretas devem ser plausíveis (não obviamente erradas).
5. As perguntas devem testar memória real do casal, não conhecimento geral.
6. Varie os temas: algumas sobre datas, outras sobre lugares, outras sobre hábitos etc.

Responda SOMENTE com um array JSON válido, sem markdown, sem explicações, sem texto fora do JSON. Formato exato:
[
  {
    "question": "Texto da pergunta?",
    "options": [
      { "id": "opt-a", "text": "Alternativa A" },
      { "id": "opt-b", "text": "Alternativa B" },
      { "id": "opt-c", "text": "Alternativa C" },
      { "id": "opt-d", "text": "Alternativa D" }
    ],
    "correctOptionId": "opt-a"
  }
]`;
}

// ─────────────────────────────────────────────
// Handler Principal (Vercel Serverless Function)
// ─────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // 1. Apenas POST é permitido
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
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('Configuração do servidor incompleta: FIREBASE_PROJECT_ID não definido.');
    res.status(500).json({ error: 'Erro de configuração no servidor.' });
    return;
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
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
    // Resposta genérica para evitar expor detalhes de validação criptográfica
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  // 5. Exigir email e rejeitar login anônimo
  const firebaseClaim = payload.firebase as { sign_in_provider?: string } | undefined;
  if (!payload.email || typeof payload.email !== 'string' || firebaseClaim?.sign_in_provider === 'anonymous') {
    res.status(403).json({ error: 'Acesso negado.' });
    return;
  }

  // 6. Exigir role super_admin ou site_admin
  const role = payload.role;
  if (role !== 'super_admin' && role !== 'site_admin') {
    res.status(403).json({ error: 'Acesso restrito a administradores.' });
    return;
  }

  // 7. Rate limiting por UID
  const uid = typeof payload.sub === 'string' ? payload.sub : '';
  if (!uid) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  const rateCheck = checkRateLimit(uid);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: rateCheck.reason || 'Limite de requisições excedido.' });
    return;
  }

  // 8. Validação e sanitização do payload de entrada
  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      res.status(400).json({ error: 'Corpo da requisição deve ser um JSON válido.' });
      return;
    }
  }

  const validation = validateStoryData(parsedBody);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  // 9. Chamada segura à API Gemini via x-goog-api-key no header
  const prompt = buildPrompt(validation.data);

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
          temperature: 0.9,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!geminiResponse.ok) {
      // NUNCA logar a chave nem o corpo do erro cru
      console.error('Falha na chamada ao serviço Gemini. Status HTTP:', geminiResponse.status);
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

    let parsedQuestions: unknown;
    try {
      parsedQuestions = JSON.parse(cleaned);
    } catch {
      res.status(502).json({ error: 'A IA retornou um formato JSON inválido. Tente novamente.' });
      return;
    }

    if (!Array.isArray(parsedQuestions)) {
      res.status(502).json({ error: 'A IA não retornou uma lista de perguntas.' });
      return;
    }

    const validQuestions = parsedQuestions.filter(isValidRawQuestion);
    if (validQuestions.length === 0) {
      res.status(502).json({ error: 'Nenhuma pergunta válida foi gerada. Tente novamente com mais detalhes.' });
      return;
    }

    res.status(200).json({ questions: validQuestions });
  } catch (error) {
    // Log seguro de erro sem vazar credenciais ou dados sensíveis
    console.error('Erro interno na execução do Gemini:', (error as Error)?.message || 'Erro desconhecido');
    res.status(500).json({ error: 'Erro interno ao processar a geração de perguntas.' });
  }
}
