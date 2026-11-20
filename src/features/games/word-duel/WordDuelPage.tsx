import { useNavigate } from 'react-router-dom';
import { WordDuelModal } from '../../modals/WordDuelModal';
import { safeCloseOverlay } from '../../../shared/utils/overlayNavigation';

export default function WordDuelPage() {
  const navigate = useNavigate();

  return (
    <WordDuelModal
      isOpen={true}
      onClose={() => safeCloseOverlay(navigate)}
    />
  );
}
