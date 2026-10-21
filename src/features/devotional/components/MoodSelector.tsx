/**
 * MoodSelector.tsx
 *
 * Seletor visual de humor através de cards elegantes com emojis grandes.
 */

import { motion } from 'framer-motion';
import { MOOD_OPTIONS, type MoodId } from '../schema';
import { cn } from '../../../shared/utils/cn';

interface MoodSelectorProps {
  selectedMood: MoodId | null;
  onSelectMood: (mood: MoodId) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function MoodSelector({
  selectedMood,
  onSelectMood,
  onConfirm,
  onBack,
}: MoodSelectorProps) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-8 px-1 sm:px-0">
      <div className="text-center space-y-2">
        <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
          Passo 1
        </span>
        <h2 className="text-2xl md:text-3xl font-serif text-[#F5E6CC] font-normal">
          Como está o seu coração hoje?
        </h2>
        <p className="text-sm text-[#F5E6CC]/60 font-light">
          Escolha o sentimento mais presente em você agora
        </p>
      </div>

      {/* Grid de Cards de Humor */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {MOOD_OPTIONS.map((opt) => {
          const isSelected = selectedMood === opt.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectMood(opt.id)}
              className={cn(
                'relative flex flex-col items-center justify-center p-4 md:p-5 rounded-2xl border transition-all duration-300',
                'bg-[#1F1630]/60 backdrop-blur-md cursor-pointer select-none',
                isSelected
                  ? 'border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.35)] bg-gradient-to-b from-[#D4AF37]/20 to-[#1F1630]/90'
                  : 'border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:bg-[#1F1630]/80 text-[#F5E6CC]/80'
              )}
            >
              {/* Efeito sutil de brilho superior */}
              {isSelected && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent rounded-t-2xl" />
              )}

              <span className="text-4xl md:text-5xl mb-2 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                {opt.emoji}
              </span>
              <span
                className={cn(
                  'text-xs md:text-sm font-medium tracking-wide',
                  isSelected ? 'text-[#F5E6CC] font-semibold' : 'text-[#F5E6CC]/70'
                )}
              >
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 text-xs uppercase tracking-wider text-[#F5E6CC]/60 hover:text-[#F5E6CC] transition-colors min-h-[44px] flex items-center"
        >
          Voltar
        </button>

        <motion.button
          type="button"
          disabled={!selectedMood}
          whileHover={{ scale: selectedMood ? 1.03 : 1 }}
          whileTap={{ scale: selectedMood ? 0.97 : 1 }}
          onClick={onConfirm}
          className={cn(
            'px-8 py-3 rounded-full text-sm font-semibold tracking-wider transition-all duration-300 min-h-[44px] flex items-center justify-center',
            selectedMood
              ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#160E24] shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.45)] cursor-pointer'
              : 'bg-[#F5E6CC]/10 text-[#F5E6CC]/30 cursor-not-allowed border border-[#F5E6CC]/10'
          )}
        >
          Continuar
        </motion.button>
      </div>
    </div>
  );
}
