import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeCloseOverlay } from './overlayNavigation';
import { pushNavigationLayer, getNavigationLayerCount, _resetNavigationStackForTesting } from './navigationStack';

describe('safeCloseOverlay', () => {
  const navigateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    _resetNavigationStackForTesting();
  });

  it('fecha o modal diretamente para a Home ("/") com replace: true, sem voltar por etapas', () => {
    pushNavigationLayer({ id: 'modal-step-1', onClose: vi.fn() });
    pushNavigationLayer({ id: 'modal-step-2', onClose: vi.fn() });
    expect(getNavigationLayerCount()).toBe(2);

    safeCloseOverlay(navigateMock);

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    // Garante que todas as camadas foram limpas
    expect(getNavigationLayerCount()).toBe(0);
  });

  it('suporta custom fallbackPath com replace: true (ex: /admin)', () => {
    safeCloseOverlay(navigateMock, '/admin');

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/admin', { replace: true });
  });
});
