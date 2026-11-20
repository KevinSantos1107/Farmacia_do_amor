import type { LetterCell } from '../word/types';

export type WordDuelStatus = 'waiting_words' | 'dueling' | 'round_over';

export interface WordDuelRoom {
  roomId: string;
  p1Id: string;
  p2Id: string;
  status: WordDuelStatus;
  p1Locked: boolean;
  p2Locked: boolean;
  currentTurn: string;
  starterId: string;
  p1Guesses: LetterCell[][];
  p2Guesses: LetterCell[][];
  winnerId: string | null;
  p1RevealedWord: string | null;
  p2RevealedWord: string | null;
  updatedAt?: unknown;
}
