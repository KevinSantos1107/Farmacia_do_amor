import { useEffect, useRef } from 'react';
import { pushNavigationLayer, removeNavigationLayer } from '../utils/navigationStack';

interface UseOverlayHistoryOptions {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

/**
 * Hook para integrar qualquer modal, painel, gaveta ou overlay
 * à pilha de navegação e ao botão Voltar do navegador/mobile.
 *
 * Compatível com React 18 StrictMode: o cleanup de desmontagem causado pelo
 * duplo-invoke do StrictMode usa skipHistoryBack=true, evitando que o
 * history.back() assíncrono consuma a entrada de histórico do remount.
 */
export function useOverlayHistory({ id, isOpen, onClose, onBack }: UseOverlayHistoryOptions) {
  const onCloseRef = useRef(onClose);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onCloseRef.current = onClose;
    onBackRef.current = onBack;
  }, [onClose, onBack]);

  useEffect(() => {
    if (!isOpen) return;

    const cleanup = pushNavigationLayer({
      id,
      onClose: () => onCloseRef.current(),
      onBack: onBack ? () => onBackRef.current?.() : undefined,
    });

    // Flag que indica se este cleanup é um remount imediato do React StrictMode.
    // Se o componente remontar dentro de um tick de microtask/macro task,
    // o cleanup não deve acionar history.back() — apenas remove a camada da pilha.
    let isStrictModeRemount = true;
    const timer = setTimeout(() => {
      // Após um tick completo, se ainda estivermos montados, não é StrictMode.
      isStrictModeRemount = false;
    }, 0);

    return () => {
      clearTimeout(timer);
      // Se for o cleanup do StrictMode (remount imediato), pula o history.back()
      // para não consumir a entrada que o próximo mount vai criar.
      cleanup(isStrictModeRemount);
    };
  }, [isOpen, id, onBack !== undefined]);

  const handleDismiss = () => {
    removeNavigationLayer(id);
    onCloseRef.current();
  };

  const handleBack = () => {
    if (onBackRef.current) {
      onBackRef.current();
    } else {
      handleDismiss();
    }
  };

  return {
    handleDismiss,
    handleBack,
  };
}
