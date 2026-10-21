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

/**
 * Compara duas URLs de áudio pela forma normalizada.
 *
 * `audio.src` devolve a URL já resolvida/codificada pelo navegador (espaços viram
 * %20, acentos viram %C3...), enquanto `track.url` vem crua do Firestore. Comparar
 * as strings diretamente dá "diferente" para a mesma faixa e causa um segundo
 * carregamento (que no iOS interrompe o play() iniciado no toque).
 */
export function isSameAudioUrl(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  try {
    const base = typeof location !== 'undefined' ? location.href : 'http://localhost/';
    return new URL(a, base).href === new URL(b, base).href;
  } catch {
    return false;
  }
}

/** Traduz o código de erro do HTMLMediaElement em mensagem amigável. */
export function describeMediaError(code: number | undefined): string {
  switch (code) {
    case 1: return 'Reprodução cancelada.';
    case 2: return 'Falha de rede ao carregar a música. Verifique sua conexão.';
    case 3: return 'Não foi possível decodificar este áudio.';
    case 4: return 'Formato de áudio não suportado ou arquivo indisponível.';
    default: return 'Erro ao carregar a música.';
  }
}
