import { useNavigate } from 'react-router-dom';
import { WordGameModal } from '../../modals/WordGameModal';
import { safeCloseOverlay } from '../../../shared/utils/overlayNavigation';

export default function WordGamePage() {
  const navigate = useNavigate();

  return (
    <WordGameModal
      isOpen={true}
      onClose={() => safeCloseOverlay(navigate)}
    />
  );
}
