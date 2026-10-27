import { motion } from 'framer-motion';
import { Trophy, Star, Sparkles, Repeat, X } from 'lucide-react';
import { WaitingFor } from './WaitingFor';
import type { SyncRoomResult } from '../useSyncRoom';
import { calculateTotalScore, getRoundPoints } from '../syncLogic';

interface SessionResultProps {
  results: SyncRoomResult[];
  previousBest: number | null;
  waitingItems: { id: string; name: string; avatarUrl?: string; done: boolean }[];
  onPlayAgain: () => Promise<void>;
  onClose: () => void;
  isReady?: boolean;
}

export function SessionResult({
  results,
  previousBest,
  waitingItems,
  onPlayAgain,
  onClose,
  isReady = false,
}: SessionResultProps) {
  const total = calculateTotalScore(results);
  const isNewRecord = previousBest === null || total > previousBest;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 py-8 md:py-12 min-h-screen md:min-h-0"
    >
      {/* Header Trophy & Title */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4 mb-8"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
          </motion.div>
          {isNewRecord && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </div>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white text-center tracking-wide">
          Sessão Concluída!
        </h2>
      </motion.div>

      {/* Score Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative w-full max-w-sm bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-[2rem] p-8 text-center shadow-2xl mb-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--theme-primary)]/20 to-transparent opacity-50" />
        
        {isNewRecord && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 whitespace-nowrap"
          >
            Novo Recorde
          </motion.div>
        )}

        <div className="relative z-10 flex flex-col items-center mt-4">
          <span className="text-white/50 text-sm uppercase tracking-widest font-medium mb-2">Pontuação Total</span>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl md:text-7xl font-bold text-white drop-shadow-md">{total}</span>
            <span className="text-white/40 text-lg font-medium">pts</span>
          </div>
          {previousBest !== null && (
            <div className="flex items-center gap-1.5 mt-4 text-white/40 text-sm bg-black/20 px-4 py-1.5 rounded-full">
              <Star className="w-3.5 h-3.5" />
              <span>Melhor anterior: <strong className="text-white/60">{previousBest}</strong></span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Grid Results */}
      <div className="w-full max-w-3xl mb-12">
        <h3 className="text-white/40 text-sm uppercase tracking-widest font-medium mb-4 px-2">Detalhes por Categoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
            >
              {/* Category Info */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{r.category.split(' ')[0] /* Try extracting emoji if present, fallback handled by design */}</span>
                  <p className="text-white font-semibold text-base truncate">{r.title}</p>
                </div>
                {r.word ? (
                  <p className="text-white/60 text-sm truncate italic">"{r.word}"</p>
                ) : (
                  <p className="text-white/30 text-sm italic">Não sincronizado</p>
                )}
              </div>
              
              {/* Score Badge */}
              <div className="shrink-0 flex flex-col items-end">
                <div
                  className="flex items-center justify-center px-3 py-1.5 rounded-xl text-sm font-bold shadow-inner"
                  style={{
                    color: r.rounds <= 2 ? '#4ade80' : r.rounds <= 4 ? '#fbbf24' : '#f87171',
                    background: r.rounds <= 2 ? 'rgba(74,222,128,0.15)' : r.rounds <= 4 ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)',
                    border: `1px solid ${r.rounds <= 2 ? 'rgba(74,222,128,0.3)' : r.rounds <= 4 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`
                  }}
                  aria-label={`${getRoundPoints(r.rounds)} pontos`}
                >
                  +{getRoundPoints(r.rounds)} pts
                </div>
                <span className="text-[11px] text-white/40 mt-1">
                  {r.rounds === 7 ? 'Não sincronizou' : `${r.rounds}ª tentativa`}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col items-center gap-6 w-full max-w-md pb-8"
      >
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button onClick={onPlayAgain} disabled={isReady} className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-base transition-all active:scale-95 shadow-lg relative overflow-hidden group ${isReady ? "bg-white/10 text-white/50 cursor-not-allowed" : "text-white"}`} style={!isReady ? { background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-accent, var(--theme-primary)) 100%)" } : {}} aria-label="Jogar novamente">{!isReady && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}<span className="relative flex items-center gap-2"><Repeat className="w-5 h-5" />Jogar Novamente</span></button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-base text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all active:scale-95 sm:w-auto"
            aria-label="Fechar resultados"
          >
            <X className="w-5 h-5" />
            Sair
          </button>
        </div>
        <WaitingFor items={waitingItems} label="Prontos:" />
      </motion.div>
    </motion.div>
  );
}




