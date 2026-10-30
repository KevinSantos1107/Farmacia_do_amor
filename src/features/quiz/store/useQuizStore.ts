import { create } from 'zustand';
import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import type { QuizQuestion, QuizConfig } from '../schema';
import { DEFAULT_QUIZ_CONFIG } from '../schema';
import { usePlayerIdentityStore } from '../../../store/usePlayerIdentityStore';
import { useSiteConfigStore } from '../../../store/siteConfigStore';
import { getPlayerIds } from '../../auth/playerIds';
import { fetchAiQuestions } from '../services/aiQuizService';
import { shuffle } from '../../../shared/utils/shuffle';

// ─────────────────────────────────────────────
// Configuração de montagem do quiz
// ─────────────────────────────────────────────

/**
 * Tamanho alvo de uma partida.
 * O motor tenta chegar nesse número, mas adapta se faltar perguntas.
 */
export const TARGET_QUESTIONS = 15;

// ─────────────────────────────────────────────
// Helpers de montagem e rotação de perguntas
// ─────────────────────────────────────────────

/**
 * Monta o pool total de perguntas elegíveis (manuais ativas + IA).
 * - Se o jogador for identificado, tenta filtrar perguntas feitas pelo próprio jogador.
 * - Caso não haja perguntas do parceiro (ex: criador testando suas próprias perguntas),
 *   mantém todas as manuais ativas para que as 15 perguntas manuais não sumam.
 */
export function buildEligiblePool(
  manualQuestions: QuizQuestion[],
  aiQuestions: QuizQuestion[],
  currentPlayerId: string
): QuizQuestion[] {
  const activeManual = manualQuestions.filter((q) => q.active);

  let eligibleManual = activeManual;
  if (currentPlayerId) {
    const partnerOnly = activeManual.filter(
      (q) => !q.createdBy || q.createdBy !== currentPlayerId
    );
    // Se existem perguntas criadas pelo parceiro, prioriza apenas elas
    if (partnerOnly.length > 0) {
      eligibleManual = partnerOnly;
    }
  }

  return [...eligibleManual, ...aiQuestions];
}

/**
 * Seleciona perguntas para uma partida a partir do pool disponível.
 * - Prioriza perguntas que ainda NÃO foram jogadas nesta sessão (evita repetições).
 * - Quando as perguntas não jogadas se esgotam, inicia um novo ciclo.
 * - Se o pool total for menor ou igual à meta, usa todas as disponíveis.
 */
export function selectGameQuestions(
  pool: QuizQuestion[],
  playedIds: string[] = [],
  targetCount: number = TARGET_QUESTIONS,
  shuffleOptions: boolean = false
): { selected: QuizQuestion[]; newPlayedIds: string[] } {
  if (pool.length === 0) {
    return { selected: [], newPlayedIds: [] };
  }

  // Se o total de perguntas for menor ou igual à meta, usa todas
  if (pool.length <= targetCount) {
    let result = shuffle([...pool]);
    if (shuffleOptions) {
      result = result.map((q) => ({ ...q, options: shuffle(q.options) }));
    }
    return { selected: result, newPlayedIds: result.map((q) => q.id) };
  }

  // Remove do histórico de jogadas os IDs que não existem mais no pool
  const validPlayedIds = playedIds.filter((id) => pool.some((q) => q.id === id));
  // Filtra as perguntas que ainda NÃO foram jogadas no ciclo atual
  const unplayed = pool.filter((q) => !validPlayedIds.includes(q.id));

  let chosen: QuizQuestion[];
  let nextPlayedIds: string[];

  if (unplayed.length >= targetCount) {
    // Sorteia targetCount perguntas entre as não jogadas
    const shuffledUnplayed = shuffle([...unplayed]);
    chosen = shuffledUnplayed.slice(0, targetCount);
    nextPlayedIds = [...validPlayedIds, ...chosen.map((q) => q.id)];
    // Se completou todas as perguntas do pool, reinicia o histórico mantendo a partida atual
    if (nextPlayedIds.length >= pool.length) {
      nextPlayedIds = chosen.map((q) => q.id);
    }
  } else {
    // Restam menos perguntas não jogadas do que a meta: inclui todas as restantes
    const remainingUnplayed = [...unplayed];
    const needed = targetCount - remainingUnplayed.length;

    // Completa com perguntas já jogadas anteriormente, sorteadas
    const alreadyPlayedPool = pool.filter((q) => validPlayedIds.includes(q.id));
    const shuffledAlreadyPlayed = shuffle([...alreadyPlayedPool]);
    const filler = shuffledAlreadyPlayed.slice(0, needed);

    chosen = shuffle([...remainingUnplayed, ...filler]);
    // Reinicia o ciclo marcando as que foram usadas nesta partida
    nextPlayedIds = chosen.map((q) => q.id);
  }

  if (shuffleOptions) {
    chosen = chosen.map((q) => ({ ...q, options: shuffle(q.options) }));
  }

  return { selected: chosen, newPlayedIds: nextPlayedIds };
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

interface QuizState {
  config: QuizConfig;
  availableQuestions: QuizQuestion[];
  playedQuestionIds: string[];
  questions: QuizQuestion[];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;

  // Game State
  gameState: 'intro' | 'playing' | 'result';
  currentIndex: number;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  currentCombo: number;
  maxCombo: number;

  // Stats
  personalBest: number;
  highestCombo: number;
  gamesPlayed: number;

  // Actions
  loadQuizData: (siteId: string, force?: boolean) => Promise<void>;
  startGame: () => void;
  answerQuestion: (isCorrect: boolean, points?: number) => void;
  advanceQuestion: () => void;
  resetGame: () => void;
  syncQuizStats: () => Promise<void>;
}

const LOCAL_STATS_KEY = 'romantic_engine_quiz_stats';

function loadLocalStats() {
  try {
    const data = localStorage.getItem(LOCAL_STATS_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { personalBest: 0, highestCombo: 0, gamesPlayed: 0 };
}

function saveLocalStats(stats: { personalBest: number; highestCombo: number; gamesPlayed: number }) {
  localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats));
}

const initialStats = loadLocalStats();

export const useQuizStore = create<QuizState>((set, get) => ({
  config: DEFAULT_QUIZ_CONFIG,
  availableQuestions: [],
  playedQuestionIds: [],
  questions: [],
  isLoading: false,
  isReady: false,
  error: null,

  gameState: 'intro',
  currentIndex: 0,
  score: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  currentCombo: 0,
  maxCombo: 0,

  personalBest: initialStats.personalBest,
  highestCombo: initialStats.highestCombo,
  gamesPlayed: initialStats.gamesPlayed,

  loadQuizData: async (siteId: string, force = false) => {
    // Se já temos perguntas disponíveis carregadas e não foi forçado reload, reaproveita
    if (!force && get().isReady && get().availableQuestions.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        setTimeout(() => {
          const mockQuestions: QuizQuestion[] = [
            {
              id: 'q1',
              siteId,
              question: 'Onde nos conhecemos?',
              options: [
                { id: 'o1', text: 'Praia' },
                { id: 'o2', text: 'Festa' },
                { id: 'o3', text: 'Escola' },
                { id: 'o4', text: 'Internet' },
              ],
              correctOptionId: 'o4',
              points: 100,
              active: true,
              order: 1,
            },
            {
              id: 'q2',
              siteId,
              question: 'Quem mandou a primeira mensagem?',
              options: [
                { id: 'o1', text: 'Eu' },
                { id: 'o2', text: 'Você' },
                { id: 'o3', text: 'Os dois ao mesmo tempo' },
                { id: 'o4', text: 'Um amigo em comum' },
              ],
              correctOptionId: 'o2',
              points: 100,
              active: true,
              order: 2,
            },
          ];
          set({
            config: { ...DEFAULT_QUIZ_CONFIG, active: true },
            availableQuestions: mockQuestions,
            playedQuestionIds: mockQuestions.map((q) => q.id),
            questions: mockQuestions,
            isLoading: false,
            isReady: true,
          });
        }, 300);
        return;
      }

      // ── Busca config, perguntas manuais e perguntas de IA TODAS EM PARALELO ──
      const configRef = doc(db, 'sites', siteId, 'quiz_config', 'main');
      const qRef = collection(db, 'sites', siteId, 'quiz_questions');
      const qQuery = query(qRef, orderBy('order', 'asc'));

      const [configSnap, qSnap, rawAi] = await Promise.all([
        getDoc(configRef).catch((e) => {
          console.warn('Erro ao carregar quiz_config:', e);
          return null;
        }),
        getDocs(qQuery).catch((e) => {
          console.warn('Erro ao carregar quiz_questions:', e);
          return null;
        }),
        fetchAiQuestions(siteId).catch((aiErr) => {
          console.warn('Não foi possível carregar perguntas de IA:', aiErr);
          return [];
        }),
      ]);

      let loadedConfig = DEFAULT_QUIZ_CONFIG;
      if (configSnap && configSnap.exists()) {
        loadedConfig = { ...DEFAULT_QUIZ_CONFIG, ...configSnap.data() } as QuizConfig;
      }

      // ── Identifica o jogador atual ────────────────────────────────────
      const currentPlayer = usePlayerIdentityStore.getState().player;
      const siteConfig = useSiteConfigStore.getState().config;
      const { p1Id, p2Id } = getPlayerIds(siteConfig);
      const isKnownPlayer = currentPlayer === p1Id || currentPlayer === p2Id;

      // ── Processa perguntas manuais ────────────────────────────────────
      const manualQuestions = qSnap
        ? qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizQuestion))
        : [];

      // ── Processa perguntas de IA ──────────────────────────────────────
      const aiQuestions: QuizQuestion[] = (rawAi || []).map((q) => ({
        id: q.id,
        siteId: q.siteId,
        question: q.question,
        options: q.options,
        correctOptionId: q.correctOptionId,
        points: q.points ?? loadedConfig.pointsCorrect ?? 100,
        active: true,
        order: 0,
      }));

      // ── Monta o pool completo de perguntas disponíveis (64+) ─────────
      const availableQuestions = buildEligiblePool(
        manualQuestions,
        aiQuestions,
        isKnownPlayer ? currentPlayer : ''
      );

      // Sorteia a primeira partida variando entre todas as perguntas
      const { selected, newPlayedIds } = selectGameQuestions(
        availableQuestions,
        get().playedQuestionIds,
        TARGET_QUESTIONS,
        loadedConfig.shuffleOptions
      );

      set({
        config: loadedConfig,
        availableQuestions,
        playedQuestionIds: newPlayedIds,
        questions: selected,
        isLoading: false,
        isReady: true,
      });
    } catch (err: unknown) {
      console.error('Error loading quiz:', err);
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false, isReady: true });
    }
  },

  startGame: () => {
    const state = get();
    let questionsToPlay = state.questions;
    let nextPlayedIds = state.playedQuestionIds;

    // Se ainda não temos perguntas selecionadas, sorteia do pool completo
    if (questionsToPlay.length === 0 && state.availableQuestions.length > 0) {
      const result = selectGameQuestions(
        state.availableQuestions,
        state.playedQuestionIds,
        TARGET_QUESTIONS,
        state.config.shuffleOptions
      );
      questionsToPlay = result.selected;
      nextPlayedIds = result.newPlayedIds;
    }

    set({
      gameState: 'playing',
      questions: questionsToPlay,
      playedQuestionIds: nextPlayedIds,
      currentIndex: 0,
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      currentCombo: 0,
      maxCombo: 0,
    });
  },

  answerQuestion: (isCorrect: boolean, points?: number) => {
    const state = get();
    const config = state.config;

    let newScore = state.score;
    let newCombo = state.currentCombo;
    let newMaxCombo = state.maxCombo;

    if (isCorrect) {
      const basePoints = points ?? config.pointsCorrect;
      newScore += basePoints;
      newCombo += 1;
      if (newCombo >= 5) newScore += config.combo5;
      else if (newCombo >= 3) newScore += config.combo3;
      else if (newCombo >= 2) newScore += config.combo2;
      if (newCombo > newMaxCombo) newMaxCombo = newCombo;
    } else {
      newCombo = 0;
      // Apply penalty if provided (e.g. timeout = -50)
      if (points !== undefined && points < 0) {
        newScore = Math.max(0, newScore + points);
      }
    }

    set({
      score: newScore,
      currentCombo: newCombo,
      maxCombo: newMaxCombo,
      correctAnswers: state.correctAnswers + (isCorrect ? 1 : 0),
      wrongAnswers: state.wrongAnswers + (!isCorrect ? 1 : 0),
    });
  },

  advanceQuestion: () => {
    const state = get();
    const nextIndex = state.currentIndex + 1;
    if (nextIndex >= state.questions.length) {
      const newGamesPlayed = state.gamesPlayed + 1;
      const newPersonalBest = Math.max(state.personalBest, state.score);
      const newHighestCombo = Math.max(state.highestCombo, state.maxCombo);

      saveLocalStats({
        personalBest: newPersonalBest,
        highestCombo: newHighestCombo,
        gamesPlayed: newGamesPlayed,
      });

      // Persiste no Firestore só para jogadores identificados
      const currentPlayer = usePlayerIdentityStore.getState().player;
      const siteConfig = useSiteConfigStore.getState().config;
      const { p1Id, p2Id } = getPlayerIds(siteConfig);
      if (currentPlayer === p1Id || currentPlayer === p2Id) {
        import('../../../services/gameRecords').then(({ saveQuizRecordIfBetter }) => {
          saveQuizRecordIfBetter(currentPlayer, newPersonalBest, newHighestCombo);
        });
      }

      set({
        gameState: 'result',
        personalBest: newPersonalBest,
        highestCombo: newHighestCombo,
        gamesPlayed: newGamesPlayed,
      });
    } else {
      set({ currentIndex: nextIndex });
    }
  },

  resetGame: () => {
    const state = get();
    // Pega o pool completo de perguntas para sortear UMA NOVA LEVA de 15 perguntas sem repetição
    const pool = state.availableQuestions.length > 0 ? state.availableQuestions : state.questions;
    const { selected, newPlayedIds } = selectGameQuestions(
      pool,
      state.playedQuestionIds,
      TARGET_QUESTIONS,
      state.config.shuffleOptions
    );

    set({
      gameState: 'intro',
      questions: selected.length > 0 ? selected : state.questions,
      playedQuestionIds: newPlayedIds,
      currentIndex: 0,
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      currentCombo: 0,
      maxCombo: 0,
    });
  },

  syncQuizStats: async () => {
    const player = usePlayerIdentityStore.getState().player;
    const siteConfig = useSiteConfigStore.getState().config;
    const { p1Id, p2Id } = getPlayerIds(siteConfig);
    if (player === p1Id || player === p2Id) {
      try {
        const { getQuizRecord } = await import('../../../services/gameRecords');
        const record = await getQuizRecord(player);
        if (record) {
          set({ personalBest: record.score, highestCombo: record.highestCombo });
        }
      } catch (e) {
        console.error('Erro ao sincronizar stats do quiz:', e);
      }
    }
  },
}));
