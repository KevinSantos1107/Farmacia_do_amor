import { getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { siteDoc } from '../firestore/paths';
import {
  type PlayerName,
  type RankingResult,
  recordDocId,
  waitForAuth,
  getConfigPlayerIds,
} from './common';

export interface QuizRecord {
  /** Pontuação total acumulada (campo principal do ranking). */
  totalScore: number;
  /** Total de partidas jogadas. */
  gamesPlayed: number;
  /** Total de acertos ao longo de todas as partidas. */
  totalCorrect: number;
  /** Total de perguntas respondidas. */
  totalQuestions: number;
  /** Melhor pontuação em uma única partida (antigo `score`, mantido para retrocompatibilidade). */
  bestSingleRun: number;
  /** Maior combo já alcançado. */
  highestCombo: number;
  /** @deprecated Use `bestSingleRun`. Mantido apenas para não quebrar leituras antigas. */
  score: number;
}

/**
 * Lê o registro acumulado do Quiz para um jogador.
 */
export async function getQuizRecord(
  player: PlayerName
): Promise<QuizRecord | null> {
  if (!player) return null;
  try {
    const ref = siteDoc('game_records', recordDocId('quiz', player));
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      // `score` legado vira `bestSingleRun` se o novo campo ainda não existir
      const bestSingleRun = d.bestSingleRun ?? d.score ?? 0;
      return {
        totalScore:     d.totalScore     ?? 0,
        gamesPlayed:    d.gamesPlayed    ?? 0,
        totalCorrect:   d.totalCorrect   ?? 0,
        totalQuestions: d.totalQuestions ?? 0,
        bestSingleRun,
        highestCombo:   d.highestCombo   ?? 0,
        // retrocompatibilidade
        score:          d.score          ?? bestSingleRun,
      };
    }
    return null;
  } catch (e) {
    console.error('Erro ao ler recorde do quiz:', e);
    return null;
  }
}

/**
 * Salva as estatísticas acumuladas do Quiz após cada partida.
 * - `totalScore` é **somado** ao valor existente.
 * - `bestSingleRun` é atualizado apenas se `newScore` for maior.
 * - `highestCombo` é atualizado apenas se `newCombo` for maior.
 */
export async function saveQuizStats(
  player: PlayerName,
  newScore: number,
  newCombo: number,
  correctAnswers: number,
  totalQuestions: number
): Promise<void> {
  try {
    await waitForAuth();
    const ref = siteDoc('game_records', recordDocId('quiz', player));
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const d = snap.data();
      const prevTotal       = d.totalScore     ?? 0;
      const prevGames       = d.gamesPlayed    ?? 0;
      const prevCorrect     = d.totalCorrect   ?? 0;
      const prevQuestions   = d.totalQuestions ?? 0;
      const prevBest        = d.bestSingleRun  ?? d.score ?? 0;
      const prevCombo       = d.highestCombo   ?? 0;

      await setDoc(ref, {
        game:           'quiz',
        player,
        totalScore:     prevTotal     + newScore,
        gamesPlayed:    prevGames     + 1,
        totalCorrect:   prevCorrect   + correctAnswers,
        totalQuestions: prevQuestions + totalQuestions,
        bestSingleRun:  Math.max(prevBest,  newScore),
        highestCombo:   Math.max(prevCombo, newCombo),
        // mantém `score` legado como espelho de bestSingleRun
        score:          Math.max(prevBest,  newScore),
        updatedAt:      serverTimestamp(),
      }, { merge: true });
    } else {
      await setDoc(ref, {
        game:           'quiz',
        player,
        totalScore:     newScore,
        gamesPlayed:    1,
        totalCorrect:   correctAnswers,
        totalQuestions: totalQuestions,
        bestSingleRun:  newScore,
        highestCombo:   newCombo,
        score:          newScore,
        updatedAt:      serverTimestamp(),
      });
    }
  } catch (e) {
    console.error('Erro ao salvar stats do quiz:', e);
  }
}

/**
 * Salva o recorde do Quiz se a pontuação ou o combo forem maiores.
 * @deprecated Para novas partidas completas com contagem de acertos, use `saveQuizStats`.
 * Mantida para compatibilidade e testes unitários.
 */
export async function saveQuizRecordIfBetter(
  player: PlayerName,
  newScore: number,
  newCombo: number
): Promise<boolean> {
  try {
    await waitForAuth();
    const ref = siteDoc('game_records', recordDocId('quiz', player));
    const snap = await getDoc(ref);

    let updated = false;
    const dataToSave: {
      game: string;
      player: PlayerName;
      updatedAt: ReturnType<typeof serverTimestamp>;
      score?: number;
      bestSingleRun?: number;
      highestCombo?: number;
    } = { game: 'quiz', player, updatedAt: serverTimestamp() };

    if (snap.exists()) {
      const data = snap.data();
      const currentScore = data.bestSingleRun ?? data.score ?? 0;
      const currentCombo = data.highestCombo ?? 0;

      if (newScore > currentScore) {
        dataToSave.score = newScore;
        dataToSave.bestSingleRun = newScore;
        updated = true;
      }
      if (newCombo > currentCombo) {
        dataToSave.highestCombo = newCombo;
        updated = true;
      }
    } else {
      dataToSave.score = newScore;
      dataToSave.bestSingleRun = newScore;
      dataToSave.highestCombo = newCombo;
      updated = true;
    }

    if (updated) {
      await setDoc(ref, dataToSave, { merge: true });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Erro ao salvar recorde do quiz:', e);
    return false;
  }
}

/**
 * Lê os registros do Quiz para ambos os jogadores.
 */
export async function getQuizRanking(): Promise<RankingResult<QuizRecord>> {
  const { p1Id, p2Id } = getConfigPlayerIds();
  const [p1, p2] = await Promise.all([
    getQuizRecord(p1Id),
    getQuizRecord(p2Id),
  ]);
  return { p1, p2 };
}
