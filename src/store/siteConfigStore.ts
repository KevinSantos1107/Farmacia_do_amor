import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import type { SiteConfig } from '../config/siteConfig.schema';
import { meuSiteConfig } from '../config/sites/meu-site';

interface SiteConfigState {
  config: SiteConfig | null;
  isLoading: boolean;
  error: string | null;
  loadConfig: (siteId: string) => Promise<void>;
  updateConfig: (siteId: string, updates: Partial<SiteConfig>) => Promise<void>;
}

const THEME_CACHE_KEY = 're_theme_cache';


// Aplica apenas variáveis estruturais de UI — NÃO toca em primary/secondary/accent
// As cores do tema são responsabilidade exclusiva do useThemeStore
function applyThemeVars(colors: SiteConfig['theme']['colors']) {
  const root = document.documentElement;
  root.style.setProperty('--theme-bg',             colors.bg            || '#0d0d14');
  root.style.setProperty('--theme-text',           colors.text          || '#f1f0fb');
  root.style.setProperty('--theme-text-secondary', colors.textSecondary || '#a9a9c8');
  root.style.setProperty('--theme-card-bg',        colors.cardBg        || '#1a1a2e');
  root.style.setProperty('--theme-card-border',    colors.cardBorder    || '#2d2d4a');
}

// Restaura apenas as vars estruturais do cache — as cores do tema vêm do useThemeStore
try {
  const cached = localStorage.getItem(THEME_CACHE_KEY);
  if (cached) applyThemeVars(JSON.parse(cached) as SiteConfig['theme']['colors']);
} catch (e) {}

export const useSiteConfigStore = create<SiteConfigState>((set, get) => ({
  // ── Inicializa com config local IMEDIATAMENTE ──────────────────────────────
  // Garante isReady = true desde o início, evitando tela preta em abas anônimas
  // (sem cache IndexedDB). O Firestore ainda atualiza em background se disponível.
  config: meuSiteConfig,
  isLoading: false,
  error: null,

  loadConfig: async (siteId: string) => {
    // Atualiza em background sem bloquear a UI
    try {
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        applyThemeVars(meuSiteConfig.theme.colors);
        return;
      }
      const docRef = doc(db, 'sites', siteId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as SiteConfig;
        if (data.theme?.colors) applyThemeVars(data.theme.colors);
        set({ config: data });
      } else {
        // Firestore sem doc → config local já está ativa, só aplica cores
        applyThemeVars(meuSiteConfig.theme.colors);
      }
    } catch (err: any) {
      // Erro de rede: config local continua ativa, site funciona normalmente
      console.warn('siteConfigStore: Firestore indisponível, usando config local.', err.message);
    }
  },

  updateConfig: async (siteId: string, updates: Partial<SiteConfig>) => {
    const { config } = get();
    if (!config) return;
    if (import.meta.env.VITE_USE_MOCK_DATA !== 'true') {
      try {
        const { updateDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'sites', siteId);
        await updateDoc(docRef, updates as Record<string, unknown>);
      } catch (err: any) {
        console.error('Erro ao atualizar Firestore:', err);
        throw new Error('Falha ao salvar as configuracoes.');
      }
    }
    const newConfig = { ...config, ...updates };
    if (updates.theme?.colors) applyThemeVars(updates.theme.colors);
    set({ config: newConfig });
  },
}));
