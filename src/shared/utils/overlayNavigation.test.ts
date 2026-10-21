import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeCloseOverlay } from './overlayNavigation';

describe('safeCloseOverlay', () => {
  const navigateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls navigate(-1) when internal history exists (idx > 0)', () => {
    vi.stubGlobal('window', {
      history: {
        state: { idx: 2 },
      },
    });

    safeCloseOverlay(navigateMock);

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('calls navigate("/", { replace: true }) when user opened direct link (idx === 0)', () => {
    vi.stubGlobal('window', {
      history: {
        state: { idx: 0 },
      },
    });

    safeCloseOverlay(navigateMock);

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('calls navigate("/", { replace: true }) when history state is empty or null', () => {
    vi.stubGlobal('window', {
      history: {
        state: null,
      },
    });

    safeCloseOverlay(navigateMock);

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('supports custom fallbackPath with replace: true', () => {
    vi.stubGlobal('window', {
      history: {
        state: { idx: 0 },
      },
    });

    safeCloseOverlay(navigateMock, '/admin');

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/admin', { replace: true });
  });
});
