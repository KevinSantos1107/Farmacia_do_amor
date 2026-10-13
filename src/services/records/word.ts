import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  type PlayerName,
  type RankingResult,
  recordDocId,
  waitForAuth,
  getConfigPlayerIds,
} from './common';

// Estrutura do recorde do jogo de palavras (acumulativo)
export interface WordRecord {
  score: number;      // pontuação total acumulada
  gamesPlayed: number;// total de jogos jogados
  wins: number;       // total de vitórias
  streak: number;     // sequência atual de vitórias
  bestStreak: number; // melhor sequência de todos os tempos
  winsByAttempt: number[]; // vitórias por tentativa (índice 0 a 5)
}

/**
 * Lê o recorde completo do jogo da palavra (acumulativo).
 * Retorna null se não houver registro ainda.
 */
export async function getWordRecord(
  player: PlayerName
): Promise<WordRecord | null> {
  if (!player) return null;
  try {
    const ref = doc(db, 'game_records', recordDocId('word', player));
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return {
        score: d.score ?? 0,
        gamesPlayed: d.gamesPlayed ?? d.wins ?? 0,
        wins: d.wins ?? 0,
        streak: d.streak ?? 0,
        bestStreak: d.bestStreak ?? 0,
        winsByAttempt: d.winsByAttempt ?? [0,0,0,0,0,0],
      };
    }
    return null;
  } catch (e) {
    console.error('Erro ao ler recorde da palavra:', e);
    return null;
  }
}

/**
 * Salva o resultado de uma partida do jogo da palavra (vitória ou derrota).
 * Sempre atualiza as métricas acumuladas.
 */
export async function saveWordGameResult(
  player: PlayerName,
  roundScore: number,
  isWin: boolean,
  currentStreak: number,
  bestStreak: number,
  winsByAttempt: number[]
): Promise<void> {
  try {
    await waitForAuth();
    const ref = doc(db, 'game_records', recordDocId('word', player));
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      await setDoc(ref, {
        game: 'word',
        player,
        score: (data.score ?? 0) + roundScore,
        gamesPlayed: (data.gamesPlayed ?? data.wins ?? 0) + 1,
        wins: (data.wins ?? 0) + (isWin ? 1 : 0),
        streak: currentStreak,
        bestStreak: Math.max(data.bestStreak ?? 0, bestStreak),
        winsByAttempt,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await setDoc(ref, {
        game: 'word',
        player,
        score: roundScore,
        gamesPlayed: 1,
        wins: isWin ? 1 : 0,
        streak: currentStreak,
        bestStreak: bestStreak,
        winsByAttempt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.error('Erro ao salvar resultado da palavra:', e);
  }
}

/**
 * Lê os recordes completos do jogo da palavra para ambos os jogadores.
 */
export async function getWordRanking(): Promise<RankingResult<WordRecord>> {
  const { p1Id, p2Id } = getConfigPlayerIds();
  const [p1, p2] = await Promise.all([
    getWordRecord(p1Id),
    getWordRecord(p2Id),
  ]);
  return { p1, p2 };
}
