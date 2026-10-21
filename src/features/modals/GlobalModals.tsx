import { lazy, Suspense } from 'react';
import { useModalsStore } from '../../store/useModalsStore';

const WordGameModal = lazy(() => import('./WordGameModal').then(module => ({ default: module.WordGameModal })));
const SnakeModal = lazy(() => import('./SnakeModal').then(module => ({ default: module.SnakeModal })));
const StarMapModal = lazy(() => import('./StarMapModal').then(module => ({ default: module.StarMapModal })));
const TimelineModalWrapper = lazy(() => import('./TimelineModalWrapper').then(module => ({ default: module.TimelineModalWrapper })));
const CoupleQuizModal = lazy(() => import('../quiz/components/CoupleQuizModal').then(module => ({ default: module.CoupleQuizModal })));
const MemoryGameModal = lazy(() => import('./MemoryGameModal').then(module => ({ default: module.MemoryGameModal })));
const SyncModal = lazy(() => import('./SyncModal').then(module => ({ default: module.SyncModal })));
const DevotionalModal = lazy(() => import('./DevotionalModal').then(module => ({ default: module.DevotionalModal })));

export function GlobalModals() {
  const { activeModal, closeModal } = useModalsStore();

  return (
    <Suspense fallback={null}>
      {activeModal === 'timeline' && <TimelineModalWrapper isOpen={true} onClose={closeModal} />}
      {activeModal === 'word-game' && <WordGameModal isOpen={true} onClose={closeModal} />}
      {activeModal === 'snake' && <SnakeModal isOpen={true} onClose={closeModal} />}
      {activeModal === 'star-map' && <StarMapModal isOpen={true} onClose={closeModal} />}
      {activeModal === 'couple-quiz' && <CoupleQuizModal isOpen={true} onClose={closeModal} />}
      {activeModal === 'memory-game' && <MemoryGameModal isOpen={true} onClose={closeModal} />}
      {activeModal === 'sync' && <SyncModal isOpen={true} onClose={closeModal} />}
      {activeModal === 'devotional' && <DevotionalModal isOpen={true} onClose={closeModal} />}
    </Suspense>
  );
}
