import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './../utils/cn';
import { useOverlayHistory } from '../hooks/useOverlayHistory';

interface SideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export function SideSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  width = 'md',
}: SideSheetProps) {
  const [render, setRender] = useState(isOpen);
  const [mounted, setMounted] = useState(false);

  const { handleDismiss } = useOverlayHistory({
    id: `sidesheet-${title.toLowerCase().replace(/\s+/g, '-')}`,
    isOpen,
    onClose,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!render || !mounted) return null;

  const widthClass = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[width];

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[9999] flex justify-end', !isOpen && 'pointer-events-none')}
      onAnimationEnd={handleAnimationEnd}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleDismiss}
      />

      {/* Sheet panel */}
      <div
        className={cn(
          'relative h-full max-h-screen w-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out sm:w-auto',
          widthClass,
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors shrink-0 cursor-pointer"
            aria-label="Fechar"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">{children}</div>
      </div>
    </div>,
    document.body
  );
}
