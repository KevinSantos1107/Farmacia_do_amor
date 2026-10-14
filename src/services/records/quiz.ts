import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  type PlayerName,
  type RankingResult,
  recordDocId,
  waitForAuth,
  getConfigPlayerIds,
} from './common';

export interface QuizRecord {
  score: number;
  highestCombo: number;
}

/**
 * Lê o recorde do Quiz (Score e Combo).
 */
export async function getQuizRecord(
  player: PlayerName
): Promise<QuizRecord | null> {
  if (!player) return null;
  try {
    const ref = doc(db, 'game_records', recordDocId('quiz', player));
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return {
        score: d.score ?? 0,
        highestCombo: d.highestCombo ?? 0,
      };
    }
    return null;
  } catch (e) {
    console.error('Erro ao ler recorde do quiz:', e);
    return null;
  }
}

/**
 * Salva o recorde do Quiz se a pontuação ou o combo forem maiores.
 */
export async function saveQuizRecordIfBetter(
  player: PlayerName,
  newScore: number,
  newCombo: number
): Promise<boolean> {
  try {
    await waitForAuth();
    const ref = doc(db, 'game_records', recordDocId('quiz', player));
    const snap = await getDoc(ref);
    
    let updated = false;
    const dataToSave: {
      game: string;
      player: PlayerName;
      updatedAt: ReturnType<typeof serverTimestamp>;
      score?: number;
      highestCombo?: number;
    } = { game: 'quiz', player, updatedAt: serverTimestamp() };
    
    if (snap.exists()) {
      const data = snap.data();
      const currentScore = data.score ?? 0;
      const currentCombo = data.highestCombo ?? 0;
      
      if (newScore > currentScore) {
        dataToSave.score = newScore;
        updated = true;
      }
      if (newCombo > currentCombo) {
        dataToSave.highestCombo = newCombo;
        updated = true;
      }
    } else {
      dataToSave.score = newScore;
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
 * Lê os recordes do Quiz para ambos os jogadores.
 */
export async function getQuizRanking(): Promise<RankingResult<QuizRecord>> {
  const { p1Id, p2Id } = getConfigPlayerIds();
  const [p1, p2] = await Promise.all([
    getQuizRecord(p1Id),
    getQuizRecord(p2Id),
  ]);
  return { p1, p2 };
}
