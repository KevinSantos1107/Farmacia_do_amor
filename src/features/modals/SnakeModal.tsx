import { SnakeGame } from '../games/snake/SnakeGame';
import { FullScreenOverlay } from '../../shared/ui/FullScreenOverlay';
import { Worm } from 'lucide-react';

export function SnakeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="Cobrinha"
      subtitle="Use as setas ou deslize na tela para jogar"
      icon={<Worm className="w-6 h-6" />}
      fill
    >
      {/* Mobile/tablet/desktop: aproveita a tela mantendo proporções perfeitas sem scroll */}
      <div className="w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 md:p-3 overflow-hidden min-h-0">
        <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center min-h-0 overflow-hidden">
          <SnakeGame />
        </div>
      </div>
    </FullScreenOverlay>
  );
}
