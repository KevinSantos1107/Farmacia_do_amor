import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  type GameId,
  type PlayerName,
  type RankingResult,
  recordDocId,
  waitForAuth,
  getConfigPlayerIds,
} from './common';

/**
 * Lê o recorde de um jogador para um jogo específico.
 * Retorna null se não houver registro ainda.
 */
export async function getRecord(
  game: GameId,
  player: PlayerName
): Promise<number | null> {
  if (!player) return null; // guard: never call Firestore with undefined/empty player
  try {
    const ref = doc(db, 'game_records', recordDocId(game, player));
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().score as number;
    }
    return 0; // Documento não existe, a pontuação é 0
  } catch (e) {
    console.error('Erro ao ler recorde:', e);
    return null;
  }
}

/**
 * Salva o recorde somente se a nova pontuação for maior que a atual.
 * Retorna true se o recorde foi atualizado.
 */
export async function saveRecordIfBetter(
  game: GameId,
  player: PlayerName,
  newScore: number
): Promise<boolean> {
  try {
    await waitForAuth();
    const ref = doc(db, 'game_records', recordDocId(game, player));
    const snap = await getDoc(ref);
    const currentScore = snap.exists() ? (snap.data().score as number) : -1;

    if (newScore > currentScore) {
      await setDoc(ref, {
        game,
        player,
        score: newScore,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Erro ao salvar recorde:', e);
    return false;
  }
}

/**
 * Lê os recordes de ambos os jogadores para um jogo simples (snake, quiz).
 */
export async function getRanking(
  game: GameId
): Promise<RankingResult<number>> {
  const { p1Id, p2Id } = getConfigPlayerIds();
  const [p1, p2] = await Promise.all([
    getRecord(game, p1Id),
    getRecord(game, p2Id),
  ]);
  return { p1, p2 };
}
