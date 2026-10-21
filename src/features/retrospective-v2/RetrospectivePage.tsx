import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRetroV2Store } from './store/useRetroV2Store';
import { useSiteId } from '../../services/firestore/paths';
import { safeCloseOverlay } from '../../shared/utils/overlayNavigation';

export default function RetrospectivePage() {
  const navigate = useNavigate();
  const siteId = useSiteId();
  const { isOpen, openRetro } = useRetroV2Store();

  useEffect(() => {
    if (!isOpen) {
      openRetro(siteId);
    }
  }, [siteId, isOpen, openRetro]);

  useEffect(() => {
    const unsub = useRetroV2Store.subscribe((state, prevState) => {
      if (prevState.isOpen && !state.isOpen) {
        safeCloseOverlay(navigate);
      }
    });
    return unsub;
  }, [navigate]);

  return null;
}
