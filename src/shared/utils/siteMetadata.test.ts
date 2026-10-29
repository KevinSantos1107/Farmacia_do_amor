import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCoupleDisplayName,
  applySiteMetadata,
  DEFAULT_COUPLE_NAME,
} from './siteMetadata';

describe('siteMetadata', () => {
  let elements: Map<string, { tag: string; attrs: Map<string, string> }>;
  let mockDoc: {
    title: string;
    querySelector: (selector: string) => {
      getAttribute: (attr: string) => string | undefined;
      setAttribute: (attr: string, val: string) => void;
    } | null;
    createElement: (tag: string) => {
      setAttribute: (attr: string, val: string) => void;
      getAttribute: (attr: string) => string | undefined;
      rel?: string;
      href?: string;
    };
    head: {
      appendChild: (el: unknown) => void;
    };
  };

  beforeEach(() => {
    elements = new Map();

    mockDoc = {
      title: '',
      querySelector: (selector: string) => {
        const found = elements.get(selector);
        if (!found) return null;
        return {
          getAttribute: (attr: string) => found.attrs.get(attr),
          setAttribute: (attr: string, val: string) => {
            found.attrs.set(attr, val);
          },
        };
      },
      createElement: (tag: string) => {
        const attrs = new Map<string, string>();
        const obj = {
          setAttribute: (attr: string, val: string) => {
            attrs.set(attr, val);
            if (attr === 'name') {
              elements.set(`meta[name="${val}"]`, { tag, attrs });
            } else if (attr === 'property') {
              elements.set(`meta[property="${val}"]`, { tag, attrs });
            } else if (attr === 'rel' && val === 'manifest') {
              elements.set('link[rel="manifest"]', { tag, attrs });
            }
          },
          getAttribute: (attr: string) => attrs.get(attr),
        };
        return obj;
      },
      head: {
        appendChild: () => {},
      },
    };

    globalThis.document = mockDoc as unknown as Document;
  });

  describe('getCoupleDisplayName', () => {
    it('retorna o nome formatado quando ambos os parceiros existem', () => {
      expect(
        getCoupleDisplayName({
          partner1: { name: 'Kevin' },
          partner2: { name: 'Iara' },
        })
      ).toBe('Kevin & Iara');
    });

    it('retorna DEFAULT_COUPLE_NAME quando nenhum parceiro é fornecido', () => {
      expect(getCoupleDisplayName()).toBe(DEFAULT_COUPLE_NAME);
      expect(getCoupleDisplayName({})).toBe(DEFAULT_COUPLE_NAME);
    });

    it('retorna o nome do parceiro se apenas um estiver preenchido', () => {
      expect(getCoupleDisplayName({ partner1: { name: 'Lucas' } })).toBe('Lucas');
      expect(getCoupleDisplayName({ partner2: { name: 'Beatriz' } })).toBe('Beatriz');
    });

    it('funciona com qualquer nome de casal dinâmico', () => {
      expect(
        getCoupleDisplayName({
          partner1: { name: 'João' },
          partner2: { name: 'Maria' },
        })
      ).toBe('João & Maria');
    });
  });

  describe('applySiteMetadata', () => {
    it('atualiza document.title, metatags de app e o link do manifesto', () => {
      applySiteMetadata('Kevin & Iara', 'meu-site');

      expect(mockDoc.title).toBe('Kevin & Iara');

      const appleTitle = mockDoc.querySelector('meta[name="apple-mobile-web-app-title"]');
      expect(appleTitle?.getAttribute('content')).toBe('Kevin & Iara');

      const appName = mockDoc.querySelector('meta[name="application-name"]');
      expect(appName?.getAttribute('content')).toBe('Kevin & Iara');

      const manifestLink = mockDoc.querySelector('link[rel="manifest"]');
      expect(manifestLink?.getAttribute('href')).toBe('/api/manifest?name=Kevin%20%26%20Iara&site=meu-site');
    });

    it('atualiza para um novo casal quando os nomes mudam', () => {
      applySiteMetadata('Kevin & Iara', 'meu-site');
      applySiteMetadata('Lucas & Beatriz', 'meu-site');

      expect(mockDoc.title).toBe('Lucas & Beatriz');

      const appleTitle = mockDoc.querySelector('meta[name="apple-mobile-web-app-title"]');
      expect(appleTitle?.getAttribute('content')).toBe('Lucas & Beatriz');

      const appName = mockDoc.querySelector('meta[name="application-name"]');
      expect(appName?.getAttribute('content')).toBe('Lucas & Beatriz');

      const manifestLink = mockDoc.querySelector('link[rel="manifest"]');
      expect(manifestLink?.getAttribute('href')).toBe('/api/manifest?name=Lucas%20%26%20Beatriz&site=meu-site');
    });

    it('usa DEFAULT_COUPLE_NAME se o nome for vazio', () => {
      applySiteMetadata('');
      expect(mockDoc.title).toBe(DEFAULT_COUPLE_NAME);
    });
  });
});
