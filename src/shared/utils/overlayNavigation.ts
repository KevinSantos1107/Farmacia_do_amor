import type { NavigateFunction } from 'react-router-dom';
import { clearAllNavigationLayers } from './navigationStack';

/**
 * Fecha um overlay de rota de forma direta e definitiva:
 * Sempre redireciona para a raiz do site ('/') ou para o fallbackPath especificado com { replace: true },
 * garantindo que o botão "X" feche o modal imediatamente sem voltar por etapas internas
 * e retorne sempre para a tela inicial do site.
 */
export function safeCloseOverlay(navigate: NavigateFunction, fallbackPath: string = '/') {
  clearAllNavigationLayers();
  navigate(fallbackPath, { replace: true });
}
