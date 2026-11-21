import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useWordDuel } from './useWordDuel';
import { Swords, LogOut, Play } from 'lucide-react';
import { useModalsStore } from '../../../store/useModalsStore';

export function ReturnToWordDuelToast() {
  const navigate = useNavigate();
  const { room, isPlayer, myPlayerId, partnerDisplayName, forceEndGame, returnToGame } = useWordDuel();
  const { activeModal } = useModalsStore();

  const isGameActive = room?.status === 'waiting_words' || room?.status === 'dueling';
  const shouldShow = isPlayer && room?.leftBy === myPlayerId && isGameActive && activeModal !== 'word-duel';

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 p-4 bg-gray-900 border border-amber-500/30 rounded-2xl shadow-2xl w-80"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <div>
              <h4 className="text-white font-bold text-sm">Duelo em andamento</h4>
              <p className="text-white/60 text-xs mt-0.5">com {partnerDisplayName}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => forceEndGame()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Abandonar
          </button>
          <button
            onClick={async () => {
              await returnToGame();
              navigate('/word-duel');
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 shadow-lg shadow-rose-500/20 transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            Retornar
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
