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

import { auth } from '../../../services/firebase/auth';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

export type RawGeneratedQuestion = { question: string; options: QuizOption[]; correctOptionId: string };

/**
 * Validates that a parsed object looks like a valid quiz question.
 * Returns false if any required field is missing or malformed.
 */
export function isValidRawQuestion(q: unknown): q is RawGeneratedQuestion {
  if (!q || typeof q !== 'object') return false;
  const raw = q as Record<string, unknown>;
  if (typeof raw.question !== 'string' || raw.question.trim() === '') return false;
  if (!Array.isArray(raw.options) || raw.options.length < 2) return false;
  if (typeof raw.correctOptionId !== 'string' || raw.correctOptionId.trim() === '') return false;
  for (const opt of raw.options) {
    if (!opt || typeof opt !== 'object') return false;
    const optObj = opt as Record<string, unknown>;
    if (typeof optObj.id !== 'string' || optObj.id.trim() === '' || typeof optObj.text !== 'string' || optObj.text.trim() === '') return false;
  }
  const optionIds = (raw.options as Array<{ id: string }>).map((o) => o.id);
  if (!optionIds.includes(raw.correctOptionId)) return false;
  return true;
}

// ─────────────────────────────────────────────
// Geração via Serverless API (/api/generate-quiz)
// ─────────────────────────────────────────────

/**
 * Envia os dados da história do casal para a função serverless /api/generate-quiz,
 * que autentica o usuário via Firebase ID Token e interage de forma segura
 * com a API Gemini no backend sem expor credenciais ao navegador.
 */
export async function generateQuestionsFromGemini(
  data: CoupleStoryData
): Promise<Array<{ question: string; options: QuizOption[]; correctOptionId: string }>> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Sessão expirada ou não autenticada. Faça login novamente.');
  }

  const token = await currentUser.getIdToken();

  const response = await fetch('/api/generate-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada ou não autenticada. Faça login novamente.');
    }
    if (response.status === 403) {
      throw new Error('Acesso restrito a administradores.');
    }
    if (response.status === 429) {
      throw new Error('Limite de requisições excedido. Aguarde alguns instantes antes de tentar novamente.');
    }

    let serverMessage = '';
    try {
      const errJson = await response.json();
      if (errJson && typeof errJson === 'object' && typeof errJson.error === 'string') {
        serverMessage = errJson.error;
      }
    } catch {
      // Ignora erro ao tentar ler JSON
    }

    throw new Error(
      serverMessage || 'Erro no servidor ao gerar perguntas. Tente novamente mais tarde.'
    );
  }

  const result = await response.json();
  if (!result || !Array.isArray(result.questions)) {
    throw new Error('Resposta inesperada do servidor ao gerar perguntas.');
  }

  return result.questions;
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
