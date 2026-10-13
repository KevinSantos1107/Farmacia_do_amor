import { auth } from '../firebase/config';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { getPlayerIds } from '../../features/auth/playerIds';

export type GameId = 'snake' | 'word' | 'quiz' | 'sync';
export type PlayerName = string;

// Estrutura genérica de recorde (snake, quiz)
export interface SimpleRecord {
  score: number;
}

// Ranking return shape — keys are always 'p1'/'p2', never hardcoded names.
export interface RankingResult<T> {
  p1: T | null;
  p2: T | null;
}

// Aguarda o Firebase Auth terminar a inicialização antes de qualquer operação
export function waitForAuth(): Promise<void> {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve();
      return;
    }
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        unsub();
        resolve();
      }
    });
    // Timeout de segurança: não trava para sempre se o auth falhar
    setTimeout(resolve, 5000);
  });
}

// Formato fixo do documento: "snake_kevin", "word_iara", etc.
export function recordDocId(game: GameId, player: PlayerName): string {
  return `${game}_${player}`;
}

export function getConfigPlayerIds() {
  const config = useSiteConfigStore.getState().config;
  return getPlayerIds(config);
}
