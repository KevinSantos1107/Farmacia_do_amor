import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Search, Upload, X } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface AddTrackDropdownProps {
  onOpenSearch: () => void;
  onOpenUpload: () => void;
  className?: string;
}

export function AddTrackDropdown({
  onOpenSearch,
  onOpenUpload,
  className,
}: AddTrackDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha com Escape ou clique fora
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectSearch = () => {
    setIsOpen(false);
    onOpenSearch();
  };

  const handleSelectUpload = () => {
    setIsOpen(false);
    onOpenUpload();
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block w-full sm:w-auto', className)}>
      {/* Botão Principal Unificado */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={cn(
          'group relative inline-flex items-center justify-center sm:justify-start gap-2.5 w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-lg transition-all duration-200 select-none cursor-pointer',
          'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:via-pink-600 hover:to-rose-700',
          'shadow-rose-500/25 hover:shadow-rose-500/40 active:scale-[0.98]',
          'border border-rose-400/30 hover:border-rose-300/50',
          'focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:ring-offset-2 focus:ring-offset-slate-900',
          isOpen && 'ring-2 ring-rose-400/50 shadow-rose-500/40 from-rose-600 to-pink-700'
        )}
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-white/20 group-hover:bg-white/30 transition-colors">
          <Plus
            className={cn(
              'w-3.5 h-3.5 text-white transition-transform duration-300',
              isOpen && 'rotate-45'
            )}
          />
        </span>
        <span className="tracking-tight">Adicionar Música</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-rose-200/90 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. MODO MOBILE: Bottom Sheet Action Menu (100% responsivo)         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="sm:hidden">
          {/* Backdrop escuro com blur */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Action Sheet deslizante a partir da base */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Adicionar Música"
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 p-4 pb-8',
              'bg-slate-900 border-t border-slate-700/80 rounded-t-3xl shadow-2xl shadow-black',
              'animate-in slide-in-from-bottom duration-250 ease-out'
            )}
          >
            {/* Puxador decorativo */}
            <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mb-4" />

            {/* Cabeçalho do Sheet */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div>
                <h3 className="text-base font-bold text-white">Adicionar Música</h3>
                <p className="text-xs text-slate-400">Escolha como deseja adicionar à playlist</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Opções de Ação no Mobile */}
            <div className="space-y-2.5">
              {/* Opção 1: Pesquisar Música Online */}
              <button
                type="button"
                onClick={handleSelectSearch}
                className={cn(
                  'w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all',
                  'bg-slate-800/70 border border-slate-700/60 active:bg-slate-800 hover:border-rose-500/40'
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Search className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block">
                    Pesquisar Música Online
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                    Encontre qualquer música por nome, artista ou cole o link
                  </p>
                </div>
              </button>

              {/* Opção 2: Upload de Arquivo MP3 */}
              <button
                type="button"
                onClick={handleSelectUpload}
                className={cn(
                  'w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all',
                  'bg-slate-800/70 border border-slate-700/60 active:bg-slate-800 hover:border-indigo-500/40'
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block">
                    Fazer Upload de Arquivo
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                    Envie arquivos de áudio salvos no seu aparelho
                  </p>
                </div>
              </button>
            </div>

            {/* Botão Cancelar */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full mt-4 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors text-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. MODO TABLET E DESKTOP: Dropdown Popover Flutuante               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          role="menu"
          className={cn(
            'hidden sm:block absolute left-0 sm:left-auto sm:right-0 top-full mt-2.5 z-50',
            'w-84 p-2 rounded-2xl',
            'bg-slate-900/95 backdrop-blur-2xl',
            'border border-slate-700/70 shadow-2xl shadow-black/90',
            'ring-1 ring-white/10 divide-y divide-slate-800/80',
            'animate-in fade-in zoom-in-95 duration-150 sm:origin-top-right'
          )}
        >
          <div className="space-y-1 pb-1.5">
            {/* Opção 1: Pesquisar Música Online */}
            <button
              type="button"
              role="menuitem"
              onClick={handleSelectSearch}
              className={cn(
                'w-full group flex items-start gap-3.5 p-3 rounded-xl text-left transition-all cursor-pointer',
                'hover:bg-white/[0.07] active:bg-white/[0.1]',
                'focus:outline-none focus:bg-white/[0.07]'
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 group-hover:border-rose-400/50 group-hover:text-rose-300 transition-all shrink-0 shadow-sm shadow-rose-950/40">
                <Search className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-white group-hover:text-rose-200 transition-colors block">
                  Pesquisar Música Online
                </span>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5 leading-relaxed">
                  Encontre qualquer música por nome, artista ou cole o link
                </p>
              </div>
            </button>
          </div>

          <div className="pt-1.5">
            {/* Opção 2: Fazer Upload MP3 */}
            <button
              type="button"
              role="menuitem"
              onClick={handleSelectUpload}
              className={cn(
                'w-full group flex items-start gap-3.5 p-3 rounded-xl text-left transition-all cursor-pointer',
                'hover:bg-white/[0.07] active:bg-white/[0.1]',
                'focus:outline-none focus:bg-white/[0.07]'
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 group-hover:border-indigo-400/50 group-hover:text-indigo-300 transition-all shrink-0 shadow-sm shadow-indigo-950/40">
                <Upload className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors block">
                  Fazer Upload de Arquivo
                </span>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5 leading-relaxed">
                  Envie arquivos de áudio salvos no seu aparelho
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
