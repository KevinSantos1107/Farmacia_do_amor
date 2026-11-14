import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { X } from 'lucide-react';
import { lockBodyScroll } from '../utils/scrollLock';
import { useOverlayHistory } from '../hooks/useOverlayHistory';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal = ({ isOpen, onClose, title, children, className }: ModalProps) => {
  const { handleDismiss } = useOverlayHistory({
    id: `modal-${(title || 'dialog').toLowerCase().replace(/\s+/g, '-')}`,
    isOpen,
    onClose,
  });

  // Ref para estabilizar handleDismiss no listener de teclado sem re-registrar a cada render
  const handleDismissRef = useRef(handleDismiss);
  handleDismissRef.current = handleDismiss;

  useEffect(() => {
    if (isOpen) {
      const unlock = lockBodyScroll();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleDismissRef.current();
      };
      window.addEventListener('keydown', onKey);
      return () => {
        unlock();
        window.removeEventListener('keydown', onKey);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overscroll-contain">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          'relative z-50 w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-xl bg-slate-900 p-4 shadow-2xl ring-1 ring-slate-700/80 animate-in fade-in zoom-in-95 duration-200 overscroll-contain',
          className
        )}
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          {title && <h2 id="modal-title" className="text-base font-semibold text-white leading-snug">{title}</h2>}
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1 hover:bg-slate-800 text-slate-500 hover:text-white transition-colors cursor-pointer"
            aria-label="Fechar"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-white">{children}</div>
      </div>
    </div>,
    document.body
  );
};
