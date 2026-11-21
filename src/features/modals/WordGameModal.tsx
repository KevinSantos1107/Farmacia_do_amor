import { useNavigate } from 'react-router-dom';
import { WordGame } from '../games/WordGame';
import { FullScreenOverlay } from '../../shared/ui/FullScreenOverlay';
import { Gamepad2, Swords } from 'lucide-react';

export function WordGameModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="Jogo de Palavras"
      subtitle="Descubra a palavra secreta que marcou nossa história"
      icon={<Gamepad2 className="w-6 h-6" />}
      actions={
        <button
          onClick={() => navigate('/word-duel')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-white/80 hover:text-white text-xs font-medium transition-all cursor-pointer active:scale-95"
          title="Jogar Duelo 1v1 Online"
        >
          <Swords className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline font-semibold">Modo Duelo</span>
        </button>
      }
    >
      <div className="w-full min-h-full flex flex-col items-center justify-center px-3 sm:px-6 py-2 sm:py-4">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col flex-1">
          <WordGame />
        </div>
      </div>
    </FullScreenOverlay>
  );
}
