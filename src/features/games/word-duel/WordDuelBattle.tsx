import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Eye, User, Sparkles } from 'lucide-react';
import { WordGrid } from '../word/WordGrid';
import { WordKeyboard } from '../word/WordKeyboard';
import { WordGameStyles } from '../word/WordGameStyles';
import { normalizeWord, buildGridRows, getKeyboardStates } from '../word/wordLogic';
import type { LetterCell } from '../word/types';

interface WordDuelBattleProps {
  myPlayerId?: string;
  currentTurn?: string;
  myDisplayName?: string;
  partnerDisplayName: string;
  myGuesses: LetterCell[][];
  partnerGuesses: LetterCell[][];
  partnerDraft?: { text: string; cursor: number };
  isMyTurn: boolean;
  isValidWord: (w: string) => boolean;
  onMakeGuess: (w: string) => Promise<{ success: boolean; error?: string }>;
  onDraftChange?: (text: string, cursor: number) => void;
  isSubmitting: boolean;
  errorMsg: string | null;
}

export function WordDuelBattle({
  myPlayerId,
  currentTurn,
  partnerDisplayName,
  myGuesses,
  partnerGuesses,
  partnerDraft,
  isMyTurn,
  isValidWord,
  onMakeGuess,
  onDraftChange,
  isSubmitting,
  errorMsg,
}: WordDuelBattleProps) {
  const [currentInput, setCurrentInput] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState('');

  // Animações para o jogador atual
  const [revealingRow, setRevealingRow] = useState(-1);
  const [revealProgress, setRevealProgress] = useState(-1);
  const [bounceRow, setBounceRow] = useState(-1);
  const [lastTypedIdx, setLastTypedIdx] = useState(-1);
  const prevGuessesCount = useRef(myGuesses.length);

  // Animações para o espectador (assistindo o parceiro jogar ao vivo)
  const [partnerRevealingRow, setPartnerRevealingRow] = useState(-1);
  const [partnerRevealProgress, setPartnerRevealProgress] = useState(-1);
  const [partnerBounceRow, setPartnerBounceRow] = useState(-1);
  const prevPartnerGuessesCount = useRef(partnerGuesses.length);

  // Aba selecionada: 'my' (minha tela) ou 'partner' (assistir o parceiro em tempo real)
  const [activeTab, setActiveTab] = useState<'my' | 'partner'>('my');

  // Banner de transição de turno ("Sua Vez!" / "Turno de [Nome]")
  const [turnBanner, setTurnBanner] = useState<{
    title: string;
    subtitle: string;
    targetTab: 'my' | 'partner';
  } | null>(null);

  const prevTurnRef = useRef<string | null>(null);
  const turnTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Animação de revelação das minhas tentativas ──────────────────────────
  useEffect(() => {
    if (myGuesses.length > prevGuessesCount.current) {
      const newRowIdx = myGuesses.length - 1;
      setRevealingRow(newRowIdx);
      setRevealProgress(0);

      const latestGuess = myGuesses[newRowIdx];
      const isWin = latestGuess && latestGuess.every((c) => c.state === 'correct');

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
          if (isWin) {
            setBounceRow(newRowIdx);
          }
        }
      }, 250);

      prevGuessesCount.current = myGuesses.length;
    } else {
      prevGuessesCount.current = myGuesses.length;
    }
  }, [myGuesses]);

  // ── Animação de revelação das tentativas do parceiro (Espectador) ──────────
  useEffect(() => {
    if (partnerGuesses.length > prevPartnerGuessesCount.current) {
      const newRowIdx = partnerGuesses.length - 1;
      setPartnerRevealingRow(newRowIdx);
      setPartnerRevealProgress(0);

      const latestGuess = partnerGuesses[newRowIdx];
      const isWin = latestGuess && latestGuess.every((c) => c.state === 'correct');

      let prog = 0;
      const interval = setInterval(() => {
        prog++;
        setPartnerRevealProgress(prog);
        if (prog >= 5) {
          clearInterval(interval);
          setPartnerRevealingRow(-1);
          setPartnerRevealProgress(-1);
          if (isWin) {
            setPartnerBounceRow(newRowIdx);
          }
        }
      }, 250);

      prevPartnerGuessesCount.current = partnerGuesses.length;
    } else {
      prevPartnerGuessesCount.current = partnerGuesses.length;
    }
  }, [partnerGuesses]);

  // ── Transição suave de turno com aviso na tela ────────────────────────────
  useEffect(() => {
    const activeTurn = currentTurn || (isMyTurn ? myPlayerId : 'partner');

    // Inicialização ao montar a tela
    if (prevTurnRef.current === null) {
      prevTurnRef.current = activeTurn;
      if (isMyTurn) {
        setActiveTab('my');
      } else {
        setActiveTab('partner');
      }
      return;
    }

    // Se o turno mudou de mãos
    if (prevTurnRef.current !== activeTurn && activeTurn) {
      prevTurnRef.current = activeTurn;

      if (turnTransitionTimerRef.current) {
        clearTimeout(turnTransitionTimerRef.current);
      }
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }

      // Aguarda a animação da palavra terminar de virar (5 letras x 250ms = 1250ms)
      // + 950ms de pausa para leitura calma do usuário antes de anunciar quem joga agora
      const hasPreviousGuesses = myGuesses.length > 0 || partnerGuesses.length > 0;
      const turnChangeDelay = hasPreviousGuesses ? 2200 : 0;

      turnTransitionTimerRef.current = setTimeout(() => {
        if (isMyTurn) {
          // Passou a ser a MINHA vez
          // Se eu já estiver na minha aba, não interrompe com overlay
          if (activeTab !== 'my') {
            setTurnBanner({
              title: 'Sua Vez!',
              subtitle: `Hora de tentar decifrar a palavra de ${partnerDisplayName}`,
              targetTab: 'my',
            });
            bannerTimerRef.current = setTimeout(() => {
              setActiveTab('my');
              setTurnBanner(null);
            }, 1800);
          }
        } else {
          // Passou a ser a vez do PARCEIRO
          // Se eu já estiver na aba dele, não interrompe com overlay
          if (activeTab !== 'partner') {
            setTurnBanner({
              title: `Turno de ${partnerDisplayName}`,
              subtitle: 'Acompanhe as tentativas em tempo real',
              targetTab: 'partner',
            });
            bannerTimerRef.current = setTimeout(() => {
              setActiveTab('partner');
              setTurnBanner(null);
            }, 1800);
          }
        }
      }, turnChangeDelay);
    }

    return () => {
      if (turnTransitionTimerRef.current) {
        clearTimeout(turnTransitionTimerRef.current);
      }
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
    };
  }, [currentTurn, isMyTurn, myPlayerId, partnerDisplayName, activeTab, myGuesses.length, partnerGuesses.length]);

  // Troca de aba manual pelo usuário
  const handleTabClick = (tab: 'my' | 'partner') => {
    if (turnTransitionTimerRef.current) {
      clearTimeout(turnTransitionTimerRef.current);
    }
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }
    setTurnBanner(null);
    setActiveTab(tab);
  };

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
        let newStr = '';
        let newCur = cursorPos;
        if (cursorPos < 5 && chars[cursorPos] !== ' ') {
          chars[cursorPos] = ' ';
          newStr = chars.join('').replace(/ +$/, '');
          setCurrentInput(newStr);
          setLastTypedIdx(-1);
        } else if (cursorPos > 0) {
          const prev = cursorPos - 1;
          chars[prev] = ' ';
          newStr = chars.join('').replace(/ +$/, '');
          newCur = prev;
          setCurrentInput(newStr);
          setCursorPos(prev);
          setLastTypedIdx(-1);
        }
        if (onDraftChange) onDraftChange(newStr, newCur);
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
        const newStr = chars.join('');
        const newCur = cursorPos < 4 ? cursorPos + 1 : cursorPos;
        setCurrentInput(newStr);
        setLastTypedIdx(cursorPos);
        setCursorPos(newCur);
        if (onDraftChange) onDraftChange(newStr, newCur);
      }
    },
    [isMyTurn, isSubmitting, revealingRow, currentInput, cursorPos, isValidWord, onMakeGuess, onDraftChange]
  );

  // Escuta teclado físico do computador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // No mobile só digita se estiver na aba 'my'. No desktop (>=1024px), ambas as telas são visíveis
      if (activeTab !== 'my' && typeof window !== 'undefined' && window.innerWidth < 1024) return;
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
  }, [handleKey, activeTab]);

  // Sem limite fixo de 6 tentativas:
  // Durante a animação de revelação de uma tentativa, NÃO adiciona a linha nova ainda!
  // E quando o jogador acerta todas as letras (vitória), NÃO adiciona linha nova.
  // Somente após todas as letras terminarem de virar e não sendo vitória, acrescenta a linha ativa (+1).
  const isMyRevealing = revealingRow >= 0;
  const isPartnerRevealing = partnerRevealingRow >= 0;

  const isMyWinning = myGuesses.some(
    (row) => row.length === 5 && row.every((c) => c.state === 'correct')
  );
  const isPartnerWinning = partnerGuesses.some(
    (row) => row.length === 5 && row.every((c) => c.state === 'correct')
  );

  const myMaxAttempts = isMyRevealing || isMyWinning ? myGuesses.length : myGuesses.length + 1;
  const partnerMaxAttempts = isPartnerRevealing || isPartnerWinning ? partnerGuesses.length : partnerGuesses.length + 1;

  const myRows = buildGridRows(
    myGuesses,
    isMyRevealing || isMyWinning ? '' : currentInput,
    isMyRevealing || isMyWinning ? -1 : cursorPos,
    5,
    isMyWinning,
    myMaxAttempts
  );

  // Linhas do parceiro com digitação ao vivo
  const partnerInputDraft = !isMyTurn && !isPartnerRevealing && !isPartnerWinning ? partnerDraft?.text || '' : '';
  const partnerCursorDraft = !isMyTurn && !isPartnerRevealing && !isPartnerWinning ? partnerDraft?.cursor ?? -1 : -1;

  const partnerRows = buildGridRows(
    partnerGuesses,
    partnerInputDraft,
    partnerCursorDraft,
    5,
    isPartnerWinning,
    partnerMaxAttempts
  );

  const keyStates = getKeyboardStates(myGuesses, revealingRow, revealProgress);

  return (
    <div className="relative flex flex-col items-center justify-between w-full flex-1 max-w-sm sm:max-w-md md:max-w-xl lg:max-w-5xl mx-auto py-1 px-1 sm:px-3">
      <WordGameStyles />

      {/* Overlay de Transição de Turno com animação e clique para dispensar */}
      <AnimatePresence>
        {turnBanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => handleTabClick(turnBanner.targetTab)}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.85, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -10 }}
              className="bg-neutral-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl flex flex-col items-center gap-3 max-w-sm"
            >
              <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-1">
                <Swords className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
                {turnBanner.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300">
                {turnBanner.subtitle}
              </p>
              <span className="text-[11px] text-amber-400/80 mt-2 font-medium">
                Toque para continuar
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador de Turno Superior Global */}
      <div className="w-full mb-3 flex flex-col gap-2">
        {/* Seletor de visualização visível apenas em telas menores (< 1024px) */}
        <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-2xl lg:hidden">
          <button
            onClick={() => handleTabClick('my')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'my'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Minha Tela {isMyTurn && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
          </button>
          <button
            onClick={() => handleTabClick('partner')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'partner'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Ver {partnerDisplayName} {!isMyTurn && <span className="text-[10px] text-amber-300 font-normal animate-pulse">(jogando)</span>}
          </button>
        </div>

        {/* Indicador de Turno */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-semibold transition-all ${
            isMyTurn
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-white/5 border-white/10 text-neutral-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <Swords className={`w-4 h-4 sm:w-5 sm:h-5 ${isMyTurn ? 'text-amber-400 animate-pulse' : 'text-neutral-500'}`} />
            <span>{isMyTurn ? 'Sua vez de jogar!' : `Vez de ${partnerDisplayName} jogar...`}</span>
          </div>
          <span className="text-[11px] sm:text-xs text-neutral-400 font-medium">
            {myGuesses.length} x {partnerGuesses.length} palpites
          </span>
        </div>
      </div>

      {/* Mensagem Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 px-4 py-1.5 bg-rose-500 text-white text-xs sm:text-sm font-semibold rounded-full shadow-lg"
        >
          {toast}
        </motion.div>
      )}

      {errorMsg && (
        <div className="mb-2 text-rose-400 text-xs sm:text-sm font-medium bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* ── MODO DESKTOP (>= 1024px): ARENA 2 COLUNAS LADO A LADO ───────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 lg:w-full lg:items-start my-auto">
        {/* Coluna 1: Minha Tela */}
        <div className="flex flex-col items-center bg-white/[0.02] border border-white/10 rounded-3xl p-5 shadow-2xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-neutral-300 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            Seu Tabuleiro (Adivinhando palavra de {partnerDisplayName})
          </div>
          <div className={`my-auto max-h-[46vh] overflow-y-auto no-scrollbar py-2 ${shake ? 'word-shake' : ''}`}>
            <WordGrid
              rows={myRows}
              guesses={myGuesses}
              revealingRow={revealingRow}
              revealProgress={revealProgress}
              bounceRow={bounceRow}
              lastTypedIdx={lastTypedIdx}
              shake={shake}
              onTileClick={(idx) => {
                if (isMyTurn) setCursorPos(idx);
              }}
            />
          </div>
          <div className="w-full mt-4 pt-2">
            <WordKeyboard
              onKey={handleKey}
              keyStates={keyStates}
              disabled={!isMyTurn || isSubmitting || revealingRow >= 0}
            />
          </div>
        </div>

        {/* Coluna 2: Tela do Adversário (Ao Vivo) */}
        <div className="flex flex-col items-center bg-white/[0.02] border border-white/10 rounded-3xl p-5 shadow-2xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-neutral-300 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
            Tabuleiro de {partnerDisplayName} (Ao Vivo)
          </div>
          <div className="my-auto max-h-[46vh] overflow-y-auto no-scrollbar py-2">
            <WordGrid
              rows={partnerRows}
              guesses={partnerGuesses}
              revealingRow={partnerRevealingRow}
              revealProgress={partnerRevealProgress}
              bounceRow={partnerBounceRow}
              lastTypedIdx={-1}
              shake={false}
              onTileClick={() => {}}
            />
          </div>
          <div className="w-full mt-4 pt-6 text-center min-h-[60px] flex items-center justify-center">
            {!isMyTurn && partnerInputDraft ? (
              <span className="text-sm text-amber-300 font-medium italic flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-4 h-4" /> {partnerDisplayName} está digitando ao vivo...
              </span>
            ) : !isMyTurn ? (
              <span className="text-xs text-neutral-400">Aguardando jogada de {partnerDisplayName}...</span>
            ) : (
              <span className="text-xs text-neutral-500">Sua vez de jogar — digite no tabuleiro ao lado!</span>
            )}
          </div>
        </div>
      </div>

      {/* ── MODO MOBILE / TABLET (< 1024px): 1 COLUNA COM ABAS ──────────────────────────────── */}
      <div className="flex lg:hidden flex-col items-center w-full flex-1 justify-between">
        <div className="w-full flex flex-col gap-4 my-auto overflow-y-auto max-h-[46vh] sm:max-h-[50vh] px-1 no-scrollbar">
          {activeTab === 'my' ? (
            /* Minha Tela de Tentativas */
            <div className="flex flex-col items-center">
              <div className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Descobrindo a palavra de {partnerDisplayName}
              </div>
              <div className={shake ? 'word-shake' : ''}>
                <WordGrid
                  rows={myRows}
                  guesses={myGuesses}
                  revealingRow={revealingRow}
                  revealProgress={revealProgress}
                  bounceRow={bounceRow}
                  lastTypedIdx={lastTypedIdx}
                  shake={shake}
                  onTileClick={(idx) => {
                    if (isMyTurn) setCursorPos(idx);
                  }}
                />
              </div>
            </div>
          ) : (
            /* Tela do Parceiro em Tempo Real (Live Spectate) com animação de revelação */
            <div className="flex flex-col items-center">
              <div className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                Assistindo {partnerDisplayName} tentando achar sua palavra
              </div>
              <div>
                <WordGrid
                  rows={partnerRows}
                  guesses={partnerGuesses}
                  revealingRow={partnerRevealingRow}
                  revealProgress={partnerRevealProgress}
                  bounceRow={partnerBounceRow}
                  lastTypedIdx={-1}
                  shake={false}
                  onTileClick={() => {}}
                />
              </div>
              {!isMyTurn && partnerInputDraft && (
                <span className="text-[11px] text-amber-300/80 mt-2 italic flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Digitando ao vivo...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Teclado (ativo apenas na minha tela e no meu turno) */}
        <div className="w-full mt-auto pt-2">
          <WordKeyboard
            onKey={handleKey}
            keyStates={keyStates}
            disabled={!isMyTurn || isSubmitting || revealingRow >= 0 || activeTab !== 'my'}
          />
        </div>
      </div>
    </div>
  );
}
}
