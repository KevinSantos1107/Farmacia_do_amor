/**
 * Gerenciador centralizado de bloqueio de rolagem do body/html com contagem de referências.
 * Permite que múltiplos modais/menus empilhem bloqueios sem sofrerem de race conditions
 * ao abrir ou fechar em sequência.
 */

let lockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';
let previousBodyOverscroll = '';
let previousHtmlOverscroll = '';

/**
 * Trava o scroll da página (body e html) e previne bounce elástico no iOS/Mobile.
 * Retorna uma função de liberação (cleanup) para destravar o scroll.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  if (lockCount === 0) {
    if (document.body?.style) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if ('overscrollBehavior' in document.body.style) {
        previousBodyOverscroll = document.body.style.overscrollBehavior;
        document.body.style.overscrollBehavior = 'none';
      }
    }
    if (document.documentElement?.style) {
      previousHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      if ('overscrollBehavior' in document.documentElement.style) {
        previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
        document.documentElement.style.overscrollBehavior = 'none';
      }
    }
  }
  lockCount++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      if (document.body?.style) {
        document.body.style.overflow = previousBodyOverflow;
        if ('overscrollBehavior' in document.body.style) {
          document.body.style.overscrollBehavior = previousBodyOverscroll;
        }
      }
      if (document.documentElement?.style) {
        document.documentElement.style.overflow = previousHtmlOverflow;
        if ('overscrollBehavior' in document.documentElement.style) {
          document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
        }
      }
    }
  };
}

/**
 * Reseta o estado do scrollLock (útil para testes unitários).
 */
export function _resetScrollLockForTesting(): void {
  lockCount = 0;
  previousBodyOverflow = '';
  previousHtmlOverflow = '';
  previousBodyOverscroll = '';
  previousHtmlOverscroll = '';
  if (typeof document !== 'undefined') {
    if (document.body?.style) {
      document.body.style.overflow = '';
      if ('overscrollBehavior' in document.body.style) {
        document.body.style.overscrollBehavior = '';
      }
    }
    if (document.documentElement?.style) {
      document.documentElement.style.overflow = '';
      if ('overscrollBehavior' in document.documentElement.style) {
        document.documentElement.style.overscrollBehavior = '';
      }
    }
  }
}
