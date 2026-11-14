import type { MemoryDifficulty } from '../../../services/gameRecords';

// ─── Difficulty Config ────────────────────────────────────────────────────────

export interface GridDimensions {
  cols: number;
  rows: number;
}

export interface DifficultyConfig {
  id: MemoryDifficulty;
  label: string;
  badge: string;
  iconName: 'sparkles' | 'gem' | 'infinity' | 'crown';
  pairs: number;
  cols: number; // mobile fallback
  rows: number; // mobile fallback
  grids: {
    mobile: GridDimensions;
    tablet: GridDimensions;
    desktop: GridDimensions;
  };
  basePointsPerPair: number;
  timeMultipliers: [number, number][];
  description: string;
  gridClasses: string; // Tailwind grid cols and rows
  cardAspect?: 'square' | 'portrait'; // padrão implícito: 'portrait'
  accentColor: string;
  accentRgb: string;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'easy',
    label: 'Fácil',
    badge: 'Tranquilo',
    iconName: 'sparkles',
    pairs: 6, // 12 cards → mobile: 4×3 | tablet: 6×2 | desktop: 6×2
    cols: 4,
    rows: 3,
    grids: {
      mobile: { cols: 4, rows: 3 },
      tablet: { cols: 6, rows: 2 },
      desktop: { cols: 6, rows: 2 },
    },
    basePointsPerPair: 100,
    timeMultipliers: [[30, 2.0], [60, 1.6], [Infinity, 1.2]],
    description: '6 pares · ritmo leve',
    gridClasses: 'grid-cols-4 grid-rows-3 sm:grid-cols-6 sm:grid-rows-2 lg:grid-cols-6 lg:grid-rows-2',
    accentColor: '#10b981',
    accentRgb: '16, 185, 129',
  },
  {
    id: 'medium',
    label: 'Médio',
    badge: 'Equilibrado',
    iconName: 'gem',
    pairs: 8, // 16 cards → mobile: 4×4 | tablet: 8×2 | desktop: 8×2
    cols: 4,
    rows: 4,
    grids: {
      mobile: { cols: 4, rows: 4 },
      tablet: { cols: 8, rows: 2 },
      desktop: { cols: 8, rows: 2 },
    },
    basePointsPerPair: 150,
    timeMultipliers: [[40, 2.0], [60, 1.6], [Infinity, 1.2]],
    description: '8 pares · sintonia perfeita',
    gridClasses: 'grid-cols-4 grid-rows-4 sm:grid-cols-8 sm:grid-rows-2 lg:grid-cols-8 lg:grid-rows-2',
    accentColor: '#f59e0b',
    accentRgb: '245, 158, 11',
  },
  {
    id: 'hard',
    label: 'Difícil',
    badge: 'Desafiador',
    iconName: 'infinity',
    pairs: 12, // 24 cards → mobile: 4×6 | tablet: 6×4 | desktop: 6×4
    cols: 4,
    rows: 6,
    grids: {
      mobile: { cols: 4, rows: 6 },
      tablet: { cols: 6, rows: 4 },
      desktop: { cols: 6, rows: 4 },
    },
    basePointsPerPair: 200,
    timeMultipliers: [[45, 2.0], [60, 1.6], [Infinity, 1.2]],
    description: '12 pares · cartas quadradas',
    gridClasses: 'grid-cols-4 grid-rows-6 sm:grid-cols-6 sm:grid-rows-4 lg:grid-cols-6 lg:grid-rows-4',
    cardAspect: 'square',
    accentColor: '#f43f5e',
    accentRgb: '244, 63, 94',
  },
  {
    id: 'extreme',
    label: 'Extremo',
    badge: 'Insuperável',
    iconName: 'crown',
    pairs: 15, // 30 cards → mobile: 5×6 | tablet: 6×5 | desktop: 6×5
    cols: 5,
    rows: 6,
    grids: {
      mobile: { cols: 5, rows: 6 },
      tablet: { cols: 6, rows: 5 },
      desktop: { cols: 6, rows: 5 },
    },
    basePointsPerPair: 280,
    timeMultipliers: [[60, 2.0], [90, 1.6], [Infinity, 1.2]],
    description: '15 pares · cartas quadradas · pontuação máxima',
    gridClasses: 'grid-cols-5 grid-rows-6 sm:grid-cols-6 sm:grid-rows-5 lg:grid-cols-6 lg:grid-rows-5',
    cardAspect: 'square',
    accentColor: '#a855f7',
    accentRgb: '168, 85, 247',
  },
];

// ─── Score & Time Helpers ─────────────────────────────────────────────────────

export function getComboMultiplier(combo: number): number {
  if (combo >= 4) return 2.0;
  if (combo === 3) return 1.5;
  if (combo === 2) return 1.2;
  return 1.0;
}

export function getTimeMultiplier(elapsed: number, diff: DifficultyConfig): number {
  for (const [threshold, mult] of diff.timeMultipliers) {
    if (elapsed <= threshold) return mult;
  }
  return 1.0;
}

export function calcPairScore(diff: DifficultyConfig, combo: number): number {
  return Math.round(diff.basePointsPerPair * getComboMultiplier(combo));
}

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function getDealAnimationTiming(pairs: number, totalCards: number) {
  const staggerMs = pairs >= 12 ? 22 : pairs >= 8 ? 26 : 32;
  const animDurationMs = 280;
  const totalDealDuration = Math.max(0, totalCards - 1) * staggerMs + animDurationMs + 80;
  return { staggerMs, animDurationMs, totalDealDuration };
}

export function canTriggerGameWin(moves: number, pairs: number, phase: string): boolean {
  return phase === 'playing' && moves >= pairs * 2 && pairs > 0;
}
