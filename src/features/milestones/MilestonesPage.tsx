import { useNavigate } from 'react-router-dom';
import { MilestonesModal } from './MilestonesModal';
import { safeCloseOverlay } from '../../shared/utils/overlayNavigation';

export default function MilestonesPage() {
  const navigate = useNavigate();

  return (
    <MilestonesModal
      isOpen={true}
      onClose={() => safeCloseOverlay(navigate)}
    />
  );
}
