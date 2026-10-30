/**
 * safeArea.ts
 *
 * Utilitários para detecção e cálculo de Safe Area e posicionamento
 * seguro de elementos (toasts, mensagens de boas-vindas, modais) em dispositivos móveis,
 * especialmente em Web Apps (PWA / tela cheia no iOS) onde entalhes (Notch)
 * e a Dynamic Island ficam sobrepostos à viewport.
 */

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as unknown as { standalone?: boolean } | undefined;
  const isIOSStandalone = Boolean(nav?.standalone);
  const isDisplayStandalone = Boolean(
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
    window.matchMedia?.('(display-mode: minimal-ui)')?.matches
  );

  return isIOSStandalone || isDisplayStandalone;
}

export function isAppleDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator;
  const ua = nav?.userAgent || '';
  const isIOSDevice = /iPhone|iPad|iPod/i.test(ua);
  const isIPadOS = nav?.platform === 'MacIntel' && (nav?.maxTouchPoints || 0) > 1;

  return isIOSDevice || isIPadOS;
}

/**
 * Detecta se o dispositivo Apple possui corte de câmera físico na tela
 * (Notch tradicional nos iPhones X a 14, ou Dynamic Island nos iPhones 14 Pro, 15, 16).
 *
 * Dispositivos com entalhe/ilha têm proporção de tela > 2.0 (por volta de 2.16)
 * ou altura de tela >= 800px, diferentemente dos iPhones clássicos (iPhone SE, 6, 7, 8)
 * cuja tela é 16:9 (proporção ~1.78 e altura 667px).
 */
export function hasCameraNotchOrIsland(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isAppleDevice()) return false;

  const width = window.screen?.width || 0;
  const height = window.screen?.height || 0;
  const maxDim = Math.max(width, height);
  const minDim = Math.min(width, height);

  if (minDim === 0) return false;

  const aspectRatio = maxDim / minDim;
  return aspectRatio > 2.0 || maxDim >= 800;
}

export interface TopToastOffsetOptions {
  /** Offset padrão em rem para desktop ou navegadores comuns (padrão: 1.5rem = top-6) */
  baseRem?: number;
  /** Offset mínimo em rem para Web App no iOS com Notch ou Dynamic Island (padrão: 4.5rem = ~72px) */
  standaloneNotchRem?: number;
}

/**
 * Retorna o valor CSS apropriado para a propriedade `top` de banners e mensagens superiores.
 *
 * Em Web App (PWA instalado) no iPhone com Notch ou Dynamic Island, garante pelo menos 4.5rem (~72px)
 * somado à Safe Area do sistema (`env(safe-area-inset-top)`), pulando completamente o recorte
 * da câmera e a barra de status sem sobreposição.
 *
 * Em navegadores padrão (com barra de navegação/endereço visível) ou desktops,
 * mantém o espaçamento original confortável de 1.5rem (top-6).
 */
export function getTopToastOffset(options?: TopToastOffsetOptions): string {
  const baseRem = options?.baseRem ?? 1.5;
  const standaloneNotchRem = options?.standaloneNotchRem ?? 4.5;

  const isStandalone = isStandaloneApp();
  const hasNotch = hasCameraNotchOrIsland();

  // Se for Web App em iPhone com entalhe/Dynamic Island
  if (isStandalone && hasNotch) {
    return `max(${standaloneNotchRem}rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))`;
  }

  // Comportamento normal para desktop, navegadores comuns e Android
  // O uso de env(safe-area-inset-top) protege também dispositivos com câmera em punch-hole se suportado.
  return `max(${baseRem}rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))`;
}
