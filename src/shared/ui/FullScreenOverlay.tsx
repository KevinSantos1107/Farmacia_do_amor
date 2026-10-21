import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockBodyScroll } from '../utils/scrollLock';


interface FullScreenOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Trava o conteúdo na viewport (sem scroll do overlay) — use em telas que precisam caber inteiras. */
  fill?: boolean;
}

export function FullScreenOverlay({ isOpen, onClose, title, subtitle, children, icon, actions, fill }: FullScreenOverlayProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const unlock = lockBodyScroll();
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => {
        unlock();
        window.removeEventListener('keydown', onKey);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] h-[100dvh] max-h-[100dvh] bg-theme-bg flex flex-col overscroll-contain animate-in fade-in zoom-in-[0.98] duration-300">
      {/* Dynamic Background matching theme */}
      <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(circle_at_center,rgba(var(--theme-primary-rgb),0.15)_0%,transparent_70%)]" />

      {/* Header */}
      <div
        className={`relative z-10 flex items-center justify-between px-3 sm:px-4 md:px-6 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0 ${
          fill ? 'py-1.5 sm:py-2.5' : 'py-4'
        }`}
        style={{
          paddingTop: `max(${fill ? '0.4rem' : '1rem'}, env(safe-area-inset-top, 0px))`,
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
          {icon && (
            <div className="hidden md:flex items-center justify-center w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl bg-white/5 border border-white/10 text-theme-secondary shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.3)]">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h2 className={`font-serif font-bold text-white tracking-tight drop-shadow-md truncate ${fill ? 'text-base sm:text-xl md:text-2xl' : 'text-xl md:text-2xl'}`}>
              {title}
            </h2>
            {subtitle && (
              <p className={`text-white/60 truncate ${fill ? 'hidden sm:block text-[11px] md:text-sm mt-0.5' : 'text-xs md:text-sm mt-0.5'}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2">
          {actions}
          <button
            onClick={onClose}
            className={`flex items-center justify-center shrink-0 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all hover:scale-105 active:scale-95 ml-1 sm:ml-2 ${fill ? 'w-9 h-9' : 'w-10 h-10'}`}
            aria-label="Fechar"
          >
            <X className={fill ? 'w-5 h-5' : 'w-6 h-6'} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div
        ref={contentRef}
        className={
          fill
            ? 'relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col'
            : 'relative z-10 flex-1 overflow-y-auto no-scrollbar'
        }
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
