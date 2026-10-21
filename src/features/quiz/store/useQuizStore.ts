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
const TARGET_QUESTIONS = 15;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function buildQuizPool(
  manualQuestions: QuizQuestion[],
  aiQuestions: QuizQuestion[],
  currentPlayerId: string,
  config: QuizConfig
): QuizQuestion[] {
  // 1. Filtra manuais elegíveis (ativas + não criadas pelo player atual)
  const eligibleManual = manualQuestions.filter(
    (q) => q.active && (!q.createdBy || q.createdBy !== currentPlayerId)
  );

  // 2. Junta TODAS as perguntas disponíveis (manuais elegíveis + IA)
  const allEligible = [...eligibleManual, ...aiQuestions];

  // 3. Embaralha tudo junto para garantir aleatoriedade máxima
  let combined = shuffle(allEligible);

  // 4. Pega exatamente TARGET_QUESTIONS (ex: 15), ou todas se tiver menos
  combined = combined.slice(0, TARGET_QUESTIONS);

  // 5. Aplica embaralhar alternativas se configurado
  if (config.shuffleOptions) {
    combined = combined.map((q) => ({ ...q, options: shuffle(q.options) }));
  }

  return combined;
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

interface QuizState {
  config: QuizConfig;
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

function saveLocalStats(stats: { personalBest: number, highestCombo: number, gamesPlayed: number }) {
  localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats));
}

const initialStats = loadLocalStats();

// Identifica a carga mais recente (evita que uma busca de IA antiga sobrescreva uma nova)
let loadToken = 0;

export const useQuizStore = create<QuizState>((set, get) => ({
  config: DEFAULT_QUIZ_CONFIG,
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
    // Se já temos perguntas carregadas e não foi forçado reload, exibe instantaneamente
    if (!force && get().isReady && get().questions.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        setTimeout(() => {
          set({
            config: { ...DEFAULT_QUIZ_CONFIG, active: true },
            questions: [
              {
                id: 'q1', siteId, question: 'Onde nos conhecemos?',
                options: [{ id: 'o1', text: 'Praia' }, { id: 'o2', text: 'Festa' }, { id: 'o3', text: 'Escola' }, { id: 'o4', text: 'Internet' }],
                correctOptionId: 'o4', points: 100, active: true, order: 1,
              },
              {
                id: 'q2', siteId, question: 'Quem mandou a primeira mensagem?',
                options: [{ id: 'o1', text: 'Eu' }, { id: 'o2', text: 'Você' }, { id: 'o3', text: 'Os dois ao mesmo tempo' }, { id: 'o4', text: 'Um amigo em comum' }],
                correctOptionId: 'o2', points: 100, active: true, order: 2,
              },
            ],
            isLoading: false,
            isReady: true,
          });
        }, 300);
        return;
      }

      // ── Busca config e perguntas manuais em PARALELO ─────────────────────────
      // As perguntas de IA NÃO bloqueiam mais a abertura do quiz: são buscadas em
      // segundo plano (abaixo) e entram no pool assim que chegarem.
      const configRef = doc(db, 'sites', siteId, 'quiz_config', 'main');
      const qRef = collection(db, 'sites', siteId, 'quiz_questions');
      const qQuery = query(qRef, orderBy('order', 'asc'));

      const [configSnap, qSnap] = await Promise.all([
        getDoc(configRef).catch((e) => {
          console.warn('Erro ao carregar quiz_config:', e);
          return null;
        }),
        getDocs(qQuery).catch((e) => {
          console.warn('Erro ao carregar quiz_questions:', e);
          return null;
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

      // ── Monta o pool final (reutilizável quando a IA chegar) ──────────
      const assemblePool = (aiQuestions: QuizQuestion[]): QuizQuestion[] => {
        let pool: QuizQuestion[];
        if (isKnownPlayer) {
          pool = buildQuizPool(manualQuestions, aiQuestions, currentPlayer, loadedConfig);
        } else {
          const allEligible = manualQuestions.filter((q) => q.active);
          pool = buildQuizPool(allEligible, aiQuestions, '', loadedConfig);
        }
        if (loadedConfig.shuffleQuestions) pool = shuffle(pool);
        return pool;
      };

      set({ config: loadedConfig, questions: assemblePool([]), isLoading: false, isReady: true });

      // ── IA em segundo plano ───────────────────────────────────────────
      // Só aplica se esta ainda é a carga mais recente e o jogador não começou
      // a jogar (não mexe nas perguntas no meio de uma partida).
      const myToken = ++loadToken;
      fetchAiQuestions(siteId)
        .then((rawAi) => {
          if (myToken !== loadToken || rawAi.length === 0) return;
          if (get().gameState !== 'intro') return;
          const aiQuestions: QuizQuestion[] = rawAi.map((q) => ({
            id: q.id,
            siteId: q.siteId,
            question: q.question,
            options: q.options,
            correctOptionId: q.correctOptionId,
            points: q.points,
            active: true,
            order: 0,
          } as QuizQuestion));
          set({ questions: assemblePool(aiQuestions) });
        })
        .catch((aiErr) => {
          console.warn('Não foi possível carregar perguntas de IA:', aiErr);
        });
    } catch (err: unknown) {
      console.error('Error loading quiz:', err);
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false, isReady: true });
    }
  },

  startGame: () => {
    set({
      gameState: 'playing',
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
        gamesPlayed: newGamesPlayed
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
        gamesPlayed: newGamesPlayed
      });
    } else {
      set({ currentIndex: nextIndex });
    }
  },

  resetGame: () => {
    const state = get();
    let resetQuestions = [...state.questions];
    if (state.config.shuffleQuestions) {
      resetQuestions = shuffle(resetQuestions);
    }
    if (state.config.shuffleOptions) {
      resetQuestions = resetQuestions.map((q) => ({
        ...q,
        options: shuffle(q.options),
      }));
    }
    set({
      gameState: 'intro',
      questions: resetQuestions,
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
