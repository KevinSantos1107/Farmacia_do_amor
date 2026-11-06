import { useRef } from 'react';
import { SyncGame } from '../games/sync/SyncGame';
import { FullScreenOverlay } from '../../shared/ui/FullScreenOverlay';
import { Heart } from 'lucide-react';

export function SyncModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  // SyncGame exposes a leaveGameRef so SyncModal can call leaveGame
  // when the X button closes the modal (unilateral exit from a game in progress)
  const leaveGameRef = useRef<(() => void) | null>(null);

  const handleClose = () => {
    // If there is a leaveGame handler registered (game in progress), call it
    if (leaveGameRef.current) {
      leaveGameRef.current();
    }
    onClose();
  };

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={handleClose}
      title="Sincronia"
      subtitle="Pensem na mesma palavra sem combinar 💞"
      icon={<Heart className="w-6 h-6" style={{ strokeDasharray: 'none' }} />}
    >
      <div className="w-full flex flex-col items-center px-3 sm:px-6 md:px-10 py-4 sm:py-6">
        <div className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl flex flex-col flex-1 min-h-0 overflow-y-auto">
          <SyncGame onClose={onClose} registerLeaveGame={(fn) => { leaveGameRef.current = fn; }} />
        </div>
      </div>
    </FullScreenOverlay>
  );
}
