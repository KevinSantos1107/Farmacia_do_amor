import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  pushNavigationLayer,
  removeNavigationLayer,
  getNavigationLayerCount,
  getTopNavigationLayer,
  _resetNavigationStackForTesting,
} from './navigationStack';

describe('navigationStack', () => {
  let listeners: Record<string, EventListenerOrEventListenerObject[]> = {};
  let historyStack: Array<{ state: unknown; url: string }> = [];
  let currentState: unknown = {};

  beforeEach(() => {
    listeners = {};
    historyStack = [{ state: {}, url: 'http://localhost/' }];
    currentState = {};

    const fakeWindow = {
      location: { href: 'http://localhost/' },
      history: {
        get state() {
          return currentState;
        },
        pushState: vi.fn((state: unknown, _title: string, url?: string) => {
          currentState = state;
          historyStack.push({ state, url: url || 'http://localhost/' });
        }),
        back: vi.fn(() => {
          if (historyStack.length > 1) {
            historyStack.pop();
            currentState = historyStack[historyStack.length - 1].state;
          }
        }),
      },
      addEventListener: vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }),
      dispatchEvent: vi.fn((evt: Event) => {
        const handlers = listeners[evt.type] || [];
        for (const h of handlers) {
          if (typeof h === 'function') h(evt);
          else if (h && 'handleEvent' in h) h.handleEvent(evt);
        }
        return true;
      }),
    };

    // @ts-expect-error Mocking globalThis.window for Node test runner
    globalThis.window = fakeWindow;

    _resetNavigationStackForTesting();
    vi.restoreAllMocks();
  });

  it('inicia com pilha vazia', () => {
    expect(getNavigationLayerCount()).toBe(0);
    expect(getTopNavigationLayer()).toBeUndefined();
  });

  it('registra camadas e empurra para a pilha mantendo LIFO', () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    pushNavigationLayer({ id: 'modal-1', onClose: onClose1 });
    expect(getNavigationLayerCount()).toBe(1);
    expect(getTopNavigationLayer()?.id).toBe('modal-1');

    pushNavigationLayer({ id: 'modal-2', onClose: onClose2 });
    expect(getNavigationLayerCount()).toBe(2);
    expect(getTopNavigationLayer()?.id).toBe('modal-2');
  });

  it('preserva estado existente do window.history.state ao empurrar camada', () => {
    currentState = { usr: { auth: true }, idx: 3, key: 'router-key-123' };
    const pushSpy = vi.spyOn(window.history, 'pushState');

    pushNavigationLayer({ id: 'test-layer', onClose: vi.fn() });

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        usr: { auth: true },
        idx: 3,
        key: 'router-key-123',
        __navLayerId: 'test-layer',
        __navDepth: 1,
      }),
      '',
      window.location.href
    );
  });

  it('ao disparar popstate (botão voltar do navegador), fecha apenas a camada do topo', () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    pushNavigationLayer({ id: 'first', onClose: onClose1 });
    pushNavigationLayer({ id: 'second', onClose: onClose2 });

    // Simula clique no botão Voltar do navegador
    window.dispatchEvent(new Event('popstate'));

    expect(onClose2).toHaveBeenCalledTimes(1);
    expect(onClose1).not.toHaveBeenCalled();
    expect(getNavigationLayerCount()).toBe(1);
    expect(getTopNavigationLayer()?.id).toBe('first');

    // Segundo clique no botão Voltar
    window.dispatchEvent(new Event('popstate'));

    expect(onClose1).toHaveBeenCalledTimes(1);
    expect(getNavigationLayerCount()).toBe(0);
  });

  it('se a camada possuir onBack, o evento popstate aciona onBack preferencialmente', () => {
    const onBack = vi.fn();
    const onClose = vi.fn();

    pushNavigationLayer({ id: 'stepped-modal', onBack, onClose });

    window.dispatchEvent(new Event('popstate'));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ao remover camada programaticamente (botão X), aciona window.history.back e não duplica fechamento', () => {
    const onClose = vi.fn();
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {
      // Simula o popstate que o browser gera após history.back()
      window.dispatchEvent(new Event('popstate'));
    });

    pushNavigationLayer({ id: 'modal-x', onClose });
    expect(getNavigationLayerCount()).toBe(1);

    removeNavigationLayer('modal-x');

    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(getNavigationLayerCount()).toBe(0);
    // Como foi programático, o popstate gerado pelo back() não deve acionar onClose de novo
    expect(onClose).not.toHaveBeenCalled();
  });
});
