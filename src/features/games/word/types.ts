export type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'active' | 'typed';

export interface WordData {
  palavra: string;
  mensagem: string;
}

export interface Question {
  id: string;
  pergunta: string;
  palavras: WordData[];
}

export interface LetterCell {
  letter: string;
  state: LetterState;
}

export interface GameStats {
  gamesPlayed: number;
  wins: number;
  losses?: number;
  currentStreak: number;
  bestStreak: number;
  winsByAttempt: number[]; // índice 0 = 1ª tentativa, 5 = 6ª tentativa
}

export interface ActiveGameState {
  word: string;
  question: string;
  message: string;
  guesses: LetterCell[][];
  currentInput: string;
  cursorPos: number;
}
