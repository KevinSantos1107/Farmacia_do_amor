/**
 * VerseCard.tsx
 *
 * Card principal do devocional com efeito typewriter no versículo
 * e botão de favoritar.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SoloDevotionalResult, SyncDevotionalResult } from '../schema';
import { Heart, Sparkles, HelpCircle, Target, MessageSquareHeart, Check } from 'lucide-react';
import { useDevotionalStore } from '../store/useDevotionalStore';
import { cn } from '../../../shared/utils/cn';

interface VerseCardProps {
  result: SoloDevotionalResult | SyncDevotionalResult;
  mode: 'solo' | 'sync';
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onAmenClick?: () => void;
}

export function VerseCard({
  result,
  mode,
  isFavorited,
  onToggleFavorite,
  onAmenClick,
}: VerseCardProps) {
  const [displayedVerse, setDisplayedVerse] = useState('');
  const [isTypewriterDone, setIsTypewriterDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [amenClicked, setAmenClicked] = useState(false);
  const [amenParticles, setAmenParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [floatingAmenList, setFloatingAmenList] = useState<
    { id: number; x: number; wobble: number; scale: number }[]
  >([]);

  const handleAmenClick = () => {
    setAmenClicked(true);
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([20, 35, 20]);
      }
    } catch {}

    // Dispara callback (para sincronização em modo dupla ou efeitos)
    if (onAmenClick) {
      onAmenClick();
    }

    // Emojis de Amém flutuantes que sobem pela tela (estilo Live do Instagram)
    const newFloating = {
      id: Date.now() + Math.random(),
      x: 35 + Math.random() * 45,
      wobble: (Math.random() - 0.5) * 60,
      scale: 1.0 + Math.random() * 0.35,
    };
    setFloatingAmenList((prev) => [...prev, newFloating]);
    setTimeout(() => {
      setFloatingAmenList((prev) => prev.filter((item) => item.id !== newFloating.id));
    }, 2700);

    // Partículas luminosas que sobem ao redor do botão ao clicar em Amém
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      x: (Math.random() - 0.5) * 80,
      y: -25 - Math.random() * 35,
    }));
    setAmenParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => {
      setAmenClicked(false);
    }, 600);

    setTimeout(() => {
      setAmenParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
    }, 1200);
  };

  // Efeito Typewriter letra por letra
  useEffect(() => {
    setDisplayedVerse('');
    setIsTypewriterDone(false);

    const fullText = result.verse;
    let index = 0;
    const speed = 25; // ms por caractere

    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedVerse(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsTypewriterDone(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [result.verse]);

  const { showToast } = useDevotionalStore();

  const handleCopyVerse = async () => {
    try {
      await navigator.clipboard.writeText(`"${result.verse}" — ${result.reference}`);
      setCopied(true);
      showToast('Versículo copiado para a área de transferência! 📋', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignora erro
    }
  };

  const couplePrompt = 'couplePrompt' in result ? result.couplePrompt : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* ── CARD PRINCIPAL DO VERSÍCULO ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative rounded-3xl overflow-hidden border border-[#D4AF37]/35 bg-[#1F1630]/80 backdrop-blur-2xl shadow-[0_0_60px_rgba(212,175,55,0.15)] p-5 sm:p-7 md:p-10 space-y-6 sm:space-y-8"
      >
        {/* Borda dourada brilhante superior */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_0_15px_#D4AF37]" />

        {/* Header com referência e botões de ação */}
        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-4">
          <span className="px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            {result.reference}
          </span>

          <div className="flex items-center gap-2">
            {/* Botão de favoritar */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={onToggleFavorite}
              title={isFavorited ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
              className={cn(
                'min-w-[44px] min-h-[44px] p-2.5 rounded-xl flex items-center justify-center transition-all',
                isFavorited
                  ? 'text-[#ff0055] bg-[#ff0055]/10 shadow-[0_0_15px_rgba(255,0,85,0.3)]'
                  : 'text-[#F5E6CC]/60 hover:text-[#ff0055] hover:bg-white/5'
              )}
            >
              <Heart
                className={cn('w-5 h-5', isFavorited && 'fill-[#ff0055]')}
              />
            </motion.button>
          </div>
        </div>

        {/* Texto do Versículo com Typewriter */}
        <div className="min-h-[100px] flex flex-col justify-center py-2">
          <p
            className="text-xl md:text-2xl font-serif italic text-[#F5E6CC] leading-relaxed tracking-wide text-center"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
          >
            "{displayedVerse}"
            {!isTypewriterDone && (
              <span className="inline-block w-1.5 h-5 bg-[#D4AF37] ml-1 animate-pulse" />
            )}
          </p>

          <p className="text-right text-xs md:text-sm font-sans uppercase tracking-widest text-[#D4AF37] mt-3">
            — {result.reference}
          </p>
        </div>

        {/* Botão sutil para copiar versículo */}
        <div className="flex justify-center -mt-2">
          <button
            type="button"
            onClick={handleCopyVerse}
            className="text-[11px] text-[#F5E6CC]/50 hover:text-[#D4AF37] transition-colors flex items-center gap-1.5 tracking-wider uppercase"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <span>Copiar versículo</span>
            )}
          </button>
        </div>

        {/* ── MEDITAÇÃO ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isTypewriterDone ? 1 : 0.4 }}
          transition={{ duration: 0.6 }}
          className="space-y-3 pt-6 border-t border-[#D4AF37]/15"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Meditação do Dia</span>
          </div>

          <p className="text-sm md:text-base text-[#F5E6CC]/90 leading-relaxed font-light text-justify">
            {result.meditation}
          </p>
        </motion.div>

        {/* ── FRASE DO CASAL (MODO SYNC) ── */}
        {couplePrompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-gradient-to-r from-[#D4AF37]/15 via-[#9d4edd]/15 to-[#D4AF37]/15 border border-[#D4AF37]/40 shadow-[0_0_25px_rgba(212,175,55,0.15)] space-y-2"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
              <MessageSquareHeart className="w-4 h-4 text-[#D4AF37]" />
              <span>Diga um ao outro agora:</span>
            </div>
            <p className="text-base md:text-lg font-serif italic text-white text-center leading-snug">
              "{couplePrompt}"
            </p>
          </motion.div>
        )}

        {/* ── PERGUNTA PARA REFLEXÃO ── */}
        <div className="p-5 rounded-2xl bg-[#160E24]/80 border border-[#D4AF37]/25 space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
            <span>{mode === 'sync' ? 'Para conversarem juntos' : 'Para refletir'}</span>
          </div>
          <p className="text-sm md:text-base text-[#F5E6CC] italic leading-relaxed">
            "{result.reflectionQuestion}"
          </p>
        </div>

        {/* ── DESAFIO PRÁTICO ── */}
        <div className="p-5 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/35 space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            <Target className="w-4 h-4 text-[#D4AF37]" />
            <span>Desafio Prático de Hoje (&lt; 10 min)</span>
          </div>
          <p className="text-sm md:text-base text-[#F5E6CC] font-normal leading-relaxed">
            {result.practicalChallenge}
          </p>
        </div>

        {/* ── ORAÇÃO GUIADA ── */}
        {result.prayer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#2D1B4E]/75 via-[#1F1630]/85 to-[#2D1B4E]/75 border border-[#D4AF37]/40 shadow-[0_4px_25px_rgba(0,0,0,0.4)] space-y-3"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span>{mode === 'sync' ? 'Oração do Casal' : 'Oração do Dia'}</span>
            </div>
            <p className="text-sm sm:text-base font-serif italic text-[#F5E6CC] leading-relaxed">
              "{result.prayer}"
            </p>
            <div className="relative flex justify-end pt-1">
              {/* Partículas douradas que sobem ao redor do botão */}
              <AnimatePresence>
                {amenParticles.map((particle) => (
                  <motion.span
                    key={particle.id}
                    initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
                    animate={{
                      opacity: 0,
                      scale: 1.3,
                      x: particle.x,
                      y: particle.y,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="absolute right-6 top-1 text-xs pointer-events-none select-none text-[#FFD700]"
                  >
                    ✨
                  </motion.span>
                ))}
              </AnimatePresence>

              <motion.button
                type="button"
                onClick={handleAmenClick}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                animate={
                  amenClicked
                    ? {
                        scale: [1, 1.18, 1],
                        boxShadow: [
                          '0 0 0 rgba(212,175,55,0)',
                          '0 0 25px rgba(212,175,55,0.7)',
                          '0 0 10px rgba(212,175,55,0.3)',
                        ],
                      }
                    : {}
                }
                transition={{ duration: 0.45 }}
                className={cn(
                  'relative text-[11px] uppercase tracking-widest font-semibold px-4 py-1.5 rounded-full cursor-pointer select-none transition-all duration-300 flex items-center gap-1.5 min-h-[36px]',
                  amenClicked
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E6CC] text-[#160E24] shadow-[0_0_20px_rgba(212,175,55,0.6)] font-bold'
                    : 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/25 hover:border-[#D4AF37]/70 shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                )}
                title="Dizer Amém"
              >
                <span>Amém</span>
                <motion.span
                  animate={amenClicked ? { rotate: [0, -20, 20, 0], scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  🙏
                </motion.span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Emojis flutuantes de Amém subindo pela tela (estilo Live do Instagram) */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {floatingAmenList.map((item) => (
            <motion.div
              key={item.id}
              initial={{
                opacity: 0,
                y: 0,
                scale: 0.5,
              }}
              animate={{
                opacity: [0, 1, 1, 0.8, 0],
                y: -520,
                x: [0, item.wobble, -item.wobble * 0.7, item.wobble * 0.4],
                scale: [0.5, item.scale, item.scale * 1.15, item.scale * 0.9],
                rotate: [0, item.wobble > 0 ? 15 : -15, item.wobble > 0 ? -10 : 10, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.5,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="absolute text-3xl sm:text-4xl filter drop-shadow-[0_0_12px_rgba(212,175,55,0.7)] select-none"
              style={{
                left: `${item.x}%`,
                bottom: '70px',
              }}
            >
              🙏
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
