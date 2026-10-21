/**
 * DevotionalPage.tsx
 *
 * Rota direta para o Devocional (/devotional).
 * Renderiza o DevotionalModal em tela cheia com a barra fixa superior
 * e botão de fechar (X) inteligente com safeCloseOverlay.
 */

import { useNavigate } from 'react-router-dom';
import { DevotionalModal } from '../modals/DevotionalModal';
import { safeCloseOverlay } from '../../shared/utils/overlayNavigation';

export default function DevotionalPage() {
  const navigate = useNavigate();

  return (
    <DevotionalModal
      isOpen={true}
      onClose={() => safeCloseOverlay(navigate)}
    />
  );
}
