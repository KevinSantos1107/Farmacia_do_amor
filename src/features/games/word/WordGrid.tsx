import React from 'react';
import { cn } from '../../../shared/utils/cn';
import type { LetterCell, LetterState } from './types';
import { CELL_BG } from './wordConstants';

interface WordGridProps {
  rows: { cells: LetterCell[]; isActive: boolean }[];
  guesses?: LetterCell[][];
  revealingRow?: number;
  revealProgress?: number;
  bounceRow?: number;
  lastTypedIdx?: number;
  shake?: boolean;
  gameOver?: boolean;
  onTileClick?: (columnIndex: number) => void;
}

function getDynamicStyle(
  state: LetterState,
  ci: number,
  isRevealing: boolean,
  isBouncing: boolean
): React.CSSProperties {
  const delay = isRevealing
    ? `${ci * 180}ms`
    : isBouncing
      ? `${ci * 80}ms`
      : '0ms';

  if (state === 'active') {
    return {
      animationDelay: delay,
      textShadow: '0 0 8px rgba(255,255,255,0.9)',
    };
  }
  if (state === 'typed') {
    return {
      animationDelay: delay,
      boxShadow: '0 0 12px var(--theme-primary)',
      textShadow: '0 0 8px rgba(255,255,255,0.8)',
    };
  }
  if (state === 'empty') {
    return {
      animationDelay: delay,
      boxShadow: '0 0 6px var(--theme-primary)',
    };
  }
  return { animationDelay: delay };
}

export function WordGrid({
  rows = [],
  guesses = [],
  revealingRow = -1,
  revealProgress = -1,
  bounceRow = -1,
  lastTypedIdx = -1,
  shake = false,
  gameOver = false,
  onTileClick,
}: WordGridProps) {
  // ── Fundo atmosférico reativo ao progresso da tentativa ─────────────────────
  const maxCorrect = React.useMemo(() => {
    if (!guesses || guesses.length === 0) return 0;
    return guesses.reduce((max, row) => {
      const correctCount = row.filter((c) => c.state === 'correct').length;
      return Math.max(max, correctCount);
    }, 0);
  }, [guesses]);

  const wordLength = rows[0]?.cells.length || 5;
  const progressRatio = wordLength > 0 ? Math.min(1, maxCorrect / wordLength) : 0;
  // Interpolação suave de 0.04 até 0.12 conforme o jogador encontra letras certas
  const bgOpacity = Number((0.04 + progressRatio * 0.08).toFixed(3));
  const isWinning = bounceRow >= 0;

  const safeGuessesLength = guesses?.length ?? 0;

  return (
    <div className="
      relative flex flex-col gap-[5px] sm:gap-[6px] md:gap-[7px] items-center
      py-1 md:py-2
      flex-1 justify-center w-full
    ">
      {/* Fundo atmosférico reativo do board */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, rgba(var(--theme-primary-rgb), ${
            isWinning ? 0.22 : bgOpacity
          }) 0%, transparent 72%)`,
          transform: isWinning ? 'scale(1.18)' : 'scale(1)',
          transition: 'all 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {rows.map((row, ri) => (
        <div
          key={ri}
          className={cn(
            'flex gap-[5px] sm:gap-[6px] md:gap-[7px] transition-all duration-300 relative',
            shake && ri === safeGuessesLength && 'wg-shake',
            !row.isActive && ri >= safeGuessesLength && 'opacity-20 scale-[0.97]'
          )}
        >
          {row.cells.map((cell, ci) => {
            const isRevealing = ri === revealingRow;
            const isBouncing = ri === bounceRow;
            const isJustTyped = row.isActive && ci === lastTypedIdx && cell.letter !== '';
            const isFinalCorrect = cell.state === 'correct';

            let visualState = cell.state;
            if (isRevealing && ci >= revealProgress) {
              visualState = 'typed';
            }

            return (
              <div
                key={ci}
                className="wg-tile-wrapper cursor-pointer"
                style={{ animationDelay: isBouncing ? `${ci * 80}ms` : '0ms' }}
                onClick={() => {
                  if (row.isActive && !gameOver && onTileClick) {
                    onTileClick(ci);
                  }
                }}
              >
                <div
                  className={cn(
                    'wg-tile',
                    isRevealing && (isFinalCorrect ? 'wg-flip-correct' : 'wg-flip'),
                    isBouncing && 'wg-bounce',
                    isJustTyped && 'wg-pop',
                    visualState === 'active' && 'wg-cursor-breathe',
                    CELL_BG[visualState]
                  )}
                  style={getDynamicStyle(visualState, ci, isRevealing, isBouncing)}
                >
                  {cell.letter}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
