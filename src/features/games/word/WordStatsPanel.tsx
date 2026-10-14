import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Trophy, Gamepad2, Check } from 'lucide-react';
import type { GameStats } from './types';

interface WordStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
}

export function WordStatsPanel({ isOpen, onClose, stats }: WordStatsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[rgba(7,5,15,0.8)] backdrop-blur-md rounded-2xl overflow-hidden p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-2xl p-6 shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-6 text-center">Estatísticas</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl">
                <Flame className="w-6 h-6 text-orange-400 mb-1" />
                <span className="text-2xl font-black text-white">{stats.currentStreak}</span>
                <span className="text-xs text-white/50 uppercase">Streak Atual</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl">
                <Trophy className="w-6 h-6 text-yellow-400 mb-1" />
                <span className="text-2xl font-black text-white">{stats.bestStreak}</span>
                <span className="text-xs text-white/50 uppercase">Recorde</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl">
                <Gamepad2 className="w-6 h-6 text-[var(--theme-primary)] mb-1" />
                <span className="text-2xl font-black text-white">{stats.gamesPlayed}</span>
                <span className="text-xs text-white/50 uppercase">Jogados</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl">
                <Check className="w-6 h-6 text-emerald-400 mb-1" />
                <span className="text-2xl font-black text-white">
                  {stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0}%
                </span>
                <span className="text-xs text-white/50 uppercase">Vitórias</span>
              </div>
            </div>

            {/* Distribuição de Vitórias */}
            <div className="w-full mb-6">
              <h4 className="text-white/80 font-bold mb-3 text-sm">Distribuição de Vitórias</h4>
              <div className="flex flex-col gap-1.5 w-full">
                {(stats.winsByAttempt || [0, 0, 0, 0, 0, 0]).map((count, i) => {
                  const maxCount = Math.max(...(stats.winsByAttempt || [0, 0, 0, 0, 0, 0]), 1);
                  const widthPercent = Math.max(7, Math.round((count / maxCount) * 100));
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-white/60 font-bold"
                    >
                      <span className="w-3 text-right">{i + 1}</span>
                      <div className="flex-1 h-5 bg-white/5 rounded-sm overflow-hidden">
                        <div
                          className="h-full flex items-center justify-end px-2 text-white transition-all duration-500"
                          style={{
                            width: `${widthPercent}%`,
                            background:
                              count > 0 ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)',
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

            <button
              onClick={onClose}
              className="w-full py-3 bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] text-white font-bold rounded-xl transition-all"
            >
              Fechar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
