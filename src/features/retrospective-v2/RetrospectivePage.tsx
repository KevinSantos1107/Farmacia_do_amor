import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRetroV2Store } from './store/useRetroV2Store';
import { useSiteId } from '../../services/firestore/paths';

export default function RetrospectivePage() {
  const navigate = useNavigate();
  const siteId = useSiteId();
  const { openRetro, closeRetro } = useRetroV2Store();
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!hasOpenedRef.current) {
      hasOpenedRef.current = true;
      openRetro(siteId);
    }
  }, [siteId, openRetro]);

  useEffect(() => {
    const unsub = useRetroV2Store.subscribe((state, prevState) => {
      if (prevState.isOpen && !state.isOpen) {
        navigate('/', { replace: true });
      }
    });
    return () => {
      unsub();
      closeRetro();
    };
  }, [navigate, closeRetro]);

  return null;
}
