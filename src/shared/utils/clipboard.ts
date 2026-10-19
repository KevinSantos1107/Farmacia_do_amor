/**
 * Utilitário universal para copiar texto para a área de transferência.
 * No iOS Safari, `navigator.clipboard.writeText()` pode falhar se não estiver
 * estritamente síncrono com a ação do usuário ou em contextos de permissão restrita.
 * Implementa fallback robusto usando um textarea invisível temporário.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Tentar API moderna
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Falhou na API assíncrona, tenta o fallback abaixo
    }
  }

  // 2. Fallback síncrono via document.execCommand para iOS Safari e browsers antigos
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      // Garante que o textarea não acione scroll nem apareça na tela
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (err) {
      console.warn('Fallback copy failed:', err);
      return false;
    }
  }

  return false;
}
