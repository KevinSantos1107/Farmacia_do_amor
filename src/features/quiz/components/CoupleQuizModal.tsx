import { useEffect } from 'react';
import { FullScreenOverlay } from '../../../shared/ui/FullScreenOverlay';
import { MessageCircleHeart } from 'lucide-react';
import { useSiteId } from '../../../services/firestore/paths';
import { useQuizStore } from '../store/useQuizStore';
import { useOverlayHistory } from '../../../shared/hooks/useOverlayHistory';
import { QuizIntro } from './QuizIntro';
import { QuizPlay } from './QuizPlay';
import { QuizResult } from './QuizResult';

export function CoupleQuizModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const siteId = useSiteId();
  
  const { isReady, isLoading, error, loadQuizData, gameState, config, syncQuizStats, resetGame } = useQuizStore();

  // Permite que o botão Voltar do navegador/notebook retorne da partida/resultado para a introdução
  useOverlayHistory({
    id: 'quiz-active-game',
    isOpen: isOpen && (gameState === 'playing' || gameState === 'result'),
    onClose: resetGame,
    onBack: resetGame,
  });

  const handleQuizBack = () => {
    if (gameState === 'playing' || gameState === 'result') {
      resetGame();
    } else {
      onClose();
    }
  };

  // Sincroniza recordes só quando o modal abre (antes rodava ~3x por abertura)
  useEffect(() => {
    if (isOpen) syncQuizStats();
  }, [isOpen, syncQuizStats]);

  useEffect(() => {
    if (isOpen && !isReady && !isLoading) {
      loadQuizData(siteId);
    }
  }, [isOpen, isReady, isLoading, loadQuizData, siteId]);

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      onBack={handleQuizBack}
      title="Quiz do Casal"
      subtitle="O quanto você lembra da nossa história?"
      icon={<MessageCircleHeart className="w-6 h-6" />}
    >
      <div className="max-w-2xl mx-auto h-full flex flex-col p-4 md:p-8">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={() => loadQuizData(siteId)} className="px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              Tentar novamente
            </button>
          </div>
        )}
        
        {isReady && !config.active && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-white/60 mb-4">O quiz está desativado no momento.</p>
            <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              Voltar
            </button>
          </div>
        )}

        {isReady && config.active && (
          <>
            {gameState === 'intro' && <QuizIntro />}
            {gameState === 'playing' && <QuizPlay />}
            {gameState === 'result' && <QuizResult />}
          </>
        )}
      </div>
    </FullScreenOverlay>
  );
}
