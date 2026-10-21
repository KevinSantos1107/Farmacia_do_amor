import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRetroV2Store } from '../../store/useRetroV2Store';
import { Check, Delete } from 'lucide-react';
import { cn } from '../../../../shared/utils/cn';

// ─── Constants & Types ────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 6;
type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'active' | 'typed';

interface LetterCell {
  letter: string;
  state: LetterState;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

// ─── Styles from the original WordGame ───────────────────────────────────────
const CELL_BG: Record<LetterState, string> = {
  correct:
    'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.6)] [text-shadow:0_0_8px_rgba(255,255,255,0.8)]',
  present:
    'bg-yellow-500 border-yellow-400 text-white shadow-[0_0_20px_rgba(234,179,8,0.6)] [text-shadow:0_0_8px_rgba(255,255,255,0.8)]',
  absent:
    'bg-slate-400/5 border-slate-600 text-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.1)]',
  empty:
    'bg-[rgba(var(--theme-primary-rgb),0.05)] border-[rgba(var(--theme-primary-rgb),0.3)] text-[var(--theme-primary)]',
  active:
    'border-[var(--theme-primary)] text-white shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.4)]',
  typed:
    'bg-[rgba(var(--theme-primary-rgb),0.12)] border-[var(--theme-primary)] text-white',
};

const KEY_BG: Record<string, string> = {
  correct:
    'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] [text-shadow:0_0_8px_rgba(255,255,255,0.7)]',
  present:
    'bg-yellow-500 text-white border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] [text-shadow:0_0_8px_rgba(255,255,255,0.7)]',
  absent:
    'bg-slate-800/80 text-slate-500 border-slate-700/50',
  default:
    'bg-[rgba(var(--theme-primary-rgb),0.05)] text-white/80 border-[rgba(var(--theme-primary-rgb),0.2)] hover:bg-[rgba(var(--theme-primary-rgb),0.15)] hover:border-[var(--theme-primary)] hover:text-white active:scale-[0.92] transition-all',
};

// ─── Logic ───────────────────────────────────────────────────────────────────
function evaluateGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(answer.length).fill('absent');
  const answerArr = answer.split('');
  const guessArr = guess.split('');

  // 1. Corrects
  guessArr.forEach((letter, i) => {
    if (letter === answerArr[i]) {
      result[i] = 'correct';
      answerArr[i] = '*'; // consume
    }
  });

  // 2. Presents
  guessArr.forEach((letter, i) => {
    if (result[i] === 'correct') return;
    const foundIdx = answerArr.indexOf(letter);
    if (foundIdx !== -1) {
      result[i] = 'present';
      answerArr[foundIdx] = '*'; // consume
    }
  });

  return result;
}


export function WordGameSlide(_props: { onNext: () => void }) {
  const { config } = useRetroV2Store();
  
  // A palavra vem do admin (sempre sanitizada e maiúscula)
  const sanitizedWord = (config.wordGameAnswer || 'AMOR')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
  const WORD = sanitizedWord.length >= 2 ? sanitizedWord : 'AMOR';
  const WORD_LENGTH = WORD.length;

  const [guesses, setGuesses] = useState<LetterCell[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shakeRow, setShakeRow] = useState(false);
  const [revealingRow, setRevealingRow] = useState(-1);
  const [message, setMessage] = useState('');

  // Estados das teclas virtuais
  const keyStates: Record<string, LetterState> = {};
  guesses.forEach((row) => {
    row.forEach((cell) => {
      const prev = keyStates[cell.letter];
      if (prev === 'correct') return;
      if (prev === 'present' && cell.state !== 'correct') return;
      keyStates[cell.letter] = cell.state;
    });
  });

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2500);
  };

  const handleKey = useCallback(
    (key: string) => {
      if (gameOver || revealingRow !== -1) return;

      if (key === 'ENTER') {
        if (currentGuess.length !== WORD_LENGTH) {
          setShakeRow(true);
          showMsg('A palavra está incompleta');
          setTimeout(() => setShakeRow(false), 500);
          return;
        }

        const evaluated = evaluateGuess(currentGuess, WORD);
        const newGuessRow = currentGuess.split('').map((l, i) => ({
          letter: l,
          state: evaluated[i],
        }));

        const newGuesses = [...guesses, newGuessRow];
        setGuesses(newGuesses);
        setCurrentGuess('');
        setRevealingRow(guesses.length);

        const isWin = evaluated.every((s) => s === 'correct');
        
        // Wait for reveal animation to finish before deciding win/loss state
        setTimeout(() => {
          setRevealingRow(-1);
          if (isWin) {
            setWon(true);
            setGameOver(true);
          } else if (newGuesses.length >= MAX_ATTEMPTS) {
            setGameOver(true);
            showMsg('Acabaram as tentativas! Reiniciando...');
            // Auto restart after failure to enforce they MUST win
            setTimeout(() => {
              setGuesses([]);
              setCurrentGuess('');
              setGameOver(false);
              setWon(false);
            }, 3000);
          }
        }, WORD_LENGTH * 300 + 400); // tempo da animação (stagger)

      } else if (key === 'BACKSPACE') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[A-Z]$/.test(key)) {
        if (currentGuess.length < WORD_LENGTH) {
          setCurrentGuess((prev) => prev + key);
        }
      }
    },
    [currentGuess, gameOver, guesses, revealingRow, WORD, WORD_LENGTH]
  );

  // Keyboard events
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER') handleKey('ENTER');
      else if (key === 'BACKSPACE') handleKey('BACKSPACE');
      else if (/^[A-Z]$/.test(key)) handleKey(key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  // Bloqueia clique para avançar enquanto não ganhar
  // (Isso é feito usando data-interactive no container pai para interceptar o clique no RetroShell)
  return (
    <div 
      className="flex-1 bg-[#121212] flex flex-col items-center justify-between p-3 sm:p-6 pb-4 sm:pb-8 relative overflow-hidden"
      data-interactive={!won ? "true" : undefined}
    >
      {/* Messages */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-10 z-50 bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm tracking-wide shadow-xl"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full flex flex-col items-center justify-center max-w-sm mx-auto">
        
        {/* Header Text */}
        <div className="mb-3 sm:mb-6 text-center">
          <p className="text-theme-primary/80 font-bold text-[10px] uppercase tracking-[0.3em] mb-1">
            Minigame
          </p>
          <h2 className="text-white text-base sm:text-lg md:text-xl font-black uppercase tracking-widest max-w-[280px] mx-auto leading-tight">
            {config.wordGameQuestion || 'O QUE EU ACHO DE VOCÊ?'}
          </h2>
        </div>

        {/* Board Grid */}
        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800/50 w-full max-w-md mx-auto">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIndex) => {
            const isCurrentRow = rowIndex === guesses.length;
            const isRevealing = rowIndex === revealingRow;
            const rowGuessed = guesses[rowIndex];

            const emptyCells = Array.from({ length: WORD_LENGTH }).map((_, i) => {
              const letter = isCurrentRow ? currentGuess[i] : '';
              let state: LetterState = 'empty';
              if (isCurrentRow && letter) {
                state = i === currentGuess.length - 1 ? 'active' : 'typed';
              }
              return { letter: letter || '', state };
            });

            const cells = rowGuessed || emptyCells;

            return (
              <motion.div
                key={rowIndex}
                animate={shakeRow && isCurrentRow ? { x: [-5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex justify-center gap-1.5"
              >
                {cells.map((cell, colIndex) => {
                  return (
                    <motion.div
                      key={colIndex}
                      initial={false}
                      animate={
                        isRevealing
                          ? { rotateX: [0, 90, 0] }
                          : { scale: cell.state === 'active' ? [1, 1.1, 1] : 1 }
                      }
                      transition={
                        isRevealing
                          ? { duration: 0.6, delay: colIndex * 0.15 }
                          : { duration: 0.2 }
                      }
                      className="perspective-[1000px] w-full aspect-square max-w-[2.5rem] sm:max-w-[3rem]"
                    >
                      <div
                        className={cn(
                          'w-full h-full flex items-center justify-center rounded-lg border-2 font-black text-xl md:text-2xl transition-colors',
                          isRevealing ? 'delay-[' + colIndex * 150 + 'ms]' : '',
                          CELL_BG[cell.state]
                        )}
                        style={isRevealing ? { transitionDelay: `${colIndex * 150 + 300}ms` } : {}}
                      >
                        {cell.letter}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>

        {/* Mensagem de sucesso instintiva */}
        <AnimatePresence>
          {won && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 text-center"
            >
              <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm animate-pulse">
                Toque na tela para continuar
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard — mesmo design do jogo principal */}
      {!won && (
        <div className="w-full max-w-[500px] mx-auto pb-2 pt-0.5 px-2 mt-auto">
          {/* Botões circulares de apagar e confirmar */}
          <div className="flex items-center justify-center gap-5 mb-2">
            <button
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onClick={(e) => { e.stopPropagation(); handleKey('BACKSPACE'); }}
              className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 group"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.08)',
              }}
            >
              <Delete className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(239, 68, 68, 0.06)' }} />
            </button>
            <button
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onClick={(e) => { e.stopPropagation(); handleKey('ENTER'); }}
              className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 group"
              style={{
                background: 'rgba(52, 211, 153, 0.08)',
                border: '1.5px solid rgba(52, 211, 153, 0.35)',
                boxShadow: '0 0 20px rgba(52, 211, 153, 0.12)',
              }}
            >
              <Check className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" strokeWidth={2.5} />
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(52, 211, 153, 0.06)' }} />
            </button>
          </div>

          {/* Linha divisória com glow */}
          <div className="relative flex items-center justify-center mb-2">
            <div className="w-full h-px bg-white/5" />
            <div
              className="absolute w-20 h-px"
              style={{
                background: `linear-gradient(to right, transparent, rgba(var(--theme-primary-rgb), 0.4), transparent)`,
              }}
            />
          </div>

          {/* Teclas — mesmo layout flex do jogo original */}
          <div className="flex flex-col gap-[5px] items-center w-full px-1">
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-[3px] w-full justify-center">
                {ri === 1 && <div style={{ flex: 0.5 }} />}
                {ri === 2 && <div style={{ flex: 1.5 }} />}
                {row.map((key) => {
                  const state = keyStates[key];
                  return (
                    <button
                      key={key}
                      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onClick={(e) => { e.stopPropagation(); handleKey(key); }}
                      className={cn(
                        'border rounded-[7px] font-semibold uppercase select-none flex items-center justify-center transition-all duration-150',
                        KEY_BG[state || 'default']
                      )}
                      style={{ flex: 1, height: 'clamp(36px, 10vw, 48px)' }}
                    >
                      <span className="text-[12px]">{key}</span>
                    </button>
                  );
                })}
                {ri === 1 && <div style={{ flex: 0.5 }} />}
                {ri === 2 && <div style={{ flex: 1.5 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
