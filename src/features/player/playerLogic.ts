/**
 * playerLogic.ts
 *
 * Funções puras para regras de carregamento e reprodução de áudio.
 * Não contém imports de Firebase nem de stores (compatível com testes Node).
 */

export function shouldReloadTrack(
  activeUrl: string,
  trackUrl: string | undefined,
  hasSrc: boolean
): boolean {
  if (!trackUrl) return false;
  if (activeUrl === trackUrl && hasSrc) return false;
  return true;
}
