import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSyncRoom } from '../useSyncRoom';
import { LogOut, Play } from 'lucide-react';
import { useModalsStore } from '../../../../store/useModalsStore';

export function ReturnToGameToast() {
  const navigate = useNavigate();
  const { room, isPlayer, player, partnerName, forceEndGame } = useSyncRoom();
  const { activeModal } = useModalsStore();

  const isLeft = room?.status === 'playing' || room?.status === 'choosing' || room?.status === 'revealed';
  const shouldShow = isPlayer && room?.leftBy === player && isLeft && activeModal !== 'sync';

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 p-4 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-80"
      >
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-white font-bold text-sm">Partida em andamento</h4>
            <p className="text-white/60 text-xs mt-0.5">com {partnerName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              forceEndGame();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
          >
            <LogOut className="w-3 h-3" />
            Abandonar
          </button>
          <button
            onClick={() => {
              navigate('/sync');
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-[var(--theme-bg)] bg-[var(--theme-primary)] hover:opacity-90 transition-all"
          >
            <Play className="w-3 h-3" />
            Retornar
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
