import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import type { SiteConfig } from '../config/siteConfig.schema';
import { meuSiteConfig } from '../config/sites/meu-site';
import { applySiteMetadata, getCoupleDisplayName } from '../shared/utils/siteMetadata';

export type ConfigSource = 'server' | 'cache' | 'mock' | null;

interface SiteConfigState {
  config: SiteConfig | null;
  configSource: ConfigSource;
  isLoading: boolean;
  error: string | null;
  loadConfig: (siteId: string) => Promise<void>;
  updateConfig: (siteId: string, updates: Record<string, unknown> | Partial<SiteConfig>) => Promise<void>;
}

const THEME_CACHE_KEY = 're_theme_cache';
const CONFIG_CACHE_KEY = 're_config_cache';
const LOAD_TIMEOUT_MS = 8000;

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

function saveConfigCache(config: SiteConfig) {
  try {
    localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
    if (config.theme?.colors) {
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(config.theme.colors));
    }
  } catch { /* ignora erros de quota */ }
}

function loadConfigCache(): SiteConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SiteConfig;
  } catch {
    return null;
  }
}

/**
 * Mapeia erros do Firebase para mensagens amigáveis em português
 */
export function mapFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  const rawMsg = err instanceof Error ? err.message : String(err);

  if (code) {
    switch (code) {
      case 'permission-denied':
        return 'Permissão negada (permission-denied). Verifique se você está autenticado como administrador.';
      case 'unavailable':
        return 'Serviço temporariamente indisponível (unavailable). Verifique sua conexão com a internet.';
      case 'deadline-exceeded':
        return 'Tempo limite de conexão esgotado (deadline-exceeded). Tente novamente.';
      case 'unauthenticated':
        return 'Sessão não autenticada (unauthenticated). Faça login novamente.';
      case 'not-found':
        return 'Documento de configuração não encontrado no servidor (not-found).';
      default:
        return `Erro no Firebase (${code}): ${rawMsg}`;
    }
  }

  return rawMsg || 'Falha ao salvar as configurações.';
}

/**
 * Aplica atualizações parciais ou com dot-notation (ex.: 'couple.partner1.name')
 * sobre um objeto SiteConfig com merge profundo seguro.
 */
export function applyConfigUpdates(
  base: SiteConfig,
  updates: Record<string, unknown> | Partial<SiteConfig>
): SiteConfig {
  const result = JSON.parse(JSON.stringify(base)) as SiteConfig;

  for (const [key, value] of Object.entries(updates)) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let current: Record<string, unknown> = result as unknown as Record<string, unknown>;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || typeof current[part] !== 'object' || current[part] === null) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
      current[parts[parts.length - 1]] = value;
    } else {
      const resRec = result as unknown as Record<string, unknown>;
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof resRec[key] === 'object' &&
        resRec[key] !== null
      ) {
        resRec[key] = {
          ...(resRec[key] as Record<string, unknown>),
          ...(value as Record<string, unknown>),
        };
      } else {
        resRec[key] = value;
      }
    }
  }

  return result;
}

// Restaura vars estruturais e metadados do cache imediatamente para evitar flash
try {
  const cachedTheme = localStorage.getItem(THEME_CACHE_KEY);
  if (cachedTheme) applyThemeVars(JSON.parse(cachedTheme) as SiteConfig['theme']['colors']);

  const cachedConfig = loadConfigCache();
  if (cachedConfig?.couple) {
    applySiteMetadata(getCoupleDisplayName(cachedConfig.couple), cachedConfig.id);
  }
} catch {}

let currentLoadId = 0;

export const useSiteConfigStore = create<SiteConfigState>((set, get) => ({
  // Inicia sem config e com isLoading=true para que nenhum dado de 'meu-site'
  // vaze para outros sites antes do Firestore responder.
  config: null,
  configSource: null,
  isLoading: true,
  error: null,

  loadConfig: async (siteId: string) => {
    const loadId = ++currentLoadId;

    // Modo mock explícito: ativado APENAS por VITE_USE_MOCK_DATA === 'true'
    if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      applyThemeVars(meuSiteConfig.theme.colors);
      if (meuSiteConfig.couple) applySiteMetadata(getCoupleDisplayName(meuSiteConfig.couple), meuSiteConfig.id);
      saveConfigCache(meuSiteConfig);
      set({ config: meuSiteConfig, configSource: 'mock', isLoading: false, error: null });
      return;
    }

    // Aplica cache da sessão anterior para evitar flash enquanto Firestore responde
    const cached = loadConfigCache();
    if (cached) {
      if (cached.theme?.colors) applyThemeVars(cached.theme.colors);
      if (cached.couple) applySiteMetadata(getCoupleDisplayName(cached.couple), cached.id);
      // Mantém isLoading=true: o Firestore ainda vai confirmar/atualizar
      set({ config: cached, configSource: 'cache' });
    }

    // Timeout de segurança para nunca ficar em splash infinito
    const timeoutId = setTimeout(() => {
      if (loadId !== currentLoadId) return;
      const { config } = get();
      if (!config) {
        // Sem cache e sem Firestore → mostrar erro
        set({
          isLoading: false,
          error: 'Tempo esgotado ao carregar configurações. Verifique sua conexão.',
        });
      } else {
        // Tem cache → usa e segue; Firestore demorou mas o site funciona
        set({ isLoading: false });
      }
    }, LOAD_TIMEOUT_MS);

    try {
      const docRef = doc(db, 'sites', siteId);
      const docSnap = await getDoc(docRef);

      if (loadId !== currentLoadId) {
        clearTimeout(timeoutId);
        return;
      }
      clearTimeout(timeoutId);

      if (docSnap.exists()) {
        const data = docSnap.data() as SiteConfig;
        if (data.theme?.colors) applyThemeVars(data.theme.colors);
        if (data.couple) applySiteMetadata(getCoupleDisplayName(data.couple), data.id);
        saveConfigCache(data);
        set({ config: data, configSource: 'server', isLoading: false, error: null });
      } else {
        // Documento não existe: usa cache se disponível, senão erro
        if (cached) {
          set({ isLoading: false, error: null, configSource: 'cache' });
        } else {
          set({
            isLoading: false,
            error: 'Configuração do site não encontrada no servidor.',
          });
        }
      }
    } catch (err: unknown) {
      if (loadId !== currentLoadId) {
        clearTimeout(timeoutId);
        return;
      }
      clearTimeout(timeoutId);

      const msg = err instanceof Error ? err.message : String(err);
      if (cached) {
        // Falha de rede mas tem cache: usa o cache em silêncio
        console.warn('siteConfigStore: Firestore indisponível, usando cache local.', msg);
        set({ isLoading: false, error: null, configSource: 'cache' });
      } else {
        // Sem cache e sem Firestore: mostra erro
        set({
          isLoading: false,
          error: 'Erro ao carregar configurações: ' + msg,
        });
      }
    }
  },

  updateConfig: async (siteId: string, updates: Record<string, unknown> | Partial<SiteConfig>) => {
    const { config, configSource } = get();
    if (!config) return;

    const isMock = import.meta.env.VITE_USE_MOCK_DATA === 'true' || configSource === 'mock';
    if (configSource !== 'server' && !isMock) {
      throw new Error('Aguarde a configuração carregar do servidor antes de salvar');
    }

    if (!isMock) {
      try {
        const { updateDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'sites', siteId);
        await updateDoc(docRef, updates as Record<string, unknown>);
      } catch (err: unknown) {
        console.error('Erro ao atualizar Firestore:', err);
        const msg = mapFirebaseError(err);
        throw new Error(msg);
      }
    }

    const newConfig = applyConfigUpdates(config, updates);
    if (newConfig.theme?.colors) applyThemeVars(newConfig.theme.colors);
    if (newConfig.couple) applySiteMetadata(getCoupleDisplayName(newConfig.couple), newConfig.id);
    saveConfigCache(newConfig);
    set({ config: newConfig });
  },
}));
