import { WordDuelGame } from '../games/word-duel/WordDuelGame';
import { FullScreenOverlay } from '../../shared/ui/FullScreenOverlay';
import { Swords } from 'lucide-react';

export function WordDuelModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="Duelo de Palavras"
      subtitle="Escolham suas palavras secretas e duelem em tempo real"
      icon={<Swords className="w-6 h-6" />}
    >
      <div className="w-full min-h-full flex flex-col items-center justify-center px-3 sm:px-6 py-2 sm:py-4">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col flex-1">
          <WordDuelGame />
        </div>
      </div>
    </FullScreenOverlay>
  );
}
