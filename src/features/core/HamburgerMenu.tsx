import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Home, Clock, Palette, PlayCircle, ChevronDown,
  Heart, Timer, Music, Images, Stars, Gamepad2,
  Rocket, Snowflake, Waves, Mail, Worm, MessageCircleHeart, SpellCheck2, Layers
} from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { useThemeStore } from '../../store/useThemeStore';
import { useRetroV2Store } from '../../features/retrospective-v2/store/useRetroV2Store';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { useModalsStore, type ModalType } from '../../store/useModalsStore';
import { DEFAULT_SITE_ID } from '../../config/defaults';

// ─── Scroll helper ───────────────────────────────────────────────────────────
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ─── Theme definitions ───────────────────────────────────────────────────────
const THEME_OPTIONS = [
  {
    id: 'meteors' as const,
    label: 'Meteoros',
    Icon: Rocket,
    color: '#9d4edd',
    bg: 'from-purple-900/40 to-indigo-900/30',
    border: 'border-purple-500/40',
    dot: 'bg-purple-500',
  },
  {
    id: 'hearts' as const,
    label: 'Corações',
    Icon: Heart,
    color: '#ff0055',
    bg: 'from-rose-900/40 to-pink-900/30',
    border: 'border-rose-500/40',
    dot: 'bg-rose-500',
  },
  {
    id: 'aurora' as const,
    label: 'Aurora',
    Icon: Waves,
    color: '#00ffc8',
    bg: 'from-teal-900/40 to-cyan-900/30',
    border: 'border-teal-500/40',
    dot: 'bg-teal-400',
  },
  {
    id: 'snow' as const,
    label: 'Neve',
    Icon: Snowflake,
    color: '#00f0ff',
    bg: 'from-sky-900/40 to-blue-900/30',
    border: 'border-sky-400/40',
    dot: 'bg-sky-400',
  },
] as const;

// ─── Nav sections for "Navegação" ─────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'section-hero',      label: 'Início',         Icon: Home },
  { id: 'section-carta',     label: 'Carta',          Icon: Mail },
  { id: 'section-contador',  label: 'Contador',       Icon: Timer },
  { id: 'section-musica',    label: 'Música',         Icon: Music },
  { id: 'section-albuns',    label: 'Álbuns',         Icon: Images },
  { id: 'section-acrostico', label: 'Acróstico',      Icon: SpellCheck2 },
  { id: 'section-mensagens', label: 'Mensagens',      Icon: MessageCircleHeart },
  { id: 'section-historia',  label: 'Nossa História', Icon: Clock },
];

const INTERACTIVE_ITEMS: {
  label: string;
  modal: ModalType;
  Icon: React.ElementType;
}[] = [
  { modal: 'word-game',    label: 'Jogo de Palavras', Icon: Gamepad2 },
  { modal: 'snake',        label: 'Cobrinha',          Icon: Worm },
  { modal: 'star-map',     label: 'Mapa das Estrelas', Icon: Stars },
  { modal: 'couple-quiz',  label: 'Quiz do Casal',     Icon: MessageCircleHeart },
  { modal: 'memory-game',  label: 'Jogo da Memória',   Icon: Layers },
  { modal: 'sync',         label: 'Sincronia',         Icon: Heart },
];

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isInterOpen, setIsInterOpen] = useState(true);
  const [isThemeOpen, setIsThemeOpen] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { activeTheme, setTheme } = useThemeStore();
  const { openRetro } = useRetroV2Store();
  const { config } = useSiteConfigStore();
  const { openModal } = useModalsStore();

  const handleOpenModal = (modal: ModalType) => {
    openModal(modal);
    setIsOpen(false);
  };

  const handleScrollTo = (sectionId: string) => {
    setIsOpen(false);
    // Se não estiver na home, navega primeiro
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => scrollToSection(sectionId), 400);
    } else {
      scrollToSection(sectionId);
    }
  };

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Botão hambúrguer */}
      <div className="fixed top-3 left-3 sm:top-4 sm:left-4 md:top-5 md:left-5 lg:top-6 lg:left-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 sm:p-2 text-white/80 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
          aria-label="Menu"
        >
          {isOpen
            ? <X className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            : <Menu className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
          }
        </button>
      </div>

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Painel lateral */}
      <div
        ref={menuRef}
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-[290px] sm:w-[320px]',
          'bg-black/90 backdrop-blur-xl border-r border-white/10 shadow-2xl',
          'transition-transform duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
          {/* Header do painel */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
            <h2
              className="text-lg font-serif font-bold text-white"
              style={{ textShadow: '0 0 12px var(--theme-primary)' }}
            >
              Menu
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Fechar menu"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1 p-4 flex-1">

            {/* ── NAVEGAÇÃO ─────────────────────────────────── */}
            <div className="mb-1">
              <button
                onClick={() => setIsNavOpen(!isNavOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <span>Navegação</span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isNavOpen && 'rotate-180')} />
              </button>

              <div className={cn(
                'overflow-hidden transition-opacity duration-300',
                isNavOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
              )}>
                <div className="flex flex-col gap-0.5 mt-1">
                  {NAV_SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => handleScrollTo(sec.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/8 hover:text-white transition-colors text-sm w-full text-left"
                    >
                      <sec.Icon className="w-4 h-4 opacity-70" style={{ shapeRendering: 'geometricPrecision' }} />
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/8 my-1" />

            {/* ── INTERATIVOS ───────────────────────────────── */}
            <div className="mb-1">
              <button
                onClick={() => setIsInterOpen(!isInterOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <span>Interativos</span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isInterOpen && 'rotate-180')} />
              </button>

              <div className={cn(
                'overflow-hidden transition-opacity duration-300',
                isInterOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
              )}>
                <div className="flex flex-col gap-0.5 mt-1">
                  {INTERACTIVE_ITEMS.map((item) => (
                    <button
                      key={item.modal}
                      onClick={() => handleOpenModal(item.modal)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/8 hover:text-white transition-colors text-sm w-full text-left"
                    >
                      <item.Icon className="w-4 h-4 opacity-70" style={{ shapeRendering: 'geometricPrecision' }} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/8 my-1" />

            {/* ── TEMAS ─────────────────────────────────────── */}
            <div className="mb-1">
              <button
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Temas</span>
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isThemeOpen && 'rotate-180')} />
              </button>

              <div className={cn(
                'overflow-hidden transition-opacity duration-300',
                isThemeOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
              )}>
                <div className="grid grid-cols-4 gap-3 mt-3 px-3 pb-3">
                  {THEME_OPTIONS.map((theme) => {
                    const isActive = activeTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        title={theme.label}
                        onClick={() => {
                          setTheme(theme.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          'flex items-center justify-center w-11 h-11 mx-auto rounded-xl border transition-all duration-300',
                          'bg-gradient-to-br',
                          theme.bg,
                          theme.border,
                          isActive
                            ? 'ring-2 scale-110 shadow-lg'
                            : 'opacity-50 hover:opacity-100 hover:scale-105'
                        )}
                        style={isActive ? { boxShadow: `0 0 16px ${theme.color}50` } : {}}
                      >
                        <theme.Icon className="w-5 h-5" style={{ color: isActive ? '#fff' : theme.color, shapeRendering: 'geometricPrecision' }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/8 my-1" />

            {/* ── RETROSPECTIVA ─────────────────────────────── */}
            <button
              onClick={() => {
                openRetro(config?.id || DEFAULT_SITE_ID);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/8 hover:text-white transition-colors text-sm w-full"
            >
              <PlayCircle className="w-5 h-5" />
              Retrospectiva
            </button>

          </nav>
        </div>
      </div>
    </>
  );
}
