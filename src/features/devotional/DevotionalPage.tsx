/**
 * DevotionalPage.tsx
 *
 * Rota direta para o Devocional (/devotional).
 * Renderiza o DevotionalModal em tela cheia com a barra fixa superior
 * e botão de fechar (X) que redireciona de volta para a página inicial.
 */

import { useNavigate } from 'react-router-dom';
import { DevotionalModal } from '../modals/DevotionalModal';

export default function DevotionalPage() {
  const navigate = useNavigate();

  return (
    <DevotionalModal
      isOpen={true}
      onClose={() => navigate('/')}
    />
  );
}
