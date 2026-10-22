import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuizStore } from '../quiz/store/useQuizStore';
import { _resetNavigationStackForTesting } from '../../shared/utils/navigationStack';
import { _resetScrollLockForTesting } from '../../shared/utils/scrollLock';
import type { QuizOption } from '../quiz/schema';

describe('Correções de navegação, modais e interface', () => {
  beforeEach(() => {
    _resetNavigationStackForTesting();
    _resetScrollLockForTesting();
    vi.restoreAllMocks();
  });

  describe('1. Álbum de fotos', () => {
    it('elimina o botão X de fechar do componente AlbumViewerModal', async () => {
      // Lê o conteúdo do arquivo para garantir que X e o botão fechar do topo foram removidos
      const fs = await import('fs');
      const content = fs.readFileSync('src/features/album/AlbumViewerModal.tsx', 'utf-8');
      
      expect(content).not.toContain("aria-label=\"Fechar visualizador\"");
      expect(content).not.toContain("import { X } from 'lucide-react'");
      expect(content).toContain('key="slot-prev"');
      expect(content).toContain('key="slot-cur"');
      expect(content).toContain('key="slot-next"');
    });

    it('implementa buffer duplo para transição suave de imagens sem flicker', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/features/album/AlbumViewerModal.tsx', 'utf-8');
      
      expect(content).toContain('const [prevSrc, setPrevSrc] = useState');
      expect(content).toContain('const [isLoaded, setIsLoaded] = useState');
    });
  });

  describe('2. Seção Devocional', () => {
    it('remove a seção Devocional da página Home', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/pages/Home.tsx', 'utf-8');
      
      expect(content).not.toContain('id="section-devocional"');
      expect(content).not.toContain('Conexão com Deus & Entre Nós');
    });

    it('mantém o acesso ao Devocional dentro do HamburgerMenu', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/features/core/HamburgerMenu.tsx', 'utf-8');
      
      expect(content).toContain('Devocional do Casal');
      expect(content).toContain("handleOpenModal('devotional', '/devotional')");
    });
  });

  describe('3. Retrospectiva — histórico de navegação', () => {
    it('evita duplicidade de camadas na rota dedicada /retrospective', async () => {
      const fs = await import('fs');
      const retroShellContent = fs.readFileSync('src/features/retrospective-v2/components/RetroShell.tsx', 'utf-8');
      const retroPageContent = fs.readFileSync('src/features/retrospective-v2/RetrospectivePage.tsx', 'utf-8');
      
      expect(retroShellContent).toContain("const isDedicatedRoute = location.pathname === '/retrospective' || location.pathname === '/retrospectiva'");
      expect(retroShellContent).toContain('isOpen: isOpen && !isDedicatedRoute');
      expect(retroPageContent).toContain('safeCloseOverlay(navigate)');
    });
  });

  describe('4. Quiz de casal — tela de resultado', () => {
    it('não renderiza o botão Fechar na tela de resultado do Quiz', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/features/quiz/components/QuizResult.tsx', 'utf-8');
      
      expect(content).not.toContain('>Fechar<');
      expect(content).not.toContain('closeModal');
      expect(content).toContain('Jogar Novamente');
    });

    it('resetGame limpa pontuação, combo, acertos e volta para a tela inicial', () => {
      const store = useQuizStore.getState();
      
      const q1Options: QuizOption[] = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];
      const q2Options: QuizOption[] = [{ id: 'c', text: 'C' }, { id: 'd', text: 'D' }];
      // Simula estado pós-jogo
      useQuizStore.setState({
        gameState: 'result',
        score: 500,
        correctAnswers: 5,
        wrongAnswers: 1,
        currentCombo: 3,
        maxCombo: 3,
        currentIndex: 5,
        questions: [
          { id: '1', question: 'Q1', options: q1Options, correctOptionId: 'a', points: 100, active: true, order: 0, siteId: 'test' },
          { id: '2', question: 'Q2', options: q2Options, correctOptionId: 'c', points: 100, active: true, order: 1, siteId: 'test' },
        ],
      });

      store.resetGame();

      const newState = useQuizStore.getState();
      expect(newState.gameState).toBe('intro');
      expect(newState.score).toBe(0);
      expect(newState.correctAnswers).toBe(0);
      expect(newState.wrongAnswers).toBe(0);
      expect(newState.currentCombo).toBe(0);
      expect(newState.maxCombo).toBe(0);
      expect(newState.currentIndex).toBe(0);
    });
  });

  describe('5. Menu hambúrguer — navegação', () => {
    it('executa navegação sem replace forçado e gerencia histórico de forma limpa', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/features/core/HamburgerMenu.tsx', 'utf-8');
      
      // Verifica que replace: true foi removido de handleOpenModal e handleScrollTo
      expect(content).not.toContain("navigate(route, { replace: true })");
      expect(content).not.toContain("navigate('/devotional', { replace: true })");
      expect(content).not.toContain("navigate('/retrospective', { replace: true })");
      expect(content).toContain('handleScrollTo');
      expect(content).toContain('scrollToSection(sectionId)');
    });
  });
});
