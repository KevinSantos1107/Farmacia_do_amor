/**
 * aiQuizService.ts
 *
 * Responsável por:
 *  1. Chamar a API Gemini com dados do casal e retornar perguntas geradas.
 *  2. Salvar essas perguntas no Firestore (collection: ai_quiz_questions).
 *  3. Buscar/sortear perguntas de IA na hora de montar uma partida.
 *
 * AVISO: Esta collection NUNCA é exposta em nenhuma tela do admin.
 */

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import type { AiQuizQuestion, QuizOption } from '../schema';
import { shuffle } from '../../../shared/utils/shuffle';

// ─────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────

export interface CoupleStoryData {
  /** Quando se conheceram, datas importantes, aniversários etc. */
  dates: string;
  /** Lugares especiais: onde se conheceram, viagens, restaurantes etc. */
  places: string;
  /** Frases marcantes, apelidos, piadas internas */
  phrases: string;
  /** Músicas, filmes, séries favoritos do casal */
  media: string;
  /** Comidas, pratos, restaurantes favoritos */
  food: string;
  /** Momentos engraçados ou marcantes */
  memories: string;
  /** Outros detalhes únicos do relacionamento */
  other: string;
  /** Nome dos dois, para contextualizar o prompt */
  names: string;
}

export interface GenerationResult {
  generated: number;
  batchId: string;
  error?: string;
}

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────


export type RawGeneratedQuestion = { question: string; options: QuizOption[]; correctOptionId: string };

/**
 * Validates that a parsed object looks like a valid quiz question.
 * Returns false if any required field is missing or malformed.
 */
function isValidRawQuestion(q: unknown): q is RawGeneratedQuestion {
  if (!q || typeof q !== 'object') return false;
  const raw = q as Record<string, unknown>;
  if (typeof raw.question !== 'string' || raw.question.trim() === '') return false;
  if (!Array.isArray(raw.options) || raw.options.length < 2) return false;
  if (typeof raw.correctOptionId !== 'string') return false;
  for (const opt of raw.options) {
    if (!opt || typeof opt !== 'object') return false;
    const optObj = opt as Record<string, unknown>;
    if (typeof optObj.id !== 'string' || typeof optObj.text !== 'string') return false;
  }
  const optionIds = (raw.options as Array<{ id: string }>).map((o) => o.id);
  if (!optionIds.includes(raw.correctOptionId)) return false;
  return true;
}

// ─────────────────────────────────────────────
// Geração via Gemini
// ─────────────────────────────────────────────

/**
 * Monta o prompt para o Gemini com base nos dados do casal.
 */
function buildPrompt(data: CoupleStoryData): string {
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

/**
 * Chama a API Gemini e retorna as perguntas geradas (já validadas).
 * Lança exceção se a chamada falhar ou o JSON for inválido.
 */
export async function generateQuestionsFromGemini(
  data: CoupleStoryData
): Promise<Array<{ question: string; options: QuizOption[]; correctOptionId: string }>> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não está definida no .env');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(data) }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
  }

  const json = await response.json();
  const rawText: string | undefined =
    json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Resposta vazia ou inesperada da API Gemini.');
  }

  // Extrai o JSON mesmo se vier com marcadores de código (```json ... ```)
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('A IA retornou JSON inválido. Tente novamente.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('A IA não retornou um array de perguntas.');
  }

  const valid = parsed.filter(isValidRawQuestion);
  if (valid.length === 0) {
    throw new Error('Nenhuma pergunta válida foi gerada. Verifique os dados e tente novamente.');
  }

  return valid;
}

// ─────────────────────────────────────────────
// Persistência no Firestore
// ─────────────────────────────────────────────

/**
 * Salva as perguntas geradas na collection `ai_quiz_questions`.
 * Usa writeBatch para garantir atomicidade (máximo 500 por batch).
 *
 * @returns GenerationResult com quantidade salva e batchId
 */
export async function saveAiQuestionsToFirestore(
  siteId: string,
  questions: Array<{ question: string; options: QuizOption[]; correctOptionId: string }>,
  pointsPerQuestion: number = 100
): Promise<GenerationResult> {
  const batchId = new Date().toISOString();
  const collRef = collection(db, 'sites', siteId, 'ai_quiz_questions');

  // Firestore batches suportam no máximo 500 operações
  const CHUNK_SIZE = 499;
  let saved = 0;

  for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
    const chunk = questions.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const q of chunk) {
      const newDocRef = doc(collRef);
      batch.set(newDocRef, {
        siteId,
        question: q.question,
        options: q.options,
        correctOptionId: q.correctOptionId,
        points: pointsPerQuestion,
        generatedAt: serverTimestamp(),
        batchId,
      });
      saved++;
    }

    await batch.commit();
  }

  return { generated: saved, batchId };
}

/**
 * Deleta todas as perguntas de IA existentes antes de salvar um novo batch.
 * Uso: quando o admin quer regerar tudo do zero.
 */
export async function deleteAllAiQuestions(siteId: string): Promise<void> {
  const collRef = collection(db, 'sites', siteId, 'ai_quiz_questions');
  const snap = await getDocs(collRef);

  const CHUNK_SIZE = 499;
  const docs = snap.docs;

  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + CHUNK_SIZE).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * Verifica quantas perguntas de IA existem para o site.
 */
export async function getAiQuestionCount(siteId: string): Promise<number> {
  const collRef = collection(db, 'sites', siteId, 'ai_quiz_questions');
  const snap = await getDocs(collRef);
  return snap.size;
}

// ─────────────────────────────────────────────
// Busca para o motor do quiz
// ─────────────────────────────────────────────

/**
 * Busca todas as perguntas de IA disponíveis para um site.
 * Usado INTERNAMENTE pelo motor do quiz — nunca exponha essa função em telas admin.
 */
export async function fetchAiQuestions(siteId: string): Promise<AiQuizQuestion[]> {
  const collRef = collection(db, 'sites', siteId, 'ai_quiz_questions');
  const snap = await getDocs(collRef);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      siteId: data.siteId,
      question: data.question,
      options: data.options as QuizOption[],
      correctOptionId: data.correctOptionId,
      points: data.points ?? 100,
      generatedAt: data.generatedAt?.toMillis?.() ?? Date.now(),
      batchId: data.batchId ?? '',
    } as AiQuizQuestion;
  });
}

/**
 * Sorteia `count` perguntas aleatórias de um pool.
 * Se o pool for menor que `count`, retorna o pool inteiro.
 */
export function pickRandom<T>(pool: T[], count: number): T[] {
  if (pool.length <= count) return shuffle(pool);
  return shuffle(pool).slice(0, count);
}
