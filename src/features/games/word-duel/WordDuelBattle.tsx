import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { WordGrid } from '../word/WordGrid';
import { WordKeyboard } from '../word/WordKeyboard';
import { WordGameStyles } from '../word/WordGameStyles';
import { normalizeWord, buildGridRows, getKeyboardStates } from '../word/wordLogic';
import type { LetterCell } from '../word/types';

interface WordDuelBattleProps {
  myDisplayName?: string;
  partnerDisplayName: string;
  myGuesses: LetterCell[][];
  partnerGuesses: LetterCell[][];
  isMyTurn: boolean;
  isValidWord: (w: string) => boolean;
  onMakeGuess: (w: string) => Promise<{ success: boolean; error?: string }>;
  isSubmitting: boolean;
  errorMsg: string | null;
}

export function WordDuelBattle({
  partnerDisplayName,
  myGuesses,
  partnerGuesses,
  isMyTurn,
  isValidWord,
  onMakeGuess,
  isSubmitting,
  errorMsg,
}: WordDuelBattleProps) {
  const [currentInput, setCurrentInput] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState('');
  const [revealingRow, setRevealingRow] = useState(-1);
  const [revealProgress, setRevealProgress] = useState(-1);
  const [bounceRow] = useState(-1);
  const [lastTypedIdx, setLastTypedIdx] = useState(-1);

  const prevGuessesCount = useRef(myGuesses.length);

  // Efeito de revelação e animação quando uma nova tentativa é confirmada
  useEffect(() => {
    if (myGuesses.length > prevGuessesCount.current) {
      const newRowIdx = myGuesses.length - 1;
      setRevealingRow(newRowIdx);
      setRevealProgress(0);

      // Animação das 5 letras virando em cascata
      let prog = 0;
      const interval = setInterval(() => {
        prog++;
        setRevealProgress(prog);
        if (prog >= 5) {
          clearInterval(interval);
          setRevealingRow(-1);
          setRevealProgress(-1);
          setCurrentInput('');
          setCursorPos(0);
        }
      }, 250);

      prevGuessesCount.current = myGuesses.length;
    } else {
      prevGuessesCount.current = myGuesses.length;
    }
  }, [myGuesses]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleKey = useCallback(
    async (key: string) => {
      if (!isMyTurn || isSubmitting || revealingRow >= 0 || currentInput === 'ANIMATING') {
        return;
      }

      const chars = currentInput.split('');
      while (chars.length < 5) chars.push(' ');

      // ── BACKSPACE ──────────────────────────────────────────────────────────
      if (key === '⌫' || key === 'BACKSPACE') {
        if (cursorPos < 5 && chars[cursorPos] !== ' ') {
          chars[cursorPos] = ' ';
          setCurrentInput(chars.join('').replace(/ +$/, ''));
          setLastTypedIdx(-1);
        } else if (cursorPos > 0) {
          const prev = cursorPos - 1;
          chars[prev] = ' ';
          setCurrentInput(chars.join('').replace(/ +$/, ''));
          setCursorPos(prev);
          setLastTypedIdx(-1);
        }
        return;
      }

      // ── ENTER ──────────────────────────────────────────────────────────────
      if (key === 'ENTER') {
        const fullWord = chars.join('');
        if (fullWord.includes(' ')) {
          showToast('Preencha as 5 letras!');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          return;
        }

        const normalized = normalizeWord(fullWord);
        if (!isValidWord(normalized)) {
          showToast('Palavra inválida');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          return;
        }

        setCurrentInput('ANIMATING');
        const res = await onMakeGuess(normalized);
        if (!res.success) {
          setCurrentInput(normalized);
          showToast(res.error || 'Erro ao enviar palpite');
          setShake(true);
          setTimeout(() => setShake(false), 500);
        }
        return;
      }

      // ── LETRA NORMAL ───────────────────────────────────────────────────────
      const letter = normalizeWord(key);
      if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
        chars[cursorPos] = letter;
        setCurrentInput(chars.join(''));
        setLastTypedIdx(cursorPos);
        if (cursorPos < 4) {
          setCursorPos(cursorPos + 1);
        }
      }
    },
    [isMyTurn, isSubmitting, revealingRow, currentInput, cursorPos, isValidWord, onMakeGuess]
  );

  // Escuta teclado físico do computador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleKey('⌫');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleKey('ENTER');
      } else {
        const letter = e.key.toUpperCase();
        if (/^[A-Z]$/.test(letter)) {
          e.preventDefault();
          handleKey(letter);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKey]);

  // Sem limite fixo de 6 tentativas:
  // maxAttempts é dinâmico: número de tentativas já feitas + 1 (linha ativa)
  const myMaxAttempts = myGuesses.length + 1;
  const partnerMaxAttempts = Math.max(partnerGuesses.length, 1);

  const myRows = buildGridRows(
    myGuesses,
    currentInput,
    cursorPos,
    5,
    false,
    myMaxAttempts
  );

  const partnerRows = buildGridRows(
    partnerGuesses,
    '',
    -1,
    5,
    true,
    partnerMaxAttempts
  );

  const keyStates = getKeyboardStates(myGuesses, revealingRow, revealProgress);

  return (
    <div className="flex flex-col items-center justify-between w-full flex-1 max-w-sm sm:max-w-md mx-auto py-1">
      <WordGameStyles />

      {/* Indicador de Turno */}
      <div className="w-full mb-3">
        <div
          className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
            isMyTurn
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
              : 'bg-white/5 border-white/10 text-neutral-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <Swords className={`w-5 h-5 ${isMyTurn ? 'text-amber-400 animate-pulse' : 'text-neutral-500'}`} />
            <span className="font-semibold text-sm">
              {isMyTurn ? 'Sua vez de jogar!' : `Vez de ${partnerDisplayName}...`}
            </span>
          </div>
          <div className="text-xs font-medium text-neutral-400">
            Tentativas: {myGuesses.length} x {partnerGuesses.length}
          </div>
        </div>
      </div>

      {/* Mensagem Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 px-3 py-1 bg-rose-500 text-white text-xs font-semibold rounded-full shadow-lg"
        >
          {toast}
        </motion.div>
      )}

      {errorMsg && (
        <div className="mb-2 text-rose-400 text-xs font-medium bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
          {errorMsg}
        </div>
      )}

      {/* Área dos Grids */}
      <div className="w-full flex flex-col gap-4 my-auto overflow-y-auto max-h-[46vh] sm:max-h-[50vh] px-1 no-scrollbar">
        {/* Meu Grid (Ativo para digitação) */}
        <div className="flex flex-col items-center">
          <div className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Seus Palpites (Palavra de {partnerDisplayName})
          </div>
          <div className={shake ? 'word-shake' : ''}>
            <WordGrid
              rows={myRows}
              revealingRow={revealingRow}
              revealProgress={revealProgress}
              bounceRow={bounceRow}
              lastTypedIdx={lastTypedIdx}
              onCellClick={(idx) => {
                if (isMyTurn) setCursorPos(idx);
              }}
            />
          </div>
        </div>

        {/* Grid do Parceiro (Read-only via Firestore) */}
        {partnerGuesses.length > 0 && (
          <div className="flex flex-col items-center pt-2 border-t border-white/5 opacity-80">
            <div className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              Palpites de {partnerDisplayName} ({partnerGuesses.length})
            </div>
            <WordGrid
              rows={partnerRows}
              revealingRow={-1}
              revealProgress={-1}
              bounceRow={-1}
              lastTypedIdx={-1}
              onCellClick={() => {}}
            />
          </div>
        )}
      </div>

      {/* Teclado */}
      <div className="w-full mt-auto pt-2">
        <WordKeyboard
          onKey={handleKey}
          keyStates={keyStates}
          disabled={!isMyTurn || isSubmitting || revealingRow >= 0}
        />
      </div>
    </div>
  );
}
