import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Trophy, RotateCcw, Swords } from 'lucide-react';
import { Confetti } from '../word/Confetti';

interface WordDuelGameOverProps {
  isOpen: boolean;
  isWinner: boolean;
  winnerDisplayName: string;
  myDisplayName?: string;
  partnerDisplayName: string;
  myAttempts: number;
  partnerAttempts: number;
  myRevealedSecret: string | null;
  partnerRevealedSecret: string | null;
  onPlayAgain: () => void;
  isSubmitting: boolean;
}

export function WordDuelGameOver({
  isOpen,
  isWinner,
  winnerDisplayName,
  partnerDisplayName,
  myAttempts,
  partnerAttempts,
  myRevealedSecret,
  partnerRevealedSecret,
  onPlayAgain,
  isSubmitting,
}: WordDuelGameOverProps) {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="word-duel-game-over-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-xl overflow-y-auto no-scrollbar"
      >
        {isWinner && <Confetti />}

        <motion.div
          initial={{ scale: 0.88, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.88, y: 24, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280, delay: 0.05 }}
          className="flex flex-col items-center text-center w-full max-w-sm sm:max-w-md bg-[rgba(16,12,24,0.96)] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.85)] z-20 relative overflow-hidden my-auto"
        >
          {/* Ambient Glow */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none opacity-25"
            style={{
              background: isWinner
                ? 'radial-gradient(circle, #fbbf24 0%, transparent 70%)'
                : 'radial-gradient(circle, #818cf8 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          {/* Ícone */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-white/10 shadow-lg bg-white/5">
            {isWinner ? (
              <Trophy className="w-9 h-9 text-amber-400 animate-bounce" />
            ) : (
              <Swords className="w-8 h-8 text-indigo-400" />
            )}
          </div>

          {/* Título de Vitória / Fim de Jogo */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
            {isWinner ? 'Você Venceu!' : `${winnerDisplayName} Venceu!`}
          </h2>
          <p className="text-sm text-neutral-400 mb-6">
            {isWinner
              ? `Parabéns! Você decifrou a palavra de ${partnerDisplayName} primeiro!`
              : `${winnerDisplayName} decifrou sua palavra primeiro nesta rodada!`}
          </p>

          {/* Palavras Reveladas */}
          <div className="w-full grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center">
              <span className="text-xs text-neutral-400 uppercase font-medium">Sua Palavra</span>
              <span className="text-lg font-black tracking-widest text-emerald-400 mt-1">
                {myRevealedSecret || '-----'}
              </span>
              <span className="text-[11px] text-neutral-500 mt-0.5">
                {partnerAttempts} {partnerAttempts === 1 ? 'tentativa' : 'tentativas'} do rival
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center">
              <span className="text-xs text-neutral-400 uppercase font-medium">
                Palavra de {partnerDisplayName}
              </span>
              <span className="text-lg font-black tracking-widest text-amber-400 mt-1">
                {partnerRevealedSecret || '-----'}
              </span>
              <span className="text-[11px] text-neutral-500 mt-0.5">
                {myAttempts} {myAttempts === 1 ? 'tentativa' : 'tentativas'} sua
              </span>
            </div>
          </div>

          {/* Botão Jogar de Novo */}
          <button
            onClick={onPlayAgain}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-5 h-5" />
            {isSubmitting ? 'Preparando...' : 'Jogar de Novo'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
