/**
 * src/features/games/word-duel/types.ts
 */

import type { LetterCell } from '../word/types';

export type WordDuelStatus =
  | 'lobby'
  | 'inviting'
  | 'waiting_words'
  | 'dueling'
  | 'round_over';

export interface WordDuelRoom {
  roomId: string;
  p1Id: string;
  p2Id: string;
  status: WordDuelStatus;
  hostId: string;
  inviteExpiresAt?: number | null;
  p1Locked: boolean;
  p2Locked: boolean;
  currentTurn: string;
  starterId: string;
  p1Guesses: LetterCell[][];
  p2Guesses: LetterCell[][];
  // Rascunho / digitação em tempo real (opcional para o parceiro acompanhar)
  liveDraft?: {
    [playerId: string]: {
      text: string;
      cursor: number;
      updatedAt?: number;
    };
  };
  winnerId: string | null;
  p1RevealedWord: string | null;
  p2RevealedWord: string | null;
  leftBy?: string | null;
  leftAt?: number | null;
  updatedAt?: unknown;
}
