import { useNavigate } from 'react-router-dom';
import { SnakeModal } from '../../modals/SnakeModal';
import { safeCloseOverlay } from '../../../shared/utils/overlayNavigation';

export default function SnakePage() {
  const navigate = useNavigate();

  return (
    <SnakeModal
      isOpen={true}
      onClose={() => safeCloseOverlay(navigate)}
    />
  );
}
