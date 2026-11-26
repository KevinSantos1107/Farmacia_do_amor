/**
 * Retorna o nó DOM `#modal-root` (irmão de `#root`, isolado do lock de scroll no body)
 * com fallback seguro para `document.body`.
 */
export function getModalPortalTarget(): HTMLElement {
  return document.getElementById('modal-root') || document.body;
}
