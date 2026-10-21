/**
 * DevotionalSolo.tsx
 *
 * Fluxo solo do devocional:
 *  - Passo 2: Texto livre (desabafar ou expressar o que está no coração)
 *  - Passo 3: Foco da reflexão (relacionamento, futuro, eu mesmo, fé)
 *  - Disparo da geração com a IA
 */

import { motion } from 'framer-motion';
import { useDevotionalStore } from '../store/useDevotionalStore';
import { FOCUS_OPTIONS, type FocusId } from '../schema';
import { cn } from '../../../shared/utils/cn';
import { Sparkles, ArrowRight } from 'lucide-react';

interface DevotionalSoloProps {
  siteId: string;
  playerName: string;
  playerId: string;
}

export function DevotionalSolo({ siteId, playerName, playerId }: DevotionalSoloProps) {
  const {
    step,
    setStep,
    freeText,
    setFreeText,
    selectedFocus,
    setFocus,
    generateSoloDevotional,
    isGenerating,
    error,
  } = useDevotionalStore();

  const handleFocusSelect = async (focus: FocusId) => {
    setFocus(focus);
    await generateSoloDevotional(siteId, playerName, playerId);
  };

  if (step === 'text-input') {
    return (
      <div className="w-full max-w-xl mx-auto space-y-6 px-1 sm:px-0">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            Passo 2
          </span>
          <h2 className="text-2xl md:text-3xl font-serif text-[#F5E6CC] font-normal">
            Abra seu coração
          </h2>
          <p className="text-sm text-[#F5E6CC]/60 font-light">
            Conta um pouco mais sobre como você está se sentindo... (opcional)
          </p>
        </div>

        <div className="relative">
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Escreva aqui pensamentos, medos, alegrias ou orações de hoje..."
            /* text-base previne auto-zoom do iOS Safari */
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
            onClick={() => setStep('mood-select')}
            className="px-5 py-2.5 text-xs uppercase tracking-wider text-[#F5E6CC]/60 hover:text-[#F5E6CC] transition-colors min-h-[44px]"
          >
            Voltar
          </button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setStep('focus-select')}
            className="px-7 sm:px-8 py-3 rounded-full text-sm font-semibold tracking-wider bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#160E24] shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.45)] transition-all cursor-pointer flex items-center gap-2 min-h-[44px]"
          >
            <span>Continuar</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    );
  }

  if (step === 'focus-select') {
    return (
      <div className="w-full max-w-xl mx-auto space-y-8 px-1 sm:px-0">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            Passo 3
          </span>
          <h2 className="text-2xl md:text-3xl font-serif text-[#F5E6CC] font-normal">
            Qual o foco da reflexão?
          </h2>
          <p className="text-sm text-[#F5E6CC]/60 font-light">
            Onde você gostaria que a mensagem tocasse hoje?
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/40 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FOCUS_OPTIONS.map((f) => {
            const isSelected = selectedFocus === f.id;
            return (
              <motion.button
                key={f.id}
                type="button"
                disabled={isGenerating}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFocusSelect(f.id)}
                className={cn(
                  'flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-300',
                  'bg-[#1F1630]/60 backdrop-blur-md cursor-pointer select-none',
                  isSelected
                    ? 'border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.3)] bg-gradient-to-r from-[#D4AF37]/20 to-[#1F1630]/90'
                    : 'border-[#D4AF37]/20 hover:border-[#D4AF37]/60 hover:bg-[#1F1630]/90'
                )}
              >
                <span className="text-3xl p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 shrink-0">
                  {f.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#F5E6CC] tracking-wide">
                    {f.label}
                  </p>
                  <p className="text-xs text-[#F5E6CC]/60 font-light mt-0.5">
                    {f.desc}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStep('text-input')}
            disabled={isGenerating}
            className="px-5 py-2.5 text-xs uppercase tracking-wider text-[#F5E6CC]/60 hover:text-[#F5E6CC] transition-colors min-h-[44px] flex items-center"
          >
            Voltar
          </button>

          <span className="text-xs text-[#D4AF37]/80 flex items-center gap-1.5 font-light">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
            A IA preparará o devocional sob medida
          </span>
        </div>
      </div>
    );
  }

  return null;
}
