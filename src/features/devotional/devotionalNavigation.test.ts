import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  pushNavigationLayer,
  removeNavigationLayer,
  getNavigationLayerCount,
  _resetNavigationStackForTesting,
} from '../../shared/utils/navigationStack';

describe('Devotional and Multi-level Navigation Flows', () => {
  let currentState: Record<string, unknown> = {};
  let historyStack: Array<{ state: unknown; url: string }> = [];
  let listeners: Record<string, EventListenerOrEventListenerObject[]> = {};

  beforeEach(() => {
    currentState = { idx: 1, key: 'home-key' };
    historyStack = [{ state: currentState, url: 'http://localhost/' }];
    listeners = {};

    const fakeWindow = {
      location: { href: 'http://localhost/' },
      history: {
        get state() {
          return currentState;
        },
        pushState: vi.fn((state: unknown, _title: string, url?: string) => {
          currentState = state as Record<string, unknown>;
          historyStack.push({ state, url: url || 'http://localhost/' });
        }),
        back: vi.fn(() => {
          if (historyStack.length > 1) {
            historyStack.pop();
            currentState = (historyStack[historyStack.length - 1].state as Record<string, unknown>) || {};
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

    // @ts-expect-error Mocking global window in test
    globalThis.window = fakeWindow;
    _resetNavigationStackForTesting();
    vi.restoreAllMocks();
  });

  it('fluxo canônico: Home -> Devocional -> Favoritos -> Devocional -> Home', () => {
    // 1. Usuário entra no Devocional
    let isDevotionalOpen = true;
    let devotionalStep: string = 'mode-select';
    const stepHistory: string[] = [];

    const handleClose = vi.fn(() => {
      isDevotionalOpen = false;
    });

    const handleBack = vi.fn(() => {
      if (stepHistory.length > 0) {
        const prev = stepHistory.pop()!;
        devotionalStep = prev;
        removeNavigationLayer(`devotional-step-${devotionalStep}`);
      } else {
        handleClose();
      }
    });

    // Registra a camada raiz do Devocional
    pushNavigationLayer({
      id: 'modal-devotional',
      onBack: handleBack,
      onClose: handleClose,
    });

    expect(getNavigationLayerCount()).toBe(1);
    expect(devotionalStep).toBe('mode-select');

    // 2. Usuário entra em Favoritos (history)
    stepHistory.push(devotionalStep);
    devotionalStep = 'history';
    pushNavigationLayer({
      id: 'devotional-step-history',
      onBack: handleBack,
      onClose: handleClose,
    });

    expect(getNavigationLayerCount()).toBe(2);
    expect(devotionalStep).toBe('history');
    expect(stepHistory).toEqual(['mode-select']);

    // 3. Usuário clica no botão Voltar (ou gesto do navegador)
    window.dispatchEvent(new Event('popstate'));

    // Deve voltar para a tela principal do Devocional, sem fechar o modal
    expect(devotionalStep).toBe('mode-select');
    expect(isDevotionalOpen).toBe(true);
    expect(handleClose).not.toHaveBeenCalled();
    expect(getNavigationLayerCount()).toBe(1);

    // 4. Usuário clica no botão Voltar novamente
    window.dispatchEvent(new Event('popstate'));

    // Agora deve fechar o Devocional e retornar para a Home
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(isDevotionalOpen).toBe(false);
    expect(getNavigationLayerCount()).toBe(0);
  });

  it('fluxo profundo de múltiplos passos: modo -> humor -> reflexão -> foco -> resultado', () => {
    const steps = ['mode-select', 'mood-select', 'text-input', 'focus-select', 'result'];
    let currentStep = steps[0];
    const history: string[] = [];
    const onClose = vi.fn();

    const onBack = () => {
      if (history.length > 0) {
        const leaving = currentStep;
        currentStep = history.pop()!;
        removeNavigationLayer(`step-${leaving}`);
      } else {
        onClose();
      }
    };

    pushNavigationLayer({ id: 'modal-root', onBack, onClose });

    // Avança passo a passo
    for (let i = 1; i < steps.length; i++) {
      history.push(currentStep);
      currentStep = steps[i];
      pushNavigationLayer({ id: `step-${currentStep}`, onBack, onClose });
    }

    expect(currentStep).toBe('result');
    expect(history.length).toBe(4);
    expect(getNavigationLayerCount()).toBe(5);

    // Agora recua passo a passo via popstate
    // 1: volta para focus-select
    window.dispatchEvent(new Event('popstate'));
    expect(currentStep).toBe('focus-select');

    // 2: volta para text-input
    window.dispatchEvent(new Event('popstate'));
    expect(currentStep).toBe('text-input');

    // 3: volta para mood-select
    window.dispatchEvent(new Event('popstate'));
    expect(currentStep).toBe('mood-select');

    // 4: volta para mode-select
    window.dispatchEvent(new Event('popstate'));
    expect(currentStep).toBe('mode-select');
    expect(onClose).not.toHaveBeenCalled();

    // 5: volta para home (fecha overlay)
    window.dispatchEvent(new Event('popstate'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tratamento de acesso direto / refresh sem histórico prévio (Regra 7)', () => {
    // Se o usuário carregar direto em Favoritos
    let currentStep = 'history';
    const history: string[] = []; // Vazio devido a refresh
    const onClose = vi.fn();

    const onBack = () => {
      if (history.length > 0) {
        currentStep = history.pop()!;
      } else {
        // Fallback previsível para a tela principal
        if (currentStep === 'history') {
          currentStep = 'mode-select';
        } else {
          onClose();
        }
      }
    };

    pushNavigationLayer({ id: 'modal-root', onBack, onClose });

    // Primeiro voltar: transiciona para mode-select sem derrubar o usuário
    onBack();
    expect(currentStep).toBe('mode-select');
    expect(onClose).not.toHaveBeenCalled();

    // Segundo voltar: agora sim fecha para Home
    onBack();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fluxo de jogo e painel de estatísticas: Home -> Jogo de Palavras -> Estatísticas -> Jogo -> Home', () => {
    let isWordGameOpen = true;
    let isStatsOpen = false;

    const closeStats = vi.fn(() => {
      isStatsOpen = false;
    });

    const closeWordGame = vi.fn(() => {
      isWordGameOpen = false;
    });

    // 1. Abre Jogo de Palavras a partir do menu/home
    pushNavigationLayer({
      id: 'overlay-word-game',
      onClose: closeWordGame,
    });

    expect(getNavigationLayerCount()).toBe(1);
    expect(isWordGameOpen).toBe(true);

    // 2. Abre Estatísticas/Rank dentro do jogo
    isStatsOpen = true;
    pushNavigationLayer({
      id: 'word-game-stats',
      onClose: closeStats,
    });

    expect(getNavigationLayerCount()).toBe(2);
    expect(isStatsOpen).toBe(true);

    // 3. Usuário aperta Voltar no notebook
    window.dispatchEvent(new Event('popstate'));

    // Deve fechar apenas o painel de estatísticas, mantendo o jogo aberto e sem sair para o Google!
    expect(closeStats).toHaveBeenCalledTimes(1);
    expect(isStatsOpen).toBe(false);
    expect(isWordGameOpen).toBe(true);
    expect(closeWordGame).not.toHaveBeenCalled();
    expect(getNavigationLayerCount()).toBe(1);

    // 4. Usuário aperta Voltar no notebook novamente
    window.dispatchEvent(new Event('popstate'));

    // Agora fecha o jogo de palavras e retorna para a Home
    expect(closeWordGame).toHaveBeenCalledTimes(1);
    expect(isWordGameOpen).toBe(false);
    expect(getNavigationLayerCount()).toBe(0);
  });
});
