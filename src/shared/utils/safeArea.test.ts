import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isStandaloneApp,
  isAppleDevice,
  hasCameraNotchOrIsland,
  getTopToastOffset
} from './safeArea';

describe('safeArea utils', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  describe('isAppleDevice', () => {
    it('detecta iPhone pelo User-Agent', () => {
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          platform: 'iPhone',
          maxTouchPoints: 5,
        } as unknown as Navigator,
      } as unknown as Window & typeof globalThis;

      expect(isAppleDevice()).toBe(true);
    });

    it('detecta iPadOS (MacIntel com touch points)', () => {
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          platform: 'MacIntel',
          maxTouchPoints: 5,
        } as unknown as Navigator,
      } as unknown as Window & typeof globalThis;

      expect(isAppleDevice()).toBe(true);
    });

    it('retorna false para desktop Windows ou Android', () => {
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          platform: 'Win32',
          maxTouchPoints: 0,
        } as unknown as Navigator,
      } as unknown as Window & typeof globalThis;

      expect(isAppleDevice()).toBe(false);
    });

    it('retorna false se window for undefined (SSR)', () => {
      // @ts-expect-error Intentionally deleting window for SSR testing
      delete globalThis.window;

      expect(isAppleDevice()).toBe(false);
    });
  });

  describe('isStandaloneApp', () => {
    it('detecta modo standalone via navigator.standalone (iOS PWA)', () => {
      globalThis.window = {
        navigator: {
          userAgent: 'iPhone',
          standalone: true,
        } as unknown as Navigator,
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      } as unknown as Window & typeof globalThis;

      expect(isStandaloneApp()).toBe(true);
    });

    it('detecta modo standalone via display-mode media query', () => {
      globalThis.window = {
        navigator: { userAgent: 'Android', standalone: false } as unknown as Navigator,
        matchMedia: vi.fn().mockImplementation((query: string) => ({
          matches: query.includes('(display-mode: standalone)'),
        })),
      } as unknown as Window & typeof globalThis;

      expect(isStandaloneApp()).toBe(true);
    });

    it('retorna false quando aberto em navegador comum', () => {
      globalThis.window = {
        navigator: { userAgent: 'iPhone', standalone: false } as unknown as Navigator,
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      } as unknown as Window & typeof globalThis;

      expect(isStandaloneApp()).toBe(false);
    });
  });

  describe('hasCameraNotchOrIsland', () => {
    it('retorna true para iPhone com notch/Dynamic Island (aspect ratio > 2 ou altura >= 800)', () => {
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          platform: 'iPhone',
        } as unknown as Navigator,
        screen: { width: 393, height: 852 } as unknown as Screen,
      } as unknown as Window & typeof globalThis;

      expect(hasCameraNotchOrIsland()).toBe(true);
    });

    it('retorna false para iPhone clássico sem notch (ex: iPhone SE com 375 x 667)', () => {
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          platform: 'iPhone',
        } as unknown as Navigator,
        screen: { width: 375, height: 667 } as unknown as Screen,
      } as unknown as Window & typeof globalThis;

      expect(hasCameraNotchOrIsland()).toBe(false);
    });
  });

  describe('getTopToastOffset', () => {
    it('calcula offset expandido para Web App em iPhone com Notch/Dynamic Island', () => {
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          platform: 'iPhone',
          standalone: true,
        } as unknown as Navigator,
        screen: { width: 393, height: 852 } as unknown as Screen,
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      } as unknown as Window & typeof globalThis;

      const offset = getTopToastOffset();
      expect(offset).toBe('max(4.5rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))');
    });

    it('retorna offset padrão confortável de 1.5rem para navegadores comuns', () => {
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          platform: 'Win32',
          standalone: false,
        } as unknown as Navigator,
        screen: { width: 1920, height: 1080 } as unknown as Screen,
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      } as unknown as Window & typeof globalThis;

      const offset = getTopToastOffset();
      expect(offset).toBe('max(1.5rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))');
    });
  });
});
