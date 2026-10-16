import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDataLayout,
  _setDataLayoutForTesting,
  getCurrentSiteId,
  isPlaceholderId,
  filterPlaceholders,
  siteCollection,
  siteDoc,
} from './paths';
import { DEFAULT_SITE_ID } from '../../config/defaults';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import type { SiteConfig } from '../../config/siteConfig.schema';

describe('Firestore Paths & Multi-tenant Layout', () => {
  beforeEach(() => {
    _setDataLayoutForTesting(null);
    useSiteConfigStore.setState({ config: null, isLoading: false });
  });

  afterEach(() => {
    _setDataLayoutForTesting(null);
    vi.unstubAllEnvs();
  });

  describe('getDataLayout', () => {
    it('retorna "legacy" por padrão quando VITE_DATA_LAYOUT não está definido', () => {
      expect(getDataLayout()).toBe('legacy');
    });

    it('retorna "site" quando VITE_DATA_LAYOUT=site', () => {
      vi.stubEnv('VITE_DATA_LAYOUT', 'site');
      expect(getDataLayout()).toBe('site');
    });

    it('permite sobrescrita explícita via _setDataLayoutForTesting', () => {
      _setDataLayoutForTesting('site');
      expect(getDataLayout()).toBe('site');

      _setDataLayoutForTesting('legacy');
      expect(getDataLayout()).toBe('legacy');
    });
  });

  describe('getCurrentSiteId', () => {
    it('retorna DEFAULT_SITE_ID ("meu-site") quando o store não tem config carregada', () => {
      expect(getCurrentSiteId()).toBe(DEFAULT_SITE_ID);
    });

    it('retorna o ID do site quando o store possui config', () => {
      useSiteConfigStore.setState({
        config: { id: 'cliente-especial' } as unknown as SiteConfig,
        isLoading: false,
      });
      expect(getCurrentSiteId()).toBe('cliente-especial');
    });
  });

  describe('isPlaceholderId & filterPlaceholders', () => {
    it('identifica corretamente IDs que começam com sublinhado', () => {
      expect(isPlaceholderId('_placeholder')).toBe(true);
      expect(isPlaceholderId('_init')).toBe(true);
      expect(isPlaceholderId('evento-123')).toBe(false);
      expect(isPlaceholderId('timeline_kevin')).toBe(false);
    });

    it('filtra itens com id iniciando em "_"', () => {
      const items = [
        { id: '_placeholder', name: 'Temp' },
        { id: 'item-1', name: 'Primeiro' },
        { id: '_init', name: 'Init' },
        { id: 'item-2', name: 'Segundo' },
      ];
      const filtered = filterPlaceholders(items);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toEqual(['item-1', 'item-2']);
    });
  });

  describe('siteCollection', () => {
    it('em layout legacy: cria collection na raiz', () => {
      _setDataLayoutForTesting('legacy');
      const coll = siteCollection('timeline');
      expect(coll.path).toBe('timeline');
    });

    it('em layout site: cria collection sob sites/{siteId}/{collection}', () => {
      _setDataLayoutForTesting('site');
      useSiteConfigStore.setState({
        config: { id: 'casal-romantico' } as unknown as SiteConfig,
        isLoading: false,
      });
      const coll = siteCollection('timeline');
      expect(coll.path).toBe('sites/casal-romantico/timeline');
    });

    it('em layout site: aceita siteId explícito por parâmetro', () => {
      _setDataLayoutForTesting('site');
      const coll = siteCollection('albums', 'outro-casal');
      expect(coll.path).toBe('sites/outro-casal/albums');
    });
  });

  describe('siteDoc', () => {
    it('em layout legacy com id: cria doc na raiz', () => {
      _setDataLayoutForTesting('legacy');
      const docRef = siteDoc('timeline', 'evento-1');
      expect(docRef.path).toBe('timeline/evento-1');
    });

    it('em layout site com id: cria doc sob sites/{siteId}/{collection}/{id}', () => {
      _setDataLayoutForTesting('site');
      useSiteConfigStore.setState({
        config: { id: 'casal-romantico' } as unknown as SiteConfig,
        isLoading: false,
      });
      const docRef = siteDoc('timeline', 'evento-1');
      expect(docRef.path).toBe('sites/casal-romantico/timeline/evento-1');
    });

    it('em layout site com siteId explícito: respeita o siteId passado', () => {
      _setDataLayoutForTesting('site');
      const docRef = siteDoc('player_tokens', 'token-abc', 'site-demo');
      expect(docRef.path).toBe('sites/site-demo/player_tokens/token-abc');
    });

    it('sem id: gera documento com auto-id na coleção certa', () => {
      _setDataLayoutForTesting('legacy');
      const legacyAutoDoc = siteDoc('timeline');
      expect(legacyAutoDoc.parent.path).toBe('timeline');
      expect(legacyAutoDoc.id).toBeDefined();

      _setDataLayoutForTesting('site');
      const siteAutoDoc = siteDoc('timeline', undefined, 'meu-site');
      expect(siteAutoDoc.parent.path).toBe('sites/meu-site/timeline');
      expect(siteAutoDoc.id).toBeDefined();
    });
  });
});
