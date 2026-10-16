import { getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { siteDoc } from '../firestore/paths';
import {
  type PlayerName,
  type RankingResult,
  waitForAuth,
  getConfigPlayerIds,
} from './common';

// ─── Memory Game Records ──────────────────────────────────────────────────────

export type MemoryDifficulty = 'easy' | 'medium' | 'hard';

export interface MemoryLevelRecord {
  score: number;
  bestTime: number; // seconds — lower is better
}

export interface MemoryRecord {
  score: number;        // all-time best score across all difficulties
  bestTime: number;     // time of the all-time best score (seconds)
  bestScoreLevel?: MemoryDifficulty; // difficulty where the best score was made
  gamesPlayed: number;
  bestCombo: number;    // highest combo streak ever achieved
  easy:   MemoryLevelRecord | null;
  medium: MemoryLevelRecord | null;
  hard:   MemoryLevelRecord | null;
}

/**
 * Reads the memory game record for a player.
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
        easy:   d.easy   ?? null,
        medium: d.medium ?? null,
        hard:   d.hard   ?? null,
      };
    }
    return null;
  } catch (e) {
    console.error('Erro ao ler recorde do jogo da memória:', e);
    return null;
  }
}

function nextMemoryLevelRecord(
  current: MemoryLevelRecord | null,
  newScore: number,
  newTime: number,
): MemoryLevelRecord {
  if (!current) return { score: newScore, bestTime: newTime };
  if (newScore > current.score) return { score: newScore, bestTime: newTime };
  if (newScore === current.score) {
    return { score: current.score, bestTime: Math.min(newTime, current.bestTime ?? 99999) };
  }
  return current;
}

/**
 * Saves the memory game record if the new score is better.
 * Tempo do recorde global segue sempre a partida da melhor pontuação.
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

    let updated = false;
    const dataToSave: Record<string, unknown> = {
      game: 'memory',
      player,
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      const data = snap.data();
      const currentScore = data.score ?? 0;
      const currentTime  = data.bestTime ?? 99999;
      const currentCombo = data.bestCombo ?? 0;
      const currentLevel = (data[difficulty] as MemoryLevelRecord | undefined) ?? null;

      if (newScore > currentScore || (newScore === currentScore && newTime < currentTime)) {
        dataToSave.score = newScore;
        dataToSave.bestTime = newTime;
        dataToSave.bestScoreLevel = difficulty;
        updated = true;
      }
      if (combo > currentCombo) {
        dataToSave.bestCombo = combo;
        updated = true;
      }

      const levelUpdate = nextMemoryLevelRecord(currentLevel, newScore, newTime);
      if (
        !currentLevel ||
        levelUpdate.score !== currentLevel.score ||
        levelUpdate.bestTime !== currentLevel.bestTime
      ) {
        dataToSave[difficulty] = levelUpdate;
        updated = true;
      }

      dataToSave.gamesPlayed = (data.gamesPlayed ?? 0) + 1;
      updated = true;
    } else {
      dataToSave.score          = newScore;
      dataToSave.bestTime       = newTime;
      dataToSave.bestScoreLevel = difficulty;
      dataToSave.bestCombo      = combo;
      dataToSave.gamesPlayed    = 1;
      dataToSave[difficulty]    = { score: newScore, bestTime: newTime } satisfies MemoryLevelRecord;
      updated = true;
    }

    if (updated) {
      await setDoc(ref, dataToSave, { merge: true });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Erro ao salvar recorde do jogo da memória:', e);
    return false;
  }
}

/**
 * Reads memory game records for both players.
 */
export async function getMemoryRanking(): Promise<RankingResult<MemoryRecord>> {
  const { p1Id, p2Id } = getConfigPlayerIds();
  const [p1, p2] = await Promise.all([
    getMemoryRecord(p1Id),
    getMemoryRecord(p2Id),
  ]);
  return { p1, p2 };
}
