/**
 * Gerenciador centralizado de bloqueio de rolagem do body/html com contagem de referências.
 * Permite que múltiplos modais/menus empilhem bloqueios sem sofrerem de race conditions
 * ao abrir ou fechar em sequência.
 *
 * Estratégia para iOS/Safari:
 * O Safari tem um bug histórico onde `overflow: hidden` no body não impede o rubber-band
 * scrolling. A solução é usar `position: fixed` + `top: -scrollY` no body enquanto o
 * lock está ativo, restaurando o scroll exato ao fechar.
 */

let lockCount = 0;
let savedScrollY = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';
let previousBodyOverscroll = '';
let previousHtmlOverscroll = '';
let previousBodyPosition = '';
let previousBodyTop = '';
let previousBodyWidth = '';

/** Detecta iOS (iPhone/iPad) para aplicar o fix de position:fixed */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Trava o scroll da página (body e html) e previne bounce elástico no iOS/Mobile,
 * preservando a posição exata da rolagem para restauração ao fechar.
 * Retorna uma função de liberação (cleanup) para destravar o scroll.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  if (lockCount === 0) {
    if (typeof window !== 'undefined') {
      savedScrollY =
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement?.scrollTop ||
        document.body?.scrollTop ||
        0;
    }

    if (document.body?.style) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if ('overscrollBehavior' in document.body.style) {
        previousBodyOverscroll = document.body.style.overscrollBehavior;
        document.body.style.overscrollBehavior = 'none';
      }

      // Fix para iOS/Safari: position:fixed impede o rubber-band scrolling que
      // `overflow:hidden` sozinho não bloqueia. Sem isso, o fundo do site continua
      // respondendo a swipes e compete com os gestos do modal.
      if (isIOS()) {
        previousBodyPosition = document.body.style.position;
        previousBodyTop = document.body.style.top;
        previousBodyWidth = document.body.style.width;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${savedScrollY}px`;
        document.body.style.width = '100%';
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

        // Restaura position e scroll no iOS
        if (isIOS()) {
          document.body.style.position = previousBodyPosition;
          document.body.style.top = previousBodyTop;
          document.body.style.width = previousBodyWidth;
        }
      }
      if (document.documentElement?.style) {
        document.documentElement.style.overflow = previousHtmlOverflow;
        if ('overscrollBehavior' in document.documentElement.style) {
          document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
        }
      }
      if (typeof window !== 'undefined') {
        const targetScroll = savedScrollY;
        if (typeof window.scrollTo === 'function') {
          window.scrollTo({
            top: targetScroll,
            left: 0,
            behavior: 'instant' as ScrollBehavior,
          });
        }
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            if (typeof window.scrollTo === 'function') {
              window.scrollTo({
                top: targetScroll,
                left: 0,
                behavior: 'instant' as ScrollBehavior,
              });
            }
          });
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
  savedScrollY = 0;
  previousBodyOverflow = '';
  previousHtmlOverflow = '';
  previousBodyOverscroll = '';
  previousHtmlOverscroll = '';
  previousBodyPosition = '';
  previousBodyTop = '';
  previousBodyWidth = '';
  if (typeof document !== 'undefined') {
    if (document.body?.style) {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
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

