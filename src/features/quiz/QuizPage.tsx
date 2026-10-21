import { useNavigate } from 'react-router-dom';
import { CoupleQuizModal } from './components/CoupleQuizModal';
import { safeCloseOverlay } from '../../shared/utils/overlayNavigation';

export default function QuizPage() {
  const navigate = useNavigate();

  return (
    <CoupleQuizModal
      isOpen={true}
      onClose={() => safeCloseOverlay(navigate)}
    />
  );
}
