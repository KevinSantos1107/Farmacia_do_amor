import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModalsStore, type ModalType } from '../../store/useModalsStore';

const MODAL_ROUTES: Record<NonNullable<ModalType>, string> = {
  'timeline': '/timeline',
  'word-game': '/word-game',
  'snake': '/snake',
  'star-map': '/star-map',
  'couple-quiz': '/quiz',
  'memory-game': '/memory-game',
  'sync': '/sync',
  'devotional': '/devotional',
};

export function GlobalModals() {
  const { activeModal, closeModal } = useModalsStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeModal && MODAL_ROUTES[activeModal]) {
      navigate(MODAL_ROUTES[activeModal]);
      closeModal();
    }
  }, [activeModal, closeModal, navigate]);

  return null;
}
