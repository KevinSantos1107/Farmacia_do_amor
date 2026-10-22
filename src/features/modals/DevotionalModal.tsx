/**
 * DevotionalModal.tsx
 *
 * Modal em tela cheia do Devocional do Casal, utilizando o padrão
 * FullScreenOverlay compartilhado com todos os outros modais do app.
 */

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  User,
  Users,
  Sparkles,
  Bookmark,
  Lock,
} from 'lucide-react';
import { FullScreenOverlay } from '../../shared/ui/FullScreenOverlay';
import {
  useDevotionalStore,
  type DevotionalStep,
  type DevotionalMode,
} from '../devotional/store/useDevotionalStore';
import { usePlayerIdentityStore } from '../../store/usePlayerIdentityStore';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { getPlayerIds } from '../auth/playerIds';
import { getCurrentSiteId } from '../../services/firestore/paths';

import { MoodSelector } from '../devotional/components/MoodSelector';
import { DevotionalSolo } from '../devotional/components/DevotionalSolo';
import { DevotionalSync } from '../devotional/components/DevotionalSync';
import { VerseCard } from '../devotional/components/VerseCard';
import { DevotionalHistory } from '../devotional/components/DevotionalHistory';
import { DevotionalToast } from '../devotional/components/DevotionalToast';
import { cn } from '../../shared/utils/cn';

interface DevotionalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevotionalModal({ isOpen, onClose }: DevotionalModalProps) {
  const siteId = getCurrentSiteId();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlStep = searchParams.get('step') as DevotionalStep | null;
  const urlMode = searchParams.get('mode') as DevotionalMode | null;

  const { player } = usePlayerIdentityStore();
  const { config } = useSiteConfigStore();

  const { p1Id, p2Id } = getPlayerIds(config);
  const isPlayer = player === p1Id || player === p2Id;
  const isP1 = player === p1Id;
  const playerSlot: 'p1' | 'p2' = isP1 ? 'p1' : 'p2';

  const playerName = config
    ? isP1
      ? config.couple.partner1.name
      : config.couple.partner2.name
    : 'Você';

  const partnerName = config
    ? isP1
      ? config.couple.partner2.name
      : config.couple.partner1.name
    : 'Seu amor';

  const partnerNames = {
    name1: config?.couple.partner1.name || 'Parceiro 1',
    name2: config?.couple.partner2.name || 'Parceiro 2',
  };

  const {
    mode,
    step,
    setMode,
    setStep,
    selectedMood,
    setMood,
    soloResult,
    syncResult,
    favorites,
    loadHistory,
    loadFavorites,
    toggleFavorite,
    removeFavoriteItem,
    reset,
    toast,
    clearToast,
    showToast,
    checkMidnightExpiration,
    handleModalOpen,
    handleModalClose,
  } = useDevotionalStore();

  // O passo e modo efetivos priorizam a rota (URL search params)
  const currentStep: DevotionalStep = urlStep || step;
  const currentMode: DevotionalMode | null = urlMode || mode;

  // Sincroniza parâmetros de URL com o store quando o usuário navega pelo browser
  useEffect(() => {
    if (urlStep && urlStep !== step) {
      setStep(urlStep);
    } else if (!urlStep && step !== 'mode-select' && !soloResult && !syncResult) {
      setStep('mode-select');
    }
    if (urlMode && urlMode !== mode) {
      setMode(urlMode);
    }
  }, [urlStep, urlMode, step, mode, soloResult, syncResult, setStep, setMode]);

  // Sincroniza a URL quando o store avança automaticamente (ex: generating -> result)
  useEffect(() => {
    if (step === 'result' && urlStep !== 'result') {
      setSearchParams({ mode: mode || 'solo', step: 'result' }, { replace: true });
    } else if (step === 'generating' && urlStep !== 'generating') {
      setSearchParams({ mode: mode || 'solo', step: 'generating' }, { replace: true });
    } else if (step === 'sync-waiting' && urlStep !== 'sync-waiting') {
      setSearchParams({ mode: mode || 'sync', step: 'sync-waiting' }, { replace: true });
    } else if (step === 'sync-reveal' && urlStep !== 'sync-reveal') {
      setSearchParams({ mode: mode || 'sync', step: 'sync-reveal' }, { replace: true });
    }
  }, [step, urlStep, mode, setSearchParams]);

  // Navegação de etapas profissional via rota (React Router history)
  const navigateToStep = (nextStep: DevotionalStep, targetMode?: DevotionalMode) => {
    const activeMode = targetMode || currentMode || mode || 'solo';
    setStep(nextStep);
    if (activeMode) setMode(activeMode);

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (activeMode) next.set('mode', activeMode);
        next.set('step', nextStep);
        return next;
      },
      { replace: false }
    );
  };

  const handleBack = () => {
    if (urlStep && urlStep !== 'mode-select') {
      // Se há um step na URL diferente de mode-select, volta 1 nível no histórico do navegador
      navigate(-1);
    } else {
      // Já estamos na tela inicial do devocional (/devotional sem step): fecha diretamente para a home
      handleClose();
    }
  };

  const handleClose = () => {
    handleModalClose();
    onClose();
  };

  // Gerenciamento de abertura e virada da meia-noite
  useEffect(() => {
    if (isOpen && isPlayer) {
      loadHistory(siteId, player);
      loadFavorites(siteId, player);
      handleModalOpen();

      // Monitora a virada da meia-noite (23:59:59 -> 00:00:00) a cada 10 segundos
      const midnightTimer = setInterval(() => {
        const expired = checkMidnightExpiration();
        if (expired) {
          showToast('O devocional de ontem terminou. Um novo dia começou! 🌅', 'info');
        }
      }, 10000);

      return () => {
        clearInterval(midnightTimer);
      };
    }
  }, [isOpen, isPlayer, siteId, player]);

  // Se o usuário for visitante (sem token cadastrado), bloqueia o acesso igual ao Sincronia
  if (!isPlayer) {
    return (
      <FullScreenOverlay
        isOpen={isOpen}
        onClose={onClose}
        overlayId="devotional-guest"
        title="Devocional"
        icon={<BookOpen className="w-5 h-5 text-[#D4AF37]" />}
      >
        <div className="relative text-[#F5E6CC] min-h-full flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md mx-auto text-center space-y-6 p-7 sm:p-9 rounded-3xl bg-[#1F1630]/75 border border-[#D4AF37]/30 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#9d4edd]/20 border border-[#D4AF37]/35 flex items-center justify-center text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Lock className="w-8 h-8 text-[#D4AF37]" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
                Acesso Exclusivo
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif text-[#F5E6CC]">
                Abra pelo seu link pessoal
              </h2>
              <p className="text-xs sm:text-sm text-[#F5E6CC]/70 font-light leading-relaxed max-w-xs mx-auto">
                O devocional é uma experiência personalizada para o casal. Acesse através do seu link exclusivo com token para poder participar.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-[#F5E6CC] border border-white/20 transition-all min-h-[44px] cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </FullScreenOverlay>
    );
  }

  const isFavorited = favorites.some(
    (f) => f.reference === soloResult?.reference
  );

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={handleClose}
      onBack={handleBack}
      overlayId="devotional-root"
      title={currentStep === 'history' ? 'Favoritos' : 'Devocional'}
      icon={<BookOpen className="w-5 h-5 text-[#D4AF37]" />}
      actions={
        <button
          type="button"
          onClick={() => (currentStep === 'history' ? handleBack() : navigateToStep('history'))}
          title={currentStep === 'history' ? 'Voltar ao Devocional' : 'Favoritos'}
          className={cn(
            'relative p-2 rounded-xl transition-all min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer',
            currentStep === 'history'
              ? 'bg-[#D4AF37] text-[#160E24] shadow-[0_0_12px_rgba(212,175,55,0.4)]'
              : 'text-[#F5E6CC]/70 hover:text-[#D4AF37] hover:bg-white/5'
          )}
        >
          <Bookmark className="w-4 h-4" />
          {favorites.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-[#160E24] text-[9px] font-bold flex items-center justify-center shadow-sm">
              {favorites.length}
            </span>
          )}
        </button>
      }
    >
      <div className="relative text-[#F5E6CC] min-h-full pb-16 pt-4 sm:pt-6 px-3 sm:px-6">
        {/* Iluminação suave de fundo */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-[#D4AF37]/10 blur-[140px] rounded-full" />
          <div className="absolute bottom-10 right-0 w-[450px] h-[450px] bg-[#311042]/20 blur-[180px] rounded-full" />
        </div>

        {/* Conteúdo principal */}
        <div className="relative z-10 w-full max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ════════════ PASSO: ESCOLHA DE MODO (SOLO vs SYNC) ════════════ */}
            {currentStep === 'mode-select' && (
              <motion.div
                key="step-mode-select"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-2xl mx-auto space-y-8 sm:space-y-10 py-4 sm:py-6"
              >
                <div className="text-center space-y-3">
                  <span className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                    Um momento com Deus
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#F5E6CC]">
                    Como deseja se conectar hoje?
                  </h2>
                  <p className="text-xs sm:text-sm text-[#F5E6CC]/65 font-light max-w-md mx-auto leading-relaxed">
                    A Palavra de Deus alimenta nossa alma individualmente e fortalece o nosso amor como casal.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {/* Card Modo Solo */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setMode('solo');
                      navigateToStep('mood-select', 'solo');
                    }}
                    className="group relative flex flex-col p-6 sm:p-7 rounded-3xl border border-[#D4AF37]/25 bg-[#1F1630]/60 hover:bg-[#1F1630]/90 backdrop-blur-xl hover:border-[#D4AF37] hover:shadow-[0_0_40px_rgba(212,175,55,0.25)] text-left transition-all duration-300 cursor-pointer"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#9d4edd]/20 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
                      <User className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>

                    <h3 className="text-lg sm:text-xl font-serif font-bold text-[#F5E6CC] group-hover:text-white transition-colors">
                      Momento a Sós
                    </h3>
                    <p className="text-xs uppercase tracking-wider text-[#D4AF37] font-semibold mt-1 mb-2.5">
                      Modo Individual
                    </p>
                    <p className="text-xs sm:text-sm text-[#F5E6CC]/70 font-light leading-relaxed">
                      Compartilhe como você está se sentindo e receba um devocional íntimo, com meditação, versículo e reflexão.
                    </p>
                  </motion.button>

                  {/* Card Modo Sincronizado */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setMode('sync');
                      navigateToStep('mood-select', 'sync');
                    }}
                    className="group relative flex flex-col p-6 sm:p-7 rounded-3xl border border-[#D4AF37]/25 bg-[#1F1630]/60 hover:bg-[#1F1630]/90 backdrop-blur-xl hover:border-[#D4AF37] hover:shadow-[0_0_40px_rgba(212,175,55,0.25)] text-left transition-all duration-300 cursor-pointer"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#ff0055]/20 to-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>

                    <h3 className="text-lg sm:text-xl font-serif font-bold text-[#F5E6CC] group-hover:text-white transition-colors">
                      Momento a Dois
                    </h3>
                    <p className="text-xs uppercase tracking-wider text-[#D4AF37] font-semibold mt-1 mb-2.5">
                      Modo Sincronizado
                    </p>
                    <p className="text-xs sm:text-sm text-[#F5E6CC]/70 font-light leading-relaxed">
                      Você e {partnerName} compartilham seus sentimentos em segredo. A Palavra unirá os dois corações num devocional único.
                    </p>
                  </motion.button>
                </div>

                {/* Acesso rápido aos favoritos salvos */}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => navigateToStep('history')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs text-[#F5E6CC]/80 hover:text-[#D4AF37] bg-[#1F1630]/60 hover:bg-[#1F1630] border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 transition-all backdrop-blur-md cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Devocionais Salvos</span>
                    {favorites.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[10px] font-bold text-[#D4AF37]">
                        {favorites.length}
                      </span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ════════════ PASSO: SELEÇÃO DE HUMOR (MODO SOLO) ════════════ */}
            {currentStep === 'mood-select' && currentMode === 'solo' && (
              <motion.div
                key="step-solo-mood"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="py-4"
              >
                <MoodSelector
                  selectedMood={selectedMood}
                  onSelectMood={setMood}
                  onConfirm={() => navigateToStep('text-input', 'solo')}
                  onBack={handleBack}
                />
              </motion.div>
            )}

            {/* ════════════ PASSOS: TEXTO E FOCO (MODO SOLO) ════════════ */}
            {(currentStep === 'text-input' || currentStep === 'focus-select') && currentMode === 'solo' && (
              <motion.div
                key="step-solo-details"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="py-4"
              >
                <DevotionalSolo
                  siteId={siteId}
                  playerName={playerName}
                  playerId={player}
                  onBack={handleBack}
                  onAdvance={(next) => navigateToStep(next, 'solo')}
                />
              </motion.div>
            )}

            {/* ════════════ PASSO: GERANDO (ANIMAÇÃO DA IA) ════════════ */}
            {currentStep === 'generating' && (
              <motion.div
                key="step-generating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-md mx-auto py-16 sm:py-20 text-center space-y-6"
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-gradient-to-tr from-[#D4AF37]/20 via-[#B8962E]/30 to-[#9d4edd]/20 border border-[#D4AF37]/50 flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.35)]"
                >
                  <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-[#D4AF37]" />
                </motion.div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-serif text-[#F5E6CC]">
                    Buscando uma palavra para o seu coração...
                  </h3>
                  <p className="text-xs sm:text-sm text-[#F5E6CC]/60 font-light">
                    Acalme a respiração por um instante. Seu devocional está sendo preparado.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ════════════ PASSO: RESULTADO DO MODO SOLO ════════════ */}
            {currentStep === 'result' && soloResult && (
              <motion.div
                key="step-solo-result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-8 py-4"
              >
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
                    Devocional Pessoal
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif text-[#F5E6CC]">
                    Uma palavra para você, {playerName}
                  </h2>
                </div>

                <VerseCard
                  result={soloResult}
                  mode="solo"
                  isFavorited={isFavorited}
                  onToggleFavorite={() => toggleFavorite(siteId, player)}
                />

                <div className="flex justify-center pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setSearchParams({}, { replace: true });
                    }}
                    className="px-8 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-[#F5E6CC] border border-white/20 transition-all min-h-[44px] cursor-pointer"
                  >
                    Fazer outro devocional
                  </button>
                </div>
              </motion.div>
            )}

            {/* ════════════ MODO SINCRONIZADO (SYNC) ════════════ */}
            {currentMode === 'sync' && (currentStep === 'mood-select' || currentStep === 'text-input' || currentStep === 'sync-waiting' || currentStep === 'sync-reveal') && (
              <motion.div
                key="step-sync"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="py-4"
              >
                <DevotionalSync
                  siteId={siteId}
                  playerSlot={playerSlot}
                  playerName={playerName}
                  partnerName={partnerName}
                  partnerNames={partnerNames}
                  onBack={handleBack}
                  onAdvance={(next) => navigateToStep(next, 'sync')}
                />
              </motion.div>
            )}

            {/* ════════════ TELA: HISTÓRICO / FAVORITOS ════════════ */}
            {currentStep === 'history' && (
              <motion.div
                key="step-history"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="py-4"
              >
                <DevotionalHistory
                  favorites={favorites}
                  onRemoveFavorite={(id) => removeFavoriteItem(siteId, id)}
                  onNewDevotional={handleBack}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Notificações Flutuantes Elegantes (Toast) */}
      <DevotionalToast toast={toast} onDismiss={clearToast} />
    </FullScreenOverlay>
  );
}
export default DevotionalModal;
