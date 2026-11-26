import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Gerencia focus trap (Tab / Shift+Tab dentro do container) e restauração
 * de foco para o elemento anterior ao fechar um diálogo/painel acessível.
 */
export function useFocusTrap(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    // Move o foco para o primeiro elemento focável (ou para o próprio container)
    const focusTimer = window.setTimeout(() => {
      if (!container) return;
      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        if (!container.hasAttribute('tabindex')) {
          container.setAttribute('tabindex', '-1');
        }
        container.focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !container) return;

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, containerRef]);
}
