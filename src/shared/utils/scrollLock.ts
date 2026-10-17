/**
 * Gerenciador centralizado de bloqueio de rolagem do body/html com contagem de referências.
 * Permite que múltiplos modais/menus empilhem bloqueios sem sofrerem de race conditions
 * ao abrir ou fechar em sequência.
 */

let lockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

/**
 * Trava o scroll da página (body e html).
 * Retorna uma função de liberação (cleanup) para destravar o scroll.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
  lockCount++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
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
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
}
