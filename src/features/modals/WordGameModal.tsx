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
      {/* Mobile: full width; Tablet/Desktop: centralizado com max-w crescente */}
      <div className="w-full min-h-full flex flex-col items-center px-3 sm:px-6 md:px-10 py-4 sm:py-6 md:py-8">
        <div className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col flex-1">
          <WordGame />
        </div>
      </div>
    </FullScreenOverlay>
  );
}
