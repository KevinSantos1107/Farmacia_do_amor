import { motion, AnimatePresence } from 'framer-motion';
import { Heart, HeartCrack, Play, Target } from 'lucide-react';
import { Confetti } from './Confetti';
import { MAX_ATTEMPTS } from './wordConstants';

interface WordGameOverOverlayProps {
  gameOver: boolean;
  won: boolean;
  currentWord: string;
  currentMessage: string;
  attempts: number;
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
  onNextRound,
  onShare,
}: WordGameOverOverlayProps) {
  return (
    <AnimatePresence>
      {gameOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[rgba(7,5,15,0.92)] backdrop-blur-xl rounded-2xl overflow-hidden"
        >
          {won && <Confetti />}

          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.1 }}
            className="flex flex-col items-center text-center max-w-sm w-full px-6 z-20 relative"
          >
            {won ? (
              <>
                {/* Victory icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-5 relative"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                    boxShadow: '0 0 50px rgba(var(--theme-primary-rgb), 0.5)',
                  }}
                >
                  <Heart className="w-10 h-10 text-white fill-current" />
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-theme-primary" />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-theme-primary to-theme-secondary mb-1"
                >
                  Parabéns! 🎉
                </motion.h2>

                {/* Word */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="text-white/70 text-sm mb-1"
                >
                  A palavra era
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-black text-white uppercase tracking-widest mb-4"
                >
                  {currentWord}
                </motion.p>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-theme-secondary font-medium text-base mb-2 italic text-balance leading-relaxed"
                >
                  {currentMessage}
                </motion.p>

                {/* Attempts badge */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center gap-1.5 text-white/40 text-xs mb-6"
                >
                  <Target className="w-3.5 h-3.5" />
                  Acertou em {attempts}/{MAX_ATTEMPTS} tentativa
                  {attempts > 1 ? 's' : ''}
                </motion.div>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex w-full gap-3"
                >
                  <button
                    onClick={onNextRound}
                    className="flex-1 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                      boxShadow: '0 4px 20px rgba(var(--theme-primary-rgb), 0.35)',
                    }}
                  >
                    <Play className="w-4 h-4 fill-current" /> Próxima
                  </button>
                  <button
                    onClick={onShare}
                    className="flex-1 py-3.5 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] hover:border-[var(--theme-primary)] text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                  >
                    <WhatsAppIcon className="w-4 h-4" /> Enviar
                  </button>
                </motion.div>
              </>
            ) : (
              <>
                {/* Defeat icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 bg-[var(--theme-card-bg)] border-2 border-rose-500/40 rounded-full flex items-center justify-center mb-5"
                  style={{ boxShadow: '0 0 40px rgba(244,63,94,0.2)' }}
                >
                  <HeartCrack className="w-10 h-10 text-rose-400" />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-2xl font-bold text-white mb-2"
                >
                  Quase lá!
                </motion.h2>

                {/* Word */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="mb-6"
                >
                  <p className="text-white/50 text-sm mb-1">A palavra era</p>
                  <p className="text-xl font-black text-theme-primary uppercase tracking-widest">
                    {currentWord}
                  </p>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="text-white/40 text-sm mb-8"
                >
                  Não desista! Tente a próxima 💪
                </motion.p>

                {/* Button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  onClick={onNextRound}
                  className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                    boxShadow: '0 4px 20px rgba(var(--theme-primary-rgb), 0.3)',
                  }}
                >
                  <Play className="w-4 h-4 fill-current" /> Próxima Palavra
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
