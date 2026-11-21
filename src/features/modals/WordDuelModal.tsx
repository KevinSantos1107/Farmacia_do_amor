import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordDuelGame } from '../games/word-duel/WordDuelGame';
import { FullScreenOverlay } from '../../shared/ui/FullScreenOverlay';
import { Swords, Gamepad2 } from 'lucide-react';

export function WordDuelModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const leaveGameRef = useRef<(() => void) | null>(null);
  const navigate = useNavigate();

  const handleClose = () => {
    if (leaveGameRef.current) {
      leaveGameRef.current();
    }
    onClose();
  };

  const handleSwitchToSolo = () => {
    if (leaveGameRef.current) {
      leaveGameRef.current();
    }
    navigate('/word-game');
  };

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={handleClose}
      title="Duelo de Palavras"
      subtitle="Escolham suas palavras secretas e duelem em tempo real"
      icon={<Swords className="w-6 h-6" />}
      actions={
        <button
          onClick={handleSwitchToSolo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white text-xs font-medium transition-all cursor-pointer active:scale-95"
          title="Jogar Modo Solo"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Modo Solo</span>
        </button>
      }
    >
      <div className="w-full min-h-full flex flex-col items-center justify-start px-2 sm:px-6 md:px-8 py-2 sm:py-4">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-5xl flex flex-col flex-1">
          <WordDuelGame onClose={onClose} registerLeaveGame={(fn) => { leaveGameRef.current = fn; }} />
        </div>
      </div>
    </FullScreenOverlay>
  );
}
