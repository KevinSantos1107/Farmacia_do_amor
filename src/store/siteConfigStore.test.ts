import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useSiteConfigStore,
  applyConfigUpdates,
  mapFirebaseError,
} from './siteConfigStore';
import { getDoc, updateDoc } from 'firebase/firestore';
import type { SiteConfig } from '../config/siteConfig.schema';
import { meuSiteConfig } from '../config/sites/meu-site';

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => { storage.set(key, String(val)); }),
  removeItem: vi.fn((key: string) => { storage.delete(key); }),
  clear: vi.fn(() => { storage.clear(); }),
};
vi.stubGlobal('localStorage', localStorageMock);

if (typeof document === 'undefined') {
  vi.stubGlobal('document', {
    documentElement: {
      style: {
        setProperty: vi.fn(),
      },
    },
  });
}

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn((_db, _coll, id) => ({ id })),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
  };
});

describe('siteConfigStore - configSource e Proteção de Gravação', () => {
  const mockServerConfig: SiteConfig = {
    id: 'meu-site',
    couple: {
      partner1: { name: 'Kevin Real', playerId: 'kevin', gender: 'M' },
      partner2: { name: 'Iara Real', playerId: 'iara', gender: 'F' },
    },
    relationship: {
      startDate: '2021-06-12',
    },
    theme: {
      colors: {
        bg: '#05050A',
        primary: '#9d4edd',
        secondary: '#e0aaff',
        accent: '#c77dff',
        text: '#ffffff',
        textSecondary: '#aaaaaa',
        cardBg: '#111122',
        cardBorder: '#222244',
      },
    },
    features: {
      enableTimeline: true,
      enableGames: true,
      enableMusic: true,
      enableAlbum: true,
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useSiteConfigStore.setState({
      config: null,
      configSource: null,
      isLoading: true,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Caso 1 (server): define configSource: server e permite salvar via updateConfig', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => mockServerConfig,
    } as unknown as ReturnType<typeof getDoc> extends Promise<infer U> ? U : never);

    const store = useSiteConfigStore.getState();
    await store.loadConfig('meu-site');

    const state = useSiteConfigStore.getState();
    expect(state.configSource).toBe('server');
    expect(state.config?.couple.partner1.name).toBe('Kevin Real');
    expect(state.isLoading).toBe(false);

    // Permite updateConfig normalmente gravando no Firestore
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined as unknown as void);
    await expect(
      state.updateConfig('meu-site', { 'couple.partner1.name': 'Kevin Atualizado' })
    ).resolves.not.toThrow();

    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(useSiteConfigStore.getState().config?.couple.partner1.name).toBe('Kevin Atualizado');
  });

  it('Caso 2 (cache): define configSource: cache e BLOQUEIA gravação lançando erro claro', async () => {
    const cachedConfig: SiteConfig = {
      ...mockServerConfig,
      couple: {
        ...mockServerConfig.couple,
        partner1: { ...mockServerConfig.couple.partner1, name: 'Kevin do Cache' },
      },
    };
    localStorage.setItem('re_config_cache', JSON.stringify(cachedConfig));

    let delayedResolve: (val: unknown) => void;
    const delayedPromise = new Promise((resolve) => {
      delayedResolve = resolve;
    });
    vi.mocked(getDoc).mockReturnValueOnce(delayedPromise as unknown as ReturnType<typeof getDoc>);

    const store = useSiteConfigStore.getState();
    const loadPromise = store.loadConfig('meu-site');

    // Ao ler o cache imediatamente, configSource é 'cache'
    expect(useSiteConfigStore.getState().configSource).toBe('cache');
    expect(useSiteConfigStore.getState().config?.couple.partner1.name).toBe('Kevin do Cache');

    // Avança o timeout de 8s
    vi.advanceTimersByTime(8000);

    const stateAfterTimeout = useSiteConfigStore.getState();
    expect(stateAfterTimeout.configSource).toBe('cache');
    expect(stateAfterTimeout.isLoading).toBe(false);

    // Tentativa de updateConfig enquanto configSource === 'cache' DEVE falhar
    await expect(
      stateAfterTimeout.updateConfig('meu-site', { 'couple.partner1.name': 'Tentativa' })
    ).rejects.toThrow('Aguarde a configuração carregar do servidor antes de salvar');

    // updateDoc NÃO pode ser chamado no Firestore real
    expect(updateDoc).not.toHaveBeenCalled();

    delayedResolve!({ exists: () => true, data: () => mockServerConfig });
    await loadPromise;
  });

  it('Caso 3 (mock): com VITE_USE_MOCK_DATA=true, define configSource: mock e não grava no Firestore', async () => {
    const originalEnv = import.meta.env.VITE_USE_MOCK_DATA;
    try {
      import.meta.env.VITE_USE_MOCK_DATA = 'true';

      const store = useSiteConfigStore.getState();
      await store.loadConfig('meu-site');

      const state = useSiteConfigStore.getState();
      expect(state.configSource).toBe('mock');
      expect(state.config).toEqual(meuSiteConfig);
      expect(state.isLoading).toBe(false);
      expect(getDoc).not.toHaveBeenCalled();

      // updateConfig no modo mock atualiza o store sem chamar Firestore
      await expect(
        state.updateConfig('meu-site', { 'couple.partner1.name': 'Kevin Mock Alterado' })
      ).resolves.not.toThrow();

      expect(updateDoc).not.toHaveBeenCalled();
      expect(useSiteConfigStore.getState().config?.couple.partner1.name).toBe('Kevin Mock Alterado');
    } finally {
      import.meta.env.VITE_USE_MOCK_DATA = originalEnv;
    }
  });
});

describe('applyConfigUpdates - Merge profundo e suporte a Dot Notation', () => {
  const base: SiteConfig = {
    id: 'meu-site',
    couple: {
      partner1: {
        name: 'Kevin',
        playerId: 'kevin',
        gender: 'M',
        photoUrl: 'https://cloudinary.com/photo.webp',
        _photoPublicId: 'avatars/p1',
      },
      partner2: {
        name: 'Iara',
        playerId: 'iara',
        gender: 'F',
      },
    },
    relationship: {
      startDate: '2021-06-12',
    },
    theme: {
      colors: {
        bg: '#05050A',
        primary: '#9d4edd',
        secondary: '#e0aaff',
        accent: '#c77dff',
        text: '#ffffff',
        textSecondary: '#aaaaaa',
        cardBg: '#111122',
        cardBorder: '#222244',
      },
    },
    features: {
      enableTimeline: true,
      enableGames: true,
      enableMusic: true,
      enableAlbum: true,
    },
  };

  it('atualiza campo aninhado com dot-notation preservando outros campos não alterados', () => {
    const updated = applyConfigUpdates(base, {
      'couple.partner1.name': 'Kevin Santos',
    });

    expect(updated.couple.partner1.name).toBe('Kevin Santos');
    // photoUrl e _photoPublicId continuam intactos
    expect(updated.couple.partner1.photoUrl).toBe('https://cloudinary.com/photo.webp');
    expect(updated.couple.partner1._photoPublicId).toBe('avatars/p1');
    expect(updated.couple.partner2.name).toBe('Iara');
  });

  it('atualiza múltiplos campos com dot-notation simultaneamente', () => {
    const updated = applyConfigUpdates(base, {
      'couple.partner1.name': 'Kevin Novo',
      'couple.partner2.name': 'Iara Nova',
      'relationship.startDate': '2022-01-01',
      'features.enableGames': false,
    });

    expect(updated.couple.partner1.name).toBe('Kevin Novo');
    expect(updated.couple.partner2.name).toBe('Iara Nova');
    expect(updated.relationship.startDate).toBe('2022-01-01');
    expect(updated.features.enableGames).toBe(false);
    expect(updated.features.enableTimeline).toBe(true);
  });
});

describe('mapFirebaseError - Tradução amigável de erros do Firestore', () => {
  it('mapeia permission-denied', () => {
    const err = { code: 'permission-denied', message: 'Missing permissions' };
    expect(mapFirebaseError(err)).toContain('Permissão negada (permission-denied)');
  });

  it('mapeia unavailable', () => {
    const err = { code: 'unavailable', message: 'Network offline' };
    expect(mapFirebaseError(err)).toContain('Serviço temporariamente indisponível (unavailable)');
  });

  it('mapeia unauthenticated', () => {
    const err = { code: 'unauthenticated', message: 'Token expired' };
    expect(mapFirebaseError(err)).toContain('Sessão não autenticada (unauthenticated)');
  });

  it('retorna mensagem padrão se o erro não tiver código conhecido', () => {
    const err = new Error('Falha customizada');
    expect(mapFirebaseError(err)).toBe('Falha customizada');
  });
});
