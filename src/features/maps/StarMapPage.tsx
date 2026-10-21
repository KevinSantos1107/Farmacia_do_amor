import { useNavigate } from 'react-router-dom';
import { StarMapModal } from '../modals/StarMapModal';
import { safeCloseOverlay } from '../../shared/utils/overlayNavigation';

export default function StarMapPage() {
  const navigate = useNavigate();

  return (
    <StarMapModal
      isOpen={true}
      onClose={() => safeCloseOverlay(navigate)}
    />
  );
}
