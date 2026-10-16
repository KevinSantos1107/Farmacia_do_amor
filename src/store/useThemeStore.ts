import { create } from 'zustand';

interface ThemeState {
  activeTheme: 'meteors' | 'hearts' | 'aurora' | 'snow';
  toggleTheme: () => void;
  setTheme: (theme: 'meteors' | 'hearts' | 'aurora' | 'snow') => void;
}

const THEMES = {
  meteors: {
    primary: '#9d4edd',
    primaryRgb: '157, 78, 221',
    secondary: '#e0aaff',
    secondaryRgb: '224, 170, 255',
    accent: '#c77dff',
    accentRgb: '199, 125, 255',
  },
  hearts: {
    primary: '#ff0055',
    primaryRgb: '255, 0, 85',
    secondary: '#ff4d94',
    secondaryRgb: '255, 77, 148',
    accent: '#ff2a7a',
    accentRgb: '255, 42, 122',
  },
  aurora: {
    primary: '#00ffc8',
    primaryRgb: '0, 255, 200',
    secondary: '#a855f7',
    secondaryRgb: '168, 85, 247',
    accent: '#22d3ee',
    accentRgb: '34, 211, 238',
  },
  snow: {
    primary: '#00f0ff',
    primaryRgb: '0, 240, 255',
    secondary: '#ffffff',
    secondaryRgb: '255, 255, 255',
    accent: '#4a90e2',
    accentRgb: '74, 144, 226',
  },
} as const;

const THEME_ORDER: Array<keyof typeof THEMES> = ['meteors', 'hearts', 'aurora', 'snow'];
const ACTIVE_THEME_KEY = 're_active_theme';

function applyTheme(name: keyof typeof THEMES) {
  const t = THEMES[name];
  const root = document.documentElement;
  root.style.setProperty('--theme-primary',       t.primary);
  root.style.setProperty('--theme-primary-rgb',   t.primaryRgb);
  root.style.setProperty('--theme-secondary',     t.secondary);
  root.style.setProperty('--theme-secondary-rgb', t.secondaryRgb);
  root.style.setProperty('--theme-accent',        t.accent);
  root.style.setProperty('--theme-accent-rgb',    t.accentRgb);
  // Persiste para restaurar no próximo carregamento
  try { localStorage.setItem(ACTIVE_THEME_KEY, name); } catch {}
}

// Restaura o tema IMEDIATAMENTE ao carregar o módulo (elimina flash)
function restoreTheme(): keyof typeof THEMES {
  try {
    const saved = localStorage.getItem(ACTIVE_THEME_KEY) as keyof typeof THEMES | null;
    if (saved && THEMES[saved]) {
      applyTheme(saved);
      return saved;
    }
  } catch {}
  
  // Se não tem tema salvo, aplica o meteors como padrão
  applyTheme('meteors');
  return 'meteors';
}

const initialTheme = restoreTheme();

export const useThemeStore = create<ThemeState>((set, get) => ({
  activeTheme: initialTheme,
  toggleTheme: () => {
    const current = get().activeTheme;
    const idx = THEME_ORDER.indexOf(current);
    const nextTheme = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    applyTheme(nextTheme);
    set({ activeTheme: nextTheme });
  },
  setTheme: (theme) => {
    applyTheme(theme);
    set({ activeTheme: theme });
  },
}));
