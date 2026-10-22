/**
 * navigationStack.ts
 *
 * Gerenciador centralizado de camadas de navegação (modais, overlays, gavetas, sheets).
 * Permite que o botão Voltar do navegador, o gesto de voltar do mobile (Android/iOS)
 * e os botões Voltar da interface funcionem em perfeita harmonia LIFO (Last-In, First-Out),
 * desfazendo uma etapa por vez sem pular níveis nem sair inesperadamente do site.
 */

export interface NavigationLayer {
  id: string;
  onBack?: () => void;
  onClose: () => void;
}

let layers: NavigationLayer[] = [];
let isProgrammatic = false;
let isInitialized = false;

function handlePopState(_event: PopStateEvent) {
  if (isProgrammatic) {
    isProgrammatic = false;
    return;
  }

  if (layers.length > 0) {
    const top = layers.pop();
    if (top) {
      if (typeof top.onBack === 'function') {
        top.onBack();
      } else {
        top.onClose();
      }
    }
  }
}

function initListener() {
  if (typeof window === 'undefined' || isInitialized) return;
  window.addEventListener('popstate', handlePopState);
  isInitialized = true;
}

/**
 * Registra uma nova camada na pilha de navegação e empurra uma entrada segura no histórico.
 */
export function pushNavigationLayer(layer: NavigationLayer): (skipHistoryBack?: boolean) => void {
  initListener();

  // Se já existir camada com mesmo ID na pilha, atualiza handlers
  const existingIndex = layers.findIndex((l) => l.id === layer.id);
  if (existingIndex !== -1) {
    layers[existingIndex] = layer;
    return (skipHistoryBack?: boolean) => removeNavigationLayer(layer.id, skipHistoryBack);
  }

  layers.push(layer);

  if (typeof window !== 'undefined' && window.history) {
    try {
      const currentState = (window.history.state && typeof window.history.state === 'object')
        ? window.history.state
        : {};
      window.history.pushState(
        { ...currentState, __navLayerId: layer.id, __navDepth: layers.length },
        '',
        window.location.href
      );
    } catch {
      // Ignora erro em ambientes com restrição de pushState
    }
  }

  return (skipHistoryBack?: boolean) => removeNavigationLayer(layer.id, skipHistoryBack);
}

/**
 * Remove a camada da pilha programaticamente (ex: usuário clicou no X, gesto de swipe ou Voltar visual).
 * Se a camada for a do topo e skipHistoryBack for falso, recua uma entrada no histórico do navegador.
 * O duplo-recuo é evitado naturalmente: quando o back-button dispara o popstate, handlePopState já
 * remove a camada do array, de modo que o cleanup da desmontagem do componente encontra a camada
 * fora do topo e cai no branch else (sem chamar history.back()).
 */
export function removeNavigationLayer(id: string, skipHistoryBack: boolean = false): void {
  const top = layers[layers.length - 1];
  if (top && top.id === id) {
    layers.pop();
    if (!skipHistoryBack && typeof window !== 'undefined' && window.history) {
      isProgrammatic = true;
      try {
        window.history.back();
      } catch {
        isProgrammatic = false;
      }
    }
  } else {
    // Camada não estava no topo (ex: desmontagem em lote ou fechamento forçado)
    layers = layers.filter((l) => l.id !== id);
  }
}

/**
 * Retorna a camada no topo da pilha atual.
 */
export function getTopNavigationLayer(): NavigationLayer | undefined {
  return layers[layers.length - 1];
}

/**
 * Limpa todas as camadas ativas da pilha (usado ao fechar modais/overlays diretamente para a Home).
 */
export function clearAllNavigationLayers(): void {
  layers = [];
}

/**
 * Retorna o número de camadas ativas.
 */
export function getNavigationLayerCount(): number {
  return layers.length;
}

/**
 * Reseta o estado (usado em testes unitários).
 */
export function _resetNavigationStackForTesting(): void {
  layers = [];
  isProgrammatic = false;
  if (typeof window !== 'undefined' && isInitialized) {
    window.removeEventListener('popstate', handlePopState);
    isInitialized = false;
  }
}
