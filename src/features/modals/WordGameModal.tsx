import { WordGame } from '../games/WordGame';
import { FullScreenOverlay } from '../../shared/ui/FullScreenOverlay';
import { Gamepad2 } from 'lucide-react';

export function WordGameModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="Jogo de Palavras"
      subtitle="Descubra a palavra secreta que marcou nossa história"
      icon={<Gamepad2 className="w-6 h-6" />}
    >
      <div className="w-full min-h-full flex flex-col items-center justify-center px-3 sm:px-6 py-2 sm:py-4">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col flex-1">
          <WordGame />
        </div>
      </div>
    </FullScreenOverlay>
  );
}
