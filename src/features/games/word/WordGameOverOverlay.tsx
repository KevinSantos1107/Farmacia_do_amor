import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, HeartCrack, Play, Target } from 'lucide-react';
import { Confetti } from './Confetti';
import { MAX_ATTEMPTS } from './wordConstants';
import { getModalPortalTarget } from '../../../shared/utils/portal';

interface WordGameOverOverlayProps {
  gameOver: boolean;
  won: boolean;
  currentWord: string;
  currentMessage: string;
  attempts: number;
  originY?: number;
  onNextRound: () => void;
  onShare: () => void;
}

export const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

export function WordGameOverOverlay({
  gameOver,
  won,
  currentWord,
  currentMessage,
  attempts,
  originY,
  onNextRound,
  onShare,
}: WordGameOverOverlayProps) {
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    if (gameOver) {
      setIsDismissing(false);
    }
  }, [gameOver]);

  const handleNext = () => {
    setIsDismissing(true);
    onNextRound();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {gameOver && (
        <motion.div
          key="word-game-over-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-xl overflow-y-auto no-scrollbar"
        >
          {won && !isDismissing && <Confetti originY={originY} />}

          <motion.div
            initial={{ scale: 0.88, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.88, y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280, delay: 0.05 }}
            className="flex flex-col items-center text-center w-full max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-[rgba(16,12,24,0.96)] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-[0_25px_80px_rgba(0,0,0,0.85)] z-20 relative overflow-hidden my-auto"
          >
            {/* Ambient glow no topo do card */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full pointer-events-none opacity-20 sm:opacity-25"
              style={{
                background: won
                  ? 'radial-gradient(circle, var(--theme-primary) 0%, transparent 70%)'
                  : 'radial-gradient(circle, #f43f5e 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />

            {won ? (
              <>
                {/* Victory icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.15 }}
                  className="w-18 h-18 sm:w-22 sm:h-22 md:w-26 md:h-26 lg:w-28 lg:h-28 rounded-full flex items-center justify-center mb-3 sm:mb-5 relative shrink-0"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                    boxShadow: '0 0 50px rgba(var(--theme-primary-rgb), 0.55)',
                  }}
                >
                  <Heart className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 lg:w-14 lg:h-14 text-white fill-current" />
                  <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-theme-primary" />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-theme-primary to-theme-secondary mb-1 tracking-tight"
                >
                  Parabéns! 🎉
                </motion.h2>

                {/* Secret word label */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-white/60 text-xs sm:text-sm md:text-base font-semibold uppercase tracking-wider mb-2"
                >
                  A palavra era
                </motion.p>

                {/* Secret word formatted in animated green tiles */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-1.5 sm:gap-2.5 md:gap-3 mb-4 sm:mb-5 flex-wrap"
                >
                  {currentWord.split('').map((letter, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotateY: 90 }}
                      animate={{ scale: 1, rotateY: 0 }}
                      transition={{
                        delay: 0.42 + i * 0.07,
                        type: 'spring',
                        stiffness: 260,
                        damping: 18,
                      }}
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center font-black text-lg sm:text-2xl md:text-3xl text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.35)] select-none"
                    >
                      {letter}
                    </motion.div>
                  ))}
                </motion.div>

                {/* Romantic couple message box */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="w-full max-w-lg mx-auto mb-3 sm:mb-4 px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner"
                >
                  <p className="text-theme-secondary font-medium text-sm sm:text-base md:text-lg italic leading-relaxed text-balance">
                    &ldquo;{currentMessage}&rdquo;
                  </p>
                </motion.div>

                {/* Attempts badge */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/[0.05] border border-white/10 text-xs sm:text-sm text-white/70 mb-5 sm:mb-7"
                >
                  <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                  <span>
                    Acertou em <strong className="text-white font-bold">{attempts}</strong> de{' '}
                    <strong className="text-white font-bold">{MAX_ATTEMPTS}</strong> tentativas
                  </span>
                </motion.div>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex flex-col sm:flex-row w-full max-w-md gap-2.5 sm:gap-4"
                >
                  <button
                    onClick={handleNext}
                    className="flex-1 py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base uppercase tracking-wider text-white transition-all active:scale-95 hover:scale-[1.02] hover:shadow-[0_6px_25px_rgba(var(--theme-primary-rgb),0.5)] flex items-center justify-center gap-2.5 cursor-pointer"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                      boxShadow: '0 4px 20px rgba(var(--theme-primary-rgb), 0.35)',
                    }}
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> Próxima
                  </button>
                  <button
                    onClick={onShare}
                    className="flex-1 py-3.5 sm:py-4 px-6 bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-[var(--theme-primary)] text-white font-bold rounded-xl sm:rounded-2xl transition-all active:scale-95 hover:scale-[1.02] flex items-center justify-center gap-2.5 text-sm sm:text-base uppercase tracking-wider cursor-pointer shadow-lg"
                  >
                    <WhatsAppIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Enviar
                  </button>
                </motion.div>
              </>
            ) : (
              <>
                {/* Defeat icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
                  className="w-18 h-18 sm:w-22 sm:h-22 md:w-26 md:h-26 lg:w-28 lg:h-28 bg-[var(--theme-card-bg)] border-2 border-rose-500/40 rounded-full flex items-center justify-center mb-3 sm:mb-5 relative shrink-0"
                  style={{ boxShadow: '0 0 40px rgba(244,63,94,0.25)' }}
                >
                  <HeartCrack className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 lg:w-14 lg:h-14 text-rose-400" />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1 tracking-tight"
                >
                  Quase lá!
                </motion.h2>

                {/* Word label */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-white/50 text-xs sm:text-sm md:text-base uppercase tracking-wider font-semibold mb-2"
                >
                  A palavra era
                </motion.p>

                {/* Word formatted in red/rose tiles */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-1.5 sm:gap-2.5 md:gap-3 mb-4 sm:mb-5 flex-wrap"
                >
                  {currentWord.split('').map((letter, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-rose-500/15 border-2 border-rose-500/50 flex items-center justify-center font-black text-lg sm:text-2xl md:text-3xl text-rose-300 select-none"
                    >
                      {letter}
                    </div>
                  ))}
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="text-white/50 text-sm sm:text-base md:text-lg mb-6 sm:mb-8"
                >
                  Não desista! Tente a próxima palavra 💪
                </motion.p>

                {/* Button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  onClick={handleNext}
                  className="w-full max-w-xs sm:max-w-sm py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base uppercase tracking-wider text-white transition-all active:scale-95 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                    boxShadow: '0 4px 20px rgba(var(--theme-primary-rgb), 0.3)',
                  }}
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> Próxima Palavra
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    getModalPortalTarget()
  );
}
