import { useNavigate } from 'react-router-dom';
import { TimelineModalWrapper } from '../modals/TimelineModalWrapper';
import { safeCloseOverlay } from '../../shared/utils/overlayNavigation';

export default function TimelinePage() {
  const navigate = useNavigate();

  return (
    <TimelineModalWrapper
      isOpen={true}
      onClose={() => safeCloseOverlay(navigate)}
    />
  );
}
