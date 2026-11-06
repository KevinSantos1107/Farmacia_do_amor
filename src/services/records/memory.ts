import { getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { siteDoc } from '../firestore/paths';
import {
  type PlayerName,
  type RankingResult,
  waitForAuth,
  getConfigPlayerIds,
} from './common';

// ─── Memory Game Records ──────────────────────────────────────────────────────

export type MemoryDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export interface MemoryLevelRecord {
  /** Melhor pontuação já obtida neste nível (uma única partida). */
  score: number;
  /** Melhor tempo (em segundos) correspondente ao melhor score. Menor = melhor. */
  bestTime: number;
  /** Pontuação acumulada de todas as partidas neste nível. */
  totalScore: number;
  /** Total de partidas jogadas neste nível. */
  gamesPlayed: number;
}

export interface MemoryRecord {
  /** Melhor pontuação em uma única partida (across all difficulties). */
  score: number;
  /** Tempo da partida com o melhor score (seconds). */
  bestTime: number;
  /** Dificuldade onde o melhor score foi alcançado. */
  bestScoreLevel?: MemoryDifficulty;
  /** Total de partidas iniciadas/completadas (todos os níveis). */
  gamesPlayed: number;
  /** Maior combo streak já alcançado. */
  bestCombo: number;
  /** Pontuação total acumulada de todas as partidas (campo principal do ranking). */
  totalScore: number;
  easy:      MemoryLevelRecord | null;
  medium:    MemoryLevelRecord | null;
  hard:      MemoryLevelRecord | null;
  extreme?:  MemoryLevelRecord | null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Reconstitui um `MemoryLevelRecord` a partir dos dados brutos do Firestore,
 * garantindo que os novos campos de somatória existam (defaults a 0).
 */
function parseLevelRecord(raw: Record<string, unknown> | undefined | null): MemoryLevelRecord | null {
  if (!raw) return null;
  return {
    score:       (raw.score       as number) ?? 0,
    bestTime:    (raw.bestTime    as number) ?? 99999,
    totalScore:  (raw.totalScore  as number) ?? 0,
    gamesPlayed: (raw.gamesPlayed as number) ?? 0,
  };
}

/**
 * Lê o registro do Jogo da Memória para um jogador.
 */
export async function getMemoryRecord(
  player: PlayerName
): Promise<MemoryRecord | null> {
  if (!player) return null;
  try {
    const ref = siteDoc('game_records', `memory_${player}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return {
        score:          d.score          ?? 0,
        bestTime:       d.bestTime       ?? 99999,
        bestScoreLevel: d.bestScoreLevel as MemoryDifficulty | undefined,
        gamesPlayed:    d.gamesPlayed    ?? 0,
        bestCombo:      d.bestCombo      ?? 0,
        totalScore:     d.totalScore     ?? 0,
        easy:    parseLevelRecord(d.easy    as Record<string, unknown> | undefined),
        medium:  parseLevelRecord(d.medium  as Record<string, unknown> | undefined),
        hard:    parseLevelRecord(d.hard    as Record<string, unknown> | undefined),
        extreme: parseLevelRecord(d.extreme as Record<string, unknown> | undefined),
      };
    }
    return null;
  } catch (e) {
    console.error('Erro ao ler recorde do jogo da memória:', e);
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Atualiza os campos de um nível específico:
 * - `score` e `bestTime`: lógica de máximo/mínimo (melhor partida).
 * - `totalScore` e `gamesPlayed`: somatória acumulada.
 */
function nextMemoryLevelRecord(
  current: MemoryLevelRecord | null,
  newScore: number,
  newTime: number,
): MemoryLevelRecord {
  if (!current) {
    return { score: newScore, bestTime: newTime, totalScore: newScore, gamesPlayed: 1 };
  }

  let bestScore = current.score;
  let bestTime  = current.bestTime ?? 99999;

  if (newScore > bestScore) {
    bestScore = newScore;
    bestTime  = newTime;
  } else if (newScore === bestScore && newTime < bestTime) {
    bestTime = newTime;
  }

  return {
    score:       bestScore,
    bestTime:    bestTime,
    totalScore:  (current.totalScore  ?? 0) + newScore,
    gamesPlayed: (current.gamesPlayed ?? 0) + 1,
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Salva o resultado de uma partida do Jogo da Memória.
 * - Soma `newScore` ao `totalScore` global e ao `totalScore` do nível.
 * - Mantém a lógica de `bestTime` e `bestCombo` (máximo/mínimo, como antes).
 * - Incrementa `gamesPlayed` global, `wins` e `gamesPlayed` do nível.
 */
export async function saveMemoryRecordIfBetter(
  player: PlayerName,
  newScore: number,
  newTime: number,
  difficulty: MemoryDifficulty,
  combo: number
): Promise<boolean> {
  try {
    await waitForAuth();
    const ref = siteDoc('game_records', `memory_${player}`);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      const currentScore      = data.score      ?? 0;
      const currentTime       = data.bestTime   ?? 99999;
      const currentCombo      = data.bestCombo  ?? 0;
      const currentTotalScore = data.totalScore ?? 0;
      const currentGames      = data.gamesPlayed ?? 0;
      const currentLevel      = parseLevelRecord(data[difficulty] as Record<string, unknown> | undefined);

      // ── Recorde global (melhor partida) ─────────────────────────────
      let newGlobalScore = currentScore;
      let newGlobalTime  = currentTime;
      let newBestLevel   = (data.bestScoreLevel as MemoryDifficulty | undefined) ?? difficulty;

      if (newScore > currentScore || (newScore === currentScore && newTime < currentTime)) {
        newGlobalScore = newScore;
        newGlobalTime  = newTime;
        newBestLevel   = difficulty;
      }

      const dataToSave: Record<string, unknown> = {
        game:           'memory',
        player,
        // recorde global (máximo)
        score:          newGlobalScore,
        bestTime:       newGlobalTime,
        bestScoreLevel: newBestLevel,
        // acumulados globais
        totalScore:     currentTotalScore + newScore,
        gamesPlayed:    currentGames      + 1,
        // combo (máximo)
        bestCombo:      Math.max(currentCombo, combo),
        // nível específico
        [difficulty]:   nextMemoryLevelRecord(currentLevel, newScore, newTime),
        updatedAt:      serverTimestamp(),
      };

      await setDoc(ref, dataToSave, { merge: true });
      return true;
    } else {
      // Primeiro registro
      await setDoc(ref, {
        game:           'memory',
        player,
        score:          newScore,
        bestTime:       newTime,
        bestScoreLevel: difficulty,
        totalScore:     newScore,
        gamesPlayed:    1,
        bestCombo:      combo,
        [difficulty]:   {
          score: newScore,
          bestTime: newTime,
          totalScore: newScore,
          gamesPlayed: 1,
        } satisfies MemoryLevelRecord,
        updatedAt: serverTimestamp(),
      });
      return true;
    }
  } catch (e) {
    console.error('Erro ao salvar recorde do jogo da memória:', e);
    return false;
  }
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

/**
 * Lê os registros do Jogo da Memória para ambos os jogadores.
 */
export async function getMemoryRanking(): Promise<RankingResult<MemoryRecord>> {
  const { p1Id, p2Id } = getConfigPlayerIds();
  const [p1, p2] = await Promise.all([
    getMemoryRecord(p1Id),
    getMemoryRecord(p2Id),
  ]);
  return { p1, p2 };
}
