import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { WordKeyboard } from '../word/WordKeyboard';
import { WordGameStyles } from '../word/WordGameStyles';
import { normalizeWord } from '../word/wordLogic';

interface WordDuelSetupProps {
  myDisplayName?: string;
  partnerDisplayName: string;
  isLocked: boolean;
  partnerLocked: boolean;
  isValidWord: (w: string) => boolean;
  onLockWord: (w: string) => Promise<boolean>;
  isSubmitting: boolean;
  errorMsg: string | null;
}

export function WordDuelSetup({
  partnerDisplayName,
  isLocked,
  partnerLocked,
  isValidWord,
  onLockWord,
  isSubmitting,
  errorMsg,
}: WordDuelSetupProps) {
  const [inputWord, setInputWord] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState('');
  const [localLocked, setLocalLocked] = useState(false);

  const effectivelyLocked = isLocked || localLocked;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleKey = useCallback(
    (key: string) => {
      if (effectivelyLocked || isSubmitting) return;

      const chars = inputWord.split('');
      while (chars.length < 5) chars.push(' ');

      if (key === '⌫' || key === 'BACKSPACE') {
        if (cursorPos < 5 && chars[cursorPos] !== ' ') {
          chars[cursorPos] = ' ';
          setInputWord(chars.join('').replace(/ +$/, ''));
        } else if (cursorPos > 0) {
          const prev = cursorPos - 1;
          chars[prev] = ' ';
          setInputWord(chars.join('').replace(/ +$/, ''));
          setCursorPos(prev);
        }
        return;
      }

      if (key === 'ENTER') {
        const fullWord = chars.join('');
        if (fullWord.includes(' ')) {
          showToast('Preencha as 5 letras!');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          return;
        }

        const normalized = normalizeWord(fullWord);
        // Validação instantânea local do dicionário de 5 letras
        if (!isValidWord(normalized)) {
          showToast('Palavra não encontrada no dicionário');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          return;
        }

        // Otimista: trava imediatamente na UI para feedback instantâneo e responsivo
        setLocalLocked(true);
        onLockWord(normalized).then((success) => {
          if (!success) {
            setLocalLocked(false);
          }
        });
        return;
      }

      const letter = normalizeWord(key);
      if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
        chars[cursorPos] = letter;
        setInputWord(chars.join(''));
        if (cursorPos < 4) {
          setCursorPos(cursorPos + 1);
        }
      }
    },
    [effectivelyLocked, isSubmitting, inputWord, cursorPos, isValidWord, onLockWord]
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

  const chars = inputWord.split('');
  while (chars.length < 5) chars.push('');

  return (
    <div className="flex flex-col items-center justify-between w-full flex-1 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto py-2 px-3 sm:px-6">
      <WordGameStyles />

      {/* Cabeçalho */}
      <div className="text-center mb-3 sm:mb-5">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          Escolha sua Palavra Secreta
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-neutral-400 mt-1">
          {partnerDisplayName} terá que decifrar esta palavra de 5 letras.
        </p>
      </div>

      {/* Status do adversário */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 mb-3 sm:mb-5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-neutral-300 font-medium">{partnerDisplayName}:</span>
          {partnerLocked ? (
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Palavra travada!
            </span>
          ) : (
            <span className="text-xs sm:text-sm text-amber-300/80 italic animate-pulse">
              Escolhendo a palavra...
            </span>
          )}
        </div>
      </div>

      {/* Grid de 1 linha para a palavra secreta */}
      <div className="flex flex-col items-center my-3 sm:my-6 w-full">
        <div
          className={`grid grid-cols-5 gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/10 shadow-xl ${
            shake ? 'word-shake' : ''
          }`}
        >
          {chars.map((letter, idx) => {
            const isActive = !effectivelyLocked && idx === cursorPos;
            const hasLetter = letter.trim().length > 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (!effectivelyLocked) setCursorPos(idx);
                }}
                className={`w-12 h-14 sm:w-16 sm:h-18 md:w-18 md:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-2xl sm:text-3xl md:text-4xl uppercase select-none transition-all duration-150 border-2 cursor-pointer ${
                  isActive
                    ? 'border-amber-400 bg-white/10 text-white shadow-[0_0_20px_rgba(251,191,36,0.35)] scale-105'
                    : hasLetter
                    ? 'border-white/50 bg-white/5 text-white'
                    : 'border-white/20 bg-white/5 text-neutral-400'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Mensagens de Feedback */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 px-4 py-1.5 bg-rose-500 text-white text-xs sm:text-sm font-medium rounded-full shadow-lg"
          >
            {toast}
          </motion.div>
        )}

        {errorMsg && (
          <div className="mt-3 text-rose-400 text-xs sm:text-sm font-medium bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Estado travado ou Teclado */}
      {effectivelyLocked ? (
        <div className="w-full max-w-md bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 text-center my-auto flex flex-col items-center shadow-xl">
          <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-400 mb-3 animate-bounce" />
          <h3 className="text-lg sm:text-2xl font-bold text-emerald-300">Sua palavra está travada!</h3>
          <p className="text-xs sm:text-base text-neutral-300 mt-2">
            {partnerLocked
              ? 'Iniciando o duelo...'
              : `Aguardando ${partnerDisplayName} travar a palavra dele(a)...`}
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md md:max-w-lg mt-auto">
          <div className="flex justify-center mb-3 sm:mb-4">
            <button
              onClick={() => handleKey('ENTER')}
              disabled={isSubmitting || inputWord.replace(/ /g, '').length !== 5}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-2xl shadow-xl shadow-rose-500/20 transition-all text-sm sm:text-base active:scale-95 cursor-pointer"
            >
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
              {isSubmitting ? 'Validando...' : 'Travar Palavra'}
            </button>
          </div>

          <WordKeyboard onKey={handleKey} keyStates={{}} />
        </div>
      )}
    </div>
  );
}
