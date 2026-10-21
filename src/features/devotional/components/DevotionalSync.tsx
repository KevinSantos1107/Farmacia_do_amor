/**
 * DevotionalSync.tsx
 *
 * Modo Sincronizado do Devocional:
 *  - Preenchimento individual e secreto por cada parceiro
 *  - Tela de espera com animação suave e nome do parceiro
 *  - Disparo da IA quando ambos enviarem
 *  - Visualização conjunta com reações em tempo real
 *  - Tratamento resiliente de estado para garantir que o casal nunca fique travado
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDevotionalStore } from '../store/useDevotionalStore';
import { MoodSelector } from './MoodSelector';
import { VerseCard } from './VerseCard';
import { ConfirmResetModal } from './ConfirmResetModal';
import {
  subscribeToSession,
  getTodayDateString,
  saveReaction,
} from '../services/aiDevotionalService';
import { REACTION_EMOJIS, type ReactionEmoji } from '../schema';
import { cn } from '../../../shared/utils/cn';
import {
  Heart,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Edit3,
} from 'lucide-react';

interface DevotionalSyncProps {
  siteId: string;
  playerSlot: 'p1' | 'p2';
  playerName: string;
  partnerName: string;
  partnerNames: { name1: string; name2: string };
  onBack?: () => void;
  onAdvance?: (step: 'text-input') => void;
}

export function DevotionalSync({
  siteId,
  playerSlot,
  playerName,
  partnerName,
  partnerNames,
  onBack,
  onAdvance,
}: DevotionalSyncProps) {
  const {
    setStep,
    selectedMood,
    setMood,
    freeText,
    setFreeText,
    session,
    setSession,
    submitSyncMood,
    triggerSyncGeneration,
    resetSyncSession,
    resetMySyncSubmission,
    syncResult,
    isLoading,
    error,
    toggleFavorite,
    favorites,
    showToast,
    reset,
  } = useDevotionalStore();

  const [syncStep, setSyncStep] = useState<'mood' | 'text'>('mood');
  const [activeDate, setActiveDate] = useState(() => getTodayDateString());
  const [isNextDayAvailable, setIsNextDayAvailable] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Inscreve no Firestore para ouvir mudanças na sessão da data ativa em tempo real
  useEffect(() => {
    const unsubscribe = subscribeToSession(siteId, activeDate, (updatedSession) => {
      setSession(updatedSession);
    });
    return () => unsubscribe();
  }, [siteId, activeDate, setSession]);

  // Monitora inteligentemente a virada da meia-noite (23:59 -> 00:00)
  // Se o casal estiver lendo online, NÃO reinicia nem apaga a tela de surpresa.
  // Em vez disso, exibe um aviso gentil permitindo que eles continuem lendo
  // e avancem para o novo dia apenas quando terminarem.
  useEffect(() => {
    const checkDateTransition = () => {
      const currentToday = getTodayDateString();
      if (currentToday !== activeDate) {
        setIsNextDayAvailable(true);
      }
    };

    const interval = setInterval(checkDateTransition, 30000); // Checa a cada 30 segundos
    return () => clearInterval(interval);
  }, [activeDate]);

  const handleAdvanceToNextDay = () => {
    const newDay = getTodayDateString();
    setActiveDate(newDay);
    setIsNextDayAvailable(false);
    reset();
    showToast('Iniciando o devocional de hoje! ☀️', 'info');
  };

  const otherSlot: 'p1' | 'p2' = playerSlot === 'p1' ? 'p2' : 'p1';
  const mySubmission = session?.[playerSlot];
  const partnerSubmission = session?.[otherSlot];
  const bothSubmitted = Boolean(mySubmission && partnerSubmission);

  const handleSubmit = async () => {
    await submitSyncMood(siteId, playerSlot, partnerNames);
  };

  const handleRevealClick = async () => {
    await triggerSyncGeneration(siteId, partnerNames);
  };

  const handleEditMyEntry = async () => {
    await resetMySyncSubmission(siteId, playerSlot);
    setSyncStep('mood');
    showToast('Pronto para editar seu momento de hoje.', 'info');
  };

  const handleConfirmReset = async () => {
    setShowConfirmReset(false);
    await resetSyncSession(siteId);
    setSyncStep('mood');
    showToast('Devocional reiniciado! Vocês já podem preencher novamente ✨', 'success');
  };

  const handleSelectReaction = async (emoji: ReactionEmoji) => {
    await saveReaction(siteId, activeDate, playerSlot, emoji);
  };

  const devotionalResult = session?.result || syncResult;
  const isFavorited = favorites.some(
    (f) => f.reference === devotionalResult?.reference
  );

  // ─────────────────────────────────────────────
  // 1. REVELADO: Exibe o resultado conjunto
  // ─────────────────────────────────────────────
  if (session?.status === 'revealed' && (session.result || syncResult)) {
    const devotional = session.result || syncResult!;
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 sm:space-y-8 px-2 sm:px-0">
        {/* Banner inteligente de novo dia (se a meia-noite virar enquanto estiverem lendo) */}
        {isNextDayAvailable && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleAdvanceToNextDay}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/25 via-[#9d4edd]/25 to-[#D4AF37]/25 border border-[#D4AF37]/50 backdrop-blur-md flex items-center justify-between text-xs text-[#F5E6CC] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:scale-[1.01] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span className="font-medium text-left">
                Um novo dia começou! Quando terminarem de ler, toque aqui para abrir o devocional de hoje.
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider underline shrink-0 ml-2">
              Começar hoje →
            </span>
          </motion.button>
        )}

        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold flex items-center justify-center gap-1.5">
            <Heart className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
            Devocional do Casal
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#F5E6CC]">
            {partnerNames.name1} &amp; {partnerNames.name2}
          </h2>
          <p className="text-xs text-[#F5E6CC]/60 font-light">
            Uma só mensagem para dois corações unidos em oração
          </p>
        </div>

        <VerseCard
          result={devotional}
          mode="sync"
          isFavorited={isFavorited}
          onToggleFavorite={() => toggleFavorite(siteId, playerSlot)}
        />

        {/* Reações dos dois parceiros */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#1F1630]/70 border border-[#D4AF37]/30 backdrop-blur-xl space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <p className="text-xs uppercase tracking-widest text-[#D4AF37] text-center font-semibold">
            Como você se sente com essa palavra?
          </p>

          <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
            {REACTION_EMOJIS.map((emoji) => {
              const isSelected = mySubmission?.reaction === emoji;
              return (
                <motion.button
                  key={emoji}
                  type="button"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSelectReaction(emoji)}
                  className={cn(
                    'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all cursor-pointer',
                    isSelected
                      ? 'bg-[#D4AF37]/30 border-2 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  )}
                >
                  {emoji}
                </motion.button>
              );
            })}
          </div>

          {/* Exibição das reações mútuas */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[#F5E6CC]/50 block">{playerName}</span>
              <span className="text-2xl mt-1 block">
                {mySubmission?.reaction || '💭'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[#F5E6CC]/50 block">{partnerName}</span>
              <span className="text-2xl mt-1 block">
                {partnerSubmission?.reaction || '💭'}
              </span>
            </div>
          </div>
        </div>

        {/* Opção para recomeçar se desejarem */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setShowConfirmReset(true)}
            className="flex items-center gap-1.5 text-xs text-[#F5E6CC]/40 hover:text-[#D4AF37] transition-colors py-2 px-4 rounded-full hover:bg-white/5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Fazer outro devocional hoje</span>
          </button>
        </div>

        {/* Diálogo elegante de confirmação */}
        <ConfirmResetModal
          isOpen={showConfirmReset}
          onCancel={() => setShowConfirmReset(false)}
          onConfirm={handleConfirmReset}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // 2. GERANDO: Ambos enviaram e a IA está trabalhando
  // ─────────────────────────────────────────────
  if (session?.status === 'generating' || isLoading) {
    return (
      <div className="w-full max-w-md mx-auto py-16 text-center space-y-6 px-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-[#D4AF37]/20 to-[#9d4edd]/30 border border-[#D4AF37]/40 flex items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.3)]"
        >
          <Sparkles className="w-10 h-10 text-[#D4AF37]" />
        </motion.div>

        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-serif text-[#F5E6CC]">
            Unindo seus corações...
          </h3>
          <p className="text-sm text-[#F5E6CC]/70 font-light leading-relaxed">
            A Palavra de Deus está sendo preparada especialmente para vocês dois.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <Loader2 className="w-7 h-7 text-[#D4AF37] animate-spin" />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // 3. AMBOS ENVIARAM: Prontos para Revelar! (Evita Deadlock)
  // ─────────────────────────────────────────────
  if (bothSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto py-10 text-center space-y-6 px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-24 h-24 mx-auto flex items-center justify-center"
        >
          <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 animate-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.4)]">
            <Heart className="w-8 h-8 text-[#160E24] fill-[#160E24]" />
          </div>
        </motion.div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
            Vocês dois já responderam!
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif text-[#F5E6CC]">
            Tudo pronto para o Devocional 💛
          </h3>
          <p className="text-sm text-[#F5E6CC]/70 font-light leading-relaxed max-w-sm mx-auto">
            Os sentimentos de vocês foram acolhidos. Clique abaixo para gerar e revelar a mensagem do casal!
          </p>
        </div>

        {/* Status dos dois parceiros */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#1F1630]/70 border border-[#D4AF37]/25 text-xs text-left">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-[#F5E6CC]/90 truncate">{partnerNames.name1}: Pronto</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-[#F5E6CC]/90 truncate">{partnerNames.name2}: Pronto</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-xs text-center space-y-1">
            <p className="font-semibold">{error}</p>
            <p className="opacity-80">Clique no botão abaixo para tentar gerar novamente.</p>
          </div>
        )}

        {/* Botão de Revelação */}
        <motion.button
          type="button"
          disabled={isLoading}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleRevealClick}
          className="w-full py-3.5 px-6 rounded-full text-sm font-semibold tracking-wider bg-gradient-to-r from-[#D4AF37] via-[#E2C366] to-[#B8962E] text-[#160E24] shadow-[0_4px_25px_rgba(212,175,55,0.4)] hover:shadow-[0_6px_30px_rgba(212,175,55,0.6)] transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Gerando devocional...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Revelar Devocional do Casal ✨</span>
            </>
          )}
        </motion.button>

        {/* Opções secundárias */}
        <div className="flex items-center justify-center gap-4 pt-2 text-xs text-[#F5E6CC]/50">
          <button
            type="button"
            onClick={handleEditMyEntry}
            className="hover:text-[#D4AF37] transition-colors flex items-center gap-1 p-2"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar meu momento</span>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowConfirmReset(true)}
            className="hover:text-red-400 transition-colors flex items-center gap-1 p-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recomeçar tudo</span>
          </button>
        </div>

        {/* Diálogo elegante de confirmação */}
        <ConfirmResetModal
          isOpen={showConfirmReset}
          onCancel={() => setShowConfirmReset(false)}
          onConfirm={handleConfirmReset}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // 4. APENAS EU ENVIEI: Aguardando o parceiro
  // ─────────────────────────────────────────────
  if (mySubmission) {
    return (
      <div className="w-full max-w-md mx-auto py-12 text-center space-y-6 px-4">
        {/* Animação suave de pulso */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: 0.4, ease: 'easeInOut' }}
            className="absolute inset-3 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50"
          />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.5)]">
            <Heart className="w-8 h-8 text-[#160E24] fill-[#160E24]" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="inline-block px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs text-[#D4AF37] font-medium">
            Seu momento foi registrado
          </div>
          <h3 className="text-2xl sm:text-3xl font-serif text-[#F5E6CC]">
            Aguardando {partnerName} 💛
          </h3>
          <p className="text-sm text-[#F5E6CC]/70 font-light max-w-xs mx-auto leading-relaxed">
            Assim que {partnerName} compartilhar o sentimento de hoje, o devocional do casal será revelado para vocês dois ao mesmo tempo.
          </p>
        </div>

        <div className="pt-2 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleEditMyEntry}
            className="text-xs text-[#F5E6CC]/60 hover:text-[#D4AF37] transition-colors flex items-center gap-1.5 py-2 px-4 rounded-full border border-white/10 hover:border-[#D4AF37]/40 bg-white/[0.02]"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar o que escrevi</span>
          </button>
          <p className="text-[11px] text-[#F5E6CC]/40">
            Você pode fechar esta página e voltar depois — tudo fica salvo.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // 5. EU AINDA NÃO ENVIEI: Formulário de preenchimento
  // ─────────────────────────────────────────────
  return (
    <div className="w-full max-w-xl mx-auto space-y-6 sm:space-y-8 px-2 sm:px-0">
      {/* Banner indicando se o parceiro já enviou */}
      {partnerSubmission && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/20 to-[#9d4edd]/20 border border-[#D4AF37]/40 backdrop-blur-md flex items-center gap-3 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
        >
          <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#F5E6CC]">
              {partnerName} já está pronto(a)! 💛
            </p>
            <p className="text-xs text-[#F5E6CC]/70">
              Preencha o seu sentimento para revelar o devocional de vocês dois.
            </p>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/40 text-red-200 text-sm text-center">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {syncStep === 'mood' ? (
          <motion.div
            key="sync-mood"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MoodSelector
              selectedMood={selectedMood}
              onSelectMood={setMood}
              onConfirm={() => {
                setSyncStep('text');
                if (onAdvance) onAdvance('text-input');
              }}
              onBack={() => {
                if (onBack) onBack();
                else setStep('mode-select');
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="sync-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
                Passo 2
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif text-[#F5E6CC]">
                Conta um pouco mais...
              </h2>
              <p className="text-xs sm:text-sm text-[#F5E6CC]/65 font-light max-w-md mx-auto">
                O que tem pesado ou alegrado o seu coração hoje? {partnerName} não verá este texto diretamente — ele será usado pela IA para abençoar vocês.
              </p>
            </div>

            <div className="relative">
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Ex.: Hoje estou com o coração grato por... / Estou um pouco ansioso(a) com..."
                /* text-base evita que o Safari do iOS dê zoom automático ao focar no campo */
                className={cn(
                  'w-full p-4 sm:p-5 rounded-2xl border text-base leading-relaxed',
                  'bg-[#1F1630]/70 text-[#F5E6CC] placeholder-[#F5E6CC]/30',
                  'border-[#D4AF37]/30 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]',
                  'backdrop-blur-md resize-none transition-all shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]'
                )}
              />
              <span className="absolute bottom-3 right-4 text-[10px] text-[#F5E6CC]/40 tracking-wider">
                {freeText.length}/2000
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setSyncStep('mood');
                  if (onBack) onBack();
                }}
                className="px-5 py-2.5 text-xs uppercase tracking-wider text-[#F5E6CC]/60 hover:text-[#F5E6CC] transition-colors min-h-[44px]"
              >
                Voltar
              </button>

              <motion.button
                type="button"
                disabled={isLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                className="px-8 py-3 rounded-full text-sm font-semibold tracking-wider bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#160E24] shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.45)] transition-all cursor-pointer flex items-center gap-2 min-h-[44px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar meu momento</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
