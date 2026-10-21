import type { NavigateFunction } from 'react-router-dom';

/**
 * Fecha um overlay de rota de forma inteligente e segura:
 * - Se o usuário veio de dentro do site (histórico interno > 0), volta no histórico (navigate(-1)),
 *   preservando exatamente a posição do scroll da página anterior e evitando criar entradas duplicadas.
 * - Se o usuário entrou direto pela URL (idx === 0 ou sem histórico do app), redireciona
 *   para a raiz ('/') com replace, impedindo que o botão voltar ou fechar jogue o usuário para fora
 *   do site (ex: para a tela inicial do Google).
 */
export function safeCloseOverlay(navigate: NavigateFunction, fallbackPath: string = '/') {
  const hasInternalHistory =
    typeof window !== 'undefined' &&
    window.history.state &&
    typeof window.history.state.idx === 'number' &&
    window.history.state.idx > 0;

  if (hasInternalHistory) {
    navigate(-1);
  } else {
    navigate(fallbackPath, { replace: true });
  }
}
