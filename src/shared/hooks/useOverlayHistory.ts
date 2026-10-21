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

    return () => {
      cleanup();
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
