import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { X } from 'lucide-react';
import { lockBodyScroll } from '../utils/scrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal = ({ isOpen, onClose, title, children, className }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      const unlock = lockBodyScroll();
      return () => {
        unlock();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-50 w-full max-w-sm rounded-xl bg-slate-900 p-4 shadow-2xl ring-1 ring-slate-700/80 animate-in fade-in zoom-in-95 duration-200',
          className
        )}
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          {title && <h2 className="text-base font-semibold text-white leading-snug">{title}</h2>}
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1 hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
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
