import { describe, it, expect, beforeEach } from 'vitest';
import {
  useQuizStore,
  selectGameQuestions,
  buildEligiblePool,
  TARGET_QUESTIONS,
} from './useQuizStore';
import type { QuizQuestion, QuizOption } from '../schema';

function makeQuestion(id: string, overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  const options: QuizOption[] = [
    { id: 'opt-1', text: 'Opção 1' },
    { id: 'opt-2', text: 'Opção 2' },
  ];
  return {
    id,
    siteId: 'test-site',
    question: `Pergunta ${id}`,
    options,
    correctOptionId: 'opt-1',
    points: 100,
    active: true,
    order: 0,
    ...overrides,
  };
}

describe('useQuizStore - Seleção e Rotação de Perguntas', () => {
  beforeEach(() => {
    useQuizStore.setState({
      availableQuestions: [],
      playedQuestionIds: [],
      questions: [],
      currentIndex: 0,
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      currentCombo: 0,
      maxCombo: 0,
      gameState: 'intro',
    });
  });

  describe('selectGameQuestions', () => {
    it('retorna array vazio quando o pool for vazio', () => {
      const result = selectGameQuestions([], []);
      expect(result.selected).toEqual([]);
      expect(result.newPlayedIds).toEqual([]);
    });

    it('retorna todas as perguntas se o pool tiver menos ou igual a TARGET_QUESTIONS (ex: 5)', () => {
      const pool = Array.from({ length: 5 }, (_, i) => makeQuestion(`q-${i + 1}`));
      const result = selectGameQuestions(pool, [], TARGET_QUESTIONS);

      expect(result.selected).toHaveLength(5);
      expect(result.newPlayedIds).toHaveLength(5);
    });

    it('em um pool de 64 perguntas (15 manuais + 49 IA), garante partidas consecutivas sem repetição', () => {
      // 15 perguntas manuais + 49 perguntas IA = 64 perguntas no total
      const pool = Array.from({ length: 64 }, (_, i) =>
        makeQuestion(`q-${i + 1}`, {
          createdBy: i < 15 ? 'partner1' : undefined,
        })
      );

      // Partida 1: Deve sortear 15 perguntas
      const game1 = selectGameQuestions(pool, [], TARGET_QUESTIONS);
      expect(game1.selected).toHaveLength(TARGET_QUESTIONS);
      expect(game1.newPlayedIds).toHaveLength(15);
      const game1Ids = new Set(game1.selected.map((q) => q.id));

      // Partida 2: Deve sortear 15 perguntas com ZERO repetições da Partida 1
      const game2 = selectGameQuestions(pool, game1.newPlayedIds, TARGET_QUESTIONS);
      expect(game2.selected).toHaveLength(TARGET_QUESTIONS);
      expect(game2.newPlayedIds).toHaveLength(30);
      const game2Ids = new Set(game2.selected.map((q) => q.id));
      for (const id of game2Ids) {
        expect(game1Ids.has(id)).toBe(false);
      }

      // Partida 3: Deve sortear mais 15 perguntas com ZERO repetições das Partidas 1 e 2
      const game3 = selectGameQuestions(pool, game2.newPlayedIds, TARGET_QUESTIONS);
      expect(game3.selected).toHaveLength(TARGET_QUESTIONS);
      expect(game3.newPlayedIds).toHaveLength(45);
      const game3Ids = new Set(game3.selected.map((q) => q.id));
      for (const id of game3Ids) {
        expect(game1Ids.has(id)).toBe(false);
        expect(game2Ids.has(id)).toBe(false);
      }

      // Partida 4: Deve sortear mais 15 perguntas com ZERO repetições das Partidas 1, 2 e 3
      const game4 = selectGameQuestions(pool, game3.newPlayedIds, TARGET_QUESTIONS);
      expect(game4.selected).toHaveLength(TARGET_QUESTIONS);
      expect(game4.newPlayedIds).toHaveLength(60);
      const game4Ids = new Set(game4.selected.map((q) => q.id));
      for (const id of game4Ids) {
        expect(game1Ids.has(id)).toBe(false);
        expect(game2Ids.has(id)).toBe(false);
        expect(game3Ids.has(id)).toBe(false);
      }

      // Partida 5: Restavam 4 perguntas não vistas (64 - 60 = 4).
      // Deve obrigatoriamente incluir todas as 4 restantes e completar com 11 do ciclo anterior
      const game5 = selectGameQuestions(pool, game4.newPlayedIds, TARGET_QUESTIONS);
      expect(game5.selected).toHaveLength(TARGET_QUESTIONS);
      const allSeenInFirst4 = new Set([...game1Ids, ...game2Ids, ...game3Ids, ...game4Ids]);
      const remaining4 = pool.filter((q) => !allSeenInFirst4.has(q.id)).map((q) => q.id);
      expect(remaining4).toHaveLength(4);

      const game5Ids = new Set(game5.selected.map((q) => q.id));
      for (const id of remaining4) {
        expect(game5Ids.has(id)).toBe(true);
      }
    });

    it('embaralha opções quando shuffleOptions for true', () => {
      const q = makeQuestion('q1', {
        options: [
          { id: '1', text: 'A' },
          { id: '2', text: 'B' },
          { id: '3', text: 'C' },
          { id: '4', text: 'D' },
        ],
      });
      const result = selectGameQuestions([q], [], 15, true);
      expect(result.selected[0].options).toHaveLength(4);
    });
  });

  describe('buildEligiblePool', () => {
    it('combina perguntas manuais ativas e perguntas de IA', () => {
      const manual = [makeQuestion('m1'), makeQuestion('m2', { active: false }), makeQuestion('m3')];
      const ai = [makeQuestion('ai1'), makeQuestion('ai2')];

      const pool = buildEligiblePool(manual, ai, '');
      expect(pool.map((q) => q.id)).toEqual(['m1', 'm3', 'ai1', 'ai2']);
    });

    it('as perguntas criadas por Kevin NÃO aparecem para Kevin, apenas para Iara', () => {
      const manual = [
        makeQuestion('q-kevin-1', { createdBy: 'kevin' }),
        makeQuestion('q-kevin-2', { createdBy: 'kevin' }),
        makeQuestion('q-iara-1', { createdBy: 'iara' }),
      ];
      const ai = [makeQuestion('q-ai-1')];

      // Quando Kevin joga: NUNCA deve ver as perguntas de Kevin, apenas as de Iara + IA
      const poolKevin = buildEligiblePool(manual, ai, 'kevin');
      expect(poolKevin.map((q) => q.id)).toEqual(['q-iara-1', 'q-ai-1']);
      expect(poolKevin.some((q) => q.createdBy === 'kevin')).toBe(false);

      // Quando Iara joga: NUNCA deve ver as perguntas de Iara, apenas as de Kevin + IA
      const poolIara = buildEligiblePool(manual, ai, 'iara');
      expect(poolIara.map((q) => q.id)).toEqual(['q-kevin-1', 'q-kevin-2', 'q-ai-1']);
      expect(poolIara.some((q) => q.createdBy === 'iara')).toBe(false);
    });

    it('se Iara não criou perguntas manuais ainda, Kevin joga estritamente com perguntas da IA', () => {
      const manual = [
        makeQuestion('q-kevin-1', { createdBy: 'kevin' }),
        makeQuestion('q-kevin-2', { createdBy: 'kevin' }),
      ];
      const ai = [makeQuestion('q-ai-1'), makeQuestion('q-ai-2')];

      // Kevin jogando: NUNCA vê suas próprias perguntas, mesmo que Iara não tenha criado nenhuma
      const poolKevin = buildEligiblePool(manual, ai, 'kevin');
      expect(poolKevin.map((q) => q.id)).toEqual(['q-ai-1', 'q-ai-2']);
      expect(poolKevin.some((q) => q.createdBy === 'kevin')).toBe(false);

      // Iara jogando: vê todas as 2 perguntas de Kevin + 2 de IA = 4 perguntas
      const poolIara = buildEligiblePool(manual, ai, 'iara');
      expect(poolIara.map((q) => q.id)).toEqual(['q-kevin-1', 'q-kevin-2', 'q-ai-1', 'q-ai-2']);
    });
  });

  describe('resetGame no useQuizStore', () => {
    it('ao chamar resetGame, seleciona uma nova leva de perguntas a partir do pool disponível', () => {
      const pool = Array.from({ length: 64 }, (_, i) => makeQuestion(`q-${i + 1}`));
      
      const firstSelection = selectGameQuestions(pool, [], TARGET_QUESTIONS);

      useQuizStore.setState({
        availableQuestions: pool,
        playedQuestionIds: firstSelection.newPlayedIds,
        questions: firstSelection.selected,
        score: 500,
        currentIndex: 14,
        gameState: 'result',
      });

      const store = useQuizStore.getState();
      store.resetGame();

      const newState = useQuizStore.getState();
      expect(newState.gameState).toBe('intro');
      expect(newState.score).toBe(0);
      expect(newState.currentIndex).toBe(0);
      expect(newState.questions).toHaveLength(TARGET_QUESTIONS);

      // As perguntas da nova partida não devem ser as mesmas da partida anterior!
      const oldIds = new Set(firstSelection.selected.map((q) => q.id));
      const newIds = new Set(newState.questions.map((q) => q.id));

      let hasDifference = false;
      for (const id of newIds) {
        if (!oldIds.has(id)) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });
  });
});
