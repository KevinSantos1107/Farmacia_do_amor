import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Trophy, Gamepad2, Check, ArrowLeft } from 'lucide-react';
import type { GameStats } from './types';
import { useOverlayHistory } from '../../../shared/hooks/useOverlayHistory';
import { lockBodyScroll } from '../../../shared/utils/scrollLock';

interface WordStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
}

export function WordStatsPanel({ isOpen, onClose, stats }: WordStatsPanelProps) {
  const { handleDismiss, handleBack } = useOverlayHistory({
    id: 'word-game-stats',
    isOpen,
    onClose,
  });

  useEffect(() => {
    if (isOpen) {
      const unlock = lockBodyScroll();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleDismiss();
      };
      window.addEventListener('keydown', onKeyDown);
      return () => {
        unlock();
        window.removeEventListener('keydown', onKeyDown);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  const maxAttemptCount = Math.max(...(stats.winsByAttempt || [0, 0, 0, 0, 0, 0]), 1);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop cobrindo toda a viewport */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Card responsivo para desktop e mobile */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="relative z-10 w-full max-w-md sm:max-w-xl md:max-w-2xl bg-[#0e091b]/95 border border-purple-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(157,78,221,0.25)] flex flex-col my-auto"
        >
          {/* Header com Voltar e Fechar */}
          <div className="flex items-center justify-between pb-4 sm:pb-5 mb-5 border-b border-white/10">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              title="Voltar ao Jogo"
              aria-label="Voltar ao Jogo"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
              <h3 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-wide">
                Estatísticas do Jogo
              </h3>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid de 4 Cards responsivo: 2 colunas no celular, 4 colunas completas no desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.08] transition-colors">
              <Flame className="w-6 h-6 text-orange-400 mb-1.5" />
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.currentStreak}</span>
              <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-semibold mt-0.5">
                Streak Atual
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.08] transition-colors">
              <Trophy className="w-6 h-6 text-yellow-400 mb-1.5" />
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.bestStreak}</span>
              <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-semibold mt-0.5">
                Recorde
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.08] transition-colors">
              <Gamepad2 className="w-6 h-6 text-purple-400 mb-1.5" />
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.gamesPlayed}</span>
              <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-semibold mt-0.5">
                Jogados
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.08] transition-colors">
              <Check className="w-6 h-6 text-emerald-400 mb-1.5" />
              <span className="text-2xl sm:text-3xl font-black text-white">{winRate}%</span>
              <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-semibold mt-0.5">
                Vitórias
              </span>
            </div>
          </div>

          {/* Distribuição de Vitórias por Tentativa */}
          <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 mb-6">
            <h4 className="text-white/80 font-bold mb-3.5 text-xs sm:text-sm uppercase tracking-wider text-center sm:text-left">
              Distribuição de Vitórias por Tentativa
            </h4>
            <div className="flex flex-col gap-2 w-full">
              {(stats.winsByAttempt || [0, 0, 0, 0, 0, 0]).map((count, i) => {
                const widthPercent = Math.max(8, Math.round((count / maxAttemptCount) * 100));
                return (
                  <div key={i} className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm text-white/70 font-bold">
                    <span className="w-4 text-right text-white/50 shrink-0">{i + 1}</span>
                    <div className="flex-1 h-6 sm:h-7 bg-white/5 border border-white/5 rounded-lg overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-md flex items-center justify-end px-2.5 text-white text-xs font-black transition-all duration-500 shadow-sm"
                        style={{
                          width: `${widthPercent}%`,
                          background: count > 0
                            ? 'linear-gradient(90deg, #9d4edd 0%, #c77dff 100%)'
                            : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        {count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão de Retorno */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 text-white font-bold rounded-2xl transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base active:scale-[0.99]"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Jogo
          </button>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
