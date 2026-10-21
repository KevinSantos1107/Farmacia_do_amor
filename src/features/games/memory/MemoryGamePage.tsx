import { useNavigate } from 'react-router-dom';
import { MemoryGameModal } from '../../modals/MemoryGameModal';
import { safeCloseOverlay } from '../../../shared/utils/overlayNavigation';

export default function MemoryGamePage() {
  const navigate = useNavigate();

  return (
    <MemoryGameModal
      isOpen={true}
      onClose={() => safeCloseOverlay(navigate)}
    />
  );
}
