import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRetroV2Store } from './store/useRetroV2Store';
import { useSiteId } from '../../services/firestore/paths';
import { safeCloseOverlay } from '../../shared/utils/overlayNavigation';

export default function RetrospectivePage() {
  const navigate = useNavigate();
  const siteId = useSiteId();
  const { openRetro, closeRetro } = useRetroV2Store();
  const isClosingRef = useRef(false);

  useEffect(() => {
    isClosingRef.current = false;
    openRetro(siteId);

    const unsub = useRetroV2Store.subscribe((state, prevState) => {
      if (prevState.isOpen && !state.isOpen && !isClosingRef.current) {
        isClosingRef.current = true;
        safeCloseOverlay(navigate);
      }
    });

    return () => {
      unsub();
      closeRetro();
    };
  }, [siteId, openRetro, closeRetro, navigate]);

  return null;
}
