import React from 'react';
import { cn } from '../../../shared/utils/cn';
import type { LetterCell, LetterState } from './types';
import { CELL_BG } from './wordConstants';

interface WordGridProps {
  rows: { cells: LetterCell[]; isActive: boolean }[];
  guesses: LetterCell[][];
  revealingRow: number;
  revealProgress: number;
  bounceRow: number;
  lastTypedIdx: number;
  shake: boolean;
  gameOver: boolean;
  onTileClick: (columnIndex: number) => void;
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
      backgroundColor: 'rgba(var(--theme-primary-rgb), 0.18)',
      boxShadow:
        '0 0 0 1px var(--theme-primary), 0 0 20px var(--theme-primary), 0 0 40px var(--theme-primary)',
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
  rows,
  guesses,
  revealingRow,
  revealProgress,
  bounceRow,
  lastTypedIdx,
  shake,
  gameOver,
  onTileClick,
}: WordGridProps) {
  return (
    <div className="relative flex flex-col gap-[5px] items-center py-1 flex-1 justify-center">
      {/* Fundo atmosférico do board */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, rgba(var(--theme-primary-rgb), 0.04) 0%, transparent 70%)`,
        }}
      />

      {rows.map((row, ri) => (
        <div
          key={ri}
          className={cn(
            'flex gap-[5px] transition-all duration-300 relative',
            shake && ri === guesses.length && 'wg-shake',
            !row.isActive && ri >= guesses.length && 'opacity-20 scale-[0.97]'
          )}
        >
          {row.cells.map((cell, ci) => {
            const isRevealing = ri === revealingRow;
            const isBouncing = ri === bounceRow;
            const isJustTyped = row.isActive && ci === lastTypedIdx && cell.letter !== '';

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
                  if (row.isActive && !gameOver) {
                    onTileClick(ci);
                  }
                }}
              >
                <div
                  className={cn(
                    'wg-tile',
                    isRevealing && 'wg-flip',
                    isBouncing && 'wg-bounce',
                    isJustTyped && 'wg-pop',
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
