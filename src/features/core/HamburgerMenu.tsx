import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Home, Clock, Palette, PlayCircle, ChevronDown,
  Heart, Timer, Music, Images, Stars, Gamepad2,
  Rocket, Snowflake, Waves, Mail, Worm, MessageCircleHeart, SpellCheck2, Layers, BookOpen
} from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { useThemeStore } from '../../store/useThemeStore';
import { useModalsStore, type ModalType } from '../../store/useModalsStore';
import { lockBodyScroll } from '../../shared/utils/scrollLock';
import { useOverlayHistory } from '../../shared/hooks/useOverlayHistory';
import { removeNavigationLayer } from '../../shared/utils/navigationStack';

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
  route: string;
  Icon: React.ElementType;
}[] = [
  { modal: 'word-game',    label: 'Jogo de Palavras', route: '/word-game',   Icon: Gamepad2 },
  { modal: 'snake',        label: 'Cobrinha',         route: '/snake',       Icon: Worm },
  { modal: 'star-map',     label: 'Mapa das Estrelas', route: '/star-map',   Icon: Stars },
  { modal: 'couple-quiz',  label: 'Quiz do Casal',    route: '/quiz',        Icon: MessageCircleHeart },
  { modal: 'memory-game',  label: 'Jogo da Memória',  route: '/memory-game', Icon: Layers },
  { modal: 'sync',         label: 'Sincronia',        route: '/sync',        Icon: Heart },
];

const MENU_STORAGE_KEYS = {
  nav: 're_menu_nav_open',
  inter: 're_menu_inter_open',
  theme: 're_menu_theme_open',
};

function getInitialMenuSectionState(key: string, defaultValue: boolean): boolean {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {}
  return defaultValue;
}

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(() => getInitialMenuSectionState(MENU_STORAGE_KEYS.nav, true));
  const [isInterOpen, setIsInterOpen] = useState(() => getInitialMenuSectionState(MENU_STORAGE_KEYS.inter, false));
  const [isThemeOpen, setIsThemeOpen] = useState(() => getInitialMenuSectionState(MENU_STORAGE_KEYS.theme, false));
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { activeTheme, setTheme } = useThemeStore();
  const { openModal } = useModalsStore();

  useOverlayHistory({
    id: 'hamburger-menu',
    isOpen,
    onClose: () => setIsOpen(false),
  });

  const handleOpenModal = (modal: ModalType, route?: string) => {
    removeNavigationLayer('hamburger-menu', true);
    setIsOpen(false);
    if (route) {
      navigate(route);
    } else if (modal) {
      openModal(modal);
    }
  };

  const handleScrollTo = (sectionId: string) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => scrollToSection(sectionId), 350);
    } else {
      setTimeout(() => scrollToSection(sectionId), 120);
    }
  };

  // Fecha ao clicar fora ou pressionar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toggleBtnRef.current && toggleBtnRef.current.contains(event.target as Node)) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Bloqueia scroll do body e html quando aberto
  useEffect(() => {
    if (isOpen) {
      const unlock = lockBodyScroll();
      return () => {
        unlock();
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Botão hambúrguer */}
      <div
        ref={toggleBtnRef}
        className="fixed z-50"
        style={{
          top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
          left: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        }}
      >
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
        onClick={() => setIsOpen(false)}
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
          'bg-[#080611]/95 backdrop-blur-2xl border-r border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]',
          'transition-transform duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
          {/* Header do painel */}
          <div
            className="flex items-center justify-between px-5 pb-4 border-b border-white/10"
            style={{
              paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 flex items-center justify-center text-[var(--theme-secondary)]">
                <Heart className="w-3.5 h-3.5 fill-[var(--theme-secondary)]" />
              </div>
              <h2
                className="text-base font-serif font-bold text-white tracking-wide"
                style={{ textShadow: '0 0 12px var(--theme-primary)' }}
              >
                Nosso Espaço
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Fechar menu"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1.5 p-4 flex-1">

            {/* ── NAVEGAÇÃO ─────────────────────────────────── */}
            <div className="mb-0.5">
              <button
                onClick={() => {
                  const next = !isNavOpen;
                  setIsNavOpen(next);
                  try { localStorage.setItem(MENU_STORAGE_KEYS.nav, String(next)); } catch {}
                }}
                className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-white/45 hover:text-white/80 hover:bg-white/5 transition-colors text-[11px] font-bold uppercase tracking-[0.15em] cursor-pointer"
              >
                <span>Navegação</span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300', isNavOpen && 'rotate-180')} />
              </button>

              <div className={cn(
                'overflow-hidden transition-all duration-300',
                isNavOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
              )}>
                <div className="flex flex-col gap-1 mt-1">
                  {NAV_SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => handleScrollTo(sec.id)}
                      className="group flex items-center gap-3 px-2.5 py-2 rounded-xl text-white/70 hover:bg-white/[0.06] hover:text-white active:scale-[0.98] transition-all text-sm w-full text-left cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-white/[0.08] transition-all shrink-0">
                        <sec.Icon className="w-3.5 h-3.5" style={{ shapeRendering: 'geometricPrecision' }} />
                      </div>
                      <span className="font-normal text-white/80 group-hover:text-white transition-colors">{sec.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/8 my-0.5" />

            {/* ── INTERATIVOS ───────────────────────────────── */}
            <div className="mb-0.5">
              <button
                onClick={() => {
                  const next = !isInterOpen;
                  setIsInterOpen(next);
                  try { localStorage.setItem(MENU_STORAGE_KEYS.inter, String(next)); } catch {}
                }}
                className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-white/45 hover:text-white/80 hover:bg-white/5 transition-colors text-[11px] font-bold uppercase tracking-[0.15em] cursor-pointer"
              >
                <span>Interativos</span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300', isInterOpen && 'rotate-180')} />
              </button>

              <div className={cn(
                'overflow-hidden transition-all duration-300',
                isInterOpen ? 'max-h-[350px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
              )}>
                <div className="flex flex-col gap-1 mt-1">
                  {INTERACTIVE_ITEMS.map((item) => (
                    <button
                      key={item.modal}
                      onClick={() => handleOpenModal(item.modal, item.route)}
                      className="group flex items-center gap-3 px-2.5 py-2 rounded-xl text-white/80 hover:bg-white/[0.06] hover:text-white active:scale-[0.98] transition-all text-sm w-full text-left cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 group-hover:text-[var(--theme-secondary)] group-hover:bg-[var(--theme-primary)]/15 group-hover:border-[var(--theme-primary)]/30 group-hover:scale-105 transition-all shrink-0">
                        <item.Icon className="w-3.5 h-3.5" style={{ shapeRendering: 'geometricPrecision' }} />
                      </div>
                      <span className="font-medium text-white/85 group-hover:text-white transition-colors">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/8 my-0.5" />

            {/* ── TEMAS ─────────────────────────────────────── */}
            <div className="mb-0.5">
              <button
                onClick={() => {
                  const next = !isThemeOpen;
                  setIsThemeOpen(next);
                  try { localStorage.setItem(MENU_STORAGE_KEYS.theme, String(next)); } catch {}
                }}
                className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-white/45 hover:text-white/80 hover:bg-white/5 transition-colors text-[11px] font-bold uppercase tracking-[0.15em] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Temas</span>
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300', isThemeOpen && 'rotate-180')} />
              </button>

              <div className={cn(
                'overflow-hidden transition-all duration-300',
                isThemeOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
              )}>
                <div className="grid grid-cols-4 gap-2.5 mt-2.5 px-2 pb-2">
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
                          'flex items-center justify-center w-11 h-11 mx-auto rounded-xl border transition-all duration-300 cursor-pointer',
                          'bg-gradient-to-br',
                          theme.bg,
                          theme.border,
                          isActive
                            ? 'ring-2 ring-[var(--theme-primary)] scale-105 shadow-lg'
                            : 'opacity-40 hover:opacity-100 hover:scale-105'
                        )}
                        style={isActive ? { boxShadow: `0 0 16px ${theme.color}60` } : {}}
                      >
                        <theme.Icon className="w-5 h-5" style={{ color: isActive ? '#fff' : theme.color, shapeRendering: 'geometricPrecision' }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/8 my-0.5" />

            {/* ── DEVOCIONAL DO CASAL ───────────────────────── */}
            <button
              onClick={() => handleOpenModal('devotional', '/devotional')}
              className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-white/80 hover:bg-[#D4AF37]/15 hover:text-[#D4AF37] active:scale-[0.98] transition-all text-sm w-full font-medium group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <span className="block text-sm font-medium text-white/90 group-hover:text-[#D4AF37] transition-colors leading-tight">
                  Devocional do Casal
                </span>
                <span className="block text-[11px] text-[#D4AF37]/70 font-light truncate mt-0.5">
                  Palavra e oração a dois
                </span>
              </div>
            </button>

            <div className="h-px bg-white/8 my-0.5" />

            {/* ── RETROSPECTIVA ─────────────────────────────── */}
            <button
              onClick={() => handleOpenModal(null, '/retrospective')}
              className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-white/70 hover:bg-white/[0.06] hover:text-white active:scale-[0.98] transition-all text-sm w-full group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 group-hover:scale-105 group-hover:bg-purple-500/20 transition-all shrink-0">
                <PlayCircle className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-white/85 group-hover:text-white transition-colors">Retrospectiva</span>
            </button>

          </nav>
        </div>
      </div>
    </>
  );
}
