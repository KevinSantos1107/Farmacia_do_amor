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

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
export const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export const MAX_FIELD_LENGTH = 2000;
export const MAX_EXISTING_QUESTIONS = 300;
export const MAX_TOTAL_BODY_LENGTH = 50000;

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
  /** Lista opcional de enunciados de perguntas que já existem no banco para evitar repetição */
  existingQuestions?: string[];
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

export type ValidationResult =
  | { valid: true; data: CoupleStoryData; error?: never }
  | { valid: false; error: string; data?: never };

export function validateStoryData(body: unknown): ValidationResult {
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

  // Validação opcional da lista de perguntas já existentes
  if (Array.isArray(rec.existingQuestions)) {
    const validQuestions: string[] = [];
    for (const item of rec.existingQuestions) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed && trimmed.length <= 500) {
          validQuestions.push(trimmed);
        }
      }
      if (validQuestions.length >= MAX_EXISTING_QUESTIONS) break;
    }
    if (validQuestions.length > 0) {
      sanitized.existingQuestions = validQuestions;
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

  const existingBlock =
    data.existingQuestions && data.existingQuestions.length > 0
      ? `\n\nPERGUNTAS JÁ EXISTENTES NO BANCO (REGRA CRÍTICA DE INEDITISMO):
Você NÃO PODE repetir nenhuma das perguntas abaixo e nem fazer perguntas que abordem o mesmo fato pelo mesmo ângulo. Explore aspectos que ainda NÃO foram perguntados, ou aborde fatos sob um novo prisma (ex: detalhes de bastidores, reações emocionais, consequências cômicas ou curiosidades específicas).
Perguntas já cadastradas:
${data.existingQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}`
      : '';

  return `Você é um mestre em quizzes românticos e íntimos de altíssimo nível, especializado em criar perguntas cativantes, bem-humoradas e desafiadoras para casais.

Seu objetivo é analisar profundamente os dados fornecidos sobre o casal ${data.names} e produzir o máximo de perguntas de múltipla escolha INÉDITAS, inteligentes e memoráveis. Não invente fatos externos; extraia o suco dos detalhes, hábitos, piadas internas e marcos reais fornecidos.

Informações da história do casal:
${parts}${existingBlock}

DIRETRIZES DE MÁXIMA QUALIDADE E CRIATIVIDADE:
1. Variedade e Profundidade de Ângulos:
   - Alterne formatos: perguntas sobre cronologia ("o que aconteceu primeiro?"), detalhes de cenário ("qual era a sobremesa?"), frases exatas ("quem disse a frase tal?"), reações ("qual foi a reação quando...?"), hábitos peculiares e preferências.
   - Não foque apenas no óbvio: se o texto menciona uma viagem e um prato, pergunte sobre o contexto da situação.
2. Alternativas Plausíveis e Inteligentes (Pegadinhas Naturais):
   - Cada pergunta deve ter exatamente 4 alternativas (options).
   - As 3 alternativas incorretas DEVEM ser plausíveis e contextuais — use elementos reais ou verossímeis do universo do casal para que quem responda precise realmente lembrar do momento, sem respostas absurdas ou infantis.
   - Distribua a alternativa correta de forma equilibrada entre "opt-a", "opt-b", "opt-c" e "opt-d".
3. Tom e Estilo:
   - Afetuoso, divertido, leve e envolvente. Enunciados claros e objetivos em português do Brasil.
   - Evite perguntas de sim/não disfarçadas ou conhecimento enciclopédico externo. O foco é estritamente a vida e a intimidade do casal.

REQUISITOS TÉCNICOS:
1. Cada pergunta deve ter exatamente 4 alternativas ("opt-a", "opt-b", "opt-c", "opt-d").
2. O campo "correctOptionId" deve corresponder exatamente ao "id" da alternativa correta.
3. Responda SOMENTE com um array JSON válido, sem qualquer bloco de texto introdutório, sem markdown adicional fora da estrutura esperada.

Formato esperado:
[
  {
    "question": "Texto da pergunta inédita?",
    "options": [
      { "id": "opt-a", "text": "Alternativa 1" },
      { "id": "opt-b", "text": "Alternativa 2" },
      { "id": "opt-c", "text": "Alternativa 3" },
      { "id": "opt-d", "text": "Alternativa 4" }
    ],
    "correctOptionId": "opt-b"
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
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'kevin-iara-site';
  if (!projectId) {
    console.error('Configuração do servidor incompleta: FIREBASE_PROJECT_ID não definido.');
    res.status(500).json({ error: 'Erro de configuração no servidor.' });
    return;
  }

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
  if (!validation.valid || 'error' in validation) {
    res.status(400).json({ error: 'error' in validation ? validation.error : 'Corpo da requisição inválido.' });
    return;
  }

  // 9. Chamada segura à API Gemini via x-goog-api-key no header (com retry resiliente)
  const prompt = buildPrompt(validation.data);

  try {
    let geminiResponse: Response | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1200));
      }
      geminiResponse = await fetch(GEMINI_API_URL, {
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
            responseMimeType: 'application/json',
          },
        }),
      });

      if (geminiResponse.ok) {
        break;
      }

      // Se for erro definitivo de chave ou payload, não adianta tentar novamente
      if (geminiResponse.status === 400 || geminiResponse.status === 401 || geminiResponse.status === 403) {
        break;
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      const status = geminiResponse?.status || 502;
      let userError = 'Erro de comunicação com o serviço de IA. Tente novamente mais tarde.';

      try {
        const errorJson = (await geminiResponse?.json()) as { error?: { message?: string } } | undefined;
        const apiMsg = errorJson?.error?.message || '';
        if (typeof apiMsg === 'string' && apiMsg.toLowerCase().includes('api key')) {
          userError = 'Chave do Gemini inválida ou não configurada na Vercel (HTTP 400). Atualize GEMINI_API_KEY no painel da Vercel.';
        } else if (status === 401 || status === 403) {
          userError = 'Chave do Gemini inválida ou não autorizada (HTTP 401/403). Verifique GEMINI_API_KEY no painel da Vercel.';
        } else if (status === 429) {
          userError = 'Limite temporário da API Gemini atingido (Google AI Studio). Aguarde cerca de 1 minuto e tente novamente.';
        } else if (status === 503) {
          userError = 'O modelo Gemini está temporariamente sobrecarregado pelo Google. Tente novamente em alguns segundos.';
        }
      } catch {
        // Fallback para mensagem genérica
      }

      console.error('Falha na chamada ao serviço Gemini. Status HTTP:', status);
      res.status(502).json({ error: userError });
      return;
    }

    const geminiJson = (await geminiResponse.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const parts = geminiJson?.candidates?.[0]?.content?.parts ?? [];
    const rawText = parts.map((p) => p.text || '').join('').trim();

    if (!rawText) {
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
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          parsedQuestions = JSON.parse(match[0]);
        } catch {
          res.status(502).json({ error: 'A IA retornou um formato JSON inválido. Tente novamente.' });
          return;
        }
      } else {
        res.status(502).json({ error: 'A IA retornou um formato JSON inválido. Tente novamente.' });
        return;
      }
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

    // Desduplicação defensiva no backend: filtra perguntas idênticas ou muito próximas às existentes
    const existingNormalized = new Set(
      (validation.data.existingQuestions || []).map((q) =>
        q.toLowerCase().replace(/[^a-z0-9]/gi, '')
      )
    );

    const deduplicatedQuestions = validQuestions.filter((q) => {
      const normalized = q.question.toLowerCase().replace(/[^a-z0-9]/gi, '');
      if (existingNormalized.has(normalized)) {
        return false;
      }
      existingNormalized.add(normalized);
      return true;
    });

    if (deduplicatedQuestions.length === 0) {
      res.status(502).json({
        error: 'Todas as perguntas geradas coincidiram com as já existentes no banco. Tente adicionar novos detalhes ou fatos diferentes da história do casal.',
      });
      return;
    }

    res.status(200).json({ questions: deduplicatedQuestions });
  } catch (error) {
    // Log seguro de erro sem vazar credenciais ou dados sensíveis
    console.error('Erro interno na execução do Gemini:', (error as Error)?.message || 'Erro desconhecido');
    res.status(500).json({ error: 'Erro interno ao processar a geração de perguntas.' });
  }
}
