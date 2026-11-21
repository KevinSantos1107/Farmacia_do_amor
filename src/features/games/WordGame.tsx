import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../shared/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Swords } from 'lucide-react';
import { RankingModal } from './ranking/RankingModal';
import { useModalsStore } from '../../store/useModalsStore';

import type { LetterCell, Question } from './word/types';
export type { ActiveGameState } from './word/types';
import { MAX_ATTEMPTS } from './word/wordConstants';
import {
  normalizeWord,
  evaluateGuess,
  getKeyboardStates,
  buildGridRows,
  loadUsedWords,
  saveUsedWords,
  loadActiveGame,
  saveActiveGame,
  clearActiveGame,
} from './word/wordLogic';
import { useWordDictionary } from './word/useWordDictionary';
import { useWordStats } from './word/useWordStats';
import { useWordQuestions } from './word/useWordQuestions';
import { WordGrid } from './word/WordGrid';
import { WordKeyboard } from './word/WordKeyboard';
import { WordGameOverOverlay } from './word/WordGameOverOverlay';
import { WordStatsPanel } from './word/WordStatsPanel';
import { WordGameStyles } from './word/WordGameStyles';
import { Confetti } from './word/Confetti';

// ─── Main Component ───────────────────────────────────────────────────────────
export function WordGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeModal, closeModal } = useModalsStore();
  const { questions, questionsLoaded } = useWordQuestions();
  const usedWords = useRef<string[]>(loadUsedWords());
  const { isValidWord } = useWordDictionary();

  // Active round state
  const [currentWord, setCurrentWord] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [wordLength, setWordLength] = useState(5);

  // Grid state
  const [guesses, setGuesses] = useState<LetterCell[][]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState('');
  const [revealingRow, setRevealingRow] = useState(-1);
  const [bounceRow, setBounceRow] = useState(-1);
  const [lastTypedIdx, setLastTypedIdx] = useState(-1);
  const [revealProgress, setRevealProgress] = useState(-1);
  const [showStats, setShowStats] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [showVictoryConfetti, setShowVictoryConfetti] = useState(false);
  const isTransitioningRef = useRef(false);

  // Stats & Streak (Firestore sync)
  const { stats, recordRoundResult } = useWordStats();

  // ── Start a round ──────────────────────────────────────────────────────────
  const startNewRound = useCallback(
    (qs: Question[], forceNew: boolean = false) => {
      if (!questionsLoaded || qs.length === 0) return;

      // Tenta restaurar uma partida em andamento (somente se não for pedido explícito de nova rodada)
      if (!forceNew) {
        const activeGame = loadActiveGame();
        if (activeGame && activeGame.word) {
          const isWon = (activeGame.guesses || []).some((row: LetterCell[]) =>
            row.every((c) => c.state === 'correct')
          );
          const isLost = !isWon && (activeGame.guesses || []).length >= 6;

          setCurrentWord(activeGame.word);
          setCurrentQuestion(activeGame.question);
          setCurrentMessage(activeGame.message);
          setWordLength(activeGame.word.length);
          setGuesses(activeGame.guesses || []);
          setCurrentInput(activeGame.currentInput || '');
          setCursorPos(activeGame.cursorPos || 0);
          setWon(isWon);
          setGameOver(isWon || isLost);
          setRevealingRow(-1);
          setBounceRow(-1);
          setToast('');
          setLastTypedIdx(-1);
          setShowVictoryConfetti(false);

          if (isWon || isLost) clearActiveGame();
          return;
        }
      }

      let currentUsed = [...usedWords.current];
      const pool: { question: Question; wordData: Question['palavras'][number]; id: string }[] = [];

      qs.forEach((q) =>
        q.palavras.forEach((p) => {
          const w = normalizeWord(p.palavra);
          if (w.length === 5) {
            const id = `${q.id}:${w}`;
            if (!currentUsed.includes(id)) pool.push({ question: q, wordData: p, id });
          }
        })
      );

      // Se a pool estiver vazia, inicia novo ciclo liberando todas as palavras
      if (pool.length === 0) {
        currentUsed = [];
        qs.forEach((q) =>
          q.palavras.forEach((p) => {
            const w = normalizeWord(p.palavra);
            if (w.length === 5) pool.push({ question: q, wordData: p, id: `${q.id}:${w}` });
          })
        );
      }

      if (pool.length === 0) return;

      const pick = pool[Math.floor(Math.random() * pool.length)];

      currentUsed.push(pick.id);
      usedWords.current = currentUsed;
      saveUsedWords(currentUsed);

      const word = normalizeWord(pick.wordData.palavra);
      setCurrentWord(word);
      setCurrentQuestion(pick.question.pergunta);
      setCurrentMessage(pick.wordData.mensagem);
      setWordLength(word.length);
      setGuesses([]);
      setCurrentInput('');
      setGameOver(false);
      setWon(false);
      setRevealingRow(-1);
      setBounceRow(-1);
      setToast('');
      setLastTypedIdx(-1);
      setCursorPos(0);
      setShowVictoryConfetti(false);

      saveActiveGame({
        word,
        question: pick.question.pergunta,
        message: pick.wordData.mensagem,
        guesses: [],
        currentInput: '',
        cursorPos: 0,
      });
    },
    [questionsLoaded]
  );

  useEffect(() => {
    if (questionsLoaded && questions.length > 0 && currentWord === '') {
      startNewRound(questions);
    }
  }, [questionsLoaded, questions, currentWord, startNewRound]);

  // Sincroniza estado atual da partida em andamento
  useEffect(() => {
    if (currentWord && !gameOver && !won && !isTransitioningRef.current) {
      saveActiveGame({
        word: currentWord,
        question: currentQuestion,
        message: currentMessage,
        guesses,
        currentInput,
        cursorPos,
      });
    }
  }, [currentWord, currentQuestion, currentMessage, guesses, currentInput, cursorPos, gameOver, won]);

  // ── Transição suave entre rodadas ──────────────────────────────────────────
  const handleNextRound = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    // Interrompe imediatamente qualquer confete e efeito de vitória
    setShowVictoryConfetti(false);
    setBounceRow(-1);
    setGameOver(false);
    setTimeout(() => {
      startNewRound(questions, true /* forceNew */);
      isTransitioningRef.current = false;
    }, 280);
  }, [questions, startNewRound]);

  // ── Keyboard handler ───────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleKey = useCallback(
    (key: string) => {
      if (gameOver || revealingRow >= 0 || currentInput === 'ANIMATING') return;

      const chars = currentInput.split('');
      while (chars.length < wordLength) chars.push(' ');

      // ── BACKSPACE ──────────────────────────────────────────────────────────
      if (key === '⌫' || key === 'BACKSPACE') {
        if (cursorPos < wordLength && chars[cursorPos] !== ' ') {
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
        const inputToValidate = chars.join('');
        if (inputToValidate.includes(' ')) {
          showToast('Preencha todas as letras!');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          return;
        }

        if (wordLength === 5 && !isValidWord(inputToValidate)) {
          showToast('Palavra inválida');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          return;
        }

        const states = evaluateGuess(inputToValidate, currentWord);
        const newRow: LetterCell[] = inputToValidate
          .split('')
          .map((letter, i) => ({ letter, state: states[i] }));
        const newGuesses = [...guesses, newRow];
        setGuesses(newGuesses);

        setCurrentInput('ANIMATING');
        setLastTypedIdx(-1);

        const rowIdx = newGuesses.length - 1;
        setRevealingRow(rowIdx);
        setRevealProgress(0);

        for (let i = 0; i < wordLength; i++) {
          setTimeout(() => setRevealProgress(i + 1), i * 180 + 250);
        }

        const animationEnd = (wordLength - 1) * 180 + 500 + 100;

        setTimeout(() => {
          setRevealingRow(-1);
          setRevealProgress(-1);

          if (inputToValidate === currentWord) {
            setBounceRow(rowIdx);
            setShowVictoryConfetti(true);
            recordRoundResult(true, newGuesses.length);
            setTimeout(() => {
              setWon(true);
              setGameOver(true);
              clearActiveGame();
              setCurrentInput('');
            }, 600);
          } else if (newGuesses.length >= 6) {
            recordRoundResult(false, newGuesses.length);
            setWon(false);
            setGameOver(true);
            clearActiveGame();
            setCurrentInput('');
          } else {
            setCurrentInput('');
            setCursorPos(0);
          }
        }, animationEnd);
        return;
      }

      // ── LETTER ────────────────────────────────────────────────────────────
      if (/^[A-ZÁÉÍÓÚÀÂÊÎÔÛÃÕÇ]$/.test(key)) {
        if (cursorPos < wordLength) {
          chars[cursorPos] = key;
          setCurrentInput(chars.join('').replace(/ +$/, ''));
          setLastTypedIdx(cursorPos);
          setCursorPos(Math.min(cursorPos + 1, wordLength));
        }
      }
    },
    [
      gameOver,
      revealingRow,
      currentInput,
      wordLength,
      guesses,
      currentWord,
      isValidWord,
      cursorPos,
      recordRoundResult,
    ]
  );

  // Physical keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // Não captura teclas se o usuário estiver no Duelo de Palavras ou em outro modal
      if (activeModal && activeModal !== 'word-game') return;
      if (location.pathname.startsWith('/word-duel') || location.pathname.startsWith('/duelo')) return;

      const key = e.key.toUpperCase();
      if (key === 'ENTER') {
        e.preventDefault();
        handleKey(key);
      } else if (key === 'BACKSPACE') {
        handleKey(key);
      } else if (/^[A-ZÁÉÍÓÚÀÂÊÎÔÛÃÕÇ]$/.test(key)) {
        handleKey(key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKey, activeModal, location.pathname]);

  // Share logic
  const shareOnWhatsApp = () => {
    const siteHost = window.location.host;
    const green = '%F0%9F%9F%A9';
    const yellow = '%F0%9F%9F%A8';
    const black = '%E2%AC%9B';
    const heart = '%E2%9D%A4%EF%B8%8F';
    const broken = '%F0%9F%92%94';
    const game = '%F0%9F%8E%AE';
    const link = '%F0%9F%94%97';

    const grid = guesses
      .map((row) =>
        row
          .map((c) => (c.state === 'correct' ? green : c.state === 'present' ? yellow : black))
          .join('')
      )
      .join('%0A');

    const resultLine = won
      ? `%22${heart} ${encodeURIComponent('Acertei em ' + guesses.length + ' tentativa' + (guesses.length > 1 ? 's' : '') + '!')}%22`
      : `%22${broken} ${encodeURIComponent('Não consegui dessa vez... a palavra era ' + currentWord)}%22`;

    const encodedMsg = [
      `${game} ${encodeURIComponent('Jogo de Palavras')}`,
      '',
      resultLine,
      '',
      grid,
      '',
      encodeURIComponent('Jogue também acessando:'),
      `${link} ${siteHost}`,
    ].join('%0A');

    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
  };

  const keyStates = getKeyboardStates(guesses, revealingRow, revealProgress);
  const rows = buildGridRows(guesses, currentInput, cursorPos, wordLength, gameOver, MAX_ATTEMPTS);
  // Ponto de origem (%) para o confete nascer na linha vencedora do grid
  const winningRowOriginY =
    bounceRow >= 0 ? Math.round(20 + (bounceRow / MAX_ATTEMPTS) * 36) : 35;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!currentWord)
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm">Carregando jogo...</span>
        </motion.div>
      </div>
    );

  return (
    <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto flex flex-col items-center h-full relative select-none">

      {/* ── Header / Stats ─────────────────────────────────────────────────── */}
      <div className="flex items-center w-full justify-between px-4 py-1.5 shrink-0">
        <div className="flex items-center gap-1.5 opacity-50">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          />
          <span className="text-xs uppercase tracking-wide font-semibold text-white/40">
            Palavras
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão minimalista para alternar para o Modo Duelo 1v1 */}
          <button
            onClick={() => {
              closeModal();
              navigate('/word-duel');
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 border cursor-pointer',
              'bg-gradient-to-r from-amber-500/10 to-rose-500/10 border-amber-500/30 hover:border-amber-400 hover:from-amber-500/20 hover:to-rose-500/20 hover:shadow-[0_0_12px_rgba(245,158,11,0.25)] text-white/90 active:scale-95'
            )}
            title="Duelo 1v1 Online"
            style={{ touchAction: 'manipulation' }}
          >
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">Duelo</span>
          </button>

          <button
            onClick={() => setShowRanking(true)}
            className={cn(
              'flex items-center justify-center rounded-full w-9 h-9 transition-all duration-300 border',
              'bg-white/[0.03] border-white/10 hover:border-yellow-400 hover:shadow-[0_0_12px_rgba(250,204,21,0.2)] active:scale-90'
            )}
            title="Ranking do Casal"
            style={{ touchAction: 'manipulation' }}
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          </button>

          <button
            onClick={() => setShowStats(true)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-all duration-300 border',
              'bg-white/[0.03] border-white/10 hover:border-[var(--theme-primary)] hover:shadow-[0_0_12px_rgba(var(--theme-primary-rgb),0.2)]',
              stats.currentStreak > 0 &&
                'border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
            )}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-white/80 text-xs">{stats.currentStreak}</span>
          </button>
        </div>
      </div>

      {/* ── Question ───────────────────────────────────────────────────────── */}
      <div className="w-full text-center px-4 sm:px-6 pt-0 pb-2 relative shrink-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-10 sm:w-16 h-px opacity-50"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        />
        <p className="text-xs sm:text-sm md:text-base leading-relaxed tracking-wide text-white/70 font-medium italic">
          &ldquo;{currentQuestion}&rdquo;
        </p>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -12, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-[110px] z-50 px-4 py-2 rounded-full font-semibold text-xs text-white/90 backdrop-blur-md shadow-lg"
            style={{
              background: 'rgba(var(--theme-primary-rgb), 0.15)',
              border: '1px solid rgba(var(--theme-primary-rgb), 0.3)',
              boxShadow: '0 0 20px rgba(var(--theme-primary-rgb), 0.2)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confete da vitória ─────────────────────────────────────────────── */}
      {showVictoryConfetti && !gameOver && (
        <Confetti originY={winningRowOriginY} />
      )}

      {/* ── Board ──────────────────────────────────────────────────────────── */}
      <WordGrid
        rows={rows}
        guesses={guesses}
        revealingRow={revealingRow}
        revealProgress={revealProgress}
        bounceRow={bounceRow}
        lastTypedIdx={lastTypedIdx}
        shake={shake}
        gameOver={gameOver}
        onTileClick={(ci) => setCursorPos(ci)}
      />

      {/* ── Keyboard ───────────────────────────────────────────────────────── */}
      <div className="w-full shrink-0">
        <WordKeyboard keyStates={keyStates} onKey={handleKey} />
      </div>

      {/* ── Game Over Overlay ──────────────────────────────────────────────── */}
      <WordGameOverOverlay
        gameOver={gameOver}
        won={won}
        currentWord={currentWord}
        currentMessage={currentMessage}
        attempts={guesses.length}
        originY={winningRowOriginY}
        onNextRound={handleNextRound}
        onShare={shareOnWhatsApp}
      />

      {/* ── Stats Modal ────────────────────────────────────────────────────── */}
      <WordStatsPanel isOpen={showStats} onClose={() => setShowStats(false)} stats={stats} />

      {/* ── Inline Styles ──────────────────────────────────────────────────── */}
      <WordGameStyles />

      <RankingModal
        isOpen={showRanking}
        onClose={() => setShowRanking(false)}
        initialGame="word"
      />
    </div>
  );
}
