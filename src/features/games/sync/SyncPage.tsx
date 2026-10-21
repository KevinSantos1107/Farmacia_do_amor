import { useNavigate } from 'react-router-dom';
import { SyncModal } from '../../modals/SyncModal';
import { safeCloseOverlay } from '../../../shared/utils/overlayNavigation';

export default function SyncPage() {
  const navigate = useNavigate();

  return (
    <SyncModal
      isOpen={true}
      onClose={() => safeCloseOverlay(navigate)}
    />
  );
}
