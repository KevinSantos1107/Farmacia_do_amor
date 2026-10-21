/**
 * ReflectionJournal.tsx
 *
 * Caderno de escrita livre para o modo solo com perguntas geradas pela IA.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface ReflectionJournalProps {
  prompts: string[];
}

export function ReflectionJournal({ prompts }: ReflectionJournalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState(false);

  if (!prompts || prompts.length === 0) return null;

  const handleEntryChange = (index: number, text: string) => {
    setEntries((prev) => ({ ...prev, [index]: text }));
  };

  const handleCopyJournal = async () => {
    const text = prompts
      .map((prompt, idx) => `* ${prompt}\n${entries[idx] || '(sem resposta)'}\n`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignora erro
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-3xl border border-[#D4AF37]/25 bg-[#1F1630]/60 backdrop-blur-xl overflow-hidden transition-all duration-300">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F5E6CC] tracking-wide">
                Caderno de Escrita Livre
              </p>
              <p className="text-xs text-[#F5E6CC]/50 font-light">
                {prompts.length} perguntas para aprofundar seu momento com Deus
              </p>
            </div>
          </div>

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-[#D4AF37]" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-6 pt-2 space-y-6 border-t border-[#D4AF37]/15">
                {prompts.map((prompt, idx) => (
                  <div key={idx} className="space-y-2">
                    <label className="block text-xs font-medium text-[#D4AF37] tracking-wide">
                      {idx + 1}. {prompt}
                    </label>
                    <textarea
                      value={entries[idx] || ''}
                      onChange={(e) => handleEntryChange(idx, e.target.value)}
                      rows={3}
                      placeholder="Escreva seus pensamentos aqui..."
                      /* text-base previne auto-zoom do iOS Safari */
                      className={cn(
                        'w-full p-4 rounded-xl border text-base leading-relaxed',
                        'bg-[#160E24]/90 text-[#F5E6CC] placeholder-[#F5E6CC]/25',
                        'border-[#D4AF37]/20 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]',
                        'resize-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
                      )}
                    />
                  </div>
                ))}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCopyJournal}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#F5E6CC]/80 hover:text-[#F5E6CC] transition-colors flex items-center gap-2 border border-white/10"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span>Copiado para a área de transferência!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar anotações</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
